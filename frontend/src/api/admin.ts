import { apiClient } from "./client";
import type { AdminAgentItem, AdminAgentListResponse, AgentSort, AgentSummary, UserSummary } from "./types";

export async function getUserSummary(): Promise<UserSummary> {
  const { data } = await apiClient.get<UserSummary>("/admin/user-summary");
  return data;
}

export async function getAgentSummary(): Promise<AgentSummary> {
  const { data } = await apiClient.get<AgentSummary>("/admin/agent-summary");
  return data;
}

export interface ListAdminAgentsParams {
  q?: string;
  sort?: AgentSort;
  limit?: number;
  offset?: number;
}

export async function listAdminAgents(params: ListAdminAgentsParams = {}): Promise<AdminAgentListResponse> {
  const { data } = await apiClient.get<AdminAgentListResponse>("/admin/agents", { params });
  return data;
}

export async function transferOwner(slug: string, newOwnerId: string): Promise<AdminAgentItem> {
  const { data } = await apiClient.patch<AdminAgentItem>(`/admin/agents/${slug}/transfer-owner`, {
    new_owner_id: newOwnerId,
  });
  return data;
}
