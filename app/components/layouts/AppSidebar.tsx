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
  Building2,
  ReceiptText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SIDEBAR_MENU,
  type NavItem,
  type UserRole,
} from "@/constants/navigation";
import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";

type AppSidebarProps = {
  role: UserRole;
};

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type PrimitiveIdObject = {
  _id?: string;
  id?: string;
  $oid?: string;
};

type ShopOwnerAccount =
  | string
  | {
      _id?: string;
      name?: string;
      email?: string;
    };

type ShopItem = {
  _id: string;
  name?: string;
  shopType?: string;
  businessType?: string;
  isMainWarehouse?: boolean;
  frontImageUrl?: string;
  isActive?: boolean;
  shopAddress?: Address;
  shopOwnerAccountId?: ShopOwnerAccount;
};

type AuthUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  role?: string;
  shopIds?: (string | PrimitiveIdObject)[];
  shopId?: string | PrimitiveIdObject;
  avatarUrl?: string;
  verifyEmail?: boolean;
  isActive?: boolean;
  shopControl?: string;
};

type ApiJson = {
  success?: boolean;
  message?: string;
  data?: unknown;
  user?: unknown;
  shops?: unknown[];
};

type SummaryApiEntry = {
  url: string | ((id: string) => string);
  method: string;
};

const SELECTED_SHOP_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_IMAGE_KEY = "selected_shop_image_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

function getIcon(label: string) {
  if (label.includes("Dashboard")) return LayoutDashboard;
  if (label.includes("Staff")) return Users;
  if (label.includes("Shop")) return Store;
  if (label.includes("Purchase")) return ReceiptText;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (isRecord(value)) {
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
    if (typeof value.$oid === "string") return value.$oid;
  }

  return "";
}

function apiUrl(path: string) {
  return `${baseURL}${path}`;
}

function getSummaryEntry(key: string): SummaryApiEntry | null {
  const source = SummaryApi as unknown as Record<string, unknown>;
  const entry = source[key];

  if (!isRecord(entry)) return null;
  if (typeof entry.method !== "string") return null;

  if (typeof entry.url !== "string" && typeof entry.url !== "function") {
    return null;
  }

  return entry as SummaryApiEntry;
}

function resolveDynamicUrl(entry: SummaryApiEntry, id: string) {
  return typeof entry.url === "function" ? entry.url(id) : entry.url;
}

function readShopList(json: ApiJson): ShopItem[] {
  if (Array.isArray(json.data)) return json.data as ShopItem[];
  if (Array.isArray(json.shops)) return json.shops as ShopItem[];
  return [];
}

function readSingleShop(json: ApiJson): ShopItem | null {
  if (isRecord(json.data) && isRecord(json.data.shop)) {
    return json.data.shop as ShopItem;
  }

  if (isRecord(json.data) && typeof json.data._id === "string") {
    return json.data as ShopItem;
  }

  return null;
}

function readSelfData(json: ApiJson): AuthUser | null {
  if (isRecord(json.data) && isRecord(json.data.user)) {
    return json.data.user as AuthUser;
  }

  if (isRecord(json.user)) {
    return json.user as AuthUser;
  }

  if (isRecord(json.data)) {
    return json.data as AuthUser;
  }

  return null;
}

function readStoredShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "", image: "", type: "" };
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
    image: window.localStorage.getItem(SELECTED_SHOP_IMAGE_KEY) || "",
    type: window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "",
  };
}

function writeStoredShop(shop: ShopItem | null) {
  if (typeof window === "undefined") return;

  if (!shop?._id) {
    window.localStorage.removeItem(SELECTED_SHOP_KEY);
    window.localStorage.removeItem(SELECTED_SHOP_NAME_KEY);
    window.localStorage.removeItem(SELECTED_SHOP_IMAGE_KEY);
    window.localStorage.removeItem(SELECTED_SHOP_TYPE_KEY);
    window.dispatchEvent(new Event("shop-selection-changed"));
    return;
  }

  window.localStorage.setItem(SELECTED_SHOP_KEY, shop._id || "");
  window.localStorage.setItem(SELECTED_SHOP_NAME_KEY, shop.name || "");
  window.localStorage.setItem(SELECTED_SHOP_IMAGE_KEY, shop.frontImageUrl || "");
  window.localStorage.setItem(SELECTED_SHOP_TYPE_KEY, shop.shopType || "");
  window.dispatchEvent(new Event("shop-selection-changed"));
}

function isWarehouseRetailShop(shop?: ShopItem | null) {
  return normalizeValue(shop?.shopType) === "WAREHOUSE_RETAIL_SHOP";
}

function isWholesaleShop(shop?: ShopItem | null) {
  return normalizeValue(shop?.shopType) === "WHOLESALE_SHOP";
}

function canShowMyShopProduct(shop?: ShopItem | null) {
  return isWarehouseRetailShop(shop) || isWholesaleShop(shop);
}

function canShowPurchase(shop?: ShopItem | null) {
  return canShowMyShopProduct(shop);
}

