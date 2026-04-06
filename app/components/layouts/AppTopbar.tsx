"use client";

import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvatarDropdown from "@/components/layouts/AvatarDropdown";
import type { UserRole } from "@/constants/navigation";

type AppTopbarProps = {
  role: UserRole;
  title?: string;
  onOpenMobileSidebar?: () => void;
};

export default function AppTopbar({
  role,
  title = "Dashboard",
  onOpenMobileSidebar,
}: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="h-10 w-10 rounded-xl border-slate-200 bg-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {title}
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Welcome back. Manage your operations efficiently.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-slate-200 bg-white"
        >
          <Bell className="h-4 w-4 text-slate-700" />
        </Button>

        <AvatarDropdown role={role} />
      </div>
    </header>
  );
}