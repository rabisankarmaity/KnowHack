"""KnowHack microservice (Server 3).

Only the Node backend (Server 2) is allowed to call this service.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import health, mentor, similarity, summarize, weakness

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("knowhack.ai")

settings = get_settings()
app = FastAPI(title=settings.app_name, version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(summarize.router)
app.include_router(similarity.router)
app.include_router(weakness.router)
app.include_router(mentor.router)


@app.on_event("startup")
async def startup_verification() -> None:
    # Config-only log (no network): embedding providers such as `huggingface`
    # would otherwise block process readiness for up to the embed timeout on a
    # cold start. Live subsystem verification happens lazily via /health/detail.
    from app.services.embeddings import embed_model_name
    from app.services.llm import llm_configured
    from app.services.vector_store import store

    settings = get_settings()
    logger.info("AI <-> models: %s", "llm" if llm_configured() else "extractive fallback")
    logger.info(
        "AI <-> embeddings: provider=%s model=%s dim=%d",
        (settings.embedding_provider or "hash").lower(),
        embed_model_name(),
        settings.embedding_dim,
    )
    logger.info("AI <-> vector store: %s (%d indexed)", "ok" if store.healthy() else "FAILED", len(store.items))


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled AI error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "AI service error"})