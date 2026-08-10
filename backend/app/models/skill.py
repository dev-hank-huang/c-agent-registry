import uuid
from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import AvailabilityStatus
from app.models.mixins import TimestampMixin, UUIDPKMixin


class Skill(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "skills"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    # MinIO object key (under the skills bucket) where the uploaded skill files live.
    bucket_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    # Optional MCPs this skill depends on.
    mcp_dependency: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    # Refreshed by POST /skills/sync, which checks bucket_path still exists in MinIO.
    status: Mapped[AvailabilityStatus] = mapped_column(
        SAEnum(AvailabilityStatus, name="availability_status"),
        nullable=False,
        default=AvailabilityStatus.available,
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
