import { apiClient } from "./client";
import type { AIModel, SyncResult } from "./types";

export async function listModels(): Promise<AIModel[]> {
  const { data } = await apiClient.get<AIModel[]>("/models");
  return data;
}

export interface CreateModelInput {
  name: string;
  provider: string;
  model_id: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export async function createModel(input: CreateModelInput): Promise<AIModel> {
  const { data } = await apiClient.post<AIModel>("/models", { tags: [], ...input });
  return data;
}

export async function syncModels(): Promise<SyncResult<AIModel>> {
  const { data } = await apiClient.post<SyncResult<AIModel>>("/models/sync");
  return data;
}
