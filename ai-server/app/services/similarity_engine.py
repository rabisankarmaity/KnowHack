"""Similar / Duplicate Project Engine (System 3).

Compares a project's section-aware vectors against the vector store using
weighted semantic signals (problem, architecture, technology, features,
research, documentation), classifies the relationship, and produces a safe,
evidence-based explanation. High overlap is flagged as a *potential duplicate*
for human review — never as plagiarism.
"""
import json
import logging

from app.config import SIGNAL_SECTIONS, get_settings
from app.services.embeddings import cosine
from app.services import llm
from app.prompts.loader import load_prompt

logger = logging.getLogger(__name__)

RELATIONSHIP_BANDS: list[tuple[float, float, str]] = [
    (0.0, 30.0, "unrelated"),
    (30.0, 55.0, "related"),
    (55.0, 75.0, "similar"),
    (75.0, 90.0, "highly_similar"),
    (90.0, 100.01, "potential_duplicate"),
]


def classify(similarity_score: float) -> str:
    """Map a 0-100 similarity score to a relationship label."""
    for lo, hi, label in RELATIONSHIP_BANDS:
        if lo <= similarity_score < hi:
            return label
    return "unrelated"


def signal_scores(candidate: dict[str, list[float]], other: dict[str, list[float]]) -> dict[str, float | None]:
    """Cosine per signal (mean over the sections both projects have)."""
    out: dict[str, float | None] = {}
    for signal, sections in SIGNAL_SECTIONS.items():
        scores = []
        for section in sections:
            a = candidate.get(section)
            b = other.get(section)
            if not a or not b:
                continue
            scores.append(max(0.0, cosine(a, b)))
        out[signal] = (sum(scores) / len(scores)) if scores else None
    return out


def weighted_overall(scores: dict[str, float | None]) -> tuple[float, dict[str, float]]:
    """Weighted mean of the available signals, weights re-normalised when some
    signals cannot be computed. Returns (overall 0..1, used_weights)."""
    weights = get_settings().resolved_similarity_weights
    available = {k: v for k, v in scores.items() if v is not None and k in weights}
    if not available:
        return 0.0, {}
    used = {k: weights[k] for k in available}
    total = sum(used.values()) or 1.0
    overall = sum(available[k] * used[k] for k in available) / total
    return overall, {k: round(w / total, 4) for k, w in used.items()}


def _overlapping(scores: dict[str, float | None]) -> list[str]:
    return [k for k, v in scores.items() if v is not None and v >= 0.55]


def _differing(scores: dict[str, float | None]) -> list[str]:
    return [k for k, v in scores.items() if v is not None and v < 0.35]


def _deterministic_explanation(
    a_title: str,
    b_title: str,
    overall: float,
    relationship: str,
    scores: dict[str, float | None],
) -> str:
    strong = [k.replace("_", " ") for k, v in scores.items() if v is not None and v >= 0.55]
    weak = [k.replace("_", " ") for k, v in scores.items() if v is not None and v < 0.35]
    if relationship == "potential_duplicate":
        lead = f"'{a_title}' and '{b_title}' overlap very heavily (similarity {round(overall * 100)}%)."
    elif relationship == "highly_similar":
        lead = f"'{a_title}' and '{b_title}' are highly similar (similarity {round(overall * 100)}%)."
    elif relationship == "similar":
        lead = f"'{a_title}' and '{b_title}' share a similar approach (similarity {round(overall * 100)}%)."
    elif relationship == "related":
        lead = f"'{a_title}' and '{b_title}' are related but substantially different (similarity {round(overall * 100)}%)."
    else:
        lead = f"'{a_title}' and '{b_title}' are largely unrelated (similarity {round(overall * 100)}%)."
    parts = [lead]
    if strong:
        parts.append("Overlapping areas: " + ", ".join(strong) + ".")
    if weak:
        parts.append("Appears different in: " + ", ".join(weak) + ".")
    if relationship == "potential_duplicate":
        parts.append("This is flagged for human review — a shared problem or a shared template is not proof of copying.")
    elif relationship in ("similar", "highly_similar"):
        parts.append("High similarity reflects a shared problem/solution-space; check whether the implementation genuinely differs.")
    return " ".join(parts)


