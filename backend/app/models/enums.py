import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    reviewer = "reviewer"
    member = "member"


class UserStatus(str, enum.Enum):
    active = "active"
    disabled = "disabled"


class AgentVisibility(str, enum.Enum):
    private = "private"
    internal = "internal"
    public = "public"


class AssetRole(str, enum.Enum):
    """Per-agent role granted via User_Agent_Rel (the diagram's Asset_Role).

    owner = the agent's creator (exactly one per agent, invites/removes editors).
    editor = an invited co-maintainer with equal content permissions.
    """

    owner = "owner"
    editor = "editor"


class VersionStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    in_review = "in_review"
    approved = "approved"
    rejected = "rejected"
    active = "active"
    archived = "archived"


class ReviewResult(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class DependencyType(str, enum.Enum):
    skill = "skill"
    mcp = "mcp"


class DependencySource(str, enum.Enum):
    """Which table/store `AgentDependency.dependency_id` resolves against.

    legacy = the first-party skills/mcps tables (Skills & MCP's upload flow).
    registry = an item mirrored into the Registry pages (MCP Registry / SkillHub
    Registry) via external sync. Both are valid at once during the migration this
    repo is mid-way through — legacy stays until the real sync integration is
    connected and registries are populated (see app/crud/registry.py).
    """

    legacy = "legacy"
    registry = "registry"
