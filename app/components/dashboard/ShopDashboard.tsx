"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MailCheck,
  Package2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  UserRoundCog,
  UserRoundCheck,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import { Button } from "@/components/ui/button";

const SELECTED_SHOP_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_IMAGE_KEY = "selected_shop_image_web";

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
  businessType?: string;
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
  avatarUrl?: string;
  verifyEmail?: boolean;
  isActive?: boolean;
  shopControl?: string;
  shopIds?: (string | PrimitiveIdObject)[];
  shopId?: string | PrimitiveIdObject;
};

type DashboardCounts = {
  totalStaff: number;
  managers: number;
  supervisors: number;
  employees: number;
  products: number;
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

function normalizeRole(role?: string | null) {
  return String(role || "")
    .trim()
    .toUpperCase();
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

function readSelfData(json: ApiJson): AuthUser | null {
  if (isRecord(json.data) && isRecord((json.data as Record<string, unknown>).user)) {
    return (json.data as Record<string, unknown>).user as AuthUser;
  }

  if (isRecord(json.user)) {
    return json.user as AuthUser;
  }

  if (isRecord(json.data)) {
    return json.data as AuthUser;
  }

  return null;
}

function formatRoleLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "SHOP_OWNER":
      return "Shop Owner";
    case "SHOP_MANAGER":
      return "Shop Manager";
    case "SHOP_SUPERVISOR":
      return "Shop Supervisor";
    case "EMPLOYEE":
      return "Employee";
    default:
      return normalized || "User";
  }
}

function getFullAddress(shop?: ShopItem | null) {
  if (!shop?.shopAddress) return "";

  const { area, street, taluk, district, state, pincode } = shop.shopAddress;

  return [area, street, taluk, district, state, pincode]
    .filter(Boolean)
    .join(", ");
}

function getStoredSelectedShopId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SELECTED_SHOP_KEY) || "";
}

function syncSelectedShopToStorage(shop: ShopItem | null) {
  if (typeof window === "undefined") return;

  if (!shop?._id) {
    window.localStorage.removeItem(SELECTED_SHOP_KEY);
    window.localStorage.removeItem(SELECTED_SHOP_NAME_KEY);
    window.localStorage.removeItem(SELECTED_SHOP_IMAGE_KEY);
    window.dispatchEvent(new Event("shop-selection-changed"));
    return;
  }

  window.localStorage.setItem(SELECTED_SHOP_KEY, shop._id || "");
  window.localStorage.setItem(SELECTED_SHOP_NAME_KEY, shop.name || "");
  window.localStorage.setItem(SELECTED_SHOP_IMAGE_KEY, shop.frontImageUrl || "");
  window.dispatchEvent(new Event("shop-selection-changed"));
}

function resolveInitialSelectedShop(shopList: ShopItem[]) {
  if (!shopList.length) return null;

  const storedShopId = getStoredSelectedShopId();

  if (storedShopId) {
    const matchedStoredShop = shopList.find(
      (shop) => String(shop._id) === String(storedShopId)
    );
    if (matchedStoredShop) return matchedStoredShop;
  }

  return shopList[0];
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof Store;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white px-5 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon className="h-5 w-5" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-500">
        {label}
      </p>

      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
        {value}
      </h3>

      {subtext ? (
        <p className="mt-2 text-sm text-slate-500">{subtext}</p>
      ) : null}
    </div>
  );
}

function MiniMetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon className="h-5 w-5" />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
        {value}
      </p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function ShopDashboard() {
  const { user, accessToken } = useAuth();

  const authUser = (user ?? {}) as AuthUser;
  const currentRole = normalizeRole(authUser.role);

  const [shops, setShops] = useState<ShopItem[]>([]);
  const [selectedShop, setSelectedShop] = useState<ShopItem | null>(null);
  const [dashboardCounts, setDashboardCounts] = useState<DashboardCounts>({
    totalStaff: 0,
    managers: 0,
    supervisors: 0,
    employees: 0,
    products: 0,
  });

  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(false);
  const [switchingShopId, setSwitchingShopId] = useState<string>("");
  const [switchMenuOpen, setSwitchMenuOpen] = useState(false);

  const displayName =
    authUser.name || authUser.username || selectedShop?.name || "Shop User";

  const roleLabel = formatRoleLabel(authUser.role);
  const emailVerified = Boolean(authUser.verifyEmail);
  const accountActive = authUser.isActive !== false;
  const totalShops = shops.length;

  const businessType = selectedShop?.businessType || "N/A";
  const selectedShopAddress = getFullAddress(selectedShop);

  const selectedShopStatus = selectedShop?.isActive ? "Active" : "Inactive";
  const accountControl = authUser.shopControl || "N/A";

  const selectedShopImage = selectedShop?.frontImageUrl || "";

  const availableSwitchShops = useMemo(() => {
    return shops.filter((shop) => shop?._id);
  }, [shops]);

  async function readResponse(res: Response) {
    const text = await res.text();
    try {
      return JSON.parse(text) as ApiJson;
    } catch {
      return {} as ApiJson;
    }
  }

  async function loadOwnerShops() {
    try {
      setLoading(true);

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

      const shopListEntry = getSummaryEntry("shop_list");
      if (!shopListEntry) {
        setShops([]);
        setSelectedShop(null);
        syncSelectedShopToStorage(null);
        return;
      }

      const shopRes = await fetch(apiUrl(resolveDynamicUrl(shopListEntry, "")), {
        method: shopListEntry.method,
        headers,
        cache: "no-store",
        credentials: "include",
      });

      if (!shopRes.ok) {
        setShops([]);
        setSelectedShop(null);
        syncSelectedShopToStorage(null);
        return;
      }

      const shopJson = await readResponse(shopRes);
      let shopList = readShopList(shopJson);

      const ownerId = getId(selfUser?._id) || getId(selfUser?.id);
      const allowedShopIds = Array.isArray(selfUser?.shopIds)
        ? selfUser!.shopIds!.map((item) => getId(item)).filter(Boolean)
        : [];
      const staffShopId = getId(selfUser?.shopId) || getId(authUser.shopId);

      if (currentRole === "SHOP_OWNER") {
        shopList = shopList.filter((shop) => {
          const shopOwnerId =
            typeof shop.shopOwnerAccountId === "string"
              ? shop.shopOwnerAccountId
              : shop.shopOwnerAccountId?._id || "";

          const shopId = String(shop._id || "");

          if (ownerId && shopOwnerId && String(shopOwnerId) === String(ownerId)) {
            return true;
          }

          if (allowedShopIds.length && allowedShopIds.includes(shopId)) {
            return true;
          }

          return false;
        });
      } else {
        shopList = staffShopId
          ? shopList.filter((shop) => String(shop._id) === String(staffShopId))
          : [];
      }

      setShops(shopList);

      const initialShop = resolveInitialSelectedShop(shopList);
      setSelectedShop(initialShop);
      syncSelectedShopToStorage(initialShop);
    } catch (error) {
      console.error("Failed to load shop dashboard shops:", error);
      setShops([]);
      setSelectedShop(null);
      syncSelectedShopToStorage(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedShopCounts(shopId?: string) {
    if (!shopId) {
      setDashboardCounts({
        totalStaff: 0,
        managers: 0,
        supervisors: 0,
        employees: 0,
        products: 0,
      });
      return;
    }

    try {
      setCountsLoading(true);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (typeof accessToken === "string" && accessToken.trim()) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const nextCounts: DashboardCounts = {
        totalStaff: 0,
        managers: 0,
        supervisors: 0,
        employees: 0,
        products: 0,
      };

      const shopStaffListEntry = getSummaryEntry("shopstaff_list");
      if (shopStaffListEntry) {
        const staffRes = await fetch(
          apiUrl(resolveDynamicUrl(shopStaffListEntry, "")),
          {
            method: shopStaffListEntry.method,
            headers,
            cache: "no-store",
            credentials: "include",
          }
        );

        if (staffRes.ok) {
          const staffJson = await readResponse(staffRes);

          const staffList = Array.isArray(staffJson.data)
            ? (staffJson.data as Record<string, unknown>[])
            : Array.isArray((staffJson as Record<string, unknown>).shopstaff)
            ? ((staffJson as Record<string, unknown>).shopstaff as Record<
                string,
                unknown
              >[])
            : [];

          const filteredStaff = staffList.filter((item) => {
            const recordShopId =
              getId(item.shopId) ||
              getId(item.shop) ||
              getId((item as Record<string, unknown>).linkedShopId);
            return String(recordShopId) === String(shopId);
          });

          nextCounts.totalStaff = filteredStaff.length;
          nextCounts.managers = filteredStaff.filter(
            (item) => normalizeRole(String(item.role || "")) === "SHOP_MANAGER"
          ).length;
          nextCounts.supervisors = filteredStaff.filter(
            (item) =>
              normalizeRole(String(item.role || "")) === "SHOP_SUPERVISOR"
          ).length;
          nextCounts.employees = filteredStaff.filter(
            (item) => normalizeRole(String(item.role || "")) === "EMPLOYEE"
          ).length;
        }
      }

      const productListEntry = getSummaryEntry("product_list");
      if (productListEntry) {
        const productRes = await fetch(
          apiUrl(resolveDynamicUrl(productListEntry, "")),
          {
            method: productListEntry.method,
            headers,
            cache: "no-store",
            credentials: "include",
          }
        );

        if (productRes.ok) {
          const productJson = await readResponse(productRes);

          const productList = Array.isArray(productJson.data)
            ? (productJson.data as Record<string, unknown>[])
            : [];

          nextCounts.products = productList.filter((item) => {
            const recordShopId =
              getId(item.shopId) ||
              getId(item.shop) ||
              getId((item as Record<string, unknown>).ownerShopId);
            return String(recordShopId) === String(shopId);
          }).length;
        }
      }

      setDashboardCounts(nextCounts);
    } catch (error) {
      console.error("Failed to load selected shop counts:", error);
      setDashboardCounts({
        totalStaff: 0,
        managers: 0,
        supervisors: 0,
        employees: 0,
        products: 0,
      });
    } finally {
      setCountsLoading(false);
    }
  }

  async function handleSwitchShop(shop: ShopItem) {
    if (!shop?._id) return;
    if (switchingShopId === shop._id) return;

    try {
      setSwitchingShopId(shop._id);
      setSelectedShop(shop);
      syncSelectedShopToStorage(shop);
      setSwitchMenuOpen(false);
    } catch (error) {
      console.error("Failed to switch shop:", error);
    } finally {
      setSwitchingShopId("");
    }
  }

  async function handleRefresh() {
    await loadOwnerShops();
  }

  useEffect(() => {
    void loadOwnerShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, currentRole]);

  useEffect(() => {
    if (!selectedShop?._id) {
      void loadSelectedShopCounts("");
      return;
    }

    void loadSelectedShopCounts(selectedShop._id);
    syncSelectedShopToStorage(selectedShop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop?._id, accessToken]);

  useEffect(() => {
    const handleExternalShopSync = () => {
      const storedShopId = getStoredSelectedShopId();
      if (!storedShopId || !shops.length) return;

      const matchedShop = shops.find(
        (shop) => String(shop._id) === String(storedShopId)
      );

      if (matchedShop) {
        setSelectedShop(matchedShop);
      }
    };

    window.addEventListener("shop-selection-changed", handleExternalShopSync);
    window.addEventListener("storage", handleExternalShopSync);

    return () => {
      window.removeEventListener(
        "shop-selection-changed",
        handleExternalShopSync
      );
      window.removeEventListener("storage", handleExternalShopSync);
    };
  }, [shops]);

  return (
    <section className="space-y-6">
      <section className="premium-hero premium-glow relative overflow-hidden rounded-[32px] px-5 py-6 md:px-7 md:py-7">
        <div className="premium-grid-bg premium-bg-animate opacity-40" />
        <div className="premium-bg-overlay" />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
              <Sparkles className="h-3.5 w-3.5" />
              Shop Panel
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Welcome, {displayName}
            </h1>

            <p className="max-w-2xl text-sm leading-6 text-white/85 md:text-base">
              Manage all your shops, switch shops, and review shop-level business
              performance from one premium dashboard.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-[220px] rounded-[28px] border border-white/25 bg-white/10 px-5 py-4 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                  <Store className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/75">
                    Current Shop
                  </p>
                  <p className="truncate text-xl font-bold">
                    {selectedShop?.name || "No Shop"}
                  </p>
                  <p className="truncate text-sm text-white/80">
                    {selectedShop?.businessType || "Not selected"}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-[220px] rounded-[28px] border border-white/25 bg-white/10 px-5 py-4 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/75">
                    Account Role
                  </p>
                  <p className="truncate text-xl font-bold">{roleLabel}</p>
                  <p className="truncate text-sm text-white/80">
                    {emailVerified ? "Verified account access" : "Email verification pending"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="My Shops"
          value={totalShops}
          subtext="Total linked shop accounts"
        />
        <StatCard
          icon={CheckCircle2}
          label="Shop Status"
          value={selectedShopStatus}
          subtext={selectedShop?.isActive ? "Currently operational" : "Currently inactive"}
        />
        <StatCard
          icon={MailCheck}
          label="Email Status"
          value={emailVerified ? "Verified" : "Pending"}
          subtext={emailVerified ? "Verified account access" : "Verify your email access"}
        />
        <StatCard
          icon={BriefcaseBusiness}
          label="Shop Control"
          value={accountControl}
          subtext={accountActive ? "Active account privileges" : "Inactive account"}
        />
      </section>

      <section className="rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
              Shop Overview
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Current Selected Shop
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Review the currently selected shop, business type, team distribution,
              and product summary in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
              className="h-11 rounded-2xl border-slate-200 bg-white px-4"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>

            {availableSwitchShops.length > 1 ? (
              <div className="relative">
                <Button
                  type="button"
                  onClick={() => setSwitchMenuOpen((prev) => !prev)}
                  className="h-11 rounded-2xl bg-[var(--primary)] px-4 text-white hover:bg-[var(--primary-dark)]"
                >
                  <Store className="mr-2 h-4 w-4" />
                  Switch Shop
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>

                {switchMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-80 rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                    <div className="px-3 pb-2 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        Select Shop
                      </p>
                    </div>

                    <div className="space-y-1">
                      {availableSwitchShops.map((shop) => {
                        const isActive = selectedShop?._id === shop._id;
                        const isSwitching = switchingShopId === shop._id;

                        return (
                          <button
                            key={shop._id}
                            type="button"
                            onClick={() => void handleSwitchShop(shop)}
                            disabled={isSwitching}
                            className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                              isActive
                                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {shop.name || "Unnamed Shop"}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {shop.businessType || "Shop"}
                              </p>
                            </div>

                            <span className="ml-3 text-xs font-semibold">
                              {isSwitching
                                ? "Switching..."
                                : isActive
                                ? "Selected"
                                : "Switch"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading dashboard...</span>
              </div>
            </div>
          ) : selectedShop ? (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,1))] p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {selectedShopImage ? (
                        <Image
                          src={selectedShopImage}
                          alt={selectedShop.name || "Shop"}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[var(--primary-soft)] text-[var(--primary)]">
                          <Store className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-2xl font-extrabold tracking-tight text-slate-950">
                          {selectedShop.name || "Unnamed Shop"}
                        </h3>

                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                            selectedShop.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {selectedShop.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-[var(--primary)]">
                        {selectedShop.businessType || "Business type not set"}
                      </p>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        {selectedShopAddress || "Address not available"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        Business Type
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {businessType}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        Staff Access
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        Manage Team
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <MiniMetricCard
                  icon={Users}
                  label="Total Staff"
                  value={countsLoading ? "..." : dashboardCounts.totalStaff}
                  helper="Total linked staff"
                />
                <MiniMetricCard
                  icon={UserRoundCog}
                  label="Managers"
                  value={countsLoading ? "..." : dashboardCounts.managers}
                  helper="Shop manager count"
                />
                <MiniMetricCard
                  icon={UserRoundCheck}
                  label="Supervisors"
                  value={countsLoading ? "..." : dashboardCounts.supervisors}
                  helper="Shop supervisor count"
                />
                <MiniMetricCard
                  icon={BadgeCheck}
                  label="Employees"
                  value={countsLoading ? "..." : dashboardCounts.employees}
                  helper="Employee count"
                />
                <MiniMetricCard
                  icon={Package2}
                  label="Products"
                  value={countsLoading ? "..." : dashboardCounts.products}
                  helper="Current shop product count"
                />
                <MiniMetricCard
                  icon={BellRing}
                  label="Business Type"
                  value={businessType}
                  helper="Registered business"
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Store className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                No shop found
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                No shop is currently linked to this account, or the selected shop
                data could not be loaded.
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}