from app.models.enums import UserRole
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


async def test_review_summary_forbidden_for_non_admin(client, db_session):
    await make_user(db_session, email="rs-member@example.com", role=UserRole.member)
    token = await login(client, "rs-member@example.com")

    resp = await client.get("/api/v1/admin/review-summary", headers=auth_headers(token))
    assert resp.status_code == 403


async def test_review_summary_counts_pending_approved_rejected(client, db_session):
    await make_user(db_session, email="rs-member2@example.com", role=UserRole.member)
    reviewer = await make_user(db_session, email="rs-rev@example.com", role=UserRole.reviewer)
    admin = await make_user(db_session, email="rs-admin@example.com", role=UserRole.admin)
    member_token = await login(client, "rs-member2@example.com")
    reviewer_token = await login(client, "rs-rev@example.com")
    admin_token = await login(client, "rs-admin@example.com")

    v1 = await _create_agent_and_draft_version(client, member_token, "rs-agent-1")
    await client.post(
        f"/api/v1/versions/{v1}/submit",
        headers=auth_headers(member_token),
        json={"reviewer_ids": [str(reviewer.id)]},
    )
    v2 = await _create_agent_and_draft_version(client, member_token, "rs-agent-2")
    await client.post(
        f"/api/v1/versions/{v2}/submit",
        headers=auth_headers(member_token),
        json={"reviewer_ids": [str(reviewer.id)]},
    )
    resp = await client.get(f"/api/v1/versions/{v1}/reviews", headers=auth_headers(member_token))
    review1_id = resp.json()[0]["id"]
    await client.post(
        f"/api/v1/reviews/{review1_id}/decision",
        headers=auth_headers(reviewer_token),
        json={"result": "approved"},
    )
    v3 = await _create_agent_and_draft_version(client, member_token, "rs-agent-3")
    await client.post(
        f"/api/v1/versions/{v3}/submit",
        headers=auth_headers(member_token),
        json={"reviewer_ids": [str(reviewer.id)]},
    )
    resp = await client.get(f"/api/v1/versions/{v3}/reviews", headers=auth_headers(member_token))
    review3_id = resp.json()[0]["id"]
    await client.post(
        f"/api/v1/reviews/{review3_id}/decision",
        headers=auth_headers(reviewer_token),
        json={"result": "rejected", "comment": "no"},
    )

    resp = await client.get("/api/v1/admin/review-summary", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["pendingCount"] == 1
    assert body["totalApproved"] == 1
    assert body["totalRejected"] == 1


async def test_review_summary_top_reviewers_orders_by_decision_count(client, db_session):
    await make_user(db_session, email="rs-member3@example.com", role=UserRole.member)
    reviewer = await make_user(db_session, email="rs-rev2@example.com", role=UserRole.reviewer)
    admin = await make_user(db_session, email="rs-admin2@example.com", role=UserRole.admin)
    member_token = await login(client, "rs-member3@example.com")
    reviewer_token = await login(client, "rs-rev2@example.com")
    admin_token = await login(client, "rs-admin2@example.com")

    for i in range(2):
        v = await _create_agent_and_draft_version(client, member_token, f"rs-agent-top-{i}")
        await client.post(
            f"/api/v1/versions/{v}/submit",
            headers=auth_headers(member_token),
            json={"reviewer_ids": [str(reviewer.id)]},
        )
        resp = await client.get(f"/api/v1/versions/{v}/reviews", headers=auth_headers(member_token))
        review_id = resp.json()[0]["id"]
        await client.post(
            f"/api/v1/reviews/{review_id}/decision",
            headers=auth_headers(reviewer_token),
            json={"result": "approved"},
        )

    resp = await client.get("/api/v1/admin/review-summary", headers=auth_headers(admin_token))
    body = resp.json()
    assert body["topReviewers"][0]["reviewerName"] == "rs-rev2"
    assert body["topReviewers"][0]["total"] == 2
    assert body["topReviewers"][0]["approved"] == 2
