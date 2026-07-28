import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

function getAuthState() {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
  try {
    const raw = localStorage.getItem("payme-auth");
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      accessToken: parsed?.state?.accessToken ?? null,
      refreshToken: parsed?.state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("payme-auth");
    const parsed = raw ? JSON.parse(raw) : { state: {} };
    parsed.state.accessToken = token;
    localStorage.setItem("payme-auth", JSON.stringify(parsed));
  } catch {}
}

api.interceptors.request.use((config) => {
  const { accessToken } = getAuthState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken } = getAuthState();
        if (!refreshToken) throw new Error("No refresh token");
        const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh: refreshToken });
        setAccessToken(data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem("payme-auth");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
