"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  CircleDollarSign,
  FileBarChart2,
  Grid3X3,
  History,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  Package,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  UserRound,
  Users,
  WalletCards,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import AvatarDropdown from "@/components/layouts/AvatarDropdown";
import {
  SIDEBAR_MENU,
  type NavChildItem,
  type NavItem,
  type UserRole,
} from "@/constants/navigation";
import { cn } from "@/lib/utils";

const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

type AppTopbarProps = {
  role: UserRole;
  onOpenMobileSidebar?: () => void;
};

type MegaMenuColumn = {
  title: string;
  icon: LucideIcon;
  items: NavChildItem[];
};

type TopMenuItem =
  | {
      label: string;
      href: string;
      icon: LucideIcon;
      columns?: never;
    }
  | {
      label: string;
      icon: LucideIcon;
      columns: MegaMenuColumn[];
      href?: never;
    };

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeRoleValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function isShopRole(role: UserRole) {
  return [
    "SHOP_OWNER",
    "SHOP_MANAGER",
    "SHOP_SUPERVISOR",
    "EMPLOYEE",
  ].includes(normalizeRoleValue(role));
}

function getRoleBasePath(role: UserRole) {
  switch (normalizeRoleValue(role)) {
    case "SHOP_OWNER":
      return "/shopowner";
    case "SHOP_MANAGER":
      return "/shopmanager";
    case "SHOP_SUPERVISOR":
      return "/shopsupervisor";
    case "EMPLOYEE":
      return "/employee";
    default:
      return "";
  }
}

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActiveColumn(pathname: string, columns: MegaMenuColumn[]) {
  return columns.some((column) =>
    column.items.some((item) => isPathActive(pathname, item.href))
  );
}

function compactItems(items: NavChildItem[]) {
  return items.filter((item) => Boolean(item.label && item.href));
}

function getMenuIcon(label: string): LucideIcon {
  const value = label.toLowerCase();

  if (value.includes("dashboard")) return LayoutDashboard;
  if (value.includes("master")) return Grid3X3;
  if (value.includes("barcode") || value.includes("qr")) return Grid3X3;
  if (value.includes("stock transfer")) return Truck;
  if (value.includes("stock")) return Boxes;
  if (value.includes("product")) return Package;
  if (value.includes("category")) return Tags;
  if (value.includes("brand")) return Tags;
  if (value.includes("model")) return Package;
  if (value.includes("customer")) return UserRound;
  if (value.includes("supplier") || value.includes("vendor")) return Store;
  if (value.includes("user") || value.includes("staff")) return Users;
  if (value.includes("location")) return MapPin;
  if (value.includes("expense")) return WalletCards;
  if (value.includes("sale")) return ShoppingBag;
  if (value.includes("purchase")) return ShoppingCart;
  if (value.includes("return")) return RotateCcw;
  if (value.includes("history") || value.includes("view")) return History;
  if (value.includes("report")) return FileBarChart2;
  if (value.includes("setting")) return Settings;

  return ListChecks;
}

function buildShopTopMenu(role: UserRole): TopMenuItem[] {
  const base = getRoleBasePath(role) || "/shopowner";
  const path = (href: string) => `${base}${href}`;

  return [
    {
      label: "Dashboard",
      href: path("/dashboard"),
      icon: LayoutDashboard,
    },
    {
      label: "Master",
      icon: Grid3X3,
      columns: [
        {
          title: "Inventory",
          icon: Warehouse,
          items: [
            { label: "Product List", href: path("/products/list") },
            { label: "Categories", href: path("/categories/list") },
            { label: "Subcategories", href: path("/subcategories/list") },
            { label: "Brand", href: path("/brands/list") },
            { label: "Model", href: path("/models/list") },
            { label: "Barcode / QR Generate", href: path("/barcode-printing/create") },
            { label: "Stock Transfer", href: path("/stock-transfer/list") },
          ],
        },
        {
          title: "People & Locations",
          icon: Users,
          items: [
            { label: "Customers", href: path("/customer/list") },
            { label: "Suppliers", href: path("/vendors/list") },
            { label: "Users", href: path("/shopstaff/list") },
            { label: "Locations", href: path("/shopprofile/list") },
          ],
        },
        {
          title: "Physical Stock Management",
          icon: Boxes,
          items: [
            { label: "Stock Entry", href: path("/physical-stock-entry/create") },
            { label: "View Stock Entry", href: path("/physical-stock-entry/list") },
          ],
        },
        {
          title: "Expense Management",
          icon: WalletCards,
          items: [
            { label: "Expense Entry", href: path("/expenses/create") },
            { label: "View Expenses", href: path("/expenses/list") },
          ],
        },
      ],
    },
    {
      label: "Sales",
      icon: ShoppingBag,
      columns: [
        {
          title: "Sales Operations",
          icon: CircleDollarSign,
          items: [
            { label: "Sales Entry", href: path("/sales/create") },
            { label: "Sales Return", href: path("/salesreturn/create") },
          ],
        },
        {
          title: "Sales History",
          icon: History,
          items: [
            { label: "View Sales", href: path("/sales/list") },
            { label: "View Sales Returns", href: path("/salesreturn/list") },
          ],
        },
      ],
    },
    {
      label: "Purchases",
      icon: ShoppingCart,
      columns: [
        {
          title: "Purchase Operations",
          icon: ShoppingCart,
          items: [
            { label: "Purchase Entry", href: path("/purchase/create") },
            { label: "Purchase Return", href: path("/purchasereturn/create") },
          ],
        },
        {
          title: "Purchase History",
          icon: History,
          items: [
            { label: "View Purchases", href: path("/purchase/list") },
            { label: "View Purchase Returns", href: path("/purchasereturn/list") },
          ],
        },
        {
          title: "Suppliers",
          icon: Store,
          items: [
            { label: "Supplier List", href: path("/vendors/list") },
            { label: "Create Supplier", href: path("/vendors/create") },
          ],
        },
      ],
    },
    {
      label: "Reports",
      icon: FileBarChart2,
      columns: [
        {
          title: "Reports",
          icon: FileBarChart2,
          items: [
            { label: "Sales Report", href: path("/sales/list") },
            { label: "Purchase Report", href: path("/purchase/list") },
            { label: "Expense Report", href: path("/expenses/list") },
            { label: "Physical Stock Report", href: path("/physical-stock/list") },
            { label: "Sales Return Report", href: path("/salesreturn/list") },
            {
              label: "Purchase Return Report",
              href: path("/purchasereturn/list"),
            },
          ],
        },
      ],
    },
    {
      label: "Settings",
      icon: Settings,
      columns: [
        {
          title: "Settings",
          icon: Settings,
          items: [
            { label: "Shop List", href: path("/shopprofile/list") },
            { label: "Users", href: path("/shopstaff/list") },
            { label: "Label Settings", href: path("/barcode/label-settings") },
          ],
        },
      ],
    },
  ];
}

function findItem(items: NavItem[], label: string) {
  return items.find((item) => item.label === label);
}

function buildDefaultTopMenu(role: UserRole, items: NavItem[]): TopMenuItem[] {
  const dashboard = findItem(items, "Dashboard");
  const restItems = items.filter((item) => item.label !== "Dashboard");

  const columns: MegaMenuColumn[] = restItems.map((item) => ({
    title: item.label,
    icon: getMenuIcon(item.label),
    items: compactItems(
      item.children ?? (item.href ? [{ label: item.label, href: item.href }] : [])
    ),
  }));

  return [
    {
      label: "Dashboard",
      href: dashboard?.href || `/${String(role).toLowerCase()}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      label: "Master",
      icon: Grid3X3,
      columns,
    },
  ];
}

function getPosRoute(role: UserRole) {
  const base = getRoleBasePath(role);
  return base ? `${base}/sales/create` : "";
}

function getDropdownGridClass(columnCount: number) {
  if (columnCount >= 4) return "grid-cols-4";
  if (columnCount === 3) return "grid-cols-3";
  if (columnCount === 2) return "grid-cols-2";
  return "grid-cols-1";
}

function getDropdownWidthClass(columnCount: number) {
  if (columnCount >= 4) return "w-[880px]";
  if (columnCount === 3) return "w-[720px]";
  if (columnCount === 2) return "w-[560px]";
  return "w-[330px]";
}

export default function AppTopbar({
  role,
  onOpenMobileSidebar,
}: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedShopName, setSelectedShopName] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const sidebarItems = useMemo(() => SIDEBAR_MENU[role] ?? [], [role]);

  const topMenu = useMemo<TopMenuItem[]>(() => {
    if (isShopRole(role)) {
      return buildShopTopMenu(role);
    }

    return buildDefaultTopMenu(role, sidebarItems);
  }, [role, sidebarItems]);

  const activeMega = useMemo(() => {
    if (!activeMenu) return null;

    const item = topMenu.find(
      (menuItem) => menuItem.label === activeMenu && "columns" in menuItem
    );

    return item && "columns" in item ? item : null;
  }, [activeMenu, topMenu]);

  const posRoute = useMemo(() => getPosRoute(role), [role]);
  const shouldShowPos = Boolean(posRoute && isShopRole(role));

  useEffect(() => {
    function syncShopName() {
      try {
        setSelectedShopName(
          window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || ""
        );
      } catch {
        setSelectedShopName("");
      }
    }

    syncShopName();

    window.addEventListener("storage", syncShopName);
    window.addEventListener(
      "shop-selection-changed",
      syncShopName as EventListener
    );

    return () => {
      window.removeEventListener("storage", syncShopName);
      window.removeEventListener(
        "shop-selection-changed",
        syncShopName as EventListener
      );
    };
  }, []);

  useEffect(() => {
    setActiveMenu(null);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu(label: string) {
    clearCloseTimer();
    setActiveMenu(label);
  }

  function closeMenuSlowly() {
    clearCloseTimer();

    closeTimerRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 160);
  }

  function handleTopClick(item: TopMenuItem) {
    if ("href" in item && item.href) {
      router.push(item.href);
      setActiveMenu(null);
      return;
    }

    setActiveMenu((prev) => (prev === item.label ? null : item.label));
  }

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-[#000070] bg-[#00008b] text-white shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
      <div className="flex h-14 w-full items-center justify-between px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenMobileSidebar}
            className="h-9 w-9 rounded-lg text-white hover:bg-white/10 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link
            href={topMenu[0]?.href || "#"}
            className="flex min-w-0 items-center gap-2 pr-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#00008b] shadow-sm">
              <Building2 className="h-4 w-4" />
            </span>

            <span className="truncate text-lg font-bold tracking-wide">
              {normalizeText(selectedShopName) || "Globo Green"}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {topMenu.map((item) => {
              const Icon = item.icon;

              const isActive =
                "href" in item
                  ? isPathActive(pathname, item.href)
                  : hasActiveColumn(pathname, item.columns);

              const isOpen = activeMenu === item.label;

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => {
                    if ("columns" in item) openMenu(item.label);
                  }}
                  onMouseLeave={() => {
                    if ("columns" in item) closeMenuSlowly();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleTopClick(item)}
                    aria-expanded={isOpen}
                    className={cn(
                      "flex h-14 items-center gap-1.5 px-3 text-sm font-semibold transition-colors",
                      isActive || isOpen
                        ? "bg-white/15 text-white"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>

                    {"columns" in item ? (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isOpen ? "rotate-180" : ""
                        )}
                      />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {shouldShowPos ? (
            <Link
              href={posRoute}
              className="hidden h-9 items-center gap-2 rounded-md bg-[#00c7b7] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#00afa2] sm:flex"
            >
              <Grid3X3 className="h-4 w-4" />
              POS
            </Link>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-white hover:bg-white/10"
          >
            <Bell className="h-4 w-4" />
          </Button>

          <AvatarDropdown role={role} />
        </div>
      </div>

      {activeMega ? (
        <div
          onMouseEnter={clearCloseTimer}
          onMouseLeave={closeMenuSlowly}
          className={cn(
            "absolute top-14 z-50 hidden overflow-hidden rounded-b-xl border border-slate-200 bg-white text-slate-900 shadow-[0_20px_45px_rgba(15,23,42,0.22)] lg:left-[230px] lg:block",
            getDropdownWidthClass(activeMega.columns.length)
          )}
        >
          <div
            className={cn(
              "grid gap-0",
              getDropdownGridClass(activeMega.columns.length)
            )}
          >
            {activeMega.columns.map((column) => {
              const ColumnIcon = column.icon;

              return (
                <section
                  key={column.title}
                  className="min-w-0 border-r border-slate-100 px-4 py-4 last:border-r-0"
                >
                  <div className="mb-3 border-b border-slate-100 pb-3">
                    <h3 className="flex items-center gap-2 whitespace-nowrap text-xs font-bold text-blue-700">
                      <ColumnIcon className="h-4 w-4 shrink-0" />
                      <span>{column.title}</span>
                    </h3>
                  </div>

                  <div className="space-y-1">
                    {column.items.map((child) => {
                      const ChildIcon = getMenuIcon(child.label);
                      const active = isPathActive(pathname, child.href);

                      return (
                        <Link
                          key={`${column.title}-${child.href}-${child.label}`}
                          href={child.href}
                          onClick={() => setActiveMenu(null)}
                          className={cn(
                            "flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-800 hover:bg-blue-50 hover:text-blue-700"
                          )}
                        >
                          <ChildIcon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              active ? "text-blue-700" : "text-slate-500"
                            )}
                          />

                          <span className="leading-5">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}