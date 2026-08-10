import { apiClient } from "./client";
import type { RegistryOverview, RegistrySource, RegistryStatus } from "./types";

// See backend/app/schemas/registry.py's PLACEHOLDER note: these four sources are
// currently backed by an in-memory stub pending the real sync integration (owned
// elsewhere). The contract below is what that integration will fill in — this file
// shouldn't need to change when it lands.
export async function getRegistryOverview(source: RegistrySource): Promise<RegistryOverview> {
  const { data } = await apiClient.get<RegistryOverview>(`/admin/${source}`);
  return data;
}

export async function triggerResync(source: RegistrySource): Promise<RegistryStatus> {
  const { data } = await apiClient.post<RegistryStatus>(`/admin/${source}/resync`);
  return data;
}
