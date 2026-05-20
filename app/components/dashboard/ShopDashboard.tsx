"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Package2,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  UserRoundCheck,
  UserRoundCog,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import { Button } from "@/components/ui/button";

const SELECTED_SHOP_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_IMAGE_KEY = "selected_shop_image_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

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
  | { _id?: string; name?: string; email?: string };

type ShopItem = {
  _id: string;
  name?: string;
  shopType?: string;
  businessType?: string;
  isMainWarehouse?: boolean;
  frontImageUrl?: string;
  isActive?: boolean;
  enableGSTBilling?: boolean;
  billingType?: string;
  mobile?: string;
  shopAddress?: Address;
  shopOwnerAccountId?: ShopOwnerAccount;
};

type AuthUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  role?: string;
  verifyEmail?: boolean;
  isActive?: boolean;
  shopControl?: string;
  shopIds?: (string | PrimitiveIdObject)[];
  shopId?: string | PrimitiveIdObject;
};

type ApiJson = {
  success?: boolean;
  message?: string;
  data?: unknown;
  user?: unknown;
  shops?: unknown[];
};

type ShopStats = {
  totalStaff: number;
  managers: number;
  supervisors: number;
  employees: number;
  shopProductCount: number;
  totalStockQty: number;
  stockTransferCount: number;
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  salesSixMonths: number;
  salesYear: number;
  purchaseCount: number;
  purchaseTotalAmount: number;
};

const INITIAL_STATS: ShopStats = {
  totalStaff: 0,
  managers: 0,
  supervisors: 0,
  employees: 0,
  shopProductCount: 0,
  totalStockQty: 0,
  stockTransferCount: 0,
  salesToday: 0,
  salesWeek: 0,
  salesMonth: 0,
  salesSixMonths: 0,
  salesYear: 0,
  purchaseCount: 0,
  purchaseTotalAmount: 0,
};

