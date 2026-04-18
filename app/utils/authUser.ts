import type { AuthResponse, AuthUser } from "@/types/auth";
import { normalizeRole } from "@/utils/permissions";

export function isAuthUser(value: unknown): value is AuthUser {
  return typeof value === "object" && value !== null;
}

export function pickAuthPayload(payload: AuthResponse) {
  return {
    accessToken: payload?.data?.accessToken || payload?.accessToken || "",
    refreshToken: payload?.data?.refreshToken || payload?.refreshToken || "",
    user: payload?.data?.user || payload?.user || null,
  };
}

export function getAuthUserRole(user?: AuthUser | null): string | null {
  return (
    normalizeRole(user?.role) ||
    normalizeRole(Array.isArray(user?.roles) ? user.roles[0] : null) ||
    null
  );
}

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (
      ["true", "1", "yes", "verified", "active", "enabled", "approved"].includes(
        normalized
      )
    ) {
      return true;
    }

    if (
      [
        "false",
        "0",
        "no",
        "pending",
        "inactive",
        "deactive",
        "deactivated",
        "disabled",
        "blocked",
        "suspended",
      ].includes(normalized)
    ) {
      return false;
    }
  }

  return null;
}

export function getEmailVerificationState(user?: AuthUser | null): boolean | null {
  const candidates = [
    user?.verifyEmail,
    user?.emailVerified,
    user?.isEmailVerified,
    user?.isVerified,
  ];

  for (const candidate of candidates) {
    const parsed = parseBooleanLike(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

export function getActiveState(user?: AuthUser | null): boolean | null {
  const explicitStatus = parseBooleanLike(user?.isActive);

  if (explicitStatus !== null) {
    return explicitStatus;
  }

  const statusFields = [user?.status, user?.accountStatus];

  for (const field of statusFields) {
    const parsed = parseBooleanLike(field);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}
