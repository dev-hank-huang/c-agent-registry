from datetime import datetime

from pydantic import BaseModel

# --------------------------------------------------------------------------
# PLACEHOLDER CONTRACT — Agent Templates and SkillHub Registry. A real sync
# integration for these two sources lives elsewhere and will be wired in
# later. This schema + the endpoints in app/api/v1/endpoints/registry.py
# define the response *shape* the frontend is built against now;
# app/crud/registry.py's in-memory stub is what to replace with the real
# sync logic later — the route paths, request/response shapes, and
# admin-only gating should stay as-is so the frontend doesn't need to change
# when the real backend lands.
#
# MCP and Model started out as placeholder sources here too, but were
# replaced by a real availability-sync implementation directly on the mcps/
# ai_models tables (see app/api/v1/endpoints/mcps.py, ai_models.py) rather
# than staying a second, fake "mirrored registry" source of truth.
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
