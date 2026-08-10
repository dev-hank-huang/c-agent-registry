import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import AgentVisibility
from app.schemas.registry import RegistryStatus


class TrendPoint(BaseModel):
    date: str
    count: int


class AdminAgentItem(BaseModel):
    """Agent + current owner, joined for the Governance → Agents list. Distinct from
    AgentRead (used by the public Browse endpoint) because "who owns this" lives in
    the separate UserAgentRel membership table, not a column on Agent itself — Browse
    has no reason to pay for that join on every request."""

    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    visibility: AgentVisibility
    created_at: datetime
    owner_id: uuid.UUID
    owner_name: str
    owner_email: str


class AdminAgentListResponse(BaseModel):
    items: list[AdminAgentItem]
    total: int
    limit: int
    offset: int


class TransferOwnerRequest(BaseModel):
    new_owner_id: uuid.UUID


class UserByRole(BaseModel):
    admin: int
    reviewer: int
    member: int


class UserTrends(BaseModel):
    createdByDay: list[TrendPoint]
    # Named for what this repo actually tracks — a hard, one-time deletion event
    # (User.deleted_at) — not the reversible active/disabled `status` toggle, which
    # has no per-transition timestamp to trend on (see AdminUsers.tsx: that toggle is
    # a distinct, separate action from this one).
    deletedByDay: list[TrendPoint]


class TopAgentOwner(BaseModel):
    userId: uuid.UUID
    userName: str
    agentCount: int


class TopReviewerSummary(BaseModel):
    userId: uuid.UUID
    userName: str
    reviewCount: int


class UserSummary(BaseModel):
    """No "top account creators" leaderboard — the User model doesn't record which
    admin created a given account (no created_by column), unlike Agent, so that
    leaderboard from the reference repo's IA has nothing to query here."""

    totalUsers: int
    activeCount: int
    disabledCount: int
    usersWithoutAgents: int
    byRole: UserByRole
    trends: UserTrends
    topAgentOwners: list[TopAgentOwner]
    topReviewers: list[TopReviewerSummary]


class VisibilityCount(BaseModel):
    visibility: AgentVisibility
    count: int


class StatsTrends(BaseModel):
    agentsCreatedByDay: list[TrendPoint]
    reviewsApprovedByDay: list[TrendPoint]
    reviewsRejectedByDay: list[TrendPoint]


class StatsReviewGovernance(BaseModel):
    approvedLast30Days: int
    rejectedLast30Days: int
    averageReviewTimeHours: float | None


class AdminStats(BaseModel):
    """The one page that rolls up every other admin summary's headline numbers —
    "Needs attention" cards deep-link to whichever full summary page has the
    concerning number. No Usage section (downloads/ratings) like the reference
    repo's Statistics page has — this repo tracks neither download counts nor
    ratings anywhere (no download-event log, no Rating model at all). The one real
    usage figure available, actual artifact storage bytes in MinIO, stands on its
    own instead."""

    agentsTotal: int
    agentsByVisibility: list[VisibilityCount]
    agentsWithoutProductionCount: int
    versionsByStatus: dict[str, int]
    usersTotal: int
    usersByRole: UserByRole
    disabledUsersCount: int
    pendingReviewCount: int
    registryStatus: dict[str, RegistryStatus]
    trends: StatsTrends
    reviewGovernance: StatsReviewGovernance
    artifactStorageBytes: int


class AgentSummary(BaseModel):
    """No by-category/by-pricing-model tables or top-tags leaderboard — this repo's
    Agent model has no category/tags/pricingModel columns at all (see UI_AUDIT.md),
    unlike the reference repo. by-visibility is the one real breakdown dimension this
    schema actually has data for. No trend chart either, same reasoning the reference
    repo already uses for this specific page: catalog composition is point-in-time,
    not event volume."""

    total: int
    withProduction: int
    withoutProduction: int
    withoutAnyVersion: int
    byVisibility: list[VisibilityCount]


class ReviewTrends(BaseModel):
    approvedByDay: list[TrendPoint]
    rejectedByDay: list[TrendPoint]


class ReviewPeriodCounts(BaseModel):
    approved: int
    rejected: int


class TopReviewer(BaseModel):
    reviewerId: uuid.UUID
    reviewerName: str
    total: int
    approved: int
    rejected: int


class ReviewSummary(BaseModel):
    """No checklist-related fields (avg score, most-failed checks) — this repo has no
    review-checklist concept at all (see UI_AUDIT.md's second-batch gap list), unlike
    the reference repo this page's IA was modeled on."""

    pendingCount: int
    totalApproved: int
    totalRejected: int
    last30Days: ReviewPeriodCounts
    averageReviewTimeHours: float | None
    trends: ReviewTrends
    topReviewers: list[TopReviewer]
