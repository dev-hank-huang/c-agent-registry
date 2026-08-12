import { Tag } from "antd";
import type {
  AgentVisibility,
  AssetRole,
  ReviewResult,
  UserRole,
  UserStatus,
  VersionStatus,
} from "../api/types";

const versionStatusClass: Record<VersionStatus, string> = {
  draft: "badge badge-neutral",
  submitted: "badge badge-pending",
  in_review: "badge badge-pending",
  approved: "badge badge-success",
  rejected: "badge badge-danger",
  active: "badge badge-success-solid",
  archived: "badge badge-neutral",
};

export function VersionStatusTag({ status }: { status: VersionStatus }) {
  return <span className={versionStatusClass[status]}>{status}</span>;
}

const visibilityLabel: Record<AgentVisibility, string> = {
  private: "private",
  internal: "internal",
  public: "public",
};

const visibilityClass: Record<AgentVisibility, string> = {
  public: "badge badge-visibility-public",
  internal: "badge badge-visibility-internal",
  private: "badge badge-visibility-internal badge-visibility-private",
};

export function VisibilityTag({ visibility }: { visibility: AgentVisibility }) {
  return <span className={visibilityClass[visibility]}>{visibilityLabel[visibility]}</span>;
}

export function AssetRoleTag({ role }: { role: AssetRole }) {
  return <Tag color={role === "owner" ? "blue" : "default"}>{role}</Tag>;
}

const userRoleColor: Record<UserRole, string> = {
  admin: "blue",
  reviewer: "cyan",
  member: "default",
};

export function UserRoleTag({ role }: { role: UserRole }) {
  return <Tag color={userRoleColor[role]}>{role}</Tag>;
}

export function UserStatusTag({ status }: { status: UserStatus }) {
  return (
    <span className={status === "active" ? "badge badge-success" : "badge badge-danger"}>
      {status}
    </span>
  );
}

const reviewResultClass: Record<ReviewResult, string> = {
  pending: "badge badge-pending",
  approved: "badge badge-success",
  rejected: "badge badge-danger",
};

export function ReviewResultTag({ result }: { result: ReviewResult }) {
  return <span className={reviewResultClass[result]}>{result}</span>;
}
