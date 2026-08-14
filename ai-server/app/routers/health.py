from fastapi import APIRouter

from app.config import get_settings
from app.schemas import HealthLivenessResponse, HealthResponse
from app.services.embeddings import embed_model_name, embed_text
from app.services.llm import llm_configured, probe_llm
from app.services.vector_store import store

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthLivenessResponse)
async def health_liveness() -> HealthLivenessResponse:
    """Liveness probe — the ONLY endpoint the browser may call directly.

    Waits for nothing: no LLM probe, no embeddings, no vector-store I/O, no
    auth. Kept intentionally cheap so the browser can wake a sleeping Render
    instance in parallel with the backend's own warm-up, and so Render's
    ``healthCheckPath`` never stalls on a slow provider call.
    """
    settings = get_settings()
    return HealthLivenessResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.environment,
    )


@router.get("/health/detail", response_model=HealthResponse)
async def health_detail() -> HealthResponse:
    """Deep readiness probe used by the Node backend's ``/api/v1/health``.

    Runs the real LLM probe, an embedding call and the vector-store check so
    operators see exactly which AI subsystem is degraded. This is heavier, so it
    should never be used as a wake-up or Render health-check target.
    """
    settings = get_settings()

    llm = await probe_llm()
    emb_vec = await embed_text("healthcheck")
    emb_ok = len(emb_vec) == settings.embedding_dim
    vs_ok = store.healthy()

    checks = {
        "models": {
            "ok": llm["available"],
            "engine": "llm" if llm["available"] else "fallback",
            "model": settings.llm_model if llm["configured"] else "extractive-v1",
            "provider": settings.provider if llm["configured"] else "none",
            "llm_configured": llm["configured"],
            "available": llm["available"],
            "base_url": settings.resolved_base_url or None,
            "json_mode": settings.llm_json_mode,
        },
        "embeddings": {
            "ok": emb_ok,
            "provider": (settings.embedding_provider or "hash").strip().lower(),
            "model": embed_model_name(),
            "dim": settings.embedding_dim,
            "available": emb_ok,
        },
        "vector_store": {"ok": vs_ok, "available": vs_ok, "indexed": len(store.items)},
    }

    if emb_ok and vs_ok and llm["available"]:
        status = "healthy"
    elif emb_ok and vs_ok:
        # LLM down/unconfigured: the extractive + hash paths still work.
        status = "degraded"
    else:
        status = "unavailable"

    return HealthResponse(
        status=status,
        service=settings.app_name,
        environment=settings.environment,
        checks=checks,
    )