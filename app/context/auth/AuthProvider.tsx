"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import {
  authStorage,
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "@/lib/auth-storage";
import { baseURL } from "@/constants/SummaryApi";
import type { AuthUser } from "@/types/auth";
import { normalizeRole } from "@/utils/permissions";

type AuthContextType = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: string | null;
  isReady: boolean;
  isAuthenticated: boolean;
  setAuth: (
    user: AuthUser,
    accessToken: string,
    refreshToken?: string | null,
    explicitRole?: string | null
  ) => Promise<void>;
  updateUser: (nextUser: AuthUser) => Promise<void>;
  clearAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function resolveUserRole(user?: AuthUser | null, fallbackRole?: string | null) {
  return (
    normalizeRole(user?.role) ||
    normalizeRole(Array.isArray(user?.roles) ? user.roles[0] : null) ||
    fallbackRole ||
    null
  );
}

export function AuthProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    const storedUser = (session.user as AuthUser | null) || null;
    const storedRole = resolveUserRole(storedUser, session.role || null);

    // Re-sync the _role routing cookie in case it was missing (e.g., session predates cookie support,
    // or cookie expired while localStorage tokens remained). Without this, the proxy would redirect
    // authenticated users back to the login page on every navigation.
    if (storedRole) {
      authStorage.setRole(storedRole);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(storedUser);
    setAccessTokenState(session.accessToken || null);
    setRefreshTokenState(session.refreshToken || null);
    setRole(storedRole);
    setIsReady(true);
  }, []);

  const setAuth = useCallback(
    async (
      nextUser: AuthUser,
      nextAccessToken: string,
      nextRefreshToken?: string | null,
      explicitRole?: string | null
    ) => {
      const nextRole = resolveUserRole(nextUser, explicitRole || null);

      setAuthSession({
        user: nextUser,
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken || null,
        role: nextRole,
      });

      setUser(nextUser);
      setAccessTokenState(nextAccessToken);
      setRefreshTokenState(nextRefreshToken || null);
      setRole(nextRole);
    },
    []
  );

  const updateUser = useCallback(async (nextUser: AuthUser) => {
    const currentSession = getAuthSession();
    const nextRole = resolveUserRole(nextUser, currentSession.role || null);

    setAuthSession({
      accessToken: currentSession.accessToken || "",
      refreshToken: currentSession.refreshToken || null,
      user: nextUser,
      role: nextRole,
    });

    setUser(nextUser);
    setRole(nextRole);
  }, []);

  const clearAuth = useCallback(async () => {
    clearAuthSession();
    setUser(null);
    setAccessTokenState(null);
    setRefreshTokenState(null);
    setRole(null);
  }, []);

  const logout = useCallback(async () => {
    // Revoke the session on the backend before clearing local state.
    // Uses the refresh token so this works even if the access token is already expired.
    const session = getAuthSession();
    if (session.refreshToken) {
      axios
        .post(
          `${baseURL}/api/auth/logout-by-refresh`,
          { refreshToken: session.refreshToken },
          { headers: { "Content-Type": "application/json" } }
        )
        .catch(() => {
          // Best-effort — local state is always cleared regardless of network failure
        });
    }

    clearAuthSession();
    setUser(null);
    setAccessTokenState(null);
    setRefreshTokenState(null);
    setRole(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      refreshToken,
      role,
      isReady,
      isAuthenticated: Boolean(accessToken && user),
      setAuth,
      updateUser,
      clearAuth,
      logout,
    }),
    [
      user,
      accessToken,
      refreshToken,
      role,
      isReady,
      setAuth,
      updateUser,
      clearAuth,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
