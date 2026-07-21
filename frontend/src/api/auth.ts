import { apiFetch } from "./api";
import type {
  CurrentUserResponse,
  LoginInput,
  LoginResponse,
  MessageResponse,
} from "../types/auth";

export async function loginRequest(
  credentials: LoginInput,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    retryOnUnauthorized: false,
  });
}

export async function getCurrentUserRequest(): Promise<CurrentUserResponse> {
  return apiFetch<CurrentUserResponse>("/auth/me", {
    method: "GET",
    retryOnUnauthorized: true,
  });
}

export async function logoutRequest(): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/logout", {
    method: "POST",
    retryOnUnauthorized: false,
  });
}