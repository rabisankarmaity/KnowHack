"""Right-Way-of-Thinking AI Mentor (System 2).

A grounded reasoning mentor, not a chatbot. It retrieves the most relevant
section-aware Case File chunks (RAG), then teaches the student *how* to think:
why the decision matters, what to consider, alternatives and trade-offs, a
recommended direction, the next action and a follow-up question.

It never answers project questions from generic knowledge when relevant Case
File content is available, never invents undocumented details, and never
encourages copying. If the LLM is unavailable it still returns a grounded
(extractive) reasoning guide built from the retrieved chunks.
"""
import json
import logging

from app.config import get_settings
from app.prompts.loader import load_prompt
from app.services import llm, vector_store
from app.services.embeddings import embed_text

logger = logging.getLogger(__name__)

PROMPT = load_prompt("thinking_mentor.txt")

SCHEMA_HINT = {
    "understanding": "",
    "decision": "",
    "considerations": [],
    "evidence": [{"project_id": "", "title": "", "section": "", "text": ""}],
    "alternatives": [{"option": "", "trade_off": ""}],
    "tradeoffs": [],
    "recommendation": "",
    "next_actions": [],
    "follow_up_question": "",
    "response": "Complete mentor answer in Markdown",
    "grounded": True,
}


async def retrieve_context(question: str, *, allow: set[str] | None = None, exclude: str | None = None) -> list[dict]:
    """Semantic retrieval over section-aware chunks with visibility allow-list."""
    settings = get_settings()
    query_embedding = await embed_text(question)
    hits = vector_store.store.search_sections(
        query_embedding,
        limit=settings.rag_top_k,
        exclude=exclude,
        allow=allow,
    )
    return [h for h in hits if h.get("text")]


def _merge_project_context(project_context: dict[str, str] | None, hits: list[dict]) -> list[dict]:
    """Add the specific project's own sections to the evidence pool (label them)."""
    if not project_context:
        return hits
    combined = list(hits)
    for section, text in project_context.items():
        text = (text or "").strip()
        if not text:
            continue
        combined.append(
            {
                "project_id": "current-project",
                "title": "this project",
                "section": section,
                "text": text,
                "score": 1.0,
            }
        )
    return combined


def _context_block(evidence: list[dict]) -> str:
    parts = []
    for i, ev in enumerate(evidence, start=1):
        source = f"{ev.get('title') or ev.get('project_id')} / {ev.get('section') or 'section'}"
        parts.append(f"[{i}] Source: {source}\n{ev.get('text')}")
    return "\n\n".join(parts)


async def answer_question(
    question: str,
    *,
    project_context: dict[str, str] | None = None,
    allow: set[str] | None = None,
    exclude: str | None = None,
) -> dict:
    """Returns the mentor response dict (always structured)."""
    hits = await retrieve_context(question, allow=allow, exclude=exclude)
    evidence = _merge_project_context(project_context, hits)

    settings = get_settings()
    context_text = _context_block(evidence)
    if len(context_text) > settings.max_context_chars:
        context_text = context_text[: settings.max_context_chars]

    if llm.llm_configured():
        try:
            data = await llm.chat_json(
                PROMPT,
                _build_prompt(question, context_text),
                SCHEMA_HINT,
            )
            out = _normalise(data, evidence)
            out["engine"] = "llm"
            return out
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM mentor failed, using extractive guidance: %s", exc)
    out = _fallback_guidance(question, evidence)
    out["engine"] = "fallback"
    return out


def _build_prompt(question: str, context_text: str) -> str:
    payload = {
        "question": question,
        "retrieved_case_file_context": context_text or "NO RETRIEVED CONTEXT — answer educationally and state that nothing project-specific was found.",
    }
    return f"Mentor request:\n{json.dumps(payload, indent=2, ensure_ascii=False)}"


