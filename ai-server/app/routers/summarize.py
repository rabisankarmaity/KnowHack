import logging

from fastapi import APIRouter, Depends, HTTPException

from app.schemas import (
    CaseFile,
    Metadata,
    SimilarityResult,
    SummarizeRequest,
    SummarizeResponse,
    TechStack,
)
from app.security import require_api_key
from app.services import extract
from app.services.embeddings import embed_text
from app.services.llm import analyze
from app.services.similarity_engine import compare
from app.services.vector_store import store

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai"], dependencies=[Depends(require_api_key)])


async def _embed_sections(sections: dict[str, str]) -> dict[str, list[float]]:
    vectors: dict[str, list[float]] = {}
    for section, text in sections.items():
        text = (text or "").strip()
        if not text:
            continue
        vectors[section] = await embed_text(text)
    return vectors


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(payload: SummarizeRequest) -> SummarizeResponse:
    warnings: list[str] = []
    parts: list[str] = []
    if payload.text:
        parts.append(payload.text)

    for f in payload.files:
        text, warning = await extract.extract_file(f.url, f.name, f.mime_type, f.kind)
        if warning:
            warnings.append(warning)
        if text:
            parts.append(text)

    corpus = "\n\n".join(p for p in parts if p).strip()
    if not corpus:
        raise HTTPException(status_code=422, detail="No readable content found in the provided text or files")

    result, model, engine = await analyze(payload.title, corpus)
    meta = Metadata(**(result.get("metadata") or {}))
    case_file = CaseFile(**(result.get("case_file") or {}))
    tech = TechStack(**(result.get("tech_stack") or {}))

    # Section-aware chunks: prefer the structured sections supplied by the backend,
    # otherwise fall back to a single whole-project vector.
    sections = dict(payload.sections or {})
    if not sections:
        sections = {"overview": f"{payload.title or ''}\n{result.get('summary', '')}\n{corpus[:8000]}"}
    vectors = await _embed_sections(sections)

    similar: list[SimilarityResult] = []
    if vectors:
        found = await compare(
            payload.project_id,
            payload.title,
            sections,
            vectors,
            limit=5,
            include_analysis=False,
        )
        similar = [SimilarityResult(**r) for r in found]

    embedding_ref = None
    if payload.index:
        embedding_ref = store.upsert_project(
            payload.project_id,
            title=payload.title,
            sector=meta.sector,
            vectors=vectors,
            sections=sections,
            metadata=payload.metadata or {},
        )

    return SummarizeResponse(
        project_id=payload.project_id,
        summary=result.get("summary", ""),
        highlights=result.get("highlights", []) or [],
        case_file=case_file,
        metadata=meta,
        tech_stack=tech,
        sector=meta.sector,
        embedding_ref=embedding_ref,
        similar_projects=similar,
        model=model,
        engine=engine,
        warnings=warnings,
    )