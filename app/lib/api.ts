import { baseURL } from "@/constants/SummaryApi";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

export type ApiResponse<T = unknown> = {
  success?: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: unknown;
  data?: T;
};

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
};

type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
  token?: string | null;
  isFormData?: boolean;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Network request failed";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function apiRequest<T = unknown>(
  url: string,
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options?.headers ?? {});

    if (options?.token) {
      headers.set("Authorization", `Bearer ${options.token}`);
    }

    if (!options?.isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${baseURL}${url}`, {
      ...options,
      headers,
      signal: options?.signal ?? controller.signal,
    });

    const data = (await response.json().catch(() => null)) as T | null;

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: isAbortError(error)
        ? "Request timed out. Please try again."
        : getErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getJson<T = unknown>(
  url: string,
  token?: string | null,
  timeoutMs = 15000
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    method: "GET",
    token,
    timeoutMs,
  });
}

export async function postJson<T = unknown>(
  url: string,
  payload?: JsonValue | Record<string, unknown> | unknown[],
  method = "POST",
  timeoutMs = 15000,
  token?: string | null
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    method,
    token,
    timeoutMs,
    body: JSON.stringify(payload ?? {}),
  });
}

export async function putJson<T = unknown>(
  url: string,
  payload?: JsonValue | Record<string, unknown> | unknown[],
  timeoutMs = 15000,
  token?: string | null
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    method: "PUT",
    token,
    timeoutMs,
    body: JSON.stringify(payload ?? {}),
  });
}

export async function patchJson<T = unknown>(
  url: string,
  payload?: JsonValue | Record<string, unknown> | unknown[],
  timeoutMs = 15000,
  token?: string | null
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    method: "PATCH",
    token,
    timeoutMs,
    body: JSON.stringify(payload ?? {}),
  });
}

export async function deleteJson<T = unknown>(
  url: string,
  token?: string | null,
  timeoutMs = 15000
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    method: "DELETE",
    token,
    timeoutMs,
  });
}

export async function postFormData<T = unknown>(
  url: string,
  formData: FormData,
  method = "POST",
  timeoutMs = 20000,
  token?: string | null
): Promise<ApiResult<T>> {
  return apiRequest<T>(url, {
    method,
    token,
    timeoutMs,
    body: formData,
    isFormData: true,
  });
}

export function pickAuthData<T = unknown>(response: ApiResponse<T> | null) {
  const responseData =
    response?.data && typeof response.data === "object"
      ? (response.data as Record<string, unknown>)
      : null;

  const accessToken =
    response?.accessToken ||
    response?.token ||
    (typeof responseData?.accessToken === "string"
      ? responseData.accessToken
      : "") ||
    "";

  const refreshToken =
    response?.refreshToken ||
    (typeof responseData?.refreshToken === "string"
      ? responseData.refreshToken
      : "") ||
    "";

  const user =
    response?.user ??
    responseData?.user ??
    (response?.data && !responseData?.user ? response.data : null) ??
    null;

  return {
    accessToken,
    refreshToken,
    user,
  };
}