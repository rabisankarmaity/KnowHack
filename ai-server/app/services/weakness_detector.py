"""Project Weakness / Mistake Detector (System 1).

Analyzes a structured KnowHack Case File and returns actionable, evidence-based
findings across the 21 KnowHack review categories. Uses the configured LLM for a
nuanced reading and degrades to a deterministic rule-based detector whenever the
LLM is unavailable — it never invents facts, metrics, or user research.
"""
import json
import logging

from app.config import get_settings
from app.prompts.loader import load_prompt
from app.services import llm

logger = logging.getLogger(__name__)

PROMPT = load_prompt("weakness_detector.txt")

SCHEMA_HINT = {
    "overall_score": 0,
    "severity": "low|medium|high|critical",
    "summary": "",
    "strengths": [],
    "weaknesses": [
        {
            "category": "validation",
            "severity": "high",
            "title": "Weak user validation",
            "evidence": "quote from the case file or 'Not documented'",
            "why_it_matters": "explain the impact",
            "recommended_action": "what to do",
            "priority": "high",
        }
    ],
    "missing_sections": [],
    "scope_risks": [],
    "technical_risks": [],
    "security_risks": [],
    "business_risks": [],
    "quick_fixes": [],
    "before_submission": [],
}

SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def _has(text: str | None) -> bool:
    return bool(text and text.strip())


def _evidence(text: str | None) -> str:
    if not _has(text):
        return "Not documented"
    snippet = " ".join(text.strip().split())
    return snippet[:180] + ("…" if len(snippet) > 180 else "")


async def analyze_weakness(case_file: dict, meta: dict | None = None) -> tuple[dict, str, str]:
    """Returns (payload, model, engine) — engine is `llm` or `fallback`."""
    if llm.llm_configured():
        try:
            payload = await llm.chat_json(
                PROMPT,
                _build_prompt(case_file, meta),
                SCHEMA_HINT,
            )
            return _enforce_schema(payload), get_settings().llm_model, "llm"
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM weakness analysis failed, using fallback: %s", exc)
    return fallback_weakness(case_file, meta), "rule-based-v1", "fallback"


def _build_prompt(case_file: dict, meta: dict | None) -> str:
    meta = meta or {}
    info = {
        "title": meta.get("title"),
        "team_size": meta.get("team_size"),
        "hackathon_duration_hours": meta.get("hackathon_duration_hours"),
        "hackathon_name": meta.get("hackathon_name"),
        "year": meta.get("year"),
        "case_file": case_file,
    }
    return f"Case File to analyze:\n{json.dumps(info, indent=2, ensure_ascii=False)}"


def _enforce_schema(payload: dict) -> dict:
    """Coerce arbitrary LLM output into the canonical shape so clients can trust it."""
    out = {
        "overall_score": max(0, min(100, int(payload.get("overall_score", 0)) if isinstance(payload.get("overall_score"), (int, float)) else 0)),
        "severity": payload.get("severity") if payload.get("severity") in ("low", "medium", "high", "critical") else "medium",
        "summary": str(payload.get("summary", "") or ""),
        "strengths": _as_list(payload.get("strengths")),
        "weaknesses": [],
        "missing_sections": _as_list(payload.get("missing_sections")),
        "scope_risks": _as_list(payload.get("scope_risks")),
        "technical_risks": _as_list(payload.get("technical_risks")),
        "security_risks": _as_list(payload.get("security_risks")),
        "business_risks": _as_list(payload.get("business_risks")),
        "quick_fixes": _as_list(payload.get("quick_fixes")),
        "before_submission": _as_list(payload.get("before_submission")),
    }
    for w in payload.get("weaknesses") or []:
        if not isinstance(w, dict):
            continue
        out["weaknesses"].append(
            {
                "category": str(w.get("category") or "general"),
                "severity": w.get("severity") if w.get("severity") in SEVERITY_RANK else "medium",
                "title": str(w.get("title") or "Undocumented issue"),
                "evidence": str(w.get("evidence") or "Not documented"),
                "why_it_matters": str(w.get("why_it_matters") or ""),
                "recommended_action": str(w.get("recommended_action") or ""),
                "priority": w.get("priority") if w.get("priority") in SEVERITY_RANK else "medium",
            }
        )
    return out


