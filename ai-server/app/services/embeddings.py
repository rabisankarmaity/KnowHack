"""Embeddings for KnowHack.

Two providers are supported:

* `hash` (default): a deterministic hashing embedder. It has zero dependencies,
  requires no network and always works, so the whole AI layer keeps functioning
  even without credentials.
* `huggingface`: real model embeddings via the Hugging Face Inference Providers
  endpoint, enabled by setting `EMBEDDING_PROVIDER=huggingface` (and optionally
  `EMBEDDING_API_KEY`, defaulting to `LLM_API_KEY`). Network errors / timeouts
  degrade gracefully back to `hash` so `/health` never reports a hard failure.

`chunk_case_file()` builds the section-aware chunks used both for indexing and
for RAG retrieval. Swap the provider without touching any caller.
"""
import hashlib
import logging
import math
import re

import httpx

from app.config import SECTION_ORDER, get_settings

logger = logging.getLogger(__name__)

TOKEN_RE = re.compile(r"[a-z0-9+#.]{2,}")

EMBED_MODELS = {"hash": "hash-embed-v1", "huggingface": "model-embed-v1"}


def _tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall((text or "").lower())


def _hash_embed(text: str, dim: int) -> list[float]:
    vec = [0.0] * dim
    for token in _tokenize(text):
        digest = hashlib.sha1(token.encode()).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


async def _model_embed_many(texts: list[str], key: str, model: str, timeout: float) -> list[list[float]] | None:
    """POST to the Hugging Face Inference Providers feature-extraction endpoint.

    Returns None (never raises) when the provider is unreachable so callers can
    fall back to the hash embedder.
    """
    if not key or not texts:
        return None
    body = {"inputs": texts[0] if len(texts) == 1 else texts, "options": {"wait_for_model": True}}
    headers = {"Authorization": f"Bearer {key}"}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"https://api-inference.huggingface.co/pipeline/feature-extraction/{model}",
                headers=headers,
                json=body,
            )
            resp.raise_for_status()
            out = resp.json()
        if not isinstance(out, list) or not out:
            return None
        if isinstance(out[0], (int, float)):
            # Single input -> flat list of floats.
            return [out]
        if isinstance(out[0], list) and isinstance(out[0][0] if out[0] else None, (int, float)):
            # Batch input -> one vector per row.
            return [list(row) for row in out]
        return None
    except Exception as exc:  # noqa: BLE001 - never fail embedding on provider issues
        logger.warning("model embedder unavailable (%s), using hash fallback", exc)
        return None


async def embed_text(text: str) -> list[float]:
    settings = get_settings()
    dim = settings.embedding_dim
    provider = (settings.embedding_provider or "hash").strip().lower()
    if provider not in ("huggingface", "model"):
        return _hash_embed(text or "", dim)
    vectors = await _model_embed_many([text or ""], settings.resolved_embedding_api_key, settings.embedding_model, settings.embedding_timeout_seconds)
    if vectors is not None and vectors and vectors[0] and len(vectors[0]) == dim:
        return list(vectors[0])
    return _hash_embed(text or "", dim)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    dim = settings.embedding_dim
    provider = (settings.embedding_provider or "hash").strip().lower()
    if provider in ("huggingface", "model"):
        vectors = await _model_embed_many(texts, settings.resolved_embedding_api_key, settings.embedding_model, settings.embedding_timeout_seconds)
        if vectors is not None and len(vectors) == len(texts) and vectors and all(len(v) == dim for v in vectors):
            return vectors
    return [_hash_embed(t or "", dim) for t in texts]


def embed_model_name() -> str:
    settings = get_settings()
    provider = (settings.embedding_provider or "hash").strip().lower()
    if provider not in ("huggingface", "model"):
        return "hash-embed-v1"
    return settings.embedding_model


def chunk_case_file(sections: dict[str, str | None]) -> list[dict]:
    """Build normalized section-aware chunks from a flat sections dict.

    Returns sorted chunks with canonical keys, e.g.
    ``[{ "section": "problem", "text": "..." }, ...]``. Missing or empty
    sections are dropped.
    """
    if not sections:
        return []
    chunks: list[dict] = []
    for section in SECTION_ORDER:
        text = (sections.get(section) or "").strip()
        if not text:
            continue
        chunks.append({"section": section, "text": text})
    return chunks


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))