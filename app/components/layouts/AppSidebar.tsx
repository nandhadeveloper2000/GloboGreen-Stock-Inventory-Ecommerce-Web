"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Store,
  Layers3,
  Shapes,
  Boxes,
  Tag,
  Wrench,
  Package2,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SIDEBAR_MENU, type NavItem, type UserRole } from "@/constants/navigation";

type AppSidebarProps = {
  role: UserRole;
};

function getIcon(label: string) {
  if (label.includes("Dashboard")) return LayoutDashboard;
  if (label.includes("Staff")) return Users;
  if (label.includes("Shop")) return Store;
  if (label.includes("Master Category")) return Layers3;
  if (label.includes("Subcategory")) return Boxes;
  if (label.includes("Category")) return Shapes;
  if (label.includes("Brand")) return Tag;
  if (label.includes("Model")) return Wrench;
  if (label.includes("Complaint")) return ShieldAlert;
  if (label.includes("Product")) return Package2;
  return LayoutDashboard;
}

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isParentActive(pathname: string, item: NavItem) {
  if (item.href) {
    return isPathActive(pathname, item.href);
  }

  if (item.children?.length) {
    return item.children.some((child) => isPathActive(pathname, child.href));
  }

  return false;
}

export default function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = SIDEBAR_MENU[role] ?? [];

  const defaultOpenMenu = useMemo(() => {
    const activeItem = items.find(
      (item) => item.children?.length && isParentActive(pathname, item)
    );
    return activeItem?.label ?? null;
  }, [items, pathname]);

  const [openMenu, setOpenMenu] = useState<string | null>(defaultOpenMenu);

  function toggleMenu(label: string) {
    setOpenMenu((prev) => (prev === label ? null : label));
  }

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-slate-950 text-white lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-green-700 text-lg font-bold text-white shadow-lg">
            G
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-white">
              GloboGreen
            </p>
            <p className="text-xs text-slate-400">Enterprise Panel</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Navigation
        </div>

        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = getIcon(item.label);
            const parentActive = isParentActive(pathname, item);
            const hasChildren = Boolean(item.children?.length);
            const isOpen = openMenu === item.label;

            if (!hasChildren && item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
                    parentActive
                      ? "bg-linear-to-rrom-emerald-600 to-green-700 text-white shadow-[0_10px_30px_rgba(16,185,129,0.28)]"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                      parentActive
                        ? "bg-white/15"
                        : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="line-clamp-1">{item.label}</span>
                </Link>
              );
            }

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all duration-200",
                    parentActive || isOpen
                      ? "bg-white/5 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                      parentActive || isOpen
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="flex-1 line-clamp-1">{item.label}</span>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                      isOpen ? "rotate-180" : ""
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="ml-5 mt-2 space-y-1 border-l border-white/10 pl-4">
                    {item.children?.map((child) => {
                      const childActive = isPathActive(pathname, child.href);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                            childActive
                              ? "bg-linear-to-r from-emerald-600 to-green-700 font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.22)]"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Secure Access
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Role-based navigation enabled for your current account.
          </p>
        </div>
      </div>
    </aside>
  );
}