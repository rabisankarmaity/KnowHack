"""System 3 — Similar / Duplicate Project Engine tests."""

TRIAGE_A_SECTIONS = {
    "overview": "Triage mobile app for busy clinics",
    "problem": "Nurses lose time re-entering triage data into multiple systems",
    "target_users": "Nurses in hospital clinics",
    "solution": "Mobile app that auto-fills triage documentation",
    "features": "one tap export, auto-fill templates",
    "architecture": "React Native frontend, FastAPI backend, PostgreSQL database",
    "technology": "React Native, FastAPI, PostgreSQL, Cloudinary",
    "database": "PostgreSQL patients notes rotations tables",
    "research": "Surveyed 40 student nurses",
}

TRIAGE_B_SECTIONS = {
    "overview": "Triage assistant for emergency clinics",
    "problem": "Staff waste time re-entering triage data into several systems",
    "target_users": "Emergency department nurses",
    "solution": "App that auto-fills triage documentation for staff",
    "features": "one tap export, auto-fill templates",
    "architecture": "React Native frontend, FastAPI backend, PostgreSQL database",
    "technology": "React Native, FastAPI, PostgreSQL, Cloudinary",
    "database": "PostgreSQL patients notes rotations tables",
    "research": "Surveyed student nurses at two hospitals",
}

FARM_SECTIONS = {
    "overview": "Crop monitoring dashboard for small farms",
    "problem": "Farmers cannot predict irrigation needs from weather data",
    "target_users": "Smallholder farmers",
    "solution": "Dashboard with rainfall forecasts and irrigation alerts",
    "features": "weather alerts, irrigation scheduler",
    "architecture": "Flutter frontend, Firebase backend, Cloud Firestore",
    "technology": "Flutter, Firebase, Firestore",
    "database": "Firestore crops fields readings collections",
    "research": "Interviewed 12 farmers",
}


def _summarize(client, pid, title, sections):
    return client.post(
        "/summarize",
        json={
            "projectId": pid,
            "title": title,
            "text": "\n".join(sections.values()),
            "sections": sections,
            "index": True,
            "metadata": {"visibility": "public", "domain": "healthcare"},
        },
    )


def _similar(client, pid, **overrides):
    payload = {"projectId": pid, "limit": 5, "visibleProjectIds": [], "includeAnalysis": True}
    payload.update(overrides)
    return client.post("/similarity", json=payload)


def test_similar_projects_are_ranked_and_classified(client):
    assert _summarize(client, "a", "Triage", TRIAGE_A_SECTIONS).status_code == 200
    assert _summarize(client, "b", "Med Triage", TRIAGE_B_SECTIONS).status_code == 200
    assert _summarize(client, "c", "Farm Monitor", FARM_SECTIONS).status_code == 200

    res = _similar(client, "a")
    assert res.status_code == 200
    results = res.json()["results"]

    by_id = {r["project_id"]: r for r in results}
    assert "b" in by_id, "B (similar triage project) must appear"
    assert "c" in by_id, "C must appear (it is unrelated but still ranked below)"

    b = by_id["b"]
    c = by_id["c"]
    assert b["similarity_score"] > 55, "similar triage projects should score above 55"
    assert b["relationship"] in ("similar", "highly_similar")
    assert b["signals"]["technology"] > 0.7
    assert b["overlapping_sections"], "overlap analysis must be present"
    assert c["similarity_score"] < b["similarity_score"]


def test_near_identical_projects_flag_potential_duplicate(client):
    assert _summarize(client, "a", "Triage", TRIAGE_A_SECTIONS).status_code == 200
    assert _summarize(client, "b", "Triage Clone", TRIAGE_A_SECTIONS).status_code == 200

    res = _similar(client, "a")
    assert res.status_code == 200
    b = next(r for r in res.json()["results"] if r["project_id"] == "b")
    assert b["relationship"] == "potential_duplicate"
    assert b["human_review_required"] is True
    # Safety: never an accusation of plagiarism, only a need for review.
    assert "plagiarism" not in str(b.get("recommendation", "")).lower()


def test_similarity_respects_visibility_allow_list(client):
    assert _summarize(client, "a", "Triage", TRIAGE_A_SECTIONS).status_code == 200
    assert _summarize(client, "b", "Med Triage", TRIAGE_B_SECTIONS).status_code == 200

    # The caller may only see project A -> B must not be returned.
    res = _similar(client, "a", visibleProjectIds=["a"], includeAnalysis=False)
    assert res.status_code == 200
    results = res.json()["results"]
    assert all(r["project_id"] != "b" for r in results), "B must be hidden by the allow-list"


def test_free_text_similarity(client):
    assert _summarize(client, "a", "Triage", TRIAGE_A_SECTIONS).status_code == 200
    res = client.post(
        "/similarity",
        json={"text": "triage app for nurses re-entering data", "limit": 5, "visibleProjectIds": ["a"], "includeAnalysis": False},
    )
    assert res.status_code == 200
    results = res.json()["results"]
    assert "a" in [r["project_id"] for r in results]


def test_requires_project_id_or_text(client):
    res = client.post("/similarity", json={"limit": 5})
    assert res.status_code == 422


def test_vector_store_rag_search_ranking():
    from app.services import vector_store

    vs = vector_store.VectorStore(vector_store.store.path)
    vs.items = {}
    vs.upsert_project(
        "a",
        title="Triage",
        sector="health",
        vectors={"problem": [1.0, 0.0]},
        sections={"problem": "why postgres chosen for triage notes"},
    )
    vs.upsert_project(
        "b",
        title="Farm",
        sector="agri",
        vectors={"problem": [0.0, 1.0]},
        sections={"problem": "crop irrigation scheduling"},
    )

    hits = vs.search_sections([0.9, 0.1], limit=5, allow={"a", "b"})
    assert hits and hits[0]["project_id"] == "a"

    # allow-list hides b entirely from RAG retrieval.
    hits = vs.search_sections([0.9, 0.1], limit=5, allow={"a"})
    assert hits and all(h["project_id"] == "a" for h in hits)