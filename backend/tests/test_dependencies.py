import uuid

from app.crud import registry as registry_crud
from app.models.enums import UserRole
from app.schemas.registry import RegistryItem
from tests.conftest import auth_headers, login, make_user


async def _create_agent_and_draft_version(client, token, slug):
    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(token),
        json={"slug": slug, "name": slug, "visibility": "internal"},
    )
    assert resp.status_code == 201
    resp = await client.post(
        f"/api/v1/agents/{slug}/versions",
        headers=auth_headers(token),
        json={"url": "https://example.com", "streaming": False},
    )
    assert resp.status_code == 201
    return resp.json()["slug"]


async def _upload_skill(client, token, name="skill-x"):
    resp = await client.post(
        "/api/v1/skills",
        headers=auth_headers(token),
        files={"file": ("main.py", b"print('hi')", "text/plain")},
        data={"name": name, "version": "1.0.0"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_mcp_and_list(client, db_session):
    await make_user(db_session, email="m@example.com", role=UserRole.member)
    token = await login(client, "m@example.com")
    resp = await client.post(
        "/api/v1/mcps",
        headers=auth_headers(token),
        json={"name": "mcp-1", "version": "1.0.0", "host": "https://mcp.example.com"},
    )
    assert resp.status_code == 201, resp.text

    resp = await client.get("/api/v1/mcps", headers=auth_headers(token))
    assert any(m["name"] == "mcp-1" for m in resp.json())


async def test_dependency_rejects_unknown_id(client, db_session):
    await make_user(db_session, email="dm@example.com", role=UserRole.member)
    token = await login(client, "dm@example.com")
    version_slug = await _create_agent_and_draft_version(client, token, "agent-d1")

    resp = await client.post(
        f"/api/v1/versions/{version_slug}/dependencies",
        headers=auth_headers(token),
        json={"dependency_id": str(uuid.uuid4()), "type": "skill"},
    )
    assert resp.status_code == 404


async def test_dependency_polymorphic_skill_and_mcp(client, db_session):
    await make_user(db_session, email="dm2@example.com", role=UserRole.member)
    token = await login(client, "dm2@example.com")
    version_slug = await _create_agent_and_draft_version(client, token, "agent-d2")

    skill = await _upload_skill(client, token, "skill-a")
    mcp_resp = await client.post(
        "/api/v1/mcps",
        headers=auth_headers(token),
        json={"name": "mcp-a", "version": "1.0.0", "host": "https://mcp.example.com"},
    )
    mcp = mcp_resp.json()

    resp = await client.post(
        f"/api/v1/versions/{version_slug}/dependencies",
        headers=auth_headers(token),
        json={"dependency_id": skill["id"], "type": "skill"},
    )
    assert resp.status_code == 201

    resp = await client.post(
        f"/api/v1/versions/{version_slug}/dependencies",
        headers=auth_headers(token),
        json={"dependency_id": mcp["id"], "type": "mcp"},
    )
    assert resp.status_code == 201

    resp = await client.get(
        f"/api/v1/versions/{version_slug}/dependencies", headers=auth_headers(token)
    )
    deps = resp.json()
    assert {d["type"] for d in deps} == {"skill", "mcp"}


async def test_dependencies_locked_after_submit(client, db_session):
    await make_user(db_session, email="dm3@example.com", role=UserRole.member)
    reviewer = await make_user(
        db_session, email="revd3@example.com", role=UserRole.reviewer
    )
    token = await login(client, "dm3@example.com")
    version_slug = await _create_agent_and_draft_version(client, token, "agent-d3")

    skill = await _upload_skill(client, token, "skill-locked")
    await client.post(
        f"/api/v1/versions/{version_slug}/submit",
        headers=auth_headers(token),
        json={"reviewer_ids": [str(reviewer.id)]},
    )

    resp = await client.post(
        f"/api/v1/versions/{version_slug}/dependencies",
        headers=auth_headers(token),
        json={"dependency_id": skill["id"], "type": "skill"},
    )
    assert resp.status_code == 409


async def test_dependency_omitted_source_defaults_to_legacy(client, db_session):
    # Backward compatibility: existing clients that never send `source` (like the
    # requests above) keep working against the first-party skills/mcps tables.
    await make_user(db_session, email="dm4@example.com", role=UserRole.member)
    token = await login(client, "dm4@example.com")
    version_slug = await _create_agent_and_draft_version(client, token, "agent-d4")
    skill = await _upload_skill(client, token, "skill-legacy")

    resp = await client.post(
        f"/api/v1/versions/{version_slug}/dependencies",
        headers=auth_headers(token),
        json={"dependency_id": skill["id"], "type": "skill"},
    )
    assert resp.status_code == 201
    assert resp.json()["source"] == "legacy"


async def test_dependency_registry_source_rejects_when_not_synced(client, db_session):
    await make_user(db_session, email="dm5@example.com", role=UserRole.member)
    token = await login(client, "dm5@example.com")
    version_slug = await _create_agent_and_draft_version(client, token, "agent-d5")

    resp = await client.post(
        f"/api/v1/versions/{version_slug}/dependencies",
        headers=auth_headers(token),
        json={"dependency_id": "not-mirrored-yet", "type": "skill", "source": "registry"},
    )
    assert resp.status_code == 404


async def test_dependency_registry_source_accepts_mirrored_item(client, db_session, monkeypatch):
    # Simulates a real sync having populated the skillhub-registry stub with one
    # skill — the actual population logic is what the real sync integration
    # replaces (see app/crud/registry.py's PLACEHOLDER note); this proves the
    # dependency endpoint correctly recognizes whatever ends up in that store.
    item = RegistryItem(id="pdf-parser-skill", name="PDF Parser", version="2.1.0", category=None, deprecated=False, last_seen_at=None)
    monkeypatch.setitem(registry_crud._state["skillhub-registry"], "items", [item])

    await make_user(db_session, email="dm6@example.com", role=UserRole.member)
    token = await login(client, "dm6@example.com")
    version_slug = await _create_agent_and_draft_version(client, token, "agent-d6")

    resp = await client.post(
        f"/api/v1/versions/{version_slug}/dependencies",
        headers=auth_headers(token),
        json={"dependency_id": "pdf-parser-skill", "type": "skill", "source": "registry"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["source"] == "registry"


async def test_dependency_mcp_has_no_registry_source(client, db_session):
    # MCP dependencies resolve against the real, availability-synced mcps table
    # directly (see app/api/v1/endpoints/mcps.py) — there's no separate "MCP
    # registry" mirror to source=registry from, unlike skill's SkillHub Registry.
    await make_user(db_session, email="dm7@example.com", role=UserRole.member)
    token = await login(client, "dm7@example.com")
    version_slug = await _create_agent_and_draft_version(client, token, "agent-d7")

    resp = await client.post(
        f"/api/v1/versions/{version_slug}/dependencies",
        headers=auth_headers(token),
        json={"dependency_id": "whatever", "type": "mcp", "source": "registry"},
    )
    assert resp.status_code == 400
