"""Shared LLM access via any OpenAI-compatible `/chat/completions` endpoint.

* `chat_json()` — returns parsed JSON for structured outputs (three core AI
  pipelines). Makes one controlled JSON-repair attempt, then raises.
* `chat()` — returns raw text.
* `analyze()` — keeps the legacy summarization contract (`llm` | `fallback`).
* `probe_llm()` — real availability check used by `/health`.
* `fallback_*` — deterministic extractive fallbacks so the platform degrades
  gracefully instead of failing when the LLM is unavailable.

The engine values `"llm"` / `"fallback"` are part of the public contract: the
Node backend and the frontend types depend on them.
"""
import json
import logging
import re

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def llm_configured() -> bool:
    s = get_settings()
    return bool(s.resolved_base_url and s.llm_api_key)


def _json_mode_enabled() -> bool:
    """response_format={"type":"json_object"} is not universally supported across
    Hugging Face routed providers, so it stays opt-in via LLM_JSON_MODE."""
    mode = (get_settings().llm_json_mode or "auto").strip().lower()
    if mode == "on":
        return True
    if mode == "off":
        return False
    return get_settings().provider == "openai"


_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def parse_json_payload(content: str) -> dict:
    """Parse model output that may be wrapped in markdown fences or padded with prose."""
    if not content:
        raise ValueError("empty content")
    cleaned = _FENCE_RE.sub("", content.strip())
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("no JSON object found in model output") from None
        parsed = json.loads(cleaned[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("model output was not a JSON object")
    return parsed


async def _chat(client: "httpx.AsyncClient", messages: list[dict], json_mode: bool, *, max_tokens: int | None = None) -> str:
    settings = get_settings()
    body: dict = {"model": settings.llm_model, "messages": messages}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    if max_tokens:
        body["max_tokens"] = max_tokens
    resp = await client.post(
        f"{settings.resolved_base_url}/chat/completions",
        headers={"Authorization": f"Bearer {settings.llm_api_key}"},
        json=body,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"] or ""


async def _open_client():
    settings = get_settings()
    return httpx.AsyncClient(timeout=settings.llm_timeout_seconds)


async def chat_json(system_prompt: str, user_content: str, schema_hint: dict) -> dict:
    """Ask the LLM for a structured JSON object matching ``schema_hint``.

    Raises on parse failure after one repair attempt. Never fabricates a value —
    callers are responsible for falling back.
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"{user_content}\n\n"
                "Return ONLY a JSON object with exactly this shape (no code fences, no prose):\n"
                f"{json.dumps(schema_hint)}"
            ),
        },
    ]
    return await _chat_messages_json(messages)


async def _chat_messages_json(messages: list[dict]) -> dict:
    json_mode = _json_mode_enabled()
    async with _open_client() as client:
        content = await _chat(client, messages, json_mode)
        try:
            return parse_json_payload(content)
        except (ValueError, json.JSONDecodeError) as parse_exc:
            logger.warning("LLM returned non-JSON output, attempting one repair: %s", parse_exc)
            repaired = await _chat(
                client,
                messages
                + [
                    {"role": "assistant", "content": content[:8000]},
                    {"role": "user", "content": "That was not valid JSON. Reply with the corrected JSON object only."},
                ],
                json_mode,
            )
            return parse_json_payload(repaired)


async def chat(system_prompt: str, user_content: str, *, json_mode: bool | None = None) -> str:
    """Raw chat completion (text response)."""
    mode = json_mode if json_mode is not None else _json_mode_enabled()
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}]
    async with _open_client() as client:
        return await _chat(client, messages, mode)


async def probe_llm() -> dict:
    """Real availability check: a tiny completion against the configured model."""
    settings = get_settings()
    if not llm_configured():
        return {"configured": False, "available": False}
    try:
        async with httpx.AsyncClient(timeout=min(settings.llm_timeout_seconds, 15.0)) as client:
            await _chat(
                client,
                [
                    {"role": "system", "content": "Reply with the single word: ok"},
                    {"role": "user", "content": "ping"},
                ],
                False,
                max_tokens=settings.llm_probe_max_tokens,
            )
        return {"configured": True, "available": True}
    except Exception as exc:  # noqa: BLE001 - health must never crash
        logger.warning("LLM probe failed: %s", exc)
        return {"configured": True, "available": False}


# ---------------------------------------------------------------------------
# Legacy summarization pipeline.
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are KnowHack, the intelligence layer of an AI-powered hackathon knowledge "
    "ecosystem. Your job is to transform hackathon project material into structured, "
    "educational KnowHack Case File information. Preserve the author's intent. Never "
    "invent project facts. If information is unavailable in the supplied project "
    "material, leave the appropriate field empty instead of hallucinating. Return ONLY "
    "the requested structured JSON — no prose, no markdown, no code fences."
)

SCHEMA_HINT = {
    "summary": "3-5 sentence neutral summary",
    "highlights": ["short bullet"],
    "case_file": {
        "problem": "",
        "target_users": "",
        "research": "",
        "solution": "",
        "innovation": "",
        "architecture": "",
        "challenges": [],
        "lessons": [],
        "future_scope": [],
        "team": "",
        "existing_solutions": "",
        "features": "",
        "database": "",
        "api_integrations": "",
        "ui_ux": "",
        "development_journey": "",
        "judge_feedback": "",
    },
    "metadata": {"keywords": [], "sector": "", "difficulty": "", "project_type": ""},
    "tech_stack": {"languages": [], "frameworks": [], "databases": [], "cloud": [], "tools": []},
}


async def analyze(title: str | None, text: str) -> tuple[dict, str, str]:
    """Returns (payload, model, engine).

    `engine` stays "llm" | "fallback". The provider (e.g. huggingface) is
    reported via /health.
    """
    settings = get_settings()
    if not llm_configured():
        return fallback_analyze(title, text), "extractive-v1", "fallback"

    prompt = (
        f"Project title: {title or 'Untitled'}\n\n"
        f"Source material (truncated):\n{text[:24000]}\n\n"
        f"Return ONLY a JSON object with exactly this shape (no code fences):\n"
        f"{json.dumps(SCHEMA_HINT)}"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
    try:
        payload = await _chat_messages_json(messages)
        return payload, settings.llm_model, "llm"
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM analysis failed, using fallback: %s", exc)
        return fallback_analyze(title, text), "extractive-v1", "fallback"


TECH_LEXICON = {
    "languages": ["python", "javascript", "typescript", "java", "kotlin", "swift", "go", "rust", "c++", "c#", "php", "ruby", "dart", "sql"],
    "frameworks": ["react", "next.js", "vue", "angular", "svelte", "express", "fastapi", "django", "flask", "spring", "flutter", "react native", "tailwind", "node.js"],
    "databases": ["postgresql", "postgres", "mongodb", "mysql", "redis", "sqlite", "firebase", "supabase", "pinecone", "pgvector"],
    "cloud": ["aws", "azure", "gcp", "vercel", "netlify", "cloudflare", "render", "railway", "docker", "kubernetes", "cloudinary"],
    "tools": ["figma", "github", "git", "postman", "jira", "notion", "langchain", "openai", "huggingface", "tensorflow", "pytorch"],
}

SECTORS = {
    "healthcare": ["health", "medical", "patient", "hospital", "diagnos"],
    "education": ["education", "student", "learning", "course", "school"],
    "fintech": ["finance", "payment", "bank", "loan", "wallet", "credit"],
    "agriculture": ["farm", "crop", "agri", "soil", "harvest"],
    "sustainability": ["climate", "carbon", "sustain", "energy", "waste", "green"],
    "mobility": ["transport", "traffic", "vehicle", "mobility", "logistics"],
    "govtech": ["government", "civic", "public sector", "policy"],
    "productivity": ["productivity", "workflow", "collaboration", "task"],
}

STOPWORDS = set(
    "the a an and or of to in for with on is are be this that we our it as by from at using use can".split()
)


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 40]


def fallback_analyze(title: str | None, text: str) -> dict:
    lower = text.lower()
    sentences = _sentences(text)
    summary = " ".join(sentences[:4]) or (text[:400].strip() or f"{title or 'Project'} case file.")

    words = [w for w in re.findall(r"[a-z]{4,}", lower) if w not in STOPWORDS]
    freq: dict[str, int] = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    keywords = [w for w, _ in sorted(freq.items(), key=lambda kv: kv[1], reverse=True)[:12]]

    tech = {
        bucket: sorted({term for term in terms if term in lower})
        for bucket, terms in TECH_LEXICON.items()
    }

    sector = next(
        (name for name, hints in SECTORS.items() if any(h in lower for h in hints)),
        "general",
    )

    def grab(*hints: str) -> str:
        for s in sentences:
            if any(h in s.lower() for h in hints):
                return s
        return ""

    return {
        "summary": summary,
        "highlights": sentences[:5],
        "case_file": {
            "problem": grab("problem", "challenge", "pain point"),
            "target_users": grab("users", "students", "customers", "audience"),
            "research": grab("research", "survey", "market", "competitor"),
            "solution": grab("solution", "we built", "platform", "propose"),
            "innovation": grab("innovation", "unique", "novel", "usp"),
            "architecture": grab("architecture", "backend", "frontend", "microservice"),
            "challenges": [s for s in sentences if "challenge" in s.lower()][:5],
            "lessons": [s for s in sentences if "learn" in s.lower()][:5],
            "future_scope": [s for s in sentences if "future" in s.lower() or "next step" in s.lower()][:5],
            "team": grab("team", "member", "contribution", "student"),
            "existing_solutions": grab("existing solution", "competitor", "alternatives"),
            "features": grab("feature", "ability", "supports"),
            "database": grab("database", "mongodb", "postgres", "schema", "collection"),
            "api_integrations": grab("api", "integration", "endpoint"),
            "ui_ux": grab("ui", "ux", "figma", "design", "interface"),
            "development_journey": grab("development", "prototype", "phase", "built"),
            "judge_feedback": grab("judge", "feedback", "question", "score"),
        },
        "metadata": {
            "keywords": keywords,
            "sector": sector,
            "difficulty": "advanced" if len(text) > 12000 else "intermediate",
            "project_type": "prototype",
        },
        "tech_stack": tech,
    }