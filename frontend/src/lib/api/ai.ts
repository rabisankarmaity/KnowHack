import { apiGet, apiPost } from "./client";
import type { AiInsights, MentorAnswerDTO, SimilarProjectDTO, WeaknessState } from "./types";

/**
 * The frontend NEVER talks to the AI service directly.
 * Every AI call is proxied through the Node backend.
 */
export const aiApi = {
  status: (projectId: string) => apiGet<{ ai: AiInsights }>(`/ai/projects/${projectId}/status`),
  analyze: (projectId: string) => apiPost<{ ai: AiInsights }>(`/ai/projects/${projectId}/analyze`),
  weakness: (projectId: string) =>
    apiPost<{ weakness: WeaknessState; stale: boolean }>(`/ai/projects/${projectId}/weakness`),
  mentor: (payload: { question: string; projectId?: string }) =>
    apiPost<{ mentor: MentorAnswerDTO }>("/ai/mentor", payload),
  similar: (projectId: string, limit = 5) =>
    apiGet<{ items: SimilarProjectDTO[]; stale: boolean }>(`/ai/projects/${projectId}/similar`, {
      params: { limit },
    }),
  similarByText: (text: string, limit = 5) =>
    apiPost<{ items: SimilarProjectDTO[]; stale: boolean }>("/ai/similarity", { text, limit }),
};

export const platformApi = {
  health: () =>
    apiGet<{
      ok: boolean;
      status: string;
      uptime: number;
      checks: Record<string, { ok: boolean; error?: string }>;
    }>("/health"),
};
