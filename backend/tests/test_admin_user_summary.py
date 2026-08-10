from app.models.enums import UserRole
from tests.conftest import auth_headers, login, make_user


async def test_user_summary_forbidden_for_non_admin(client, db_session):
    await make_user(db_session, email="us-member@example.com", role=UserRole.member)
    token = await login(client, "us-member@example.com")

    resp = await client.get("/api/v1/admin/user-summary", headers=auth_headers(token))
    assert resp.status_code == 403


async def test_user_summary_counts_and_role_breakdown(client, db_session):
    await make_user(db_session, email="us-admin@example.com", role=UserRole.admin)
    await make_user(db_session, email="us-rev@example.com", role=UserRole.reviewer)
    admin_token = await login(client, "us-admin@example.com")

    disabled_resp = await client.post(
        "/api/v1/users",
        headers=auth_headers(admin_token),
        json={"email": "us-disabled@example.com", "name": "Disabled Person", "password": "pw123456"},
    )
    await client.patch(
        f"/api/v1/users/{disabled_resp.json()['id']}",
        headers=auth_headers(admin_token),
        json={"status": "disabled"},
    )

    resp = await client.get("/api/v1/admin/user-summary", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["totalUsers"] == 3
    assert body["activeCount"] == 2
    assert body["disabledCount"] == 1
    assert body["byRole"] == {"admin": 1, "reviewer": 1, "member": 1}


async def test_user_summary_users_without_agents_and_top_owners(client, db_session):
    await make_user(db_session, email="us-admin2@example.com", role=UserRole.admin)
    admin_token = await login(client, "us-admin2@example.com")
    owner_resp = await client.post(
        "/api/v1/users",
        headers=auth_headers(admin_token),
        json={"email": "us-owner@example.com", "name": "Owner Person", "password": "pw123456"},
    )
    owner_token = await login(client, "us-owner@example.com", "pw123456")
    await client.post(
        "/api/v1/users",
        headers=auth_headers(admin_token),
        json={"email": "us-noagents@example.com", "name": "No Agents", "password": "pw123456"},
    )

    for slug in ["us-agent-1", "us-agent-2"]:
        resp = await client.post(
            "/api/v1/agents",
            headers=auth_headers(owner_token),
            json={"slug": slug, "name": slug, "visibility": "internal"},
        )
        assert resp.status_code == 201

    resp = await client.get("/api/v1/admin/user-summary", headers=auth_headers(admin_token))
    body = resp.json()
    # admin + owner + noagents = 3 users; owner (2 agents) is excluded from
    # "without agents", admin and noagents both qualify
    assert body["usersWithoutAgents"] == 2
    assert body["topAgentOwners"][0]["userName"] == "Owner Person"
    assert body["topAgentOwners"][0]["agentCount"] == 2
