export type UserRole = "admin" | "reviewer" | "member";
export type UserStatus = "active" | "disabled";
export type AgentVisibility = "private" | "internal" | "public";
export type AssetRole = "owner" | "editor";
export type VersionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "active"
  | "archived";
export type ReviewResult = "pending" | "approved" | "rejected";
export type DependencyType = "skill" | "mcp";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  limit: number;
  offset: number;
}

export type UserSort = "newest" | "oldest" | "name";

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  provider: string | null;
  visibility: AgentVisibility;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AgentListResponse {
  items: Agent[];
  total: number;
  limit: number;
  offset: number;
}

export type AgentSort = "newest" | "oldest" | "name";

export interface Member {
  id: string;
  user_id: string;
  agent_id: string;
  role: AssetRole;
  created_at: string;
  updated_at: string;
}

export interface AgentVersion {
  slug: string;
  agent_id: string;
  version: number;
  url: string | null;
  streaming: boolean;
  default_input_modes: string[];
  default_output_modes: string[];
  status: VersionStatus;
  package_path: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  agent_slug: string;
  reviewer_id: string;
  priority: number;
  result: ReviewResult;
  signoff_by: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAgentItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: AgentVisibility;
  created_at: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
}

export interface AdminAgentListResponse {
  items: AdminAgentItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserSummary {
  totalUsers: number;
  activeCount: number;
  disabledCount: number;
  usersWithoutAgents: number;
  byRole: { admin: number; reviewer: number; member: number };
  trends: {
    createdByDay: TrendPoint[];
    deletedByDay: TrendPoint[];
  };
  topAgentOwners: { userId: string; userName: string; agentCount: number }[];
  topReviewers: { userId: string; userName: string; reviewCount: number }[];
}

export interface AgentSummary {
  total: number;
  withProduction: number;
  withoutProduction: number;
  withoutAnyVersion: number;
  byVisibility: { visibility: AgentVisibility; count: number }[];
}

export interface ReviewerCandidate {
  id: string;
  name: string;
  email: string;
}

export interface ReviewQueueItem {
  id: string;
  result: ReviewResult;
  priority: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  agent_slug: string;
  agent_name: string;
  version_slug: string;
  version_number: number;
  reviewer_id: string;
  reviewer_name: string;
  submitted_by_id: string;
  submitted_by_name: string;
  signoff_by_id: string | null;
  signoff_by_name: string | null;
}

export interface ReviewQueueResponse {
  items: ReviewQueueItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface ReviewSummary {
  pendingCount: number;
  totalApproved: number;
  totalRejected: number;
  last30Days: { approved: number; rejected: number };
  averageReviewTimeHours: number | null;
  trends: {
    approvedByDay: TrendPoint[];
    rejectedByDay: TrendPoint[];
  };
  topReviewers: {
    reviewerId: string;
    reviewerName: string;
    total: number;
    approved: number;
    rejected: number;
  }[];
}

export interface Skill {
  id: string;
  name: string;
  version: string;
  description: string | null;
  category: string | null;
  tags: string[];
  created_by: string;
  bucket_path: string;
  mcp_dependency: string[];
  created_at: string;
  updated_at: string;
}

export interface Mcp {
  id: string;
  name: string;
  version: string;
  description: string | null;
  category: string | null;
  tags: string[];
  created_by: string;
  host: string;
  created_at: string;
  updated_at: string;
}

export interface AgentDependency {
  id: string;
  agent_slug: string;
  dependency_id: string;
  type: DependencyType;
  created_at: string;
}