function canShowShopManagement(shop?: ShopItem | null) {
  return isWarehouseRetailShop(shop);
}

function resolveDefaultShopForSidebar(shops: ShopItem[], storedId?: string) {
  if (!shops.length) return null;

  if (storedId) {
    const matchedStoredShop = shops.find(
      (shop) => String(shop._id) === String(storedId)
    );

    if (matchedStoredShop) return matchedStoredShop;
  }

  const warehouseRetailShop = shops.find((shop) => isWarehouseRetailShop(shop));

  if (warehouseRetailShop) return warehouseRetailShop;

  const wholesaleShop = shops.find((shop) => isWholesaleShop(shop));

  if (wholesaleShop) return wholesaleShop;

  const mainWarehouseShop = shops.find((shop) => Boolean(shop.isMainWarehouse));

  if (mainWarehouseShop) return mainWarehouseShop;

  return shops[0];
}

function formatShopType(value?: string | null) {
  const normalized = normalizeValue(value);

  switch (normalized) {
    case "WAREHOUSE_RETAIL_SHOP":
      return "Warehouse Retail Shop";
    case "RETAIL_BRANCH_SHOP":
      return "Retail Branch Shop";
    case "BRANCH_RETAIL_SHOP":
      return "Retail Branch Shop";
    case "WHOLESALE_SHOP":
      return "Wholesale Shop";
    case "WAREHOUSE_SHOP":
      return "Warehouse Shop";
    default:
      return value || "Selected Shop";
  }
}

