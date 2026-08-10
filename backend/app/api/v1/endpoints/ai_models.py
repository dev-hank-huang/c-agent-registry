from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.crud import ai_model as ai_model_crud
from app.db.base import get_db
from app.models.enums import AvailabilityStatus
from app.models.user import User
from app.schemas.ai_model import AIModelCreate, AIModelRead, AIModelSyncResult

router = APIRouter(prefix="/models", tags=["models"])


@router.post("", response_model=AIModelRead, status_code=201)
async def create_model(
    payload: AIModelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIModelRead:
    model = await ai_model_crud.create_model(
        db,
        name=payload.name,
        provider=payload.provider,
        model_id=payload.model_id,
        description=payload.description,
        category=payload.category,
        tags=payload.tags,
        created_by=current_user.id,
    )
    return AIModelRead.model_validate(model)


@router.get("", response_model=list[AIModelRead])
async def list_models(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AIModelRead]:
    models = await ai_model_crud.list_models(db)
    return [AIModelRead.model_validate(m) for m in models]


@router.post("/sync", response_model=AIModelSyncResult)
async def sync_models(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIModelSyncResult:
    """No external provider API is wired up yet, so this just re-validates that model_id
    is present (always true, it's required) and stamps last_synced_at. The check here is
    the extension point for a future real provider-API lookup.
    """
    models = await ai_model_crud.list_models(db)
    for model in models:
        available = bool(model.model_id)
        ai_model_crud.mark_synced(
            model, AvailabilityStatus.available if available else AvailabilityStatus.unavailable
        )
    await db.commit()
    for model in models:
        await db.refresh(model)

    available_count = sum(1 for m in models if m.status == AvailabilityStatus.available)
    return AIModelSyncResult(
        synced_at=datetime.now(timezone.utc),
        total=len(models),
        available=available_count,
        unavailable=len(models) - available_count,
        items=[AIModelRead.model_validate(m) for m in models],
    )
