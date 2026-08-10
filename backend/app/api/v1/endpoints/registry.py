from fastapi import APIRouter, Depends

from app.core.deps import require_role
from app.crud import registry as registry_crud
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.registry import RegistryOverview, RegistryStatus

# See app/schemas/registry.py's PLACEHOLDER note — these four routes mirror the
# reference repo's Registry group (Agent Templates / MCP Registry / Model Registry /
# SkillHub Registry) exactly, backed by an in-memory stub pending the real sync
# integration. Declared as one shared route set (rather than four near-duplicate
# routers) since all four are identically shaped.
router = APIRouter(prefix="/admin", tags=["admin", "registry"])

_SOURCES = ("agent-templates", "mcp-registry", "model-registry", "skillhub-registry")


for _source in _SOURCES:

    def _make_get(source: str = _source):
        async def _get_overview(
            current_user: User = Depends(require_role(UserRole.admin)),
        ) -> RegistryOverview:
            return registry_crud.get_overview(source)

        return _get_overview

    def _make_resync(source: str = _source):
        async def _resync(
            current_user: User = Depends(require_role(UserRole.admin)),
        ) -> RegistryStatus:
            return registry_crud.trigger_resync(source)

        return _resync

    router.add_api_route(
        f"/{_source}",
        _make_get(),
        methods=["GET"],
        response_model=RegistryOverview,
        name=f"get_{_source.replace('-', '_')}",
    )
    router.add_api_route(
        f"/{_source}/resync",
        _make_resync(),
        methods=["POST"],
        response_model=RegistryStatus,
        name=f"resync_{_source.replace('-', '_')}",
    )