export default function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, accessToken } = useAuth();

  const authUser = (user ?? {}) as AuthUser;
  const items = useMemo(() => SIDEBAR_MENU[role] ?? [], [role]);
  const currentRole = normalizeRole(authUser.role || role);

  const [selectedShop, setSelectedShop] = useState<ShopItem | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  const visibleItems = useMemo(() => {
    if (currentRole !== "SHOP_OWNER") {
      return items;
    }

    return items.filter((item) => {
      if (item.label === "Shop Management") {
        return canShowShopManagement(selectedShop);
      }

      if (item.label === "My Shop Product") {
        return canShowMyShopProduct(selectedShop);
      }

      if (item.label === "Purchase") {
        return canShowPurchase(selectedShop);
      }

      return true;
    });
  }, [currentRole, items, selectedShop]);

  const defaultOpenMenu = useMemo(() => {
    const activeItem = visibleItems.find(
      (item) => item.children?.length && isParentActive(pathname, item)
    );

    return activeItem?.label ?? null;
  }, [pathname, visibleItems]);

  const [openMenu, setOpenMenu] = useState<string | null>(defaultOpenMenu);

  const isShopRole = [
    "SHOP_OWNER",
    "SHOP_MANAGER",
    "SHOP_SUPERVISOR",
    "EMPLOYEE",
  ].includes(currentRole);

  useEffect(() => {
    setOpenMenu(defaultOpenMenu);
  }, [defaultOpenMenu]);

  async function readResponse(res: Response) {
    const text = await res.text();

    try {
      return JSON.parse(text) as ApiJson;
    } catch {
      return {} as ApiJson;
    }
  }

  function syncSidebarFromStorage() {
    if (!isShopRole || typeof window === "undefined") return;

    const stored = readStoredShop();

    if (!stored.id && !stored.name && !stored.image) return;

    setSelectedShop((prev) => ({
      _id: stored.id || prev?._id || "",
      name: stored.name || prev?.name || "",
      frontImageUrl: stored.image || prev?.frontImageUrl || "",
      shopType: stored.type || prev?.shopType || "",
      businessType: prev?.businessType || "",
      isActive: prev?.isActive,
      isMainWarehouse: prev?.isMainWarehouse,
      shopAddress: prev?.shopAddress,
      shopOwnerAccountId: prev?.shopOwnerAccountId,
    }));
  }

  useEffect(() => {
    syncSidebarFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShopRole]);

  useEffect(() => {
    let ignore = false;

    async function fetchSelectedShopForSidebar() {
      if (!isShopRole) {
        if (!ignore) {
          setSelectedShop(null);
          setSidebarLoading(false);
        }
        return;
      }

      try {
        if (!ignore) setSidebarLoading(true);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (typeof accessToken === "string" && accessToken.trim()) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const meEntry =
          currentRole === "SHOP_OWNER"
            ? getSummaryEntry("shopowner_me")
            : getSummaryEntry("shopstaff_me");

        let selfUser: AuthUser | null = null;

        if (meEntry) {
          const meRes = await fetch(apiUrl(resolveDynamicUrl(meEntry, "")), {
            method: meEntry.method,
            headers,
            cache: "no-store",
            credentials: "include",
          });

          if (meRes.ok) {
            const meJson = await readResponse(meRes);
            selfUser = readSelfData(meJson);
          }
        }

        const stored = readStoredShop();

        if (stored.id) {
          const shopGetEntry = getSummaryEntry("shop_get");

          if (shopGetEntry) {
            const shopRes = await fetch(
              apiUrl(resolveDynamicUrl(shopGetEntry, stored.id)),
              {
                method: shopGetEntry.method,
                headers,
                cache: "no-store",
                credentials: "include",
              }
            );

            if (shopRes.ok) {
              const shopJson = await readResponse(shopRes);
              const shop = readSingleShop(shopJson);

              if (!ignore && shop?._id) {
                setSelectedShop(shop);
                setSidebarLoading(false);
                return;
              }
            }
          }
        }

        const shopListEntry = getSummaryEntry("shop_list");

        if (!shopListEntry) {
          if (!ignore) setSidebarLoading(false);
          return;
        }

        const shopListRes = await fetch(
          apiUrl(resolveDynamicUrl(shopListEntry, "")),
          {
            method: shopListEntry.method,
            headers,
            cache: "no-store",
            credentials: "include",
          }
        );

        if (!shopListRes.ok) {
          if (!ignore) setSidebarLoading(false);
          return;
        }

        const shopListJson = await readResponse(shopListRes);
        let shops = readShopList(shopListJson);

        const ownerId = getId(selfUser?._id) || getId(selfUser?.id);

        const allowedShopIds = Array.isArray(selfUser?.shopIds)
          ? selfUser.shopIds.map((item) => getId(item)).filter(Boolean)
          : [];

        if (currentRole === "SHOP_OWNER") {
          shops = shops.filter((shop) => {
            const shopOwnerId =
              typeof shop.shopOwnerAccountId === "string"
                ? shop.shopOwnerAccountId
                : shop.shopOwnerAccountId?._id || "";

            const shopId = String(shop._id || "");

            if (
              ownerId &&
              shopOwnerId &&
              String(shopOwnerId) === String(ownerId)
            ) {
              return true;
            }

            if (allowedShopIds.length && allowedShopIds.includes(shopId)) {
              return true;
            }

            return false;
          });
        } else {
          const currentShopId = getId(selfUser?.shopId) || getId(authUser.shopId);

          shops = currentShopId
            ? shops.filter((shop) => String(shop._id) === String(currentShopId))
            : [];
        }

        if (!ignore) {
          const fallbackShop = resolveDefaultShopForSidebar(shops, stored.id);
          setSelectedShop(fallbackShop);
          writeStoredShop(fallbackShop);
        }
      } catch {
        if (!ignore) {
          syncSidebarFromStorage();
        }
      } finally {
        if (!ignore) {
          setSidebarLoading(false);
        }
      }
    }

    void fetchSelectedShopForSidebar();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, authUser.shopId, currentRole, isShopRole]);

  useEffect(() => {
    function handleShopSelectionChanged() {
      syncSidebarFromStorage();
    }

    if (typeof window !== "undefined") {
      window.addEventListener(
        "shop-selection-changed",
        handleShopSelectionChanged
      );
      window.addEventListener("storage", handleShopSelectionChanged);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "shop-selection-changed",
          handleShopSelectionChanged
        );
        window.removeEventListener("storage", handleShopSelectionChanged);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShopRole]);

  function toggleMenu(label: string) {
    setOpenMenu((prev) => (prev === label ? null : label));
  }

  const sidebarTitle = isShopRole
    ? selectedShop?.name || authUser.name || authUser.username || "Shop Panel"
    : "GloboGreen";

  const sidebarSubtitle = isShopRole
    ? formatShopType(selectedShop?.shopType || selectedShop?.businessType)
    : "Enterprise Panel";

  const sidebarImage = isShopRole
    ? selectedShop?.frontImageUrl || authUser.avatarUrl || ""
    : "";

  return (
    <aside className="premium-sidebar hidden min-h-screen w-72 shrink-0 lg:flex lg:flex-col">
      <div className="border-b border-token px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-token bg-white shadow-sm">
            {sidebarImage ? (
              <Image
                src={sidebarImage}
                alt={sidebarTitle}
                width={44}
                height={44}
                className="h-full w-full object-cover"
                priority
              />
            ) : isShopRole ? (
              <div className="flex h-full w-full items-center justify-center bg-primary-soft text-primary">
                <Building2 className="h-5 w-5" />
              </div>
            ) : (
              <Image
                src="/favicon.png"
                alt="GloboGreen"
                width={44}
                height={44}
                className="h-full w-full object-contain p-1"
                priority
              />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-heading">
              {sidebarLoading && isShopRole ? "Loading..." : sidebarTitle}
            </p>

            <p className="truncate text-xs text-secondary-text">
              {sidebarSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
          Navigation
        </div>

        <nav className="space-y-2">
          {visibleItems.map((item) => {
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
                      ? "bg-gradient-primary text-white shadow-[0_14px_32px_rgba(22,163,74,0.18)]"
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
                    "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all duration-200",
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
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                            childActive
                              ? "bg-gradient-primary font-semibold text-white shadow-[0_12px_26px_rgba(22,163,74,0.16)]"
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

      <div className="border-t border-token px-4 py-4">
        <div className="rounded-2xl border border-[rgba(0,0,139,0.12)] bg-primary-soft px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
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

