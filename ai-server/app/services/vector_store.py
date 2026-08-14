"""File-backed vector store with section-aware chunks.

Interface stays minimal so the JSON file can be swapped for pgvector / Qdrant
later without touching routers. Each indexed project stores:

* `embedding`  — the whole-project vector (normalised mean of section vectors).
* `vectors`    — per-section vectors `{ section: [float, ...] }`.
* `sections`   — the raw text per section, used to build RAG context.
* `metadata`   — hackathon / domain / technologies / university / year / visibility.

Visibility is *informational* here: authorization is enforced by the Node
backend, which passes the caller's allow-list of project ids in AI requests.
"""
import json
import os
import threading
from datetime import datetime, timezone

from app.config import get_settings
from app.services.embeddings import cosine

_lock = threading.Lock()

EMPTY_VECTORS: dict[str, list[float]] = {}


def _normalised_mean(vectors: dict[str, list[float]]) -> list[float]:
    if not vectors:
        return []
    dim = len(next(iter(vectors.values())))
    mean = [0.0] * dim
    for vec in vectors.values():
        for i, v in enumerate(vec[:dim]):
            mean[i] += v
    norm = (sum(v * v for v in mean) ** 0.5) or 1.0
    return [v / norm for v in mean]


class VectorStore:
    def __init__(self, path: str):
        self.path = path
        self.items: dict[str, dict] = {}
        self._load()

    def _load(self) -> None:
        if os.path.exists(self.path):
            try:
                with open(self.path, encoding="utf-8") as fh:
                    loaded = json.load(fh)
                self.items = {}
                for pid, item in (loaded or {}).items():
                    if not isinstance(item, dict):
                        continue
                    # Backward compatibility for the old single-vector format:
                    # migrate `embedding` into `vectors`.
                    vectors = item.get("vectors")
                    if not isinstance(vectors, dict) and item.get("embedding"):
                        vectors = {"overview": item["embedding"]}
                    vectors = vectors or {}
                    embedding = item.get("embedding") or _normalised_mean(vectors)
                    self.items[pid] = {
                        "project_id": item.get("project_id", pid),
                        "title": item.get("title"),
                        "sector": item.get("sector"),
                        "embedding": embedding,
                        "vectors": vectors,
                        "sections": item.get("sections", {}),
                        "metadata": item.get("metadata", {}),
                        "updated_at": item.get("updated_at"),
                    }
            except Exception:  # noqa: BLE001 - a corrupt store should never crash the service
                self.items = {}

    def _persist(self) -> None:
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        tmp = f"{self.path}.tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(self.items, fh)
            os.replace(tmp, self.path)
        except Exception:  # noqa: BLE001
            # Read-only filesystem must not break requests; log and move on.
            raise

    def upsert_project(
        self,
        project_id: str,
        *,
        title: str | None,
        sector: str | None,
        vectors: dict[str, list[float]],
        sections: dict[str, str],
        metadata: dict | None = None,
    ) -> str:
        embedding = _normalised_mean(vectors)
        with _lock:
            self.items[project_id] = {
                "project_id": project_id,
                "title": title,
                "sector": sector,
                "embedding": embedding,
                "vectors": vectors,
                "sections": sections,
                "metadata": metadata or {},
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            self._persist()
        return f"vec:{project_id}"

    def upsert(self, project_id: str, embedding: list[float], title: str | None, sector: str | None) -> str:
        """Backward-compatible single-vector upsert (legacy callers)."""
        return self.upsert_project(
            project_id,
            title=title,
            sector=sector,
            vectors={"overview": embedding},
            sections={"overview": ""},
        )

    def get(self, project_id: str) -> dict | None:
        return self.items.get(project_id)

    def search(self, embedding: list[float], limit: int = 5, exclude: str | None = None, allow: set[str] | None = None) -> list[dict]:
        scored = []
        for pid, item in self.items.items():
            if pid == exclude:
                continue
            if allow is not None and pid not in allow:
                continue
            vec = item.get("embedding")
            if not vec:
                continue
            scored.append(
                {
                    "project_id": pid,
                    "title": item.get("title"),
                    "score": round(max(0.0, cosine(embedding, vec)), 4),
                }
            )
        scored.sort(key=lambda r: r["score"], reverse=True)
        return scored[:limit]

    def search_sections(
        self,
        query_embedding: list[float],
        limit: int = 6,
        exclude: str | None = None,
        allow: set[str] | None = None,
    ) -> list[dict]:
        """RAG retrieval: rank individual section chunks across projects."""
        hits: list[dict] = []
        for pid, item in self.items.items():
            if pid == exclude:
                continue
            if allow is not None and pid not in allow:
                continue
            for section, vec in (item.get("vectors") or {}).items():
                if not vec:
                    continue
                text = (item.get("sections") or {}).get(section, "")
                hits.append(
                    {
                        "project_id": pid,
                        "title": item.get("title"),
                        "section": section,
                        "text": text,
                        "score": round(max(0.0, cosine(query_embedding, vec)), 4),
                    }
                )
        hits.sort(key=lambda r: r["score"], reverse=True)
        return hits[:limit]

    def vectors_for(self, project_id: str) -> dict[str, list[float]]:
        item = self.items.get(project_id)
        return (item.get("vectors") or {}) if item else {}

    def list_projects(self) -> list[dict]:
        return [
            {
                "project_id": i["project_id"],
                "title": i.get("title"),
                "sector": i.get("sector"),
                "updated_at": i.get("updated_at"),
            }
            for i in self.items.values()
        ]

    def healthy(self) -> bool:
        try:
            os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
            return True
        except Exception:  # noqa: BLE001
            return False


store = VectorStore(get_settings().vector_store_path)