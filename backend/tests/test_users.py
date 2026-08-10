from app.models.enums import UserRole, UserStatus
from tests.conftest import auth_headers, login, make_user


async def test_list_users_is_paginated_with_total_count(client, db_session):
    await make_user(db_session, email="lu-admin@example.com", role=UserRole.admin)
    token = await login(client, "lu-admin@example.com")
    for i in range(3):
        await client.post(
            "/api/v1/users",
            headers=auth_headers(token),
            json={"email": f"lu-page{i}@example.com", "password": "pw123456", "name": f"Page {i}"},
        )

    resp = await client.get("/api/v1/users?limit=2&offset=0", headers=auth_headers(token))
    assert resp.status_code == 200
    body = resp.json()
    # +1 for the admin created above
    assert body["total"] == 4
    assert body["limit"] == 2
    assert len(body["items"]) == 2


async def test_list_users_search_matches_name_or_email(client, db_session):
    await make_user(db_session, email="lu-admin2@example.com", role=UserRole.admin)
    token = await login(client, "lu-admin2@example.com")
    await client.post(
        "/api/v1/users",
        headers=auth_headers(token),
        json={"email": "zzz-zebra@example.com", "password": "pw123456", "name": "Someone"},
    )
    await client.post(
        "/api/v1/users",
        headers=auth_headers(token),
        json={"email": "other@example.com", "password": "pw123456", "name": "Zebra Person"},
    )
    await client.post(
        "/api/v1/users",
        headers=auth_headers(token),
        json={"email": "nomatch@example.com", "password": "pw123456", "name": "Nothing"},
    )

    resp = await client.get("/api/v1/users?q=zebra", headers=auth_headers(token))
    body = resp.json()
    assert body["total"] == 2


async def test_list_users_role_and_status_filters(client, db_session):
    await make_user(db_session, email="lu-admin3@example.com", role=UserRole.admin)
    token = await login(client, "lu-admin3@example.com")
    await client.post(
        "/api/v1/users",
        headers=auth_headers(token),
        json={"email": "lu-rev@example.com", "password": "pw123456", "name": "Rev", "role": "reviewer"},
    )
    disabled_resp = await client.post(
        "/api/v1/users",
        headers=auth_headers(token),
        json={"email": "lu-disabled@example.com", "password": "pw123456", "name": "Disabled Guy"},
    )
    await client.patch(
        f"/api/v1/users/{disabled_resp.json()['id']}",
        headers=auth_headers(token),
        json={"status": "disabled"},
    )

    resp = await client.get("/api/v1/users?role=reviewer", headers=auth_headers(token))
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["email"] == "lu-rev@example.com"

    resp = await client.get("/api/v1/users?status=disabled", headers=auth_headers(token))
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["email"] == "lu-disabled@example.com"


async def test_list_users_sort_name_orders_alphabetically(client, db_session):
    await make_user(db_session, email="lu-admin4@example.com", role=UserRole.admin)
    token = await login(client, "lu-admin4@example.com")
    for name, email in [("Charlie", "lu-c@example.com"), ("Alpha", "lu-a@example.com"), ("Bravo", "lu-b@example.com")]:
        await client.post(
            "/api/v1/users",
            headers=auth_headers(token),
            json={"email": email, "password": "pw123456", "name": name},
        )

    resp = await client.get("/api/v1/users?sort=name", headers=auth_headers(token))
    names = [u["name"] for u in resp.json()["items"]]
    assert [n for n in names if n in ("Alpha", "Bravo", "Charlie")] == ["Alpha", "Bravo", "Charlie"]
