import api from "./api";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: "super_admin" | "admin" | "editor" | "viewer";
  is_email_verified: boolean;
  totp_enabled: boolean;
  last_active: string | null;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>("/auth/login/", { email, password });
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
}

export async function register(email: string, name: string, password: string, password2: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>("/auth/register/", { email, name, password, password2 });
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  return data;
}

export async function logout(refreshToken: string) {
  await api.post("/auth/logout/", { refresh: refreshToken }).catch(() => {});
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get<User>("/auth/profile/");
  return data;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}
