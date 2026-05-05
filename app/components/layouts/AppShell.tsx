"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/auth/AuthProvider";
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

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, isReady, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const currentRole = useMemo<UserRole | null>(
    () => normalizeRole(role),
    [role]
  );

  const currentBasePath = useMemo(
    () => getAppBasePathByRole(currentRole),
    [currentRole]
  );

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
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Loading panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-red-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm font-medium text-red-600">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f4f4]">
      <AppTopbar
        role={currentRole}
        onOpenMobileSidebar={() => setOpen(true)}
      />

      <MobileSidebarDrawer
        open={open}
        onClose={() => setOpen(false)}
        role={currentRole}
      />

      <main className="min-h-[calc(100vh-56px)] p-3 sm:p-4">
        <div className="mx-auto w-full max-w-none">{children}</div>
      </main>
    </div>
  );
}