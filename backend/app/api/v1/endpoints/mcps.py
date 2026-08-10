from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.crud import mcp as mcp_crud
from app.db.base import get_db
from app.models.enums import AvailabilityStatus
from app.models.user import User
from app.schemas.mcp import MCPCreate, MCPRead, MCPSyncResult

router = APIRouter(prefix="/mcps", tags=["mcps"])


async def _check_reachable(host: str) -> bool:
    """Best-effort heuristic: probe http(s) hosts with a short-timeout HEAD request. Any
    response (even 4xx/5xx) counts as reachable. Non-http(s) hosts (e.g. stdio commands)
    can't be verified over the network, so they're assumed available rather than flagged.
    """
    if not host.startswith("http://") and not host.startswith("https://"):
        return True
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.head(host)
        return True
    except httpx.RequestError:
        return False


@router.post("", response_model=MCPRead, status_code=201)
async def create_mcp(
    payload: MCPCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MCPRead:
    mcp = await mcp_crud.create_mcp(
        db,
        name=payload.name,
        version=payload.version,
        description=payload.description,
        category=payload.category,
        tags=payload.tags,
        created_by=current_user.id,
        host=payload.host,
    )
    return MCPRead.model_validate(mcp)


@router.get("", response_model=list[MCPRead])
async def list_mcps(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MCPRead]:
    mcps = await mcp_crud.list_mcps(db)
    return [MCPRead.model_validate(m) for m in mcps]


@router.post("/sync", response_model=MCPSyncResult)
async def sync_mcps(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MCPSyncResult:
    """Re-probes every MCP's host and refreshes status."""
    mcps = await mcp_crud.list_mcps(db)
    for mcp in mcps:
        reachable = await _check_reachable(mcp.host)
        mcp_crud.mark_synced(
            mcp, AvailabilityStatus.available if reachable else AvailabilityStatus.unavailable
        )
    await db.commit()
    for mcp in mcps:
        await db.refresh(mcp)

    available_count = sum(1 for m in mcps if m.status == AvailabilityStatus.available)
    return MCPSyncResult(
        synced_at=datetime.now(timezone.utc),
        total=len(mcps),
        available=available_count,
        unavailable=len(mcps) - available_count,
        items=[MCPRead.model_validate(m) for m in mcps],
    )
