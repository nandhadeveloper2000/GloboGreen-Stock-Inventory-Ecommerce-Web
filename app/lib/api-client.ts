import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { tokenService } from "./token-service";
import type { AuthUser } from "@/types/auth";
import { getRefreshConfig } from "@/utils/getLoginConfig";
import { getAuthUserRole } from "@/utils/authUser";

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

function clearContentTypeHeader(
  headers: InternalAxiosRequestConfig["headers"] | undefined
) {
  if (!headers) return;

  if (headers instanceof AxiosHeaders) {
    headers.delete("Content-Type");
    return;
  }

  delete (headers as Record<string, unknown>)["Content-Type"];
  delete (headers as Record<string, unknown>)["content-type"];
}

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else if (token) {
      item.resolve(token);
    }
  });

  failedQueue = [];
}

function getAccessTokenFromRefreshPayload(
  payload: RefreshResponse
): string | null {
  return payload?.data?.accessToken || payload?.accessToken || null;
}

function getRefreshTokenFromRefreshPayload(
  payload: RefreshResponse
): string | null {
  return payload?.data?.refreshToken || payload?.refreshToken || null;
}

function getUserFromRefreshPayload(
  payload: RefreshResponse
): Record<string, unknown> | null {
  return payload?.data?.user || payload?.user || null;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  window.location.href = "/";
}

async function callRefreshToken(): Promise<RefreshResponse> {
  const refreshToken = tokenService.getRefreshToken();
  const refreshConfig = getRefreshConfig(tokenService.getRole());

  const refreshUrl =
    typeof refreshConfig.url === "string"
      ? refreshConfig.url
      : SummaryApi.master_refresh.url;

  const response = await axios.post<RefreshResponse>(
    `${baseURL}${refreshUrl}`,
    { refreshToken },
    {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenService.getAccessToken();
    const isFormDataRequest =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }

    if (isFormDataRequest) {
      clearContentTypeHeader(config.headers);
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
    const refreshConfig = getRefreshConfig(tokenService.getRole());

    const refreshUrl =
      typeof refreshConfig.url === "string"
        ? refreshConfig.url
        : "";

    const originalUrl = originalRequest.url || "";
    const isRefreshCall = originalUrl.includes(refreshUrl);

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

      const newAccessToken =
        getAccessTokenFromRefreshPayload(refreshPayload);
      const newRefreshToken =
        getRefreshTokenFromRefreshPayload(refreshPayload);
      const refreshedUser = getUserFromRefreshPayload(refreshPayload);
      const nextRole =
        getAuthUserRole(refreshedUser as AuthUser | null) ||
        tokenService.getRole();

      if (!newAccessToken) {
        throw new Error(refreshPayload?.message || "Unable to refresh session");
      }

      if (newRefreshToken) {
        tokenService.setSession({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: refreshedUser ?? tokenService.getUser(),
          role: nextRole,
        });
      } else {
        tokenService.updateAccessToken(newAccessToken);
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
