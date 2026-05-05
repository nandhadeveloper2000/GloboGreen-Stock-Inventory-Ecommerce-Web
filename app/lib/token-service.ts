import { authStorage, type StoredAuthUser } from "./auth-storage";

export const tokenService = {
  getAccessToken(): string | null {
    return authStorage.getAccessToken();
  },

  getRole(): string | null {
    return authStorage.getRole();
  },

  getRefreshToken(): string | null {
    return authStorage.getRefreshToken();
  },

  getUser(): StoredAuthUser | null {
    return authStorage.getUser();
  },

  setSession(params: {
    accessToken: string;
    refreshToken: string;
    user?: StoredAuthUser | null;
    role?: string | null;
  }): void {
    authStorage.setAccessToken(params.accessToken);
    authStorage.setRefreshToken(params.refreshToken);

    if (params.user) {
      authStorage.setUser(params.user);
    }

    if (params.role) {
      authStorage.setRole(params.role);
    }
  },

  updateAccessToken(accessToken: string): void {
    authStorage.setAccessToken(accessToken);
  },

  clearSession(): void {
    authStorage.clearAll();
  },
};
