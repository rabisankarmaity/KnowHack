from fastapi import APIRouter, Depends, HTTPException

from app.schemas import WeaknessAnalysisRequest, WeaknessAnalysisResponse
from app.security import require_api_key
from app.services.weakness_detector import analyze_weakness

router = APIRouter(tags=["ai"], dependencies=[Depends(require_api_key)])


@router.post("/weakness", response_model=WeaknessAnalysisResponse)
async def weakness(payload: WeaknessAnalysisRequest) -> WeaknessAnalysisResponse:
    if not payload.case_file:
        raise HTTPException(status_code=422, detail="caseFile must not be empty")
    data, model, engine = await analyze_weakness(payload.case_file, payload.metadata)
    return WeaknessAnalysisResponse(
        project_id=payload.project_id,
        overall_score=data["overall_score"],
        severity=data["severity"],
        summary=data["summary"],
        strengths=data["strengths"],
        weaknesses=data["weaknesses"],
        missing_sections=data["missing_sections"],
        scope_risks=data["scope_risks"],
        technical_risks=data["technical_risks"],
        security_risks=data["security_risks"],
        business_risks=data["business_risks"],
        quick_fixes=data["quick_fixes"],
        before_submission=data["before_submission"],
        model=model,
        engine=engine,
    )