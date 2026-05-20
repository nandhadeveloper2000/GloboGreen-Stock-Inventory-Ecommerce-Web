import type { AuthUser } from "@/types/auth";

export type StoredAuthUser = AuthUser;

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";
const ROLE_KEY = "auth_role";

// Lightweight non-sensitive routing cookie read by Next.js middleware.
// It holds only the role string — not a JWT. Real auth is still the Bearer token.
function setRoleCookie(role: string) {
  if (typeof document === "undefined") return;
  document.cookie = `_role=${encodeURIComponent(role)}; path=/; SameSite=Strict`;
}

function clearRoleCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "_role=; path=/; max-age=0; SameSite=Strict";
}

export const authStorage = {
  setAccessToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setRefreshToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setUser(user: StoredAuthUser) {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser(): StoredAuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as StoredAuthUser;
    } catch {
      return null;
    }
  },

  setRole(role: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ROLE_KEY, role);
    setRoleCookie(role);
  },

  getRole(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ROLE_KEY);
  },

  clearAll() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    clearRoleCookie();
  },
};

export function setAuthSession(params: {
  accessToken: string;
  refreshToken?: string | null;
  user?: StoredAuthUser | null;
  role?: string | null;
}) {
  authStorage.setAccessToken(params.accessToken);

  if (params.refreshToken) {
    authStorage.setRefreshToken(params.refreshToken);
  } else if (typeof window !== "undefined") {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  if (params.user) {
    authStorage.setUser(params.user);
  }

  if (params.role) {
    authStorage.setRole(params.role);
  } else if (typeof window !== "undefined") {
    localStorage.removeItem(ROLE_KEY);
  }
}

export function getAuthSession() {
  return {
    accessToken: authStorage.getAccessToken(),
    refreshToken: authStorage.getRefreshToken(),
    user: authStorage.getUser(),
    role: authStorage.getRole(),
  };
}

export function clearAuthSession() {
  authStorage.clearAll();
}
