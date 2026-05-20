import { ROLES } from "@/constants/roles";
import { normalizeRole } from "@/utils/permissions";

const SHOP_PATH_PREFIXES = [
  "/shopowner",
  "/shopmanager",
  "/shopsupervisor",
  "/employee",
];

export function getLoginRoute(pathname?: string | null) {
  if (pathname && SHOP_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return "/seller";
  }
  return "/master";
}

export function getAppBasePathByRole(role?: string | null) {
  switch (normalizeRole(role)) {
    case ROLES.MASTER_ADMIN:
      return "/master";
    case ROLES.MANAGER:
      return "/manager";
    case ROLES.SUPERVISOR:
      return "/supervisor";
    case ROLES.STAFF:
      return "/staff";
    case ROLES.SHOP_OWNER:
      return "/shopowner";
    case ROLES.SHOP_MANAGER:
      return "/shopmanager";
    case ROLES.SHOP_SUPERVISOR:
      return "/shopsupervisor";
    case ROLES.EMPLOYEE:
      return "/employee";
    default:
      return "";
  }
}

export function getDashboardRouteByRole(role?: string | null) {
  const basePath = getAppBasePathByRole(role);
  return basePath ? `${basePath}/dashboard` : getLoginRoute();
}
