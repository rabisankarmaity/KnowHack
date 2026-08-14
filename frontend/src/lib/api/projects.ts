import { apiClient, apiDelete, apiGet, apiPost, apiPut } from "./client";
import type { AiReviewDTO, ApiEnvelope, FileRef, ProjectDTO } from "./types";

export interface ProjectListQuery {
  q?: string;
  category?: string;
  domain?: string;
  difficulty?: string;
  hackathon?: string;
  organizer?: string;
  tech?: string; // comma separated
  owner?: string;
  sort?: "newest" | "oldest" | "views" | "bookmarks";
  page?: number;
  limit?: number;
}

export const projectsApi = {
  list: (params: ProjectListQuery = {}) =>
    apiGet<{ items: ProjectDTO[] }>("/projects", { params }),
  getBySlug: (slug: string) => apiGet<{ project: ProjectDTO }>(`/projects/${slug}`),
  create: (payload: Partial<ProjectDTO>) =>
    apiPost<{ project: ProjectDTO }>("/projects", payload),
  update: (id: string, payload: Partial<ProjectDTO>) =>
    apiPut<{ project: ProjectDTO }>(`/projects/${id}`, payload),
  remove: (id: string) => apiDelete<Record<string, never>>(`/projects/${id}`),
  aiReview: (id: string) =>
    apiPost<{ review: AiReviewDTO; project: ProjectDTO }>(`/projects/${id}/ai-review`),
  publish: (id: string) => apiPost<{ project: ProjectDTO }>(`/projects/${id}/publish`),
  archive: (id: string) => apiPost<{ project: ProjectDTO }>(`/projects/${id}/archive`),
  duplicate: (id: string) => apiPost<{ project: ProjectDTO }>(`/projects/${id}/duplicate`),
  uploadFiles: async (files: File[]) => {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    const res = await apiClient.post<ApiEnvelope<{ files: FileRef[] }>>(
      "/projects/uploads",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },
};