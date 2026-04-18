"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/auth/AuthProvider";
import AppSidebar from "@/components/layouts/AppSidebar";
import AppTopbar from "@/components/layouts/AppTopbar";
import MobileSidebarDrawer from "@/components/layouts/MobileSidebarDrawer";
import type { UserRole } from "@/constants/navigation";
import { normalizeRole } from "@/utils/permissions";
import {
  getAppBasePathByRole,
  getDashboardRouteByRole,
  getLoginRoute,
} from "@/utils/redirect";

type AppShellProps = {
  children: React.ReactNode;
};

function getTitleFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "dashboard";

  return last
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, isReady, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const currentRole = useMemo<UserRole | null>(() => normalizeRole(role), [role]);
  const currentBasePath = useMemo(
    () => getAppBasePathByRole(currentRole),
    [currentRole]
  );
  const title = useMemo(() => getTitleFromPath(pathname), [pathname]);

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated || !currentRole) {
      router.replace(getLoginRoute());
      return;
    }

    if (
      currentBasePath &&
      pathname !== currentBasePath &&
      !pathname.startsWith(`${currentBasePath}/`)
    ) {
      router.replace(getDashboardRouteByRole(currentRole));
    }
  }, [currentBasePath, currentRole, isAuthenticated, isReady, pathname, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Loading panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
        <div className="rounded-2xl border border-red-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-medium text-red-600">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <div className="flex min-h-screen">
        <AppSidebar role={currentRole} />

        <MobileSidebarDrawer
          open={open}
          onClose={() => setOpen(false)}
          role={currentRole}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppTopbar
            role={currentRole}
            title={title}
            onOpenMobileSidebar={() => setOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6">
            <div className="mx-auto w-full max-w-400">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
