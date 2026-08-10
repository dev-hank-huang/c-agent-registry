from app.models.enums import UserRole
from tests.conftest import auth_headers, login, make_user


async def test_admin_agents_forbidden_for_non_admin(client, db_session):
    await make_user(db_session, email="aa-member@example.com", role=UserRole.member)
    token = await login(client, "aa-member@example.com")

    resp = await client.get("/api/v1/admin/agents", headers=auth_headers(token))
    assert resp.status_code == 403


async def test_admin_agents_lists_every_agent_including_private_with_owner_info(client, db_session):
    owner = await make_user(db_session, email="aa-owner@example.com", role=UserRole.member)
    await make_user(db_session, email="aa-admin@example.com", role=UserRole.admin)
    owner_token = await login(client, "aa-owner@example.com")
    admin_token = await login(client, "aa-admin@example.com")

    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(owner_token),
        json={"slug": "aa-private", "name": "Private One", "visibility": "private"},
    )
    assert resp.status_code == 201

    # a plain member (not owner/admin) can't even see this agent via the public endpoint
    stranger = await make_user(db_session, email="aa-stranger@example.com", role=UserRole.member)
    stranger_token = await login(client, "aa-stranger@example.com")
    resp = await client.get("/api/v1/agents/aa-private", headers=auth_headers(stranger_token))
    assert resp.status_code == 404

    # but the admin governance list sees it, with owner info attached
    resp = await client.get("/api/v1/admin/agents", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    body = resp.json()
    item = next(i for i in body["items"] if i["slug"] == "aa-private")
    assert item["owner_id"] == str(owner.id)
    assert item["owner_name"] == "aa-owner"
    assert item["owner_email"] == "aa-owner@example.com"


async def test_transfer_owner_moves_ownership_and_demotes_previous_owner(client, db_session):
    old_owner = await make_user(db_session, email="aa-old@example.com", role=UserRole.member)
    new_owner = await make_user(db_session, email="aa-new@example.com", role=UserRole.member)
    await make_user(db_session, email="aa-admin2@example.com", role=UserRole.admin)
    old_owner_token = await login(client, "aa-old@example.com")
    admin_token = await login(client, "aa-admin2@example.com")

    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(old_owner_token),
        json={"slug": "aa-transfer", "name": "Transfer Me", "visibility": "internal"},
    )
    assert resp.status_code == 201

    resp = await client.patch(
        "/api/v1/admin/agents/aa-transfer/transfer-owner",
        headers=auth_headers(admin_token),
        json={"new_owner_id": str(new_owner.id)},
    )
    assert resp.status_code == 200, resp.text

    resp = await client.get("/api/v1/agents/aa-transfer/members", headers=auth_headers(admin_token))
    members = {m["user_id"]: m["role"] for m in resp.json()}
    assert members[str(new_owner.id)] == "owner"
    # old owner keeps access, demoted to editor rather than losing it outright
    assert members[str(old_owner.id)] == "editor"


async def test_transfer_owner_rejects_inactive_target(client, db_session):
    inactive = await make_user(db_session, email="aa-inactive@example.com", role=UserRole.member)
    await make_user(db_session, email="aa-owner3@example.com", role=UserRole.member)
    await make_user(db_session, email="aa-admin3@example.com", role=UserRole.admin)
    owner_token = await login(client, "aa-owner3@example.com")
    admin_token = await login(client, "aa-admin3@example.com")

    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(owner_token),
        json={"slug": "aa-transfer2", "name": "Transfer Me 2", "visibility": "internal"},
    )
    assert resp.status_code == 201
    await client.delete(f"/api/v1/users/{inactive.id}", headers=auth_headers(admin_token))

    resp = await client.patch(
        "/api/v1/admin/agents/aa-transfer2/transfer-owner",
        headers=auth_headers(admin_token),
        json={"new_owner_id": str(inactive.id)},
    )
    assert resp.status_code == 400


async def test_transfer_owner_forbidden_for_non_admin(client, db_session):
    owner = await make_user(db_session, email="aa-owner4@example.com", role=UserRole.member)
    other = await make_user(db_session, email="aa-other4@example.com", role=UserRole.member)
    owner_token = await login(client, "aa-owner4@example.com")

    resp = await client.post(
        "/api/v1/agents",
        headers=auth_headers(owner_token),
        json={"slug": "aa-transfer3", "name": "Transfer Me 3", "visibility": "internal"},
    )
    assert resp.status_code == 201

    # the owner themself isn't an admin, and transfer is an admin-governance action
    resp = await client.patch(
        "/api/v1/admin/agents/aa-transfer3/transfer-owner",
        headers=auth_headers(owner_token),
        json={"new_owner_id": str(other.id)},
    )
    assert resp.status_code == 403
