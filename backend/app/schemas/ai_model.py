import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AvailabilityStatus


class AIModelCreate(BaseModel):
    name: str
    provider: str
    model_id: str
    description: str | None = None
    category: str | None = None
    tags: list[str] = []


class AIModelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    provider: str
    model_id: str
    description: str | None
    category: str | None
    tags: list[str]
    created_by: uuid.UUID
    status: AvailabilityStatus
    last_synced_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AIModelSyncResult(BaseModel):
    synced_at: datetime
    total: int
    available: int
    unavailable: int
    items: list[AIModelRead]
