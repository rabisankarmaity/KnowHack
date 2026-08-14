"""Runtime configuration for the KnowHack service (env-driven, no hard-coded URLs)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Default base URL per provider, used when LLM_BASE_URL is left empty.
PROVIDER_DEFAULT_BASE_URLS: dict[str, str] = {
    "huggingface": "https://router.huggingface.co/v1",
    "openai": "https://api.openai.com/v1",
}

# Default weighted signals used by the Similar/Duplicate engine when
# SIMILARITY_WEIGHTS is not set. Overridable per deployment via env.
DEFAULT_WEIGHTS: dict[str, float] = {
    "problem": 0.25,
    "architecture": 0.15,
    "technology": 0.20,
    "features": 0.15,
    "research": 0.10,
    "documentation": 0.15,
}

# Canonical Case File sections (snake_case) that the AI understands.
SECTION_ORDER: list[str] = [
    "overview",
    "problem",
    "target_users",
    "research",
    "validation",
    "existing_solutions",
    "solution",
    "features",
    "architecture",
    "database",
    "technology",
    "apis",
    "uiux",
    "journey",
    "presentation",
    "business_model",
    "judge_feedback",
    "lessons",
    "future_scope",
    "team",
]

# Which sections contribute to each similarity signal.
SIGNAL_SECTIONS: dict[str, list[str]] = {
    "problem": ["problem", "target_users", "existing_solutions"],
    "architecture": ["architecture", "database", "apis"],
    "technology": ["technology"],
    "features": ["features", "solution"],
    "research": ["research", "validation"],
    "documentation": ["presentation", "journey", "lessons", "future_scope", "business_model", "overview"],
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "KnowHack Service"
    environment: str = "development"
    port: int = 8000

    # Comma separated origins. Only the Node backend should ever call this service.
    allowed_origins: str = ""
    # Shared secret required in the `x-api-key` header. Empty disables the check (dev only).
    ai_api_key: str = ""

    # LLM provider (OpenAI-compatible chat completions). When unset the service uses a
    # deterministic extractive fallback so the platform keeps working without an LLM key.
    # Supported values: "huggingface" (default), "openai", "custom" — all speak the same
    # OpenAI-compatible wire format, the provider only changes defaults/labels.
    llm_provider: str = "huggingface"
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 60.0
    # json_object response_format support: "auto" (send only when the provider is known
    # to support it), "on" (always send), "off" (never send — prompt-only JSON).
    llm_json_mode: str = "auto"

    embedding_dim: int = 384
    max_download_mb: int = 25
    vector_store_path: str = "./data/vector_store.json"

    # Embeddings. `hash` (default) is deterministic and always available with no
    # network. `huggingface` calls the Hugging Face Inference Providers embedding
    # endpoint when EMBEDDING_API_KEY / LLM_API_KEY is configured, and gracefully
    # falls back to `hash` whenever the provider is unreachable.
    embedding_provider: str = "hash"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_api_key: str = ""
    embedding_timeout_seconds: float = 30.0

    # Section-aware similarity weighting (JSON map). Any missing signal falls back
    # to the DEFAULT_WEIGHTS below; weights are re-normalised whenever a signal
    # cannot be computed (e.g. a section is missing on one side).
    similarity_weights: str = ""

    # Mentor / RAG tuning.
    max_context_chars: int = 12000
    rag_top_k: int = 6
    llm_probe_max_tokens: int = 4

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def provider(self) -> str:
        return (self.llm_provider or "custom").strip().lower()

    @property
    def resolved_base_url(self) -> str:
        base = self.llm_base_url.strip() or PROVIDER_DEFAULT_BASE_URLS.get(self.provider, "")
        return base.rstrip("/")

    @property
    def resolved_embedding_api_key(self) -> str:
        return self.embedding_api_key.strip() or self.llm_api_key.strip()

    @property
    def resolved_similarity_weights(self) -> dict[str, float]:
        raw = (self.similarity_weights or "").strip()
        if raw:
            try:
                import json as _json

                parsed = _json.loads(raw)
                if isinstance(parsed, dict):
                    cleaned = {
                        str(k): max(0.0, float(v))
                        for k, v in parsed.items()
                        if isinstance(v, (int, float)) and float(v) > 0
                    }
                    if cleaned:
                        return cleaned
            except (ValueError, TypeError):
                pass
        return dict(DEFAULT_WEIGHTS)


@lru_cache
def get_settings() -> Settings:
    return Settings()