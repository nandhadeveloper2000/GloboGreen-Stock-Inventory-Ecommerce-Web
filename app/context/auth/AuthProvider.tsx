"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "@/lib/auth-storage";
import { normalizeRole } from "@/utils/permissions";

type AuthUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  roles?: string[];
  [key: string]: unknown;
};

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
    refreshToken?: string | null
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
      nextRefreshToken?: string | null
    ) => {
      const nextRole = resolveUserRole(nextUser, null);

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