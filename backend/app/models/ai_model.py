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


class AIModel(UUIDPKMixin, TimestampMixin, Base):
    """Registry entry for an LLM/AI model agents can be configured to use.

    Named AIModel (table ai_models) rather than "Model" to avoid clashing with the
    app.models package and Pydantic's BaseModel.
    """

    __tablename__ = "ai_models"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    # The identifier used when calling the provider's API, e.g. "claude-sonnet-5".
    model_id: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    # Refreshed by POST /models/sync. No external provider API integration yet, so
    # this currently just re-validates required fields and stamps last_synced_at.
    status: Mapped[AvailabilityStatus] = mapped_column(
        SAEnum(AvailabilityStatus, name="availability_status"),
        nullable=False,
        default=AvailabilityStatus.available,
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
