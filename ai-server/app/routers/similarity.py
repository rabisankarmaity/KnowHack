from fastapi import APIRouter, Depends, HTTPException

from app.config import get_settings
from app.schemas import (
    EmbeddingsRequest,
    EmbeddingsResponse,
    IndexedProject,
    SimilarityRequest,
    SimilarityResponse,
    SimilarityResult,
)
from app.security import require_api_key
from app.services.embeddings import embed_text, embed_texts
from app.services.similarity_engine import compare, signals_for_plain_text, weighted_overall, classify
from app.services.vector_store import store

router = APIRouter(tags=["ai"], dependencies=[Depends(require_api_key)])


@router.post("/similarity", response_model=SimilarityResponse)
async def similarity(payload: SimilarityRequest) -> SimilarityResponse:
    allow = set(payload.visible_project_ids) if payload.visible_project_ids else None

    if payload.text:
        # Free-text query: compare against the whole-project vector of each item.
        query_embedding = await embed_text(payload.text)
        results: list[SimilarityResult] = []
        for pid, item in store.items.items():
            if allow is not None and pid not in allow:
                continue
            vectors = item.get("vectors") or {}
            scores = signals_for_plain_text(query_embedding, vectors)
            overall, weights = weighted_overall(scores)
            if overall <= 0:
                continue
            similarity_score = round(overall * 100, 1)
            results.append(
                SimilarityResult(
                    project_id=pid,
                    title=item.get("title"),
                    score=round(overall, 4),
                    similarity_score=similarity_score,
                    relationship=classify(similarity_score),
                    signals={k: (round(v, 4) if v is not None else 0.0) for k, v in scores.items()},
                    weights=weights,
                    human_review_required=False,
                )
            )
        results.sort(key=lambda r: r.score, reverse=True)
        return SimilarityResponse(results=results[: payload.limit])

    if payload.project_id:
        item = store.get(payload.project_id)
        if not item:
            raise HTTPException(status_code=404, detail="Project is not indexed yet")
        vectors = item.get("vectors") or {}
        sections = item.get("sections") or {}
        found = await compare(
            payload.project_id,
            item.get("title"),
            sections,
            vectors,
            limit=payload.limit,
            allow=allow,
            include_analysis=payload.include_analysis,
        )
        return SimilarityResponse(results=[SimilarityResult(**r) for r in found])

    raise HTTPException(status_code=422, detail="Provide projectId or text")


@router.post("/embeddings", response_model=EmbeddingsResponse)
async def embeddings(payload: EmbeddingsRequest) -> EmbeddingsResponse:
    vectors = await embed_texts(payload.inputs)
    from app.services.embeddings import embed_model_name

    return EmbeddingsResponse(model=embed_model_name(), dim=get_settings().embedding_dim, embeddings=vectors)


@router.get("/projects", response_model=list[IndexedProject])
async def indexed_projects() -> list[IndexedProject]:
    return [IndexedProject(**p) for p in store.list_projects()]