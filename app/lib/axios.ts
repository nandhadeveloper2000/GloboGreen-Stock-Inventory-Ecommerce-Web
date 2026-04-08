import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { tokenService } from "./token-service";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  success?: boolean;
  message?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: Record<string, unknown>;
  };
  accessToken?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
};

type FailedQueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });

  failedQueue = [];
}

function getAccessTokenFromRefreshPayload(payload: RefreshResponse): string | null {
  return (
    payload?.data?.accessToken ||
    payload?.accessToken ||
    null
  );
}

function getRefreshTokenFromRefreshPayload(payload: RefreshResponse): string | null {
  return (
    payload?.data?.refreshToken ||
    payload?.refreshToken ||
    null
  );
}

function getUserFromRefreshPayload(payload: RefreshResponse): Record<string, unknown> | null {
  return (
    payload?.data?.user ||
    payload?.user ||
    null
  );
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  window.location.href = "/login";
}

async function callRefreshToken(): Promise<RefreshResponse> {
  const refreshToken = tokenService.getRefreshToken();

  const response = await axios.post<RefreshResponse>(
    `${baseURL}${SummaryApi.master_refresh.url}`,
    { refreshToken },
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  return response.data;
}

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenService.getAccessToken();

    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    const isRefreshCall =
      originalRequest.url?.includes(SummaryApi.master_refresh.url) ?? false;

    if (status !== 401 || originalRequest._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            if (!originalRequest.headers) {
              originalRequest.headers = new AxiosHeaders();
            }

            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshPayload = await callRefreshToken();

      const newAccessToken = getAccessTokenFromRefreshPayload(refreshPayload);
      const newRefreshToken = getRefreshTokenFromRefreshPayload(refreshPayload);
      const refreshedUser = getUserFromRefreshPayload(refreshPayload);

      if (!newAccessToken) {
        throw new Error(refreshPayload?.message || "Unable to refresh session");
      }

      tokenService.updateAccessToken(newAccessToken);

      if (newRefreshToken) {
        tokenService.setSession({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: refreshedUser ?? tokenService.getUser(),
        });
      }

      processQueue(null, newAccessToken);

      if (!originalRequest.headers) {
        originalRequest.headers = new AxiosHeaders();
      }

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      tokenService.clearSession();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;