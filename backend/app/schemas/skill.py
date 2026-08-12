import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AvailabilityStatus


class SkillRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    version: str
    description: str | None
    category: str | None
    tags: list[str]
    created_by: uuid.UUID
    bucket_path: str
    mcp_dependency: list[uuid.UUID]
    status: AvailabilityStatus
    last_synced_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SkillSyncItem(SkillRead):
    # True when `status` flipped during the sync run this item came back from.
    changed: bool


class SkillSyncResult(BaseModel):
    synced_at: datetime
    total: int
    available: int
    unavailable: int
    items: list[SkillSyncItem]