async def explain(a_title: str, a_sections: dict[str, str], b_title: str, b_sections: dict[str, str],
                  scores: dict[str, float | None], overall: float, relationship: str) -> dict:
    """Use the LLM to write the narrative when available, else deterministic."""
    comparison = {
        "project_a": {"title": a_title, "sections": a_sections},
        "project_b": {"title": b_title, "sections": b_sections},
        "signal_scores": {k: (round(v, 3) if v is not None else None) for k, v in scores.items()},
        "overall_score": round(overall * 100, 1),
        "relationship": relationship,
    }
    if llm.llm_configured():
        try:
            data = await llm.chat_json(
                load_prompt("similarity_analysis.txt"),
                f"Compare these two projects:\n{json.dumps(comparison, indent=2)}",
                {
                    "explanation": "",
                    "overlapping_sections": [],
                    "differences": [],
                    "recommendation": "",
                    "risk": "low|medium|high",
                },
            )
            if isinstance(data, dict):
                return data
        except Exception as exc:  # noqa: BLE001 - never fail on narrative
            logger.warning("LLM similarity narrative failed, using deterministic: %s", exc)
    differences = list(_differing(scores))
    return {
        "explanation": _deterministic_explanation(a_title, b_title, overall, relationship, scores),
        "overlapping_sections": _overlapping(scores),
        "differences": differences,
        "recommendation": (
            "Review this case file before submitting/publishing to ensure it is not an accidental near-copy."
            if relationship == "potential_duplicate"
            else "Use this project as reference material and differentiate your solution explicitly."
        ),
        "risk": "high" if relationship == "potential_duplicate" else ("medium" if relationship in ("highly_similar", "similar") else "low"),
    }


async def compare(
    candidate_id: str,
    candidate_title: str | None,
    candidate_sections: dict[str, str],
    candidate_vectors: dict[str, list[float]],
    *,
    limit: int = 5,
    allow: set[str] | None = None,
    include_analysis: bool = True,
) -> list[dict]:
    """Compare a project against every stored project and return ranked results."""
    from app.services import vector_store

    settings = get_settings()
    weights = settings.resolved_similarity_weights
    results: list[dict] = []
    for pid, item in vector_store.store.items.items():
        if pid == candidate_id:
            continue
        if allow is not None and pid not in allow:
            continue
        other_vectors = item.get("vectors") or {}
        scores = signal_scores(candidate_vectors, other_vectors)
        overall, used = weighted_overall(scores)
        if overall <= 0:
            continue
        result = {
            "project_id": pid,
            "title": item.get("title"),
            "score": round(overall, 4),
            "similarity_score": round(overall * 100, 1),
            "relationship": classify(round(overall * 100, 1)),
            "signals": {k: (round(v, 4) if v is not None else 0.0) for k, v in scores.items()},
            "weights": used or weights,
        }
        if include_analysis:
            narrative = await _narrative(
                candidate_title or candidate_id,
                candidate_sections,
                item.get("title") or pid,
                item.get("sections") or {},
                scores,
                overall,
                result["relationship"],
            )
            result.update(
                {
                    "explanation": narrative.get("explanation", ""),
                    "overlapping_sections": narrative.get("overlapping_sections", _overlapping(scores)),
                    "differences": narrative.get("differences", _differing(scores)),
                    "recommendation": narrative.get("recommendation", ""),
                    "risk": narrative.get("risk", "low"),
                    "human_review_required": result["relationship"] == "potential_duplicate",
                }
            )
        results.append(result)
    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:limit]


async def _narrative(
    a_title: str,
    a_sections: dict[str, str],
    b_title: str,
    b_sections: dict[str, str],
    scores: dict[str, float | None],
    overall: float,
    relationship: str,
) -> dict:
    try:
        return await explain(a_title, a_sections, b_title, b_sections, scores, overall, relationship)
    except Exception:  # noqa: BLE001 - narrative must never break similarity
        return {
            "explanation": _deterministic_explanation(a_title, b_title, overall, relationship, scores),
            "overlapping_sections": _overlapping(scores),
            "differences": _differing(scores),
            "recommendation": "",
            "risk": "high" if relationship == "potential_duplicate" else ("medium" if relationship in ("highly_similar", "similar") else "low"),
        }


def signals_for_plain_text(query_embedding: list[float], other: dict[str, list[float]]) -> dict[str, float | None]:
    """Single-vector signal fallback for free-text queries."""
    out: dict[str, float | None] = {}
    for signal, sections in SIGNAL_SECTIONS.items():
        scores = []
        for section in sections:
            vec = other.get(section)
            if not vec:
                continue
            scores.append(max(0.0, cosine(query_embedding, vec)))
        out[signal] = (sum(scores) / len(scores)) if scores else None
    return out