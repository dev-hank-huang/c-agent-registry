from fastapi import APIRouter, Depends

from app.core.deps import require_role
from app.crud import registry as registry_crud
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.registry import RegistryOverview, RegistryStatus

# See app/crud/registry.py's PLACEHOLDER note — these two routes (Agent Templates /
# SkillHub Registry) are backed by an in-memory stub pending a real sync integration.
# MCP and Model used to be placeholder sources here too; they now have their own real
# availability-sync implementation instead (app/api/v1/endpoints/mcps.py, ai_models.py)
# and were removed from this set rather than left as a second, fake source of truth.
router = APIRouter(prefix="/admin", tags=["admin", "registry"])

_SOURCES = ("agent-templates", "skillhub-registry")


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
