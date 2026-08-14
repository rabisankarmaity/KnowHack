import { apiDelete, apiGet, apiPost } from "./client";
import type { BookmarkDTO } from "./types";

export const bookmarksApi = {
  list: () => apiGet<{ items: BookmarkDTO[] }>("/bookmarks"),
  create: (projectId: string) =>
    apiPost<{ bookmark: BookmarkDTO }>("/bookmarks", { projectId }),
  remove: (id: string) => apiDelete<Record<string, never>>(`/bookmarks/${id}`),
};