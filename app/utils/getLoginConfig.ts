import SummaryApi from "@/constants/SummaryApi";
import { ROLES } from "@/constants/roles";
import type { AuthAccountType, LoginRole } from "@/types/auth";
import { normalizeRole } from "@/utils/permissions";

type AuthConfig = {
  method: string;
  url: string;
};

const MASTER_LOGIN_ROLES: LoginRole[] = [
  ROLES.MASTER_ADMIN,
  ROLES.MANAGER,
  ROLES.SUPERVISOR,
  ROLES.STAFF,
];

const SHOP_LOGIN_ROLES: LoginRole[] = [
  ROLES.SHOP_OWNER,
  ROLES.SHOP_MANAGER,
  ROLES.SHOP_SUPERVISOR,
  ROLES.EMPLOYEE,
];

export function getRoleAccountType(
  role?: string | null
): AuthAccountType | null {
  const normalized = normalizeRole(role);

  if (!normalized) return null;
  if (MASTER_LOGIN_ROLES.includes(normalized)) return "MASTER";
  if (SHOP_LOGIN_ROLES.includes(normalized)) return "SHOP";

  return null;
}

export function getLoginRoles(accountType: AuthAccountType): LoginRole[] {
  return accountType === "SHOP" ? SHOP_LOGIN_ROLES : MASTER_LOGIN_ROLES;
}

export function getDefaultLoginRole(accountType: AuthAccountType): LoginRole {
  return accountType === "SHOP" ? ROLES.SHOP_OWNER : ROLES.MASTER_ADMIN;
}

export function getLoginConfig(role: LoginRole): AuthConfig {
  const accountType = getRoleAccountType(role);

  if (accountType === "SHOP") {
    return SummaryApi.shopowner_login;
  }

  if (role === ROLES.MASTER_ADMIN) {
    return SummaryApi.master_login;
  }

  return SummaryApi.staff_login;
}

export function getRefreshConfig(role?: string | null): AuthConfig {
  const accountType = getRoleAccountType(role);
  return accountType === "SHOP"
    ? SummaryApi.shopowner_refresh
    : SummaryApi.master_refresh;
}

export function getRoleLabel(role?: string | null): string {
  switch (normalizeRole(role)) {
    case ROLES.MASTER_ADMIN:
      return "Master Admin";
    case ROLES.MANAGER:
      return "Manager";
    case ROLES.SUPERVISOR:
      return "Supervisor";
    case ROLES.STAFF:
      return "Staff";
    case ROLES.SHOP_OWNER:
      return "Shop Owner";
    case ROLES.SHOP_MANAGER:
      return "Shop Manager";
    case ROLES.SHOP_SUPERVISOR:
      return "Shop Supervisor";
    case ROLES.EMPLOYEE:
      return "Employee";
    default:
      return "User";
  }
}
