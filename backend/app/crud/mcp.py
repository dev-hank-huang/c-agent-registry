import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AvailabilityStatus
from app.models.mcp import MCP


async def get_by_id(db: AsyncSession, mcp_id: uuid.UUID) -> MCP | None:
    return await db.get(MCP, mcp_id)


async def list_mcps(db: AsyncSession) -> list[MCP]:
    result = await db.execute(select(MCP).order_by(MCP.created_at))
    return list(result.scalars().all())


async def create_mcp(
    db: AsyncSession,
    *,
    name: str,
    version: str,
    description: str | None,
    category: str | None,
    tags: list[str],
    created_by: uuid.UUID,
    host: str,
) -> MCP:
    mcp = MCP(
        name=name,
        version=version,
        description=description,
        category=category,
        tags=tags,
        created_by=created_by,
        host=host,
    )
    db.add(mcp)
    await db.commit()
    await db.refresh(mcp)
    return mcp


def mark_synced(mcp: MCP, status: AvailabilityStatus) -> None:
    """Set status + last_synced_at on the in-session object. Caller commits once for the batch."""
    mcp.status = status
    mcp.last_synced_at = datetime.now(timezone.utc)
