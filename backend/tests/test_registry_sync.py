from app.core.config import get_settings
from app.models.enums import UserRole
from app.services.storage import get_minio_client
from tests.conftest import auth_headers, login, make_user

settings = get_settings()


async def _upload_skill(client, token, name="sync-skill"):
    resp = await client.post(
        "/api/v1/skills",
        headers=auth_headers(token),
        files={"file": ("main.py", b"print('hi')", "text/plain")},
        data={"name": name, "version": "1.0.0"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_skill_defaults_to_available_and_unsynced(client, db_session):
    await make_user(db_session, email="sk1@example.com", role=UserRole.member)
    token = await login(client, "sk1@example.com")
    skill = await _upload_skill(client, token)
    assert skill["status"] == "available"
    assert skill["last_synced_at"] is None


async def test_skill_sync_marks_missing_object_unavailable(client, db_session):
    await make_user(db_session, email="sk2@example.com", role=UserRole.member)
    token = await login(client, "sk2@example.com")
    skill = await _upload_skill(client, token, "sync-skill-2")

    resp = await client.post("/api/v1/skills/sync", headers=auth_headers(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] >= 1
    synced = next(s for s in body["items"] if s["id"] == skill["id"])
    assert synced["status"] == "available"
    assert synced["last_synced_at"] is not None

    get_minio_client().remove_object(settings.minio_skills_bucket, skill["bucket_path"])

    resp = await client.post("/api/v1/skills/sync", headers=auth_headers(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    synced = next(s for s in body["items"] if s["id"] == skill["id"])
    assert synced["status"] == "unavailable"
    assert body["unavailable"] >= 1


async def test_mcp_sync_marks_unreachable_host_unavailable(client, db_session):
    await make_user(db_session, email="mc1@example.com", role=UserRole.member)
    token = await login(client, "mc1@example.com")

    resp = await client.post(
        "/api/v1/mcps",
        headers=auth_headers(token),
        json={"name": "unreachable-mcp", "version": "1.0.0", "host": "http://127.0.0.1:1"},
    )
    assert resp.status_code == 201, resp.text
    mcp = resp.json()
    assert mcp["status"] == "available"

    resp = await client.post(
        "/api/v1/mcps",
        headers=auth_headers(token),
        json={"name": "stdio-mcp", "version": "1.0.0", "host": "npx some-mcp-server"},
    )
    assert resp.status_code == 201, resp.text
    stdio_mcp = resp.json()

    resp = await client.post("/api/v1/mcps/sync", headers=auth_headers(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    by_id = {m["id"]: m for m in body["items"]}
    assert by_id[mcp["id"]]["status"] == "unavailable"
    assert by_id[stdio_mcp["id"]]["status"] == "available"


async def test_ai_model_create_list_sync(client, db_session):
    await make_user(db_session, email="ai1@example.com", role=UserRole.member)
    token = await login(client, "ai1@example.com")

    resp = await client.post(
        "/api/v1/models",
        headers=auth_headers(token),
        json={"name": "Claude Sonnet 5", "provider": "anthropic", "model_id": "claude-sonnet-5"},
    )
    assert resp.status_code == 201, resp.text
    model = resp.json()
    assert model["status"] == "available"
    assert model["last_synced_at"] is None

    resp = await client.get("/api/v1/models", headers=auth_headers(token))
    assert resp.status_code == 200
    assert any(m["id"] == model["id"] for m in resp.json())

    resp = await client.post("/api/v1/models/sync", headers=auth_headers(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    synced = next(m for m in body["items"] if m["id"] == model["id"])
    assert synced["status"] == "available"
    assert synced["last_synced_at"] is not None
