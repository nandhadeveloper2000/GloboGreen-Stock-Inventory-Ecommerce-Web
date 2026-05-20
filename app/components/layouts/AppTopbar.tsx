"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
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
import NotificationBell from "@/components/notifications/bell";
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

type FlatNavLink = {
  label: string;
  href: string;
};

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeRoleValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function normalizeNavKey(value?: string | null) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function isShopRole(role: UserRole) {
  return [
    "SHOP_OWNER",
    "SHOP_MANAGER",
    "SHOP_SUPERVISOR",
    "EMPLOYEE",
  ].includes(normalizeRoleValue(role));
}

function isMasterAdminRole(role: UserRole) {
  return normalizeRoleValue(role) === "MASTER_ADMIN";
}

function isInternalCatalogRole(role: UserRole) {
  return ["MASTER_ADMIN", "MANAGER"].includes(normalizeRoleValue(role));
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

function joinRoute(base: string, path: string) {
  const safeBase = String(base || "").replace(/\/+$/, "");
  const safePath = String(path || "").startsWith("/") ? path : `/${path}`;

  return `${safeBase}${safePath}`.replace(/\/{2,}/g, "/");
}

function getBasePathFromDashboard(dashboardHref: string) {
  const value = normalizeText(dashboardHref);

  if (!value) return "";

  if (value.endsWith("/dashboard")) {
    return value.replace(/\/dashboard$/, "");
  }

  const parts = value.split("/").filter(Boolean);

  if (parts.length <= 1) return "";

  return `/${parts.slice(0, -1).join("/")}`;
}

function flattenNavLinks(items: NavItem[]) {
  const links: FlatNavLink[] = [];

  items.forEach((item) => {
    if (item.href) {
      links.push({
        label: item.label,
        href: item.href,
      });
    }

    item.children?.forEach((child) => {
      if (child.href) {
        links.push({
          label: child.label,
          href: child.href,
        });
      }
    });
  });

  return links;
}

function findHrefByLabels(
  items: NavItem[],
  labels: string[],
  fallbackHref: string
) {
  const links = flattenNavLinks(items);
  const targetKeys = labels.map(normalizeNavKey);

  const matched = links.find((link) =>
    targetKeys.includes(normalizeNavKey(link.label))
  );

  return matched?.href || fallbackHref;
}

function getSectionItems(items: NavItem[], label: string) {
  const section = items.find((item) => item.label === label);
  return compactItems(section?.children ?? []);
}

function getMenuIcon(label: string): LucideIcon {
  const value = label.toLowerCase();

  if (value.includes("dashboard")) return LayoutDashboard;
  if (value.includes("master")) return Grid3X3;
  if (value.includes("catalog")) return Grid3X3;
  if (value.includes("barcode") || value.includes("qr")) return Grid3X3;
  if (value.includes("stock transfer")) return Truck;
  if (value.includes("stock")) return Boxes;
  if (value.includes("approval")) return ListChecks;
  if (value.includes("compatibility")) return ListChecks;
  if (value.includes("product")) return Package;
  if (value.includes("category")) return Tags;
  if (value.includes("brand")) return Tags;
  if (value.includes("model")) return Package;
  if (value.includes("customer")) return UserRound;
  if (value.includes("supplier") || value.includes("vendor")) return Store;
  if (value.includes("shop owner")) return Store;
  if (value.includes("shop")) return Building2;
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

function buildMasterAdminTopMenu(
  role: UserRole,
  sidebarItems: NavItem[]
): TopMenuItem[] {
  const dashboard = sidebarItems.find((item) => item.label === "Dashboard");
  const dashboardHref =
    dashboard?.href ||
    `/${String(role).toLowerCase().replace(/_/g, "")}/dashboard`;

  const catalogItems =
    getSectionItems(sidebarItems, "Catalog") ||
    [];
  const productItems =
    getSectionItems(sidebarItems, "Product") ||
    [];
  const staffManagementItems = getSectionItems(sidebarItems, "Staff Management");
  const shopOwnerManagementItems = getSectionItems(
    sidebarItems,
    "Shop Owner Management"
  );
  const reportItems = getSectionItems(sidebarItems, "Reports");

  const fallbackCatalogItems =
    catalogItems.length > 0
      ? catalogItems
      : [
          {
            label: "Categories",
            href: findHrefByLabels(
              sidebarItems,
              ["Categories", "Category List"],
              "/master/category/list"
            ),
          },
          {
            label: "Subcategories",
            href: findHrefByLabels(
              sidebarItems,
              ["Subcategories", "Subcategory List", "Sub Category List"],
              "/master/subcategory/list"
            ),
          },
          {
            label: "Brand",
            href: findHrefByLabels(
              sidebarItems,
              ["Brand", "Brand List", "Brands"],
              "/master/brand/list"
            ),
          },
          {
            label: "Model",
            href: findHrefByLabels(
              sidebarItems,
              ["Model", "Model List", "Models"],
              "/master/model/list"
            ),
          },
          {
            label: "Product Type",
            href: findHrefByLabels(
              sidebarItems,
              ["Product Type", "Product Types"],
              "/master/producttype/list"
            ),
          },
          {
            label: "Compatibility",
            href: findHrefByLabels(
              sidebarItems,
              ["Compatibility", "Product Compatibility"],
              "/master/compatibility/list"
            ),
          },
        ];

  const fallbackProductItems =
    productItems.length > 0
      ? productItems
      : [
          {
            label: "Product List",
            href: findHrefByLabels(
              sidebarItems,
              ["Product List", "Products List", "All Products"],
              "/master/product/list"
            ),
          },
          {
            label: "Product Approvals",
            href: findHrefByLabels(
              sidebarItems,
              ["Product Approvals"],
              "/master/product/approvals"
            ),
          },
        ];

  return [
    {
      label: "Dashboard",
      href: dashboardHref,
      icon: LayoutDashboard,
    },
    {
      label: "Catalog",
      icon: Grid3X3,
      columns: [
        {
          title: "Catalog",
          icon: Tags,
          items: fallbackCatalogItems,
        },
      ],
    },
    {
      label: "Product",
      icon: Package,
      columns: [
        {
          title: "Products",
          icon: Package,
          items: fallbackProductItems,
        },
      ],
    },
    {
      label: "Management",
      icon: Users,
      columns: [
        {
          title: "Staff Management",
          icon: Users,
          items:
            staffManagementItems.length > 0
              ? staffManagementItems
              : [
                  {
                    label: "Staff List",
                    href: "/master/staff/list",
                  },
                ],
        },
        {
          title: "Shop Owner Management",
          icon: Store,
          items:
            shopOwnerManagementItems.length > 0
              ? shopOwnerManagementItems
              : [
                  {
                    label: "Shop Owner List",
                    href: "/master/shopowner/list",
                  },
                ],
        },
      ],
    },
      ];
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
      label: "Inventory",
      icon: Warehouse,
      columns: [
        {
          title: "Products & Stock",
          icon: Package,
          items: [
            { label: "Product List", href: path("/product/list") },
            { label: "Stock List", href: path("/stock/list") },
            { label: "Stock Entry", href: path("/physical-stock/create") },
            { label: "Stock Transfer", href: path("/stock-transfers/list") },
            { label: "Barcode / QR", href: path("/barcode-printing/create") },
          ],
        },
        {
          title: "Catalog",
          icon: Tags,
          items: [
            { label: "Categories", href: path("/categories/list") },
            { label: "Subcategories", href: path("/subcategories/list") },
            { label: "Brand", href: path("/brands/list") },
            { label: "Model", href: path("/models/list") },
          ],
        },
        {
          title: "People",
          icon: Users,
          items: [
            { label: "Customers", href: path("/customer/list") },
            { label: "Suppliers", href: path("/vendors/list") },
            { label: "Shop Staff", href: path("/shopstaff/list") },
          ],
        },
        {
          title: "Expenses",
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
      ],
    },
    {
      label: "Finance",
      icon: CircleDollarSign,
      columns: [
        {
          title: "Payments",
          icon: WalletCards,
          items: [
            { label: "Payment Entry", href: path("/payments/create") },
            { label: "Payment List", href: path("/payments/list") },
          ],
        },
        {
          title: "Discounts",
          icon: Tags,
          items: [
            { label: "Create Discount", href: path("/discounts/create") },
            { label: "Discount List", href: path("/discounts/list") },
          ],
        },
        {
          title: "Price Lists",
          icon: ListChecks,
          items: [
            { label: "Product Price List", href: path("/price-lists/list") },
          ],
        },
        {
          title: "Loyalty",
          icon: UserRound,
          items: [
            { label: "Loyalty Report", href: path("/loyalty/report") },
          ],
        },
      ],
    },
    {
      label: "Reports",
      icon: FileBarChart2,
      columns: [
        {
          title: "Business Reports",
          icon: FileBarChart2,
          items: [
            { label: "Sales Report", href: path("/reports/sales") },
            { label: "Purchase Report", href: path("/reports/purchases") },
            { label: "Expense Report", href: path("/reports/expenses") },
            { label: "GST Report", href: path("/reports/gst") },
            { label: "Loyalty Report", href: path("/loyalty/report") },
          ],
        },
        {
          title: "Stock Reports",
          icon: Boxes,
          items: [
            { label: "Physical Stock", href: path("/physical-stock/list") },
            { label: "Sales Returns", href: path("/salesreturn/list") },
            { label: "Purchase Returns", href: path("/purchasereturn/list") },
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
            { label: "Shop Profile", href: path("/shopprofile/list") },
            { label: "Staff", href: path("/shopstaff/list") },
            { label: "Label Settings", href: path("/barcode-printing/settings/label-settings") },
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

    if (
      isInternalCatalogRole(role) &&
      sidebarItems.some(
        (item) => item.label === "Catalog" || item.label === "Product"
      )
    ) {
      return buildMasterAdminTopMenu(role, sidebarItems);
    }

    return buildDefaultTopMenu(role, sidebarItems);
  }, [role, sidebarItems]);


  const closeActiveMenuOnRouteChange = useEffectEvent(() => {
    setActiveMenu(null);
  });

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
    closeActiveMenuOnRouteChange();
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
                "href" in item && item.href
                  ? isPathActive(pathname, item.href)
                  : "columns" in item
                    ? hasActiveColumn(pathname, item.columns ?? [])
                    : false;

              const isOpen = activeMenu === item.label;
              const megaColumns = "columns" in item ? item.columns ?? [] : [];

              return (
                <div
                  key={item.label}
                  className="relative"
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

                  {isOpen && megaColumns.length > 0 ? (
                    <div
                      onMouseEnter={clearCloseTimer}
                      onMouseLeave={closeMenuSlowly}
                      className={cn(
                        "absolute top-full left-0 z-50 overflow-hidden rounded-b-xl border border-slate-200 bg-white text-slate-900 shadow-[0_20px_45px_rgba(15,23,42,0.22)]",
                        getDropdownWidthClass(megaColumns.length)
                      )}
                    >
                      <div
                        className={cn(
                          "grid gap-0",
                          getDropdownGridClass(megaColumns.length)
                        )}
                      >
                        {megaColumns.map((column) => {
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
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell
            triggerClassName="relative h-9 w-9 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
            iconClassName="h-4 w-4"
          />

          <AvatarDropdown role={role} />
        </div>
      </div>

    </header>
  );
}
