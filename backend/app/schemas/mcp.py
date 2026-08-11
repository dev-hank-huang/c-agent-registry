import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AvailabilityStatus


class MCPCreate(BaseModel):
    name: str
    version: str
    description: str | None = None
    category: str | None = None
    tags: list[str] = []
    host: str


class MCPRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    version: str
    description: str | None
    category: str | None
    tags: list[str]
    created_by: uuid.UUID
    host: str
    status: AvailabilityStatus
    last_synced_at: datetime | None
    created_at: datetime
    updated_at: datetime


class MCPSyncResult(BaseModel):
    synced_at: datetime
    total: int
    available: int
    unavailable: int
    items: list[MCPRead]
