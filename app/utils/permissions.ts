import { PERMISSIONS } from "@/constants/permissions";
import { ROLES, SHOP_ROLES, MASTER_ROLES, UserRole } from "@/constants/roles";

export function normalizeRole(role?: string | null): UserRole | null {
  if (!role) return null;

  const value = String(role).trim().toUpperCase();

  if (value === ROLES.MASTER_ADMIN) return ROLES.MASTER_ADMIN;
  if (value === ROLES.MANAGER) return ROLES.MANAGER;
  if (value === ROLES.SUPERVISOR) return ROLES.SUPERVISOR;
  if (value === ROLES.STAFF) return ROLES.STAFF;

  if (value === ROLES.SHOP_OWNER) return ROLES.SHOP_OWNER;
  if (value === ROLES.SHOP_MANAGER) return ROLES.SHOP_MANAGER;
  if (value === ROLES.SHOP_SUPERVISOR) return ROLES.SHOP_SUPERVISOR;
  if (value === ROLES.EMPLOYEE) return ROLES.EMPLOYEE;

  return null;
}

export function getRolePermissions(role?: string | null) {
  const normalized = normalizeRole(role);
  if (!normalized) return null;
  return PERMISSIONS[normalized];
}

export function isMasterRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized ? MASTER_ROLES.includes(normalized) : false;
}

export function isShopRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized ? SHOP_ROLES.includes(normalized) : false;
}

export function canAccessMasterPanel(role?: string | null) {
  return isMasterRole(role);
}

export function canAccessShopPanel(role?: string | null) {
  return isShopRole(role);
}

export function getDefaultRouteByRole(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return "/master/dashboard";

    case ROLES.MANAGER:
      return "/manager/dashboard";

    case ROLES.SUPERVISOR:
      return "/supervisor/dashboard";

    case ROLES.STAFF:
      return "/staff/dashboard";

    case ROLES.SHOP_OWNER:
      return "/shopowner/dashboard";

    case ROLES.SHOP_MANAGER:
      return "/shopmanager/dashboard";

    case ROLES.SHOP_SUPERVISOR:
      return "/shopsupervisor/dashboard";

    case ROLES.EMPLOYEE:
      return "/employee/dashboard";

    default:
      return "/login";
  }
}

export function canCreateMasterRole(
  currentRole?: string | null,
  targetRole?: string | null
) {
  const current = normalizeRole(currentRole);
  const target = normalizeRole(targetRole);

  if (!current || !target) return false;

  if (current === ROLES.MASTER_ADMIN) {
    const allowed: UserRole[] = [
      ROLES.MANAGER,
      ROLES.SUPERVISOR,
      ROLES.STAFF,
      ROLES.SHOP_OWNER,
    ];
    return allowed.includes(target);
  }

  if (current === ROLES.MANAGER) {
    const allowed: UserRole[] = [
      ROLES.SUPERVISOR,
      ROLES.STAFF,
      ROLES.SHOP_OWNER,
    ];
    return allowed.includes(target);
  }

  if (current === ROLES.SUPERVISOR) {
    const allowed: UserRole[] = [ROLES.STAFF, ROLES.SHOP_OWNER];
    return allowed.includes(target);
  }

  if (current === ROLES.STAFF) {
    const allowed: UserRole[] = [ROLES.SHOP_OWNER];
    return allowed.includes(target);
  }

  return false;
}

export function canCreateShopRole(
  currentRole?: string | null,
  targetRole?: string | null
) {
  const current = normalizeRole(currentRole);
  const target = normalizeRole(targetRole);

  if (!current || !target) return false;

  if (current === ROLES.SHOP_OWNER) {
    const allowed: UserRole[] = [
      ROLES.SHOP_MANAGER,
      ROLES.SHOP_SUPERVISOR,
      ROLES.EMPLOYEE,
    ];
    return allowed.includes(target);
  }

  if (current === ROLES.SHOP_MANAGER) {
    const allowed: UserRole[] = [
      ROLES.SHOP_SUPERVISOR,
      ROLES.EMPLOYEE,
    ];
    return allowed.includes(target);
  }

  if (current === ROLES.SHOP_SUPERVISOR) {
    const allowed: UserRole[] = [ROLES.EMPLOYEE];
    return allowed.includes(target);
  }

  return false;
}

export function getAllowedMasterCreateRoles(role?: string | null): UserRole[] {
  const normalized = normalizeRole(role);

  if (normalized === ROLES.MASTER_ADMIN) {
    return [ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.STAFF, ROLES.SHOP_OWNER];
  }

  if (normalized === ROLES.MANAGER) {
    return [ROLES.SUPERVISOR, ROLES.STAFF, ROLES.SHOP_OWNER];
  }

  if (normalized === ROLES.SUPERVISOR) {
    return [ROLES.STAFF, ROLES.SHOP_OWNER];
  }

  if (normalized === ROLES.STAFF) {
    return [ROLES.SHOP_OWNER];
  }

  return [];
}

export function getAllowedShopCreateRoles(role?: string | null): UserRole[] {
  const normalized = normalizeRole(role);

  if (normalized === ROLES.SHOP_OWNER) {
    return [ROLES.SHOP_MANAGER, ROLES.SHOP_SUPERVISOR, ROLES.EMPLOYEE];
  }

  if (normalized === ROLES.SHOP_MANAGER) {
    return [ROLES.SHOP_SUPERVISOR, ROLES.EMPLOYEE];
  }

  if (normalized === ROLES.SHOP_SUPERVISOR) {
    return [ROLES.EMPLOYEE];
  }

  return [];
}
