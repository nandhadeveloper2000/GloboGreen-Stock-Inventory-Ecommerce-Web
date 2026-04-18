"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import {
  SIDEBAR_MENU,
  type NavItem,
  type UserRole,
} from "@/constants/navigation";

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
  if (item.href) return isPathActive(pathname, item.href);
  if (item.children?.length) {
    return item.children.some((child) => isPathActive(pathname, child.href));
  }
  return false;
}

export default function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const items = useMemo(() => SIDEBAR_MENU[role] ?? [], [role]);

  const defaultOpenMenu = useMemo(() => {
    const activeItem = items.find(
      (item) => item.children?.length && isParentActive(pathname, item)
    );
    return activeItem?.label ?? null;
  }, [items, pathname]);

  const [openMenu, setOpenMenu] = useState<string | null>(defaultOpenMenu);

  useEffect(() => {
    setOpenMenu(defaultOpenMenu);
  }, [defaultOpenMenu]);

  function toggleMenu(label: string) {
    setOpenMenu((prev) => (prev === label ? null : label));
  }

  return (
    <aside className="premium-sidebar hidden min-h-screen w-72 shrink-0 lg:flex lg:flex-col">
      <div className="border-b border-token px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-token bg-white shadow-sm">
            <Image
              src="/favicon.png"
              alt="GloboGreen"
              width={44}
              height={44}
              className="h-full w-full object-contain p-1"
              priority
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-heading">
              GloboGreen
            </p>
            <p className="text-xs text-secondary-text">Enterprise Panel</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
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
                      ? "bg-gradient-primary text-white shadow-[0_14px_32px_rgba(236,6,119,0.18)]"
                      : "text-secondary-text hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                      parentActive
                        ? "bg-white/15 text-white"
                        : "bg-[var(--primary-soft)] text-[var(--primary)] group-hover:bg-[var(--primary-light)]"
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
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-secondary-text hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                      parentActive || isOpen
                        ? "bg-white text-[var(--primary)] shadow-sm"
                        : "bg-[var(--primary-soft)] text-[var(--primary)] group-hover:bg-[var(--primary-light)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="flex-1 line-clamp-1">{item.label}</span>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-text transition-transform duration-200",
                      isOpen ? "rotate-180" : ""
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="ml-5 mt-2 space-y-1 border-l border-token pl-4">
                    {item.children?.map((child) => {
                      const childActive = isPathActive(pathname, child.href);
                      const ChildIcon = getIcon(child.label);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                            childActive
                              ? "bg-gradient-primary font-semibold text-white shadow-[0_12px_26px_rgba(236,6,119,0.16)]"
                              : "text-secondary-text hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                              childActive
                                ? "bg-white/15 text-white"
                                : "bg-[var(--primary-soft)] text-[var(--primary)] group-hover:bg-[var(--primary-light)]"
                            )}
                          >
                            <ChildIcon className="h-4 w-4" />
                          </span>

                          <span className="line-clamp-1">{child.label}</span>
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

      <div className="border-t border-token px-4 py-4">
        <div className="rounded-2xl border border-[rgba(46,49,146,0.12)] bg-[var(--primary-soft)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
            Secure Access
          </p>
          <p className="mt-1 text-xs leading-5 text-secondary-text">
            Role-based navigation enabled for your current account.
          </p>
        </div>
      </div>
    </aside>
  );
}