/* ── helpers ── */

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function normalizeShopType(value?: string | null) {
  const normalized = normalizeValue(value);

  if (normalized === "BRANCH_RETAIL_SHOP" || normalized === "BRANCH") {
    return "RETAIL_BRANCH_SHOP";
  }

  if (normalized === "MAIN") {
    return "WAREHOUSE_RETAIL_SHOP";
  }

  if (normalized === "WHOLESALE") {
    return "WHOLESALE_SHOP";
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function readNum(obj: unknown, ...keys: string[]): number {
  if (!isRecord(obj)) return 0;
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await res.text()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readShopList(json: ApiJson): ShopItem[] {
  if (Array.isArray(json.data)) return json.data as ShopItem[];
  if (Array.isArray(json.shops)) return json.shops as ShopItem[];
  return [];
}

function readSelfData(json: Record<string, unknown>): AuthUser | null {
  if (isRecord(json.data) && isRecord((json.data as Record<string, unknown>).user))
    return (json.data as Record<string, unknown>).user as AuthUser;
  if (isRecord(json.user)) return json.user as AuthUser;
  if (isRecord(json.data)) return json.data as AuthUser;
  return null;
}

function formatRoleLabel(role?: string | null) {
  switch (normalizeRole(role)) {
    case "SHOP_OWNER": return "Shop Owner";
    case "SHOP_MANAGER": return "Shop Manager";
    case "SHOP_SUPERVISOR": return "Shop Supervisor";
    case "EMPLOYEE": return "Employee";
    default: return role || "User";
  }
}

function formatShopType(value?: string | null) {
  switch (normalizeValue(value)) {
    case "WAREHOUSE_RETAIL_SHOP":
    case "MAIN":
      return "Warehouse Retail Shop";
    case "RETAIL_BRANCH_SHOP":
    case "BRANCH_RETAIL_SHOP":
    case "BRANCH":
      return "Retail Branch Shop";
    case "WHOLESALE_SHOP":
    case "WHOLESALE":
      return "Wholesale Shop";
    case "WAREHOUSE_SHOP":
      return "Warehouse Shop";
    default:
      return value || "Shop";
  }
}

function getFullAddress(shop?: ShopItem | null) {
  if (!shop?.shopAddress) return "";
  const { area, street, taluk, district, state, pincode } = shop.shopAddress;
  return [area, street, taluk, district, state, pincode].filter(Boolean).join(", ");
}

function formatINR(amount: number): string {
  if (!amount) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
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
    window.localStorage.removeItem(SELECTED_SHOP_TYPE_KEY);
    window.dispatchEvent(new Event("shop-selection-changed"));
    return;
  }
  window.localStorage.setItem(SELECTED_SHOP_KEY, shop._id);
  window.localStorage.setItem(SELECTED_SHOP_NAME_KEY, shop.name || "");
  window.localStorage.setItem(SELECTED_SHOP_IMAGE_KEY, shop.frontImageUrl || "");
  window.localStorage.setItem(SELECTED_SHOP_TYPE_KEY, shop.shopType || "");
  window.dispatchEvent(new Event("shop-selection-changed"));
}

function isWarehouseRetailShop(shop?: ShopItem | null) {
  return normalizeShopType(shop?.shopType) === "WAREHOUSE_RETAIL_SHOP";
}

function resolveInitialSelectedShop(shopList: ShopItem[]) {
  if (!shopList.length) return null;
  const storedId = getStoredSelectedShopId();
  if (storedId) {
    const found = shopList.find(s => String(s._id) === String(storedId));
    if (found) return found;
  }
  return (
    shopList.find(s => isWarehouseRetailShop(s)) ||
    shopList.find(s => Boolean(s.isMainWarehouse)) ||
    shopList[0]
  );
}

/* ── UI components ── */

type CardColor = "blue" | "emerald" | "violet" | "amber" | "rose" | "indigo";

const cardColors: Record<CardColor, { border: string; blob: string; iconBg: string; val: string }> = {
  blue:    { border: "border-blue-200/70",    blob: "bg-blue-400/20",    iconBg: "bg-blue-100 text-blue-600",    val: "text-blue-900" },
  emerald: { border: "border-emerald-200/70", blob: "bg-emerald-400/20", iconBg: "bg-emerald-100 text-emerald-600", val: "text-emerald-900" },
  violet:  { border: "border-violet-200/70",  blob: "bg-violet-400/20",  iconBg: "bg-violet-100 text-violet-600",  val: "text-violet-900" },
  amber:   { border: "border-amber-200/70",   blob: "bg-amber-400/20",   iconBg: "bg-amber-100 text-amber-600",   val: "text-amber-900" },
  rose:    { border: "border-rose-200/70",    blob: "bg-rose-400/20",    iconBg: "bg-rose-100 text-rose-600",    val: "text-rose-900" },
  indigo:  { border: "border-indigo-200/70",  blob: "bg-indigo-400/20",  iconBg: "bg-indigo-100 text-indigo-600",  val: "text-indigo-900" },
};

function StatCard({
  icon: Icon, label, value, subtext, color = "blue",
}: {
  icon: typeof Store;
  label: string;
  value: string | number;
  subtext?: string;
  color?: CardColor;
}) {
  const c = cardColors[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${c.blob}`} />
      <div className="relative z-10">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${c.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Live</span>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {subtext ? <p className="mt-0.5 text-[10px] text-slate-400">{subtext}</p> : null}
        <h3 className={`mt-3 text-[26px] font-black leading-none tracking-tight ${c.val}`}>{value}</h3>
      </div>
    </div>
  );
}

function SalesPeriodCard({
  label, amount, loading, color = "emerald",
}: {
  label: string;
  amount: number;
  loading: boolean;
  color?: CardColor;
}) {
  const c = cardColors[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} bg-white p-4 shadow-sm`}>
      <div className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full blur-xl ${c.blob}`} />
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className={`mt-3 text-xl font-black tracking-tight ${c.val}`}>
          {loading ? <span className="inline-flex h-5 w-16 animate-pulse rounded bg-slate-200" /> : formatINR(amount)}
        </p>
      </div>
    </div>
  );
}

type MiniColor = "slate" | "blue" | "indigo" | "violet";
const miniColors: Record<MiniColor, { iconBg: string; val: string }> = {
  slate:  { iconBg: "bg-slate-100 text-slate-600",   val: "text-slate-950" },
  blue:   { iconBg: "bg-blue-100 text-blue-600",     val: "text-blue-900" },
  indigo: { iconBg: "bg-indigo-100 text-indigo-600", val: "text-indigo-900" },
  violet: { iconBg: "bg-violet-100 text-violet-600", val: "text-violet-900" },
};

function MiniMetricCard({
  icon: Icon, label, value, helper, color = "slate",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  helper?: string;
  color?: MiniColor;
}) {
  const c = miniColors[color];
  return (
    <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold tracking-tight ${c.val}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-400">{helper}</p> : null}
    </div>
  );
}

/* ── main component ── */

export default function ShopDashboard() {
  const { user, accessToken } = useAuth();
  const authUser = (user ?? {}) as AuthUser;
  const currentRole = normalizeRole(authUser.role);

  const [shops, setShops] = useState<ShopItem[]>([]);
  const [selectedShop, setSelectedShop] = useState<ShopItem | null>(null);
  const [stats, setStats] = useState<ShopStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [switchingShopId, setSwitchingShopId] = useState("");
  const [switchMenuOpen, setSwitchMenuOpen] = useState(false);

  const displayName = authUser.name || authUser.username || selectedShop?.name || "Shop User";
  const roleLabel = formatRoleLabel(authUser.role);
  const totalShops = shops.length;
  const shopTypeLabel = formatShopType(selectedShop?.shopType);
  const selectedShopAddress = getFullAddress(selectedShop);
  const selectedShopStatus = selectedShop?.isActive ? "Active" : "Inactive";
  const selectedShopImage = selectedShop?.frontImageUrl || "";
  const isOverall = isWarehouseRetailShop(selectedShop);

  const availableSwitchShops = useMemo(() => shops.filter(s => s?._id), [shops]);

  const L = statsLoading ? "..." : undefined;

  /* ── data loading ── */

  async function loadOwnerShops() {
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const meUrl = currentRole === "SHOP_OWNER"
        ? `${baseURL}${SummaryApi.shopowner_me.url}`
        : `${baseURL}${SummaryApi.shopstaff_me.url}`;
      const meMethod = currentRole === "SHOP_OWNER"
        ? SummaryApi.shopowner_me.method
        : SummaryApi.shopstaff_me.method;

      let selfUser: AuthUser | null = null;
      try {
        const meRes = await fetch(meUrl, { method: meMethod, headers, cache: "no-store", credentials: "include" });
        if (meRes.ok) selfUser = readSelfData(await safeJson(meRes));
      } catch { /* ignore */ }

      const shopsRes = await fetch(`${baseURL}${SummaryApi.shop_list.url}`, {
        method: SummaryApi.shop_list.method, headers, cache: "no-store", credentials: "include",
      });

      if (!shopsRes.ok) {
        setShops([]); setSelectedShop(null); syncSelectedShopToStorage(null);
        return;
      }

      const shopJson = await safeJson(shopsRes);
      let shopList = readShopList(shopJson as ApiJson);

      const ownerId = getId(selfUser?._id) || getId(selfUser?.id);
      const allowedIds = Array.isArray(selfUser?.shopIds)
        ? (selfUser!.shopIds as (string | PrimitiveIdObject)[]).map(getId).filter(Boolean)
        : [];
      const staffShopId = getId(selfUser?.shopId) || getId(authUser.shopId);

      if (currentRole === "SHOP_OWNER") {
        shopList = shopList.filter(shop => {
          const sOwnerId = typeof shop.shopOwnerAccountId === "string"
            ? shop.shopOwnerAccountId
            : shop.shopOwnerAccountId?._id || "";
          if (ownerId && String(sOwnerId) === String(ownerId)) return true;
          if (allowedIds.includes(String(shop._id))) return true;
          return false;
        });
      } else {
        shopList = staffShopId
          ? shopList.filter(s => String(s._id) === String(staffShopId))
          : [];
      }

      setShops(shopList);
      const initial = resolveInitialSelectedShop(shopList);
      setSelectedShop(initial);
      syncSelectedShopToStorage(initial);
    } catch (err) {
      console.error("Failed to load shops:", err);
      setShops([]); setSelectedShop(null); syncSelectedShopToStorage(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadShopStats(shopId: string) {
    if (!shopId || !accessToken) { setStats(INITIAL_STATS); return; }

    setStatsLoading(true);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    };

    const now = new Date();
    const toDate = now.toISOString().slice(0, 10);
    const ago = (days: number) =>
      new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);

    const [
      productsRes,
      staffRes,
      transfersRes,
      salesTodayRes,
      salesWeekRes,
      salesMonthRes,
      salesSixMRes,
      salesYearRes,
      purchasesRes,
    ] = await Promise.allSettled([
      fetch(`${baseURL}${SummaryApi.shop_product_list.url(shopId)}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
      fetch(`${baseURL}${SummaryApi.shopstaff_list.url}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
      fetch(`${baseURL}${SummaryApi.stock_transfer_list.url({ shopId })}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
      fetch(`${baseURL}${SummaryApi.report_shop_sales.url({ shopId, from: toDate, to: toDate })}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
      fetch(`${baseURL}${SummaryApi.report_shop_sales.url({ shopId, from: ago(7), to: toDate })}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
      fetch(`${baseURL}${SummaryApi.report_shop_sales.url({ shopId, from: ago(30), to: toDate })}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
      fetch(`${baseURL}${SummaryApi.report_shop_sales.url({ shopId, from: ago(180), to: toDate })}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
      fetch(`${baseURL}${SummaryApi.report_shop_sales.url({ shopId, from: ago(365), to: toDate })}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
      fetch(`${baseURL}${SummaryApi.report_shop_purchases.url({ shopId })}`,
        { method: "GET", headers, cache: "no-store", credentials: "include" }),
    ]);

    const next: ShopStats = { ...INITIAL_STATS };

    /* products & stock */
    if (productsRes.status === "fulfilled" && productsRes.value.ok) {
      const json = await safeJson(productsRes.value);
      const products = Array.isArray(json.data) ? json.data as Record<string, unknown>[] : [];
      next.shopProductCount = products.length;
      next.totalStockQty = products.reduce((sum, p) => {
        const variants = Array.isArray(p.variantEntries) ? p.variantEntries as Record<string, unknown>[] : [];
        if (variants.length > 0) return sum + variants.reduce((vs, v) => vs + readNum(v, "qty"), 0);
        return sum + readNum(p, "qty", "stockQty", "quantity");
      }, 0);
    }

    /* staff */
    if (staffRes.status === "fulfilled" && staffRes.value.ok) {
      const json = await safeJson(staffRes.value);
      const all = Array.isArray(json.data) ? json.data as Record<string, unknown>[] : [];
      const filtered = all.filter(item => {
        const sid = getId(item.shopId) || getId(item.shop) || getId(item.linkedShopId);
        return String(sid) === String(shopId);
      });
      next.totalStaff = filtered.length;
      next.managers   = filtered.filter(i => normalizeRole(String(i.role || "")) === "SHOP_MANAGER").length;
      next.supervisors = filtered.filter(i => normalizeRole(String(i.role || "")) === "SHOP_SUPERVISOR").length;
      next.employees  = filtered.filter(i => normalizeRole(String(i.role || "")) === "EMPLOYEE").length;
    }

    /* stock transfers */
    if (transfersRes.status === "fulfilled" && transfersRes.value.ok) {
      const json = await safeJson(transfersRes.value);
      const list = Array.isArray(json.data) ? json.data : [];
      next.stockTransferCount = list.length;
    }

    /* sales by period */
    async function readSales(r: PromiseSettledResult<Response>): Promise<number> {
      if (r.status !== "fulfilled" || !r.value.ok) return 0;
      const json = await safeJson(r.value);
      const data = isRecord(json.data) ? json.data : json;
      return readNum(data, "totalAmount", "total", "amount", "grandTotal", "totalSales", "revenue", "netAmount");
    }

    [next.salesToday, next.salesWeek, next.salesMonth, next.salesSixMonths, next.salesYear] =
      await Promise.all([
        readSales(salesTodayRes),
        readSales(salesWeekRes),
        readSales(salesMonthRes),
        readSales(salesSixMRes),
        readSales(salesYearRes),
      ]);

    /* purchases */
    if (purchasesRes.status === "fulfilled" && purchasesRes.value.ok) {
      const json = await safeJson(purchasesRes.value);
      const data = isRecord(json.data) ? json.data : json;
      next.purchaseCount       = readNum(data, "totalCount", "count", "purchaseCount", "total", "totalOrders");
      next.purchaseTotalAmount = readNum(data, "totalAmount", "total", "amount", "grandTotal", "netAmount");
    }

    setStats(next);
    setStatsLoading(false);
  }

  async function handleSwitchShop(shop: ShopItem) {
    if (!shop?._id || switchingShopId === shop._id) return;
    try {
      setSwitchingShopId(shop._id);
      setSelectedShop(shop);
      syncSelectedShopToStorage(shop);
      setSwitchMenuOpen(false);
    } finally {
      setSwitchingShopId("");
    }
  }

  useEffect(() => {
    void loadOwnerShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, currentRole]);

  useEffect(() => {
    if (!selectedShop?._id) { setStats(INITIAL_STATS); return; }
    void loadShopStats(selectedShop._id);
    syncSelectedShopToStorage(selectedShop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop?._id, accessToken]);

  useEffect(() => {
    const sync = () => {
      const sid = getStoredSelectedShopId();
      if (!sid || !shops.length) return;
      const matched = shops.find(s => String(s._id) === String(sid));
      if (matched) setSelectedShop(matched);
    };
    window.addEventListener("shop-selection-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shop-selection-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [shops]);

  /* ── render ── */

  return (
    <section className="space-y-5">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-card bg-linear-to-br from-[#060c2c] via-[#0d1433] to-[#00008b] p-6 shadow-[0_32px_80px_rgba(0,0,139,0.35)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/95">
            <Sparkles className="h-3.5 w-3.5" />
            {isOverall ? "Warehouse Retail · Overall Dashboard" : "Shop Dashboard"}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-4xl">
            Welcome, {displayName}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-white/85">
            {selectedShop
              ? `${selectedShop.name} · ${shopTypeLabel}`
              : "Manage your shops and review business performance."}
          </p>
        </div>

        <div className="relative z-10 mt-5 flex flex-wrap gap-6 border-t border-white/10 pt-5">
          {[
            { label: "Total Shops",   value: totalShops },
            { label: "Shop Status",   value: selectedShopStatus },
            { label: "Role",          value: roleLabel },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-white/60" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
                <p className="text-base font-black text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Key Metrics ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Package2}
          label="Shop Products"
          value={L ?? stats.shopProductCount}
          subtext="Registered products in shop"
          color="blue"
        />
        <StatCard
          icon={PackageCheck}
          label="Total Stock Qty"
          value={L ?? stats.totalStockQty.toLocaleString("en-IN")}
          subtext="Total units across all products"
          color="emerald"
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Stock Transfers"
          value={L ?? stats.stockTransferCount}
          subtext="Transfer records for this shop"
          color="violet"
        />
        <StatCard
          icon={Users}
          label="Shop Users"
          value={L ?? stats.totalStaff}
          subtext="Managers · supervisors · employees"
          color="amber"
        />
      </section>

      {/* ── Sales Performance ── */}
      <section className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
                Sales Performance
              </p>
            </div>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
              Sales Revenue by Period
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isOverall
                ? "Overall Warehouse Retail Shop revenue."
                : `Revenue for ${selectedShop?.name || "selected shop"}.`}
            </p>
          </div>
          <span className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
            {shopTypeLabel}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <SalesPeriodCard label="Today"        amount={stats.salesToday}      loading={statsLoading} color="blue" />
          <SalesPeriodCard label="This Week"    amount={stats.salesWeek}       loading={statsLoading} color="emerald" />
          <SalesPeriodCard label="This Month"   amount={stats.salesMonth}      loading={statsLoading} color="violet" />
          <SalesPeriodCard label="Last 6 Months" amount={stats.salesSixMonths} loading={statsLoading} color="amber" />
          <SalesPeriodCard label="This Year"    amount={stats.salesYear}       loading={statsLoading} color="rose" />
        </div>
      </section>

      {/* ── Purchase Overview ── */}
      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={ShoppingCart}
          label="Purchase Orders"
          value={L ?? stats.purchaseCount}
          subtext="Total purchase orders placed"
          color="indigo"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Purchase Amount"
          value={L ?? formatINR(stats.purchaseTotalAmount)}
          subtext="Total purchase value"
          color="rose"
        />
      </section>

      {/* ── Shop Details + Team + Switch ── */}
      <section className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.05)] md:p-6">

        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
              {isOverall ? "Overall Shop Overview" : "Shop Overview"}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              {selectedShop?.name || "Selected Shop"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadOwnerShops()}
              disabled={loading}
              className="h-10 rounded-xl border-slate-200 bg-white px-4"
            >
              {loading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>

            {availableSwitchShops.length > 1 ? (
              <div className="relative">
                <Button
                  type="button"
                  onClick={() => setSwitchMenuOpen(prev => !prev)}
                  className="h-10 rounded-xl bg-primary px-4 text-white hover:bg-primary-dark"
                >
                  <Store className="mr-2 h-4 w-4" />
                  Switch Shop
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>

                {switchMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-80 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                    <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      Select Shop
                    </p>
                    <div className="space-y-1">
                      {availableSwitchShops.map(shop => {
                        const isActive = selectedShop?._id === shop._id;
                        const isSwitching = switchingShopId === shop._id;
                        return (
                          <button
                            key={shop._id}
                            type="button"
                            onClick={() => void handleSwitchShop(shop)}
                            disabled={isSwitching}
                            className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                              isActive ? "bg-primary-soft text-primary" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{shop.name || "Unnamed Shop"}</p>
                              <p className="truncate text-xs text-slate-500">{formatShopType(shop.shopType)}</p>
                            </div>
                            <span className="ml-3 shrink-0 text-xs font-semibold">
                              {isSwitching ? "Switching..." : isActive ? "Selected" : "Switch"}
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
            <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading dashboard…</span>
              </div>
            </div>
          ) : selectedShop ? (
            <div className="space-y-5">

              {/* Shop info card */}
              <div className="rounded-3xl border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,1))] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.04)] md:p-5">
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
                        <div className="flex h-full w-full items-center justify-center bg-primary-soft text-primary">
                          <Store className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-2xl font-extrabold tracking-tight text-slate-950">
                          {selectedShop.name || "Unnamed Shop"}
                        </h3>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                          selectedShop.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {selectedShop.isActive ? "Active" : "Inactive"}
                        </span>
                        {isOverall ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                            Overall
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                          {shopTypeLabel}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {selectedShop.businessType || "N/A"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          Billing: {selectedShop.billingType || "N/A"}
                        </span>
                      </div>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        {selectedShopAddress || "Address not available"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Mobile</p>
                      <p className="mt-2 text-base font-bold text-slate-900">{selectedShop.mobile || "N/A"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">GST Billing</p>
                      <p className="mt-2 text-base font-bold text-slate-900">
                        {selectedShop.enableGSTBilling ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team breakdown */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Team Breakdown
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniMetricCard
                    icon={Users}
                    label="Total Staff"
                    value={L ?? stats.totalStaff}
                    helper="All linked staff"
                  />
                  <MiniMetricCard
                    icon={UserRoundCog}
                    label="Managers"
                    value={L ?? stats.managers}
                    helper="Shop manager count"
                    color="blue"
                  />
                  <MiniMetricCard
                    icon={UserRoundCheck}
                    label="Supervisors"
                    value={L ?? stats.supervisors}
                    helper="Shop supervisor count"
                    color="violet"
                  />
                  <MiniMetricCard
                    icon={BadgeCheck}
                    label="Employees"
                    value={L ?? stats.employees}
                    helper="Employee count"
                    color="indigo"
                  />
                </div>
              </div>

            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Store className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">No shop found</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                No shop is currently linked to this account, or the selected shop data could not be loaded.
              </p>
            </div>
          )}
        </div>
      </section>

    </section>
  );
}
