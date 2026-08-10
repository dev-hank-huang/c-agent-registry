import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_model import AIModel
from app.models.enums import AvailabilityStatus


async def get_by_id(db: AsyncSession, model_id: uuid.UUID) -> AIModel | None:
    return await db.get(AIModel, model_id)


async def list_models(db: AsyncSession) -> list[AIModel]:
    result = await db.execute(select(AIModel).order_by(AIModel.created_at))
    return list(result.scalars().all())


async def create_model(
    db: AsyncSession,
    *,
    name: str,
    provider: str,
    model_id: str,
    description: str | None,
    category: str | None,
    tags: list[str],
    created_by: uuid.UUID,
) -> AIModel:
    model = AIModel(
        name=name,
        provider=provider,
        model_id=model_id,
        description=description,
        category=category,
        tags=tags,
        created_by=created_by,
    )
    db.add(model)
    await db.commit()
    await db.refresh(model)
    return model


def mark_synced(model: AIModel, status: AvailabilityStatus) -> None:
    """Set status + last_synced_at on the in-session object. Caller commits once for the batch."""
    model.status = status
    model.last_synced_at = datetime.now(timezone.utc)
