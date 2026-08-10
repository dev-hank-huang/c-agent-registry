from datetime import datetime, timezone

from app.schemas.registry import RegistryOverview, RegistryStatus

# --------------------------------------------------------------------------
# PLACEHOLDER — no real external MCP/Model/SkillHub/Template system is wired
# up here; this is in-process, non-persistent stub state so the four
# Registry pages have something real to call and render while the actual
# sync integration (owned elsewhere, per this session's direction) gets
# connected later. Replace this module's body with real queries against
# whatever store the real sync job writes to — the function signatures
# (`get_overview`, `trigger_resync`) are the contract the endpoints call,
# keep those stable.
#
# State is a plain module-level dict (resets on process restart, not shared
# across workers) — enough to make "click Re-sync now, see the timestamp
# update" demonstrable, not a real sync log.
# --------------------------------------------------------------------------

_SOURCES = ("agent-templates", "mcp-registry", "model-registry", "skillhub-registry")

# "items" stays empty until the real sync integration populates it — nothing in this
# module ever fabricates one. (Tests reach into this dict directly to simulate a
# populated registry; that's a test seam, not production behavior.)
_state: dict[str, dict] = {
    source: {"last_synced_at": None, "consecutive_failures": 0, "items": []} for source in _SOURCES
}


def get_overview(source: str) -> RegistryOverview:
    s = _state[source]
    items = s["items"]
    return RegistryOverview(
        status=RegistryStatus(
            total_count=len(items),
            last_synced_at=s["last_synced_at"],
            consecutive_failures=s["consecutive_failures"],
            stale_count=sum(1 for item in items if item.deprecated),
        ),
        items=items,
    )


def trigger_resync(source: str) -> RegistryStatus:
    # Stub: "succeeds" immediately and just stamps the current time — a real
    # implementation would actually call out to the source, update
    # consecutive_failures on error, and populate real items.
    _state[source]["last_synced_at"] = datetime.now(timezone.utc)
    _state[source]["consecutive_failures"] = 0
    return get_overview(source).status
