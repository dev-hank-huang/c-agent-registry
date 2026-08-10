import uuid
from datetime import datetime
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import ReviewResult


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    agent_slug: str
    reviewer_id: uuid.UUID
    priority: int
    result: ReviewResult
    signoff_by: uuid.UUID | None
    comment: str | None
    created_at: datetime
    updated_at: datetime


class ReviewDecision(BaseModel):
    result: Literal[ReviewResult.approved, ReviewResult.rejected]
    # Required when rejecting so the submitter knows what to fix; optional on approval.
    comment: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def require_comment_on_reject(self) -> Self:
        if self.result == ReviewResult.rejected and not (self.comment and self.comment.strip()):
            raise ValueError("comment is required when rejecting")
        return self


class SubmitForReview(BaseModel):
    # Optional: if empty, the submitter is asking to fall back to every eligible reviewer
    # (system role reviewer/admin) rather than naming specific people.
    reviewer_ids: list[uuid.UUID] = Field(default_factory=list)


class ReviewerCandidate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str


class ReviewQueueItem(BaseModel):
    """One row in the Review Queue — a Review enriched with the agent/version/people
    display info the reference repo's "review request" concept bundles in one object,
    even though this repo models it as a flatter Review-per-assigned-reviewer row."""

    id: uuid.UUID
    result: ReviewResult
    priority: int
    comment: str | None
    created_at: datetime
    updated_at: datetime
    agent_slug: str
    agent_name: str
    version_slug: str
    version_number: int
    reviewer_id: uuid.UUID
    reviewer_name: str
    # The version's author (AgentVersion.created_by) — the closest stable proxy this
    # schema has for "submitted by"; AgentVersion.updated_by isn't safe to use for that
    # since a decision overwrites it to the decider, not the original submitter.
    submitted_by_id: uuid.UUID
    submitted_by_name: str
    signoff_by_id: uuid.UUID | None
    signoff_by_name: str | None


class ReviewQueueResponse(BaseModel):
    items: list[ReviewQueueItem]
    total: int
    limit: int
    offset: int
