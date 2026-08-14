"""Health endpoint tests — liveness plus detailed check structure."""

from app.routers import health as health_router


def test_health_liveness_is_fast_and_always_ok(client):
    """/health is a cheap wake-up probe: 200 with status=ok, no checks block."""
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "service" in body
    assert "environment" in body
    assert "checks" not in body


def test_health_detail_reports_degraded_without_llm(client, monkeypatch):
    async def _fake_probe():
        return {"configured": False, "available": False}

    monkeypatch.setattr(health_router, "probe_llm", _fake_probe)
    res = client.get("/health/detail")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] in ("healthy", "degraded", "unavailable")
    assert body["status"] == "degraded"
    assert body["checks"]["models"]["available"] is False
    assert body["checks"]["embeddings"]["available"] is True
    assert body["checks"]["embeddings"]["dim"] == 384
    assert "vector_store" in body["checks"]


def test_health_detail_healthy_when_llm_probe_ok(client, monkeypatch):
    async def _fake_probe():
        return {"configured": True, "available": True}

    monkeypatch.setattr(health_router, "probe_llm", _fake_probe)
    res = client.get("/health/detail")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"