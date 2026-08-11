from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.agent_access import get_agent_or_404
from app.core.deps import require_role
from app.crud import admin as admin_crud
from app.crud import user as user_crud
from app.crud import user_agent_rel as membership_crud
from app.db.base import get_db
from app.models.enums import AssetRole, UserRole, UserStatus
from app.models.user import User
from app.schemas.admin import (
    AdminAgentItem,
    AdminAgentListResponse,
    AdminStats,
    AgentSummary,
    ReviewSummary,
    TransferOwnerRequest,
    UserSummary,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/review-summary", response_model=ReviewSummary)
async def review_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> ReviewSummary:
    data = await admin_crud.get_review_summary(db)
    return ReviewSummary.model_validate(data)


@router.get("/stats", response_model=AdminStats)
async def stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> AdminStats:
    data = await admin_crud.get_stats(db)
    return AdminStats.model_validate(data)


@router.get("/user-summary", response_model=UserSummary)
async def user_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> UserSummary:
    data = await admin_crud.get_user_summary(db)
    return UserSummary.model_validate(data)


@router.get("/agent-summary", response_model=AgentSummary)
async def agent_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> AgentSummary:
    data = await admin_crud.get_agent_summary(db)
    return AgentSummary.model_validate(data)


@router.get("/agents", response_model=AdminAgentListResponse)
async def admin_list_agents(
    q: str | None = None,
    sort: str = "newest",
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> AdminAgentListResponse:
    rows, total = await admin_crud.list_agents_with_owner(db, q=q, sort=sort, limit=limit, offset=offset)
    items = [
        AdminAgentItem(
            id=agent.id,
            slug=agent.slug,
            name=agent.name,
            description=agent.description,
            visibility=agent.visibility,
            created_at=agent.created_at,
            owner_id=owner.id,
            owner_name=owner.name,
            owner_email=owner.email,
        )
        for agent, owner in rows
    ]
    return AdminAgentListResponse(items=items, total=total, limit=limit, offset=offset)


@router.patch("/agents/{slug}/transfer-owner", response_model=AdminAgentItem)
async def transfer_owner(
    slug: str,
    payload: TransferOwnerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> AdminAgentItem:
    agent = await get_agent_or_404(db, slug)
    new_owner = await user_crud.get_by_id(db, payload.new_owner_id)
    if new_owner is None or new_owner.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Not an eligible new owner"
        )

    current_owner_membership = await membership_crud.get_owner(db, agent.id)
    if current_owner_membership is not None and current_owner_membership.user_id == new_owner.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="User is already the owner"
        )
    if current_owner_membership is not None:
        # Demoted to editor rather than removed outright — transferring ownership
        # shouldn't lock the previous owner out of an agent they still work on.
        await membership_crud.upsert_membership(
            db, user_id=current_owner_membership.user_id, agent_id=agent.id, role=AssetRole.editor
        )
    await membership_crud.upsert_membership(
        db, user_id=new_owner.id, agent_id=agent.id, role=AssetRole.owner
    )

    return AdminAgentItem(
        id=agent.id,
        slug=agent.slug,
        name=agent.name,
        description=agent.description,
        visibility=agent.visibility,
        created_at=agent.created_at,
        owner_id=new_owner.id,
        owner_name=new_owner.name,
        owner_email=new_owner.email,
    )
