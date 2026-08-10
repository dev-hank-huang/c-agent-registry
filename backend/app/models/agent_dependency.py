from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import DependencySource, DependencyType
from app.models.mixins import TimestampMixin, UUIDPKMixin


class AgentDependency(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "agent_dependencies"
    __table_args__ = (
        UniqueConstraint(
            "agent_slug", "dependency_id", "type", "source", name="uq_agent_dependency"
        ),
    )

    agent_slug: Mapped[str] = mapped_column(
        ForeignKey("agent_versions.slug"), nullable=False, index=True
    )
    # Polymorphic: resolves against skills.id/mcps.id (source=legacy, a real UUID
    # stringified) or a Registry item id (source=registry — an external system's own
    # id, not necessarily a UUID at all, e.g. an MCP tool's key). String rather than
    # UUID specifically to accommodate the latter. No DB-level FK either way, since it
    # can point into any of several tables/stores depending on (type, source).
    dependency_id: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[DependencyType] = mapped_column(
        SAEnum(DependencyType, name="dependency_type"), nullable=False
    )
    source: Mapped[DependencySource] = mapped_column(
        SAEnum(DependencySource, name="dependency_source"),
        nullable=False,
        default=DependencySource.legacy,
    )
