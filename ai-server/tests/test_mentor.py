"""System 2 — Right-Way-of-Thinking Mentor (RAG-grounded) tests."""

BLOATED = {
    "problem": "Clinics lose time re-entering triage data.",
    "target_users": "Nurses",
    "solution": "A mobile app.",
    "features": "chat, payments, maps, AI, notifications, admin panel, dark mode, leaderboard, export, teams, analytics, scheduler",
}


def test_mentor_guides_scope_thinking_instead_of_plain_no(client):
    res = client.post(
        "/mentor",
        json={
            "question": "We have 48 hours. Should we build 15 features?",
            "projectId": None,
            "projectContext": BLOATED,
            "visibleProjectIds": [],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["engine"] == "fallback"
    assert body["grounded"] is True
    assert body["question"] == "We have 48 hours. Should we build 15 features?"
    assert body["considerations"], "mentor must present considerations"
    joined = " ".join(body["considerations"]) + " " + body["response"]
    assert "trade" in joined.lower() or "risk" in joined.lower() or "scope" in joined.lower()
    assert body["response"].strip().lower() != "no"
    assert body["next_actions"], "mentor must give a next action"
    assert body["alternatives"], "mentor must compare alternatives"


def test_mentor_states_when_not_documented(client):
    res = client.post(
        "/mentor",
        json={"question": "Why did this project choose its database?", "projectId": None, "projectContext": {}, "visibleProjectIds": []},
    )
    assert res.status_code == 200
    body = res.json()
    # No case file context -> the mentor must say the info is not documented.
    assert body["grounded"] is False
    low = body["response"].lower()
    assert "could not find" in low or "not documented" in low
    assert "document" in low


def test_mentor_uses_llm_path(client, llm_fake):
    canned = {
        "understanding": "You ask whether 15 features fit 48 hours.",
        "decision": "Scope for the MVP.",
        "considerations": ["What is the core risk?", "What must the demo prove?"],
        "evidence": [{"project_id": "p1", "title": "Triage", "section": "features", "text": "15 features"}],
        "alternatives": [{"option": "3 features", "trade_off": "focused"}],
        "tradeoffs": ["Scope vs demo quality"],
        "recommendation": "Cut to 3 must-haves.",
        "next_actions": ["Rank features"],
        "follow_up_question": "Which 3 features prove the core value?",
        "response": "Cut the scope. Rank features by core risk.",
        "grounded": True,
    }
    llm_fake(lambda: canned)
    res = client.post(
        "/mentor",
        json={
            "question": "We have 48 hours. Should we build 15 features?",
            "projectId": "p1",
            "projectContext": BLOATED,
            "visibleProjectIds": ["p1"],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["engine"] == "llm"
    assert body["grounded"] is True
    assert body["recommendation"] == "Cut to 3 must-haves."
    assert body["sources"], "sources must be returned"


def test_raises_on_empty_question(client):
    res = client.post("/mentor", json={"question": "", "projectContext": {}})
    assert res.status_code == 422