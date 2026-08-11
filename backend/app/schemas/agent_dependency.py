import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import DependencySource, DependencyType


class AgentDependencyCreate(BaseModel):
    dependency_id: str
    type: DependencyType
    # Omitted by existing/older clients -> legacy, preserving today's behavior
    # (resolve against the first-party skills/mcps tables) without requiring every
    # caller to know about the registry migration.
    source: DependencySource = DependencySource.legacy


class AgentDependencyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_slug: str
    dependency_id: str
    type: DependencyType
    source: DependencySource
    created_at: datetime
