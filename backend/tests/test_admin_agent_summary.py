from app.models.enums import UserRole
from tests.conftest import auth_headers, login, make_user


async def test_agent_summary_forbidden_for_non_admin(client, db_session):
    await make_user(db_session, email="as-member@example.com", role=UserRole.member)
    token = await login(client, "as-member@example.com")

    resp = await client.get("/api/v1/admin/agent-summary", headers=auth_headers(token))
    assert resp.status_code == 403


async def test_agent_summary_counts_by_version_and_visibility(client, db_session):
    await make_user(db_session, email="as-owner@example.com", role=UserRole.member)
    await make_user(db_session, email="as-reviewer@example.com", role=UserRole.reviewer)
    await make_user(db_session, email="as-admin@example.com", role=UserRole.admin)
    owner_token = await login(client, "as-owner@example.com")
    admin_token = await login(client, "as-admin@example.com")

    # agent with zero versions
    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(owner_token),
        json={"slug": "as-empty", "name": "Empty", "visibility": "private"},
    )
    assert resp.status_code == 201

    # agent with a draft version only (no active/production version)
    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(owner_token),
        json={"slug": "as-draftonly", "name": "Draft Only", "visibility": "public"},
    )
    assert resp.status_code == 201
    resp = await client.post(
        "/api/v1/agents/as-draftonly/versions",
        headers=auth_headers(owner_token),
        json={"url": "https://example.com", "streaming": False},
    )
    assert resp.status_code == 201

    # agent with an active (production) version
    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(owner_token),
        json={"slug": "as-live", "name": "Live", "visibility": "internal"},
    )
    assert resp.status_code == 201
    resp = await client.post(
        "/api/v1/agents/as-live/versions",
        headers=auth_headers(owner_token),
        json={"url": "https://example.com", "streaming": False},
    )
    version_slug = resp.json()["slug"]
    resp = await client.get("/api/v1/reviewers", headers=auth_headers(owner_token))
    reviewer_id = next(c["id"] for c in resp.json() if c["email"] == "as-reviewer@example.com")
    await client.post(
        f"/api/v1/versions/{version_slug}/submit",
        headers=auth_headers(owner_token),
        json={"reviewer_ids": [reviewer_id]},
    )
    resp = await client.get(f"/api/v1/versions/{version_slug}/reviews", headers=auth_headers(owner_token))
    review_id = resp.json()[0]["id"]
    reviewer_token = await login(client, "as-reviewer@example.com")
    await client.post(
        f"/api/v1/reviews/{review_id}/decision",
        headers=auth_headers(reviewer_token),
        json={"result": "approved"},
    )
    await client.post(f"/api/v1/versions/{version_slug}/activate", headers=auth_headers(owner_token))

    resp = await client.get("/api/v1/admin/agent-summary", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert body["withProduction"] == 1
    assert body["withoutProduction"] == 2
    assert body["withoutAnyVersion"] == 1
    by_visibility = {row["visibility"]: row["count"] for row in body["byVisibility"]}
    assert by_visibility == {"private": 1, "public": 1, "internal": 1}
