from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.crud import skill as skill_crud
from app.db.base import get_db
from app.models.enums import AvailabilityStatus
from app.models.user import User
from app.schemas.skill import SkillRead, SkillSyncItem, SkillSyncResult
from app.services.storage import object_exists

router = APIRouter(prefix="/skills", tags=["skills"])
settings = get_settings()


@router.get("", response_model=list[SkillRead])
async def list_skills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SkillRead]:
    skills = await skill_crud.list_skills(db)
    return [SkillRead.model_validate(s) for s in skills]


@router.post("/sync", response_model=SkillSyncResult)
async def sync_skills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SkillSyncResult:
    """Re-checks every skill's bucket_path still exists in MinIO and refreshes status.
    `changed` on each returned item is true when this run flipped its status, so the
    frontend can highlight exactly what this sync touched."""
    skills = await skill_crud.list_skills(db)
    previous_status = {s.id: s.status for s in skills}
    for skill in skills:
        available = object_exists(settings.minio_skills_bucket, skill.bucket_path)
        skill_crud.mark_synced(
            skill, AvailabilityStatus.available if available else AvailabilityStatus.unavailable
        )
    await db.commit()
    for skill in skills:
        await db.refresh(skill)

    available_count = sum(1 for s in skills if s.status == AvailabilityStatus.available)
    return SkillSyncResult(
        synced_at=datetime.now(timezone.utc),
        total=len(skills),
        available=available_count,
        unavailable=len(skills) - available_count,
        items=[
            SkillSyncItem(
                **SkillRead.model_validate(s).model_dump(),
                changed=s.status != previous_status[s.id],
            )
            for s in skills
        ],
    )