def _as_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value if v]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


# ---------------------------------------------------------------------------
# Deterministic fallback detector (works with zero LLM dependencies).
# ---------------------------------------------------------------------------

def fallback_weakness(case_file: dict, meta: dict | None = None) -> dict:
    meta = meta or {}
    weaknesses: list[dict] = []
    missing: list[str] = []
    technical: list[str] = []
    security: list[str] = []
    business: list[str] = []
    scope: list[str] = []
    quick: list[str] = []
    strengths: list[str] = []

    title = meta.get("title") or "This case file"
    duration = meta.get("hackathon_duration_hours")

    def section(*keys: str) -> str | None:
        for k in keys:
            v = case_file.get(k)
            if _has(v):
                return str(v)
        return None

    def add(category: str, title_: str, keys: list[str], why: str, fix: str, severity: str = "high") -> None:
        evidence = _evidence(section(*keys))
        weaknesses.append(
            {
                "category": category,
                "severity": severity,
                "title": title_,
                "evidence": evidence,
                "why_it_matters": why,
                "recommended_action": fix,
                "priority": severity,
            }
        )

    # Problem validation.
    if not section("problem"):
        add("problem clarity", "No problem statement is documented", ["problem"], "Judges cannot understand what problem the project solves or who it helps.", "Write a clear problem overview, who it affects, and why it matters.", "critical")
        missing.append("problem")
    else:
        strengths.append("Problem statement is documented.")
        if not section("target_users"):
            add("target user clarity", "Target users are not documented", ["target_users"], "Without a defined audience, validation and feature prioritisation have no anchor.", "Describe the primary users and their context.")
        if not section("validation") and not section("research"):
            add("problem validation", "No user research or validation evidence", ["validation", "research"], "There is no evidence the problem is real or that users care; this is the most common judging criticism.", "Add interviews, surveys, or market observations — even a few counts as evidence.", "critical")
            missing.append("validation")

    if section("problem") and (section("validation") or section("research")):
        strengths.append("Problem is backed by research/validation.")

    if not section("existing_solutions"):
        add("existing-solution analysis", "No existing-solution analysis", ["existing_solutions"], "Without competitors, judges cannot see why this project is different or needed.", "List at least 2-3 existing solutions with their limitations and your differentiation.")
        missing.append("existing_solutions")
    else:
        strengths.append("Existing solutions are analysed.")

    # Solution & scope.
    solution = section("solution")
    features = section("features")
    feature_count = 0
    if not solution and not features:
        add("solution quality", "No solution or features are documented", ["solution", "features"], "The case file describes a problem but not what was actually built.", "Describe the solution and list the features that were built.", "critical")
        missing.append("solution")
    if _has(features):
        feature_count = len([f for f in str(features).replace("\n", ", ").split(", ") if f.strip()])
        if feature_count > 12:
            add("feature scope", f"Feature list is very large ({feature_count} features)", ["features"], "A large feature set typically means an over-scoped MVP that cannot be finished well in a hackathon.", "Cut to the top 3 must-have features that prove the core value.", "high")
            scope.append(f"There are many documented features; confirm the MVP genuinely delivers the must-haves in the available time.")
        if feature_count >= 5:
            quick.append("Verify each feature maps to a must-have that ships in the demo.")

    # Architecture / technical.
    arch = section("architecture")
    db = section("database")
    tech = section("technology")
    apis = section("apis")
    if not arch and not section("overview"):
        add("architecture quality", "System architecture is not documented", ["architecture", "overview"], "Judges cannot evaluate technical design or how the system fits together.", "Document the system architecture: components and the data flow between them.", "critical")
        missing.append("architecture")
    elif arch:
        strengths.append("Architecture is documented.")
    if not db:
        add("database design", "Database design is not documented", ["database"], "Without a data model, data handling, limits and scale story are unverifiable.", "Document the database type and key collections/tables.")
        missing.append("database")
    if not tech:
        add("technology choices", "Technology stack is not documented", ["technology"], "The tech stack is a core evaluation axis for hackathon case files.", "List the languages, frameworks and tools used.")
        missing.append("technology")
    if not apis:
        technical.append("No API/integration details documented; external integrations and costs are unverifiable.")

    # Security.
    security_text = section("security")
    if not security_text:
        security.append("No security plan is documented — authentication, secret handling, and input validation are unknown risks.")

    # UI/UX & presentation.
    if not section("uiux"):
        add("UI/UX", "User experience is not documented", ["uiux"], "Product quality and usability cannot be assessed.", "Describe the user flow and UI conventions used.")
    if not section("presentation") and not section("business_model"):
        add("presentation readiness", "Presentation / pitch material is not documented", ["presentation", "business_model"], "The case file has no story of how the project would be presented or how it would sustain itself.", "Document the pitch narrative and the business model if applicable.")
        missing.append("presentation")

    # Business model.
    if not section("business_model"):
        business.append("No business model is documented; sustainability and go-to-market thinking are absent.")

    # Judge feedback, lessons, future scope.
    if not section("judge_feedback"):
        technical.append("No judge feedback recorded; missed learning signal for the knowledge base.")
    if not section("lessons"):
        quick.append("Add a short lessons-learned section — it supplies the educational value of the Case File.")
    if not section("future_scope"):
        quick.append("Document future scope to show the project has a roadmap beyond the hackathon.")

    # Duration feasibility.
    if duration:
        if feature_count > 12 and duration and duration <= 48:
            scope.append(f"With {duration} hours and {feature_count} features, the MVP risks being unfinished.")
            add("hackathon time feasibility", f"Feature scope may exceed {duration}h window", ["features"], "Building and polishing 12+ features inside a hackathon usually leaves the core demo half-finished.", "Pick 3 core features and cut or defer the rest.", "high")

    if not case_file:
        add("documentation quality", "Case File is empty", [], "There is no content to evaluate at all.", "Fill in the Case File sections before running this analysis.", "critical")

    missing = list(dict.fromkeys(missing))
    strengths = list(dict.fromkeys(strengths))
    weaknesses.sort(key=lambda w: SEVERITY_RANK.get(w["severity"], 0), reverse=True)

    complete_ratio = 1.0 - (len(missing) / 18.0)
    penalty = min(55, len(weaknesses) * 6)
    base = max(15, round(complete_ratio * 100))
    overall_score = max(0, min(100, base - penalty))

    worst = max((w["severity"] for w in weaknesses), key=lambda s: SEVERITY_RANK.get(s, 0)) if weaknesses else None
    severity = worst or ("medium" if missing else "low")

    summary_parts = [f"{title} scores {overall_score}/100."]
    if strengths:
        summary_parts.append("Strengths: " + "; ".join(strengths[:3]) + ".")
    if weaknesses:
        summary_parts.append(f"{len(weaknesses)} weaknesses identified (top: {weaknesses[0]['severity']} risk).")
    if missing:
        summary_parts.append("Missing sections: " + ", ".join(missing[:6]) + ".")

    before = [w["recommended_action"] for w in weaknesses if w["priority"] in ("high", "critical")][:5]
    before = list(dict.fromkeys(before))

    return {
        "overall_score": overall_score,
        "severity": severity,
        "summary": " ".join(summary_parts),
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_sections": missing,
        "scope_risks": scope,
        "technical_risks": technical,
        "security_risks": security,
        "business_risks": business,
        "quick_fixes": quick,
        "before_submission": before,
    }