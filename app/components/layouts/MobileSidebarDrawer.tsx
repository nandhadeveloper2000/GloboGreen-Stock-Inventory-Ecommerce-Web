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

const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

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

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function isWarehouseOnlySection(label: string) {
  return label === "Shop Management" || label === "My Shop Product";
}

export default function MobileSidebarDrawer({
  open,
  onClose,
  role,
}: MobileSidebarDrawerProps) {
  const pathname = usePathname();
  const items = useMemo(() => SIDEBAR_MENU[role] ?? [], [role]);
  const [selectedShopType, setSelectedShopType] = useState("");
  const currentRole = useMemo(() => normalizeRole(role), [role]);
  const visibleItems = useMemo(() => {
    if (currentRole !== "SHOP_OWNER") {
      return items;
    }

    return items.filter((item) => {
      if (!isWarehouseOnlySection(item.label)) {
        return true;
      }

      return normalizeValue(selectedShopType) === "WAREHOUSE_RETAIL_SHOP";
    });
  }, [currentRole, items, selectedShopType]);

  const defaultOpenMenu = useMemo(() => {
    const activeItem = visibleItems.find(
      (item) => item.children?.length && isParentActive(pathname, item)
    );
    return activeItem?.label ?? null;
  }, [pathname, visibleItems]);

  const [openMenu, setOpenMenu] = useState<string | null>(defaultOpenMenu);

  useEffect(() => {
    setOpenMenu(defaultOpenMenu);
  }, [defaultOpenMenu]);

  useEffect(() => {
    function syncSelectedShopType() {
      if (typeof window === "undefined") return;

      setSelectedShopType(
        window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || ""
      );
    }

    syncSelectedShopType();

    if (typeof window !== "undefined") {
      window.addEventListener("storage", syncSelectedShopType);
      window.addEventListener(
        "shop-selection-changed",
        syncSelectedShopType as EventListener
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", syncSelectedShopType);
        window.removeEventListener(
          "shop-selection-changed",
          syncSelectedShopType as EventListener
        );
      }
    };
  }, []);

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
            className="h-10 w-10 rounded-2xl text-secondary-text transition-all hover:bg-primary-soft hover:text-primary"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <nav className="space-y-2">
            {visibleItems.map((item) => {
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
                        : "text-secondary-text hover:bg-primary-soft hover:text-primary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                        parentActive
                          ? "bg-white/15 text-white"
                          : "bg-primary-soft text-primary group-hover:bg-primary-light"
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
                        ? "bg-primary-soft text-primary"
                        : "text-secondary-text hover:bg-primary-soft hover:text-primary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                        parentActive || isOpen
                          ? "bg-white text-primary shadow-sm"
                          : "bg-primary-soft text-primary group-hover:bg-primary-light"
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
                                : "text-secondary-text hover:bg-primary-soft hover:text-primary"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                                childActive
                                  ? "bg-white/15 text-white"
                                  : "bg-primary-soft text-primary group-hover:bg-primary-light"
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
