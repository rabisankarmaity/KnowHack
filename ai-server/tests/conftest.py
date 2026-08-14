"""Shared test fixtures for the KnowHack service.

Tests run in full fallback mode (no LLM, no network):
- the deterministic hash embedder is used,
- LLM availability is forced off,
- the vector store points at a temp file,
- API-key auth is disabled.

To test the structured-output LLM path, monkeypatch
``app.services.llm.chat_json`` with a canned dict in the individual test.
"""
import os
import tempfile

TEST_VS = os.path.join(tempfile.gettempdir(), "knowhack_ai_test_vs.json")

os.environ.setdefault("AI_API_KEY", "")
os.environ.setdefault("LLM_API_KEY", "")
os.environ.setdefault("LLM_BASE_URL", "")
os.environ.setdefault("LLM_PROVIDER", "huggingface")
os.environ.setdefault("EMBEDDING_PROVIDER", "hash")
os.environ.setdefault("VECTOR_STORE_PATH", TEST_VS)
os.environ.setdefault("EMBEDDING_DIM", "384")

import pytest

import main as app_main
from app.services import llm, vector_store


@pytest.fixture(autouse=True)
def force_fallback(monkeypatch):
    monkeypatch.setattr(llm, "llm_configured", lambda: False)
    yield


@pytest.fixture(autouse=True)
def fresh_store(monkeypatch):
    monkeypatch.setattr(vector_store.store, "path", TEST_VS)
    monkeypatch.setattr(vector_store.store, "items", {})
    if os.path.exists(TEST_VS):
        try:
            os.remove(TEST_VS)
        except OSError:
            pass
    yield


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    with TestClient(app_main.app) as c:
        yield c


@pytest.fixture
def llm_fake(monkeypatch):
    """Routes all chat_json calls through a canned responder."""

    def _install(responder):
        async def _fake(_, __, ___, **kwargs):
            value = responder() if callable(responder) else responder
            if isinstance(value, Exception):
                raise value
            return value

        monkeypatch.setattr(llm, "chat_json", _fake)
        monkeypatch.setattr(llm, "llm_configured", lambda: True)
        return _fake

    return _install