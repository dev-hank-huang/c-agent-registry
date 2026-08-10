from datetime import datetime

from pydantic import BaseModel

# --------------------------------------------------------------------------
# PLACEHOLDER CONTRACT — Registry All (Agent Templates / MCP Registry / Model
# Registry / SkillHub Registry). Per explicit direction from the user (this
# session): the real sync integration for these four sources lives elsewhere
# and will be wired in later. This schema + the endpoints in
# app/api/v1/endpoints/registry.py define the response *shape* the frontend
# is built against now; app/crud/registry.py's in-memory stub is what to
# replace with the real sync logic later — the route paths, request/response
# shapes, and admin-only gating should stay as-is so the frontend doesn't
# need to change when the real backend lands.
# --------------------------------------------------------------------------


class RegistryItem(BaseModel):
    id: str
    name: str
    version: str | None
    category: str | None
    deprecated: bool
    last_seen_at: datetime | None


class RegistryStatus(BaseModel):
    total_count: int
    last_synced_at: datetime | None
    consecutive_failures: int
    stale_count: int


class RegistryOverview(BaseModel):
    status: RegistryStatus
    items: list[RegistryItem]
