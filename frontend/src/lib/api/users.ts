import { apiGet, apiPut } from "./client";
import type { ProjectDTO, UserDTO } from "./types";

export const usersApi = {
  getProfile: () => apiGet<{ user: UserDTO }>("/users/profile"),
  updateProfile: (payload: Partial<UserDTO>) =>
    apiPut<{ user: UserDTO }>("/users/profile", payload),
  getById: (id: string) => apiGet<{ user: UserDTO }>(`/users/${id}`),
  myProjects: () => apiGet<{ items: ProjectDTO[] }>("/users/projects"),
};