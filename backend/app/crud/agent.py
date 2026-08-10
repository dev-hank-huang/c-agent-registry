import uuid
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.enums import AgentVisibility

# Maps the API's `sort` query param to an ORDER BY clause. "newest" is the default —
# matches a browse/catalog page's natural expectation (most-recently-added first)
# rather than the previous hardcoded oldest-first order.
_SORT_CLAUSES = {
    "newest": Agent.created_at.desc(),
    "oldest": Agent.created_at.asc(),
    "name": Agent.name.asc(),
}


async def get_by_id(db: AsyncSession, agent_id: uuid.UUID) -> Agent | None:
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def get_by_slug(db: AsyncSession, slug: str) -> Agent | None:
    result = await db.execute(
        select(Agent).where(Agent.slug == slug, Agent.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def list_agents(db: AsyncSession, *, q: str | None = None, sort: str = "newest") -> list[Agent]:
    # Returns every deleted_at-is-null agent matching `q` (unpaginated, visibility
    # unfiltered) — the endpoint layer applies per-user visibility and offset/limit
    # afterward, same split of responsibility the pre-existing per-agent visibility
    # check already established. At this POC's scale that's an acceptable full-table
    # scan; if the catalog grows large enough for that to matter, visibility should
    # move into this query instead of staying a Python-side filter.
    stmt = select(Agent).where(Agent.deleted_at.is_(None))
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(or_(Agent.name.ilike(pattern), Agent.description.ilike(pattern)))
    stmt = stmt.order_by(_SORT_CLAUSES.get(sort, _SORT_CLAUSES["newest"]))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_agent(
    db: AsyncSession,
    *,
    slug: str,
    name: str,
    description: str | None,
    provider: str | None,
    visibility: AgentVisibility,
    created_by: uuid.UUID,
) -> Agent:
    agent = Agent(
        slug=slug,
        name=name,
        description=description,
        provider=provider,
        visibility=visibility,
        created_by=created_by,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


async def update_agent(
    db: AsyncSession,
    agent: Agent,
    *,
    name: str | None = None,
    description: str | None = None,
    provider: str | None = None,
    visibility: AgentVisibility | None = None,
) -> Agent:
    if name is not None:
        agent.name = name
    if description is not None:
        agent.description = description
    if provider is not None:
        agent.provider = provider
    if visibility is not None:
        agent.visibility = visibility
    await db.commit()
    await db.refresh(agent)
    return agent


async def soft_delete(db: AsyncSession, agent: Agent) -> None:
    agent.deleted_at = datetime.now(timezone.utc)
    await db.commit()
