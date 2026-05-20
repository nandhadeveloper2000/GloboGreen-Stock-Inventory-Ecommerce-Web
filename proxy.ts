import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Role-to-path mapping — each role may only access its own base path
const ROLE_BASE_PATHS: Record<string, string> = {
  MASTER_ADMIN: "/master",
  MANAGER: "/manager",
  SUPERVISOR: "/supervisor",
  STAFF: "/staff",
  SHOP_OWNER: "/shopowner",
  SHOP_MANAGER: "/shopmanager",
  SHOP_SUPERVISOR: "/shopsupervisor",
  EMPLOYEE: "/employee",
};

// Auth login pages (always public)
const AUTH_PATHS = [
  "/masterlogin",
  "/seller",
  "/login",
  "/master-login",
  "/email",
  "/forgot-pin",
];

// Paths that are always public (static assets, API routes, Next internals)
const PUBLIC_PREFIXES = ["/_next", "/api", "/favicon", "/public"];

function isPublicPath(pathname: string): boolean {
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname === "/") return true;
  return false;
}

// The `_role` cookie is a lightweight non-sensitive routing hint set on login.
// Real auth is still the Bearer JWT — this only enables edge-level path enforcement.
function getRoleFromRequest(req: NextRequest): string | null {
  return req.cookies.get("_role")?.value || null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const role = getRoleFromRequest(request);

  // No role cookie → no session → redirect to login
  if (!role) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/masterlogin";
    return NextResponse.redirect(loginUrl);
  }

  const expectedBase = ROLE_BASE_PATHS[role.toUpperCase()];

  // Role not recognised → redirect to login
  if (!expectedBase) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/masterlogin";
    return NextResponse.redirect(loginUrl);
  }

  // Role path mismatch — e.g. EMPLOYEE trying to access /master/*
  if (!pathname.startsWith(expectedBase)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = `${expectedBase}/dashboard`;
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Only run on protected page routes (not static assets or internals)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|public).*)",
  ],
};