def _normalise(data: dict, evidence: list[dict]) -> dict:
    ev_list = data.get("evidence")
    if not isinstance(ev_list, list):
        ev_list = [{"project_id": "current-project", "title": "", "section": "", "text": ""}]
    grounded = bool(evidence) or any(ev.get("text") for ev in ev_list if isinstance(ev, dict))
    return {
        "understanding": str(data.get("understanding") or ""),
        "decision": str(data.get("decision") or ""),
        "considerations": [str(x) for x in (data.get("considerations") or []) if x],
        "evidence": [
            {
                "project_id": str(ev.get("project_id") or ""),
                "title": str(ev.get("title") or ""),
                "section": str(ev.get("section") or ""),
                "text": str(ev.get("text") or ""),
            }
            for ev in ev_list
            if isinstance(ev, dict)
        ][:8],
        "alternatives": [
            {"option": str(x.get("option") or ""), "trade_off": str(x.get("trade_off") or "")}
            for x in (data.get("alternatives") or [])
            if isinstance(x, dict)
        ][:8],
        "tradeoffs": [str(x) for x in (data.get("tradeoffs") or []) if x],
        "recommendation": str(data.get("recommendation") or ""),
        "next_actions": [str(x) for x in (data.get("next_actions") or []) if x],
        "follow_up_question": str(data.get("follow_up_question") or ""),
        "response": str(data.get("response") or ""),
        "grounded": grounded,
        "sources": [{"project_id": e.get("project_id"), "title": e.get("title"), "section": e.get("section")} for e in evidence],
    }


def _fallback_guidance(question: str, evidence: list[dict]) -> dict:
    """Deterministic, grounded reasoning guide — no LLM required."""
    sections = []
    source_lines = []
    for ev in evidence:
        label = f"{ev.get('title') or ev.get('project_id')} · {ev.get('section')}"
        source_lines.append(f"- {label}: {ev.get('text')}")
        if ev.get("section") and ev["section"] not in sections:
            sections.append(ev["section"])

    grounded = bool(evidence)
    considerations = [
        "What core problem are you solving, and for whom?",
        "What is the smallest demo that proves the value to a judge?",
        "What does your existing Case File actually document, versus assume?",
        "What is the riskiest assumption, and how would you test it cheaply?",
        "How much time is left, and what is the cost of each unbuilt feature?",
    ]
    if grounded:
        considerations = [
            f"Consider the documented material under: {', '.join(sections[:6])}.",
            "Check whether your question is already answered by evidence in these Case File sections.",
            "Identify gaps: anything you assumed but did not document is a risk to your case file.",
            "Compare alternatives against what this Case File actually built, not generic best practice.",
        ]

    if not grounded:
        response = (
            f"I could not find relevant Case File content to ground an answer to: “{question}”.\n\n"
            "Before deciding, think through:\n"
            + "\n".join(f"- {c}" for c in considerations)
            + "\n\nSearch the KnowHack Case Files for prior work on this topic and document your own reasoning "
            "in the Case File so future students can learn from it."
        )
    else:
        body = "\n".join(f"- {c}" for c in considerations)
        response = (
            f"Let’s reason about “{question}” using what is actually documented in the Case File.\n\n"
            "Considerations:\n"
            f"{body}\n\n"
            "Evidence found in the Case File:\n"
            + "\n".join(source_lines)
            + "\n\nThis is an extractive answer produced without a live model — treat it as a structured "
            "starting point and verify against the full Case File."
        )

    return {
        "understanding": question,
        "decision": "Clarify the decision behind this question.",
        "considerations": considerations,
        "evidence": [
            {"project_id": e.get("project_id") or "", "title": e.get("title") or "", "section": e.get("section") or "", "text": e.get("text") or ""}
            for e in evidence
        ][:8],
        "alternatives": [
            {"option": "Build the minimum that proves the core risk", "trade_off": "Less headline surface, but a finished demo."},
            {"option": "Build the wide feature set", "trade_off": "More impressive, but high risk of an unfinished demo."},
        ],
        "tradeoffs": ["Time, scope and demo quality trade off directly against each other in a hackathon."],
        "recommendation": "Choose the smallest solution that proves your riskiest assumption, then document the reasoning.",
        "next_actions": [
            "List your documented sections and the gaps you found above.",
            "Rewrite the decision as a question with two explicit alternatives.",
            "Update the Case File with the reasoning so the knowledge base grows.",
        ],
        "follow_up_question": "What is the single riskiest assumption in your project right now, and how would you test it in the next hour?",
        "response": response,
        "grounded": grounded,
        "sources": [{"project_id": e.get("project_id"), "title": e.get("title"), "section": e.get("section")} for e in evidence],
    }