from fastapi import APIRouter, Depends, HTTPException

from app.config import get_settings
from app.schemas import EvidenceItem, ThinkingMentorRequest, ThinkingMentorResponse
from app.security import require_api_key
from app.services.thinking_mentor import answer_question

router = APIRouter(tags=["ai"], dependencies=[Depends(require_api_key)])


@router.post("/mentor", response_model=ThinkingMentorResponse)
async def mentor(payload: ThinkingMentorRequest) -> ThinkingMentorResponse:
    question = (payload.question or "").strip()
    if len(question) < 2:
        raise HTTPException(status_code=422, detail="question must not be empty")

    allow = set(payload.visible_project_ids) if payload.visible_project_ids else None
    data = await answer_question(
        question,
        project_context=payload.project_context,
        allow=allow,
        exclude=payload.project_id,
    )

    def to_evidence(items) -> list[EvidenceItem]:
        return [
            EvidenceItem(project_id=str(i.get("project_id") or ""), title=i.get("title"), section=i.get("section"), text=i.get("text"))
            for i in (items or [])
        ]

    engine = data.get("engine") or "fallback"
    settings = get_settings()
    return ThinkingMentorResponse(
        project_id=payload.project_id,
        question=question,
        understanding=data["understanding"],
        decision=data["decision"],
        considerations=data["considerations"],
        evidence=to_evidence(data.get("evidence")),
        alternatives=data.get("alternatives") or [],
        tradeoffs=data.get("tradeoffs") or [],
        recommendation=data.get("recommendation") or "",
        next_actions=data.get("next_actions") or [],
        follow_up_question=data.get("follow_up_question") or "",
        response=data["response"],
        grounded=bool(data.get("grounded")),
        sources=to_evidence(data.get("sources")),
        model=settings.llm_model if engine == "llm" else "extractive-v1",
        engine=engine,
    )