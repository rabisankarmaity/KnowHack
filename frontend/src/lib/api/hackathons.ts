import { apiGet } from "./client";
import type { HackathonDTO } from "./types";

export const hackathonsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiGet<{ items: HackathonDTO[] }>("/hackathons", { params }),
};