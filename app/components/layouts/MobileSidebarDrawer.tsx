"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { SIDEBAR_MENU, type UserRole } from "@/constants/navigation";
import { Button } from "@/components/ui/button";

type MobileSidebarDrawerProps = {
  open: boolean;
  onClose: () => void;
  role: UserRole;
};

export default function MobileSidebarDrawer({
  open,
  onClose,
  role,
}: MobileSidebarDrawerProps) {
  const pathname = usePathname();
  const items = SIDEBAR_MENU[role] ?? [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute left-0 top-0 flex h-full w-[290px] flex-col bg-slate-950 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold">GloboGreen</p>
            <p className="text-xs text-slate-400">Enterprise Panel</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-xl text-white hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <nav className="space-y-3">
            {items.map((item) => {
              if (item.href) {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                      active
                        ? "bg-linear-to-r from-emerald-600 to-green-700 text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              }

              if (item.children?.length) {
                return (
                  <div key={item.label} className="space-y-1.5">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.label}
                    </p>

                    {item.children.map((child) => {
                      const active =
                        pathname === child.href ||
                        pathname.startsWith(`${child.href}/`);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "block rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                            active
                              ? "bg-linear-to-r from-emerald-600 to-green-700 text-white"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                );
              }

              return null;
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}