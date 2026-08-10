from app.models.enums import UserRole
from tests.conftest import auth_headers, login, make_user


async def test_stats_forbidden_for_non_admin(client, db_session):
    await make_user(db_session, email="st-member@example.com", role=UserRole.member)
    token = await login(client, "st-member@example.com")

    resp = await client.get("/api/v1/admin/stats", headers=auth_headers(token))
    assert resp.status_code == 403


async def test_stats_aggregates_agents_versions_users_and_reviews(client, db_session):
    await make_user(db_session, email="st-owner@example.com", role=UserRole.member)
    await make_user(db_session, email="st-admin@example.com", role=UserRole.admin)
    owner_token = await login(client, "st-owner@example.com")
    admin_token = await login(client, "st-admin@example.com")

    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(owner_token),
        json={"slug": "st-agent-1", "name": "Stats Agent", "visibility": "public"},
    )
    assert resp.status_code == 201
    resp = await client.post(
        "/api/v1/agents/st-agent-1/versions",
        headers=auth_headers(owner_token),
        json={"url": "https://example.com", "streaming": False},
    )
    assert resp.status_code == 201

    resp = await client.get("/api/v1/admin/stats", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    body = resp.json()

    assert body["agentsTotal"] >= 1
    assert body["versionsByStatus"]["draft"] >= 1
    assert body["usersTotal"] >= 2
    assert body["usersByRole"]["admin"] >= 1
    assert "mcp" in body["registryStatus"]
    assert "model" in body["registryStatus"]
    assert "skillhub-registry" in body["registryStatus"]
    assert len(body["trends"]["agentsCreatedByDay"]) == 30
    assert "artifactStorageBytes" in body
