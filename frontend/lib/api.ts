import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "@/node_modules/@types/js-cookie";
import type {
  Token, User, Video, VideoPage,
  AnalysisJob, AnalysisConfig, FullAnalysisResults, Result, Modality, ProgressEvent,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// ─── Request Interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: auto-refresh on 401 ───────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post<Token>(`${BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          Cookies.set("access_token", data.access_token, { expires: 1, sameSite: "lax" });
          Cookies.set("refresh_token", data.refresh_token, { expires: 7, sameSite: "lax" });
          if (original.headers) {
            original.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return apiClient(original);
        } catch {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, full_name: string) =>
    apiClient.post<User>("/auth/register", { email, password, full_name }).then((r) => r.data),

  login: async (email: string, password: string): Promise<Token> => {
    const form = new FormData();
    form.append("username", email);
    form.append("password", password);
    const { data } = await apiClient.post<Token>("/auth/login", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  me: () => apiClient.get<User>("/auth/me").then((r) => r.data),

  updateMe: (payload: { full_name?: string; password?: string }) =>
    apiClient.patch<User>("/auth/me", payload).then((r) => r.data),

  logout: () => apiClient.post("/auth/logout"),
};

// ─── Videos API ───────────────────────────────────────────────────────────────
export const videosApi = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<Video>("/videos/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }).then((r) => r.data);
  },

  list: (page = 1, pageSize = 20) =>
    apiClient.get<VideoPage>(`/videos/?page=${page}&page_size=${pageSize}`).then((r) => r.data),

  get: (videoId: number) =>
    apiClient.get<Video>(`/videos/${videoId}`).then((r) => r.data),

  delete: (videoId: number) => apiClient.delete(`/videos/${videoId}`),

  thumbnailUrl: (videoId: number) => `${BASE_URL}/api/v1/videos/${videoId}/thumbnail`,
};

// ─── Analysis API ─────────────────────────────────────────────────────────────
export const analysisApi = {
  start: (videoId: number, config: Partial<AnalysisConfig>) =>
    apiClient.post<AnalysisJob>(`/analysis/${videoId}/start`, { config }).then((r) => r.data),

  status: (jobId: number) =>
    apiClient.get<AnalysisJob>(`/analysis/${jobId}/status`).then((r) => r.data),

  listForVideo: (videoId: number) =>
    apiClient.get<AnalysisJob[]>(`/analysis/video/${videoId}/jobs`).then((r) => r.data),

  streamProgress: (jobId: number, onEvent: (e: ProgressEvent) => void): EventSource => {
    // EventSource cannot send Authorization headers, so we pass the JWT as a
    // query parameter. The backend's /progress endpoint reads ?token= explicitly.
    const token = Cookies.get("access_token") || "";
    const url = `${BASE_URL}/api/v1/analysis/${jobId}/progress?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onmessage = (event) => {
      try { onEvent(JSON.parse(event.data) as ProgressEvent); } catch { /* ignore malformed */ }
    };
    return es;
  },

  cancel: (jobId: number) =>
    apiClient.delete(`/analysis/${jobId}/cancel`),
};

// ─── Results API ──────────────────────────────────────────────────────────────
export const resultsApi = {
  full: (jobId: number) =>
    apiClient.get<FullAnalysisResults>(`/results/job/${jobId}`).then((r) => r.data),

  byModality: (jobId: number, modality: Modality, minConfidence = 0) =>
    apiClient
      .get<Result[]>(`/results/job/${jobId}/modality/${modality}?min_confidence=${minConfidence}`)
      .then((r) => r.data),

  timeline: (jobId: number, startS = 0, endS = 9999, modalities?: Modality[]) => {
    const params = new URLSearchParams({ start_s: String(startS), end_s: String(endS) });
    modalities?.forEach((m) => params.append("modalities", m));
    return apiClient.get<Result[]>(`/results/job/${jobId}/timeline?${params}`).then((r) => r.data);
  },

  alerts: (jobId: number) =>
    apiClient.get<Result[]>(`/results/job/${jobId}/alerts`).then((r) => r.data),

  anomalies: (jobId: number, minSeverity = "low") =>
    apiClient.get<Result[]>(`/results/job/${jobId}/anomalies?min_severity=${minSeverity}`).then((r) => r.data),
};

// ─── Reports API ──────────────────────────────────────────────────────────────
export const reportsApi = {
  pdfUrl: (jobId: number) => `${BASE_URL}/api/v1/reports/job/${jobId}/pdf`,
  csvUrl: (jobId: number) => `${BASE_URL}/api/v1/reports/job/${jobId}/csv`,
};

// ─── SWR Fetcher ──────────────────────────────────────────────────────────────
export const fetcher = (url: string) => apiClient.get(url).then((r) => r.data);
