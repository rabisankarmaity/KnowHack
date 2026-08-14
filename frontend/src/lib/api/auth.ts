import type { AxiosRequestConfig } from "axios";
import { apiGet, apiPost } from "./client";
import type { UserDTO } from "./types";

export interface LoginPayload {
  emailOrUsername: string;
  password: string;
  remember?: boolean;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: "student" | "creator";
}

export const authApi = {
  me: (config?: AxiosRequestConfig) => apiGet<{ user: UserDTO }>("/auth/me", config),
  login: (payload: LoginPayload, config?: AxiosRequestConfig) =>
    apiPost<{ user: UserDTO; tokens: unknown }>("/auth/login", payload, config),
  register: (payload: RegisterPayload, config?: AxiosRequestConfig) =>
    apiPost<{ user: UserDTO; tokens: unknown }>("/auth/register", payload, config),
  logout: () => apiPost<Record<string, never>>("/auth/logout", {}),
  forgotPassword: (email: string) =>
    apiPost<{ message: string; resetToken?: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    apiPost<Record<string, never>>("/auth/reset-password", { token, password }),
};
