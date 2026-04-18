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
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SIDEBAR_MENU,
  type UserRole,
  type NavItem,
} from "@/constants/navigation";
import { Button } from "@/components/ui/button";

type MobileSidebarDrawerProps = {
  open: boolean;
  onClose: () => void;
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

export default function MobileSidebarDrawer({
  open,
  onClose,
  role,
}: MobileSidebarDrawerProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="premium-sidebar absolute left-0 top-0 flex h-full w-[290px] flex-col border-r shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-token px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
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
              <p className="truncate text-sm font-semibold text-heading">
                GloboGreen
              </p>
              <p className="text-xs text-secondary-text">Enterprise Panel</p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-2xl text-secondary-text transition-all hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <nav className="space-y-2">
            {items.map((item) => {
              const Icon = getIcon(item.label);
              const parentActive = isParentActive(pathname, item);
              const hasChildren = Boolean(item.children?.length);
              const isOpen = openMenu === item.label;

              if (!hasChildren && item.href) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
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
                      "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all duration-200",
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
                            onClick={onClose}
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
      </div>
    </div>
  );
}
