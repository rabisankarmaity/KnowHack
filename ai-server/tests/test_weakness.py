"""System 1 — Weakness / Mistake Detector tests."""

WEAK = {
    "problem": "We built an app to help people.",
    "target_users": "",
    "research": "",
    "validation": "",
    "existing_solutions": "",
    "solution": "A platform with chat, payments, maps, AI, notifications, admin panel, dark mode, leaderboard, export, teams, analytics, scheduler, offline mode",
    "features": "chat, payments, maps, AI, notifications, admin panel, dark mode, leaderboard, export, teams, analytics, scheduler, offline mode",
    "architecture": "",
    "database": "",
    "technology": "",
    "business_model": "",
}

STRONG = {
    "problem": "Student nurses lose 20 minutes per shift manually re-entering triage notes into three systems.",
    "target_users": "Student nurses in clinical rotations at university hospitals.",
    "research": "We surveyed 40 student nurses; 38 confirmed the manual re-entry problem.",
    "validation": "38/40 respondents said they would use a tool that auto-fills triage documentation.",
    "existing_solutions": "EPIC and Cerner exist but are hospital-admin tools; none target student rotations.",
    "solution": "A mobile note that syncs triage notes into EHR-friendly discharge summaries.",
    "features": "1. Auto-fill template, 2. One-tap sign-off export.",
    "architecture": "React Native frontend talks to a FastAPI service; results persist in PostgreSQL.",
    "database": "PostgreSQL: patients, rotations, notes tables.",
    "technology": "React Native, FastAPI, PostgreSQL.",
    "security": "Notes are encrypted at rest; access logged.",
}


def test_detector_flags_deliberately_weak_project(client):
    res = client.post(
        "/weakness",
        json={
            "projectId": "weak1",
            "title": "Vague App",
            "caseFile": WEAK,
            "metadata": {"title": "Vague App", "hackathon_duration_hours": 24},
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["engine"] == "fallback"
    assert body["overall_score"] < 60
    assert body["severity"] in ("low", "medium", "high", "critical")
    assert body["weaknesses"], "expected multiple weaknesses for a weak project"
    assert len(body["weaknesses"]) >= 4

    for w in body["weaknesses"]:
        assert w["category"]
        assert w["title"]
        assert w["evidence"], "every weakness must cite evidence or 'Not documented'"
        assert w["why_it_matters"], "every weakness must explain WHY it matters"
        assert w["recommended_action"]
        assert w["severity"] in ("low", "medium", "high", "critical")

    assert "validation" in body["missing_sections"]
    assert "architecture" in body["missing_sections"]
    assert body["scope_risks"], "the 13-feature list should surface scope risk"


def test_detector_reports_not_documented_instead_of_inventing(client):
    res = client.post(
        "/weakness",
        json={"projectId": "n1", "title": "Sparse", "caseFile": {"problem": "X is broken."}},
    )
    assert res.status_code == 200
    evidence = " ".join(w["evidence"] for w in res.json()["weaknesses"])
    assert "Not documented" in evidence


def test_detector_can_use_llm_path(client, llm_fake):
    canned = {
        "overall_score": 42,
        "severity": "high",
        "summary": "Scope is too broad and validation is missing.",
        "strengths": ["Clear problem"],
        "weaknesses": [
            {
                "category": "validation",
                "severity": "high",
                "title": "No user evidence",
                "evidence": "Not documented",
                "why_it_matters": "Judges cannot verify demand.",
                "recommended_action": "Add survey results.",
                "priority": "high",
            }
        ],
        "missing_sections": ["validation"],
        "scope_risks": [],
        "technical_risks": [],
        "security_risks": [],
        "business_risks": [],
        "quick_fixes": [],
        "before_submission": ["Add survey results."],
    }
    llm_fake(lambda: canned)
    res = client.post(
        "/weakness",
        json={"projectId": "w2", "title": "Triage", "caseFile": STRONG, "metadata": {"title": "Triage"}},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["engine"] == "llm"
    assert body["overall_score"] == 42
    assert body["weaknesses"][0]["category"] == "validation"


def test_detector_requires_case_file(client):
    res = client.post("/weakness", json={"projectId": "x", "caseFile": {}})
    assert res.status_code == 422