import pytest

from app.models.enums import UserRole
from tests.conftest import auth_headers, login, make_user

# Route paths mirror the reference repo's Registry group exactly (see
# app/schemas/registry.py's PLACEHOLDER note) — Agent Templates, MCP Registry,
# Model Registry, SkillHub Registry all share the same shape and gating.
SOURCES = ["agent-templates", "mcp-registry", "model-registry", "skillhub-registry"]


@pytest.mark.parametrize("source", SOURCES)
async def test_registry_overview_forbidden_for_non_admin(client, db_session, source):
    await make_user(db_session, email=f"reg-member-{source}@example.com", role=UserRole.member)
    token = await login(client, f"reg-member-{source}@example.com")

    resp = await client.get(f"/api/v1/admin/{source}", headers=auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.parametrize("source", SOURCES)
async def test_registry_overview_returns_expected_shape_for_admin(client, db_session, source):
    await make_user(db_session, email=f"reg-admin-{source}@example.com", role=UserRole.admin)
    token = await login(client, f"reg-admin-{source}@example.com")

    resp = await client.get(f"/api/v1/admin/{source}", headers=auth_headers(token))
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body and "items" in body
    assert set(body["status"].keys()) == {
        "total_count",
        "last_synced_at",
        "consecutive_failures",
        "stale_count",
    }


@pytest.mark.parametrize("source", SOURCES)
async def test_registry_resync_forbidden_for_non_admin(client, db_session, source):
    await make_user(db_session, email=f"reg-resync-member-{source}@example.com", role=UserRole.member)
    token = await login(client, f"reg-resync-member-{source}@example.com")

    resp = await client.post(f"/api/v1/admin/{source}/resync", headers=auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.parametrize("source", SOURCES)
async def test_registry_resync_stamps_last_synced_at(client, db_session, source):
    await make_user(db_session, email=f"reg-resync-admin-{source}@example.com", role=UserRole.admin)
    token = await login(client, f"reg-resync-admin-{source}@example.com")

    before = await client.get(f"/api/v1/admin/{source}", headers=auth_headers(token))
    assert before.json()["status"]["last_synced_at"] is None

    resp = await client.post(f"/api/v1/admin/{source}/resync", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["last_synced_at"] is not None

    after = await client.get(f"/api/v1/admin/{source}", headers=auth_headers(token))
    assert after.json()["status"]["last_synced_at"] is not None
