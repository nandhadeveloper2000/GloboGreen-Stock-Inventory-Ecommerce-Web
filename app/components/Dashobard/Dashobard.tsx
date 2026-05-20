"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Boxes,
  Clock3,
  Database,
  FolderTree,
  Info,
  Package2,
  RefreshCw,
  ShieldAlert,
  Store,
  Tag,
  TrendingUp,
  UserCog,
  UserRoundCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import SummaryApi from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import apiClient from "@/lib/axios";

type DashboardCounts = {
  category: number;
  subcategory: number;
  brand: number;
  model: number;
  compatibility: number;
  product: number;
  shops: number;
  managers: number;
  supervisors: number;
  staff: number;
};

type EndpointResult = {
  key: keyof DashboardCounts | "staffList";
  label: string;
  url: string;
  optional?: boolean;
};

type StatCardConfig = {
  key: keyof DashboardCounts;
  label: string;
  caption: string;
  icon: LucideIcon;
  href: string;
  cardClassName: string;
  glowClassName: string;
  iconClassName: string;
  chipClassName: string;
};

const initialCounts: DashboardCounts = {
  category: 0,
  subcategory: 0,
  brand: 0,
  model: 0,
  compatibility: 0,
  product: 0,
  shops: 0,
  managers: 0,
  supervisors: 0,
  staff: 0,
};

const statCards: StatCardConfig[] = [
  {
    key: "category",
    label: "Categories",
    caption: "Organized product families",
    icon: FolderTree,
    href: "/master/category/list",
    cardClassName: "border-blue-100 bg-blue-50/70",
    glowClassName: "bg-blue-500/15",
    iconClassName: "bg-blue-600 text-white",
    chipClassName: "bg-blue-600/10 text-blue-700",
  },
  {
    key: "subcategory",
    label: "Subcategories",
    caption: "Deep product structure",
    icon: Boxes,
    href: "/master/subcategory/list",
    cardClassName: "border-emerald-100 bg-emerald-50/70",
    glowClassName: "bg-emerald-500/15",
    iconClassName: "bg-emerald-600 text-white",
    chipClassName: "bg-emerald-600/10 text-emerald-700",
  },
  {
    key: "brand",
    label: "Brands",
    caption: "Active brand library",
    icon: Tag,
    href: "/master/brand/list",
    cardClassName: "border-orange-100 bg-orange-50/70",
    glowClassName: "bg-orange-500/15",
    iconClassName: "bg-orange-600 text-white",
    chipClassName: "bg-orange-600/10 text-orange-700",
  },
  {
    key: "model",
    label: "Models",
    caption: "Vehicle/model mapping",
    icon: Wrench,
    href: "/master/model/list",
    cardClassName: "border-rose-100 bg-rose-50/70",
    glowClassName: "bg-rose-500/15",
    iconClassName: "bg-rose-600 text-white",
    chipClassName: "bg-rose-600/10 text-rose-700",
  },
  {
    key: "compatibility",
    label: "Compatibility",
    caption: "Product fitment records",
    icon: ShieldAlert,
    href: "/master/compatibility/list",
    cardClassName: "border-cyan-100 bg-cyan-50/70",
    glowClassName: "bg-cyan-500/15",
    iconClassName: "bg-cyan-700 text-white",
    chipClassName: "bg-cyan-600/10 text-cyan-800",
  },
  {
    key: "product",
    label: "Products",
    caption: "Global product catalog",
    icon: Package2,
    href: "/master/product/list",
    cardClassName: "border-violet-100 bg-violet-50/70",
    glowClassName: "bg-violet-500/15",
    iconClassName: "bg-violet-600 text-white",
    chipClassName: "bg-violet-600/10 text-violet-700",
  },
  {
    key: "shops",
    label: "Shops",
    caption: "Connected shop network",
    icon: Store,
    href: "/master/shop/list",
    cardClassName: "border-sky-100 bg-sky-50/70",
    glowClassName: "bg-sky-500/15",
    iconClassName: "bg-sky-700 text-white",
    chipClassName: "bg-sky-600/10 text-sky-800",
  },
  {
    key: "managers",
    label: "Managers",
    caption: "Management access users",
    icon: UserCog,
    href: "/master/staff/list",
    cardClassName: "border-amber-100 bg-amber-50/70",
    glowClassName: "bg-amber-500/15",
    iconClassName: "bg-amber-600 text-white",
    chipClassName: "bg-amber-600/10 text-amber-800",
  },
  {
    key: "supervisors",
    label: "Supervisors",
    caption: "Supervisor-level users",
    icon: UserRoundCheck,
    href: "/master/staff/list",
    cardClassName: "border-pink-100 bg-pink-50/70",
    glowClassName: "bg-pink-500/15",
    iconClassName: "bg-pink-600 text-white",
    chipClassName: "bg-pink-600/10 text-pink-700",
  },
  {
    key: "staff",
    label: "Staff",
    caption: "Operational users",
    icon: Users,
    href: "/master/staff/list",
    cardClassName: "border-teal-100 bg-teal-50/70",
    glowClassName: "bg-teal-500/15",
    iconClassName: "bg-teal-700 text-white",
    chipClassName: "bg-teal-600/10 text-teal-800",
  },
];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await apiClient.get<T>(url, {
    headers: { Accept: "application/json" },
  });

  return response.data;
}

function getListCount(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== "object") return 0;

  const obj = payload as Record<string, unknown>;

  for (const key of [
    "total",
    "count",
    "totalCount",
    "totalItems",
    "totalRecords",
    "length",
  ]) {
    if (typeof obj[key] === "number") return obj[key] as number;
  }

  for (const key of [
    "data",
    "items",
    "result",
    "rows",
    "list",
    "records",
    "docs",
    "categories",
    "subcategories",
    "brands",
    "models",
    "products",
    "compatibilities",
    "compatible",
    "shops",
    "staff",
    "users",
  ]) {
    const value = obj[key];

    if (Array.isArray(value)) return value.length;

    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;

      for (const nestedKey of [
        "data",
        "items",
        "rows",
        "list",
        "records",
        "docs",
      ]) {
        if (Array.isArray(nested[nestedKey])) {
          return (nested[nestedKey] as unknown[]).length;
        }
      }

      for (const nestedNumberKey of [
        "total",
        "count",
        "totalCount",
        "totalItems",
        "totalRecords",
      ]) {
        if (typeof nested[nestedNumberKey] === "number") {
          return nested[nestedNumberKey] as number;
        }
      }
    }
  }

  return 0;
}

function extractStaffRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;

  for (const key of [
    "data",
    "items",
    "result",
    "rows",
    "list",
    "records",
    "docs",
  ]) {
    if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
  }

  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;

    for (const key of [
      "items",
      "rows",
      "list",
      "records",
      "docs",
      "users",
      "staff",
    ]) {
      if (Array.isArray(nested[key])) {
        return nested[key] as Record<string, unknown>[];
      }
    }
  }

  return [];
}

function extractStaffCounts(payload: unknown) {
  const result = {
    managers: 0,
    supervisors: 0,
    staff: 0,
  };

  const rows = extractStaffRows(payload);

  for (const item of rows) {
    const rawRole = String(item.role || item.staffRole || item.userRole || "")
      .trim()
      .toUpperCase();

    if (rawRole === "MANAGER" || rawRole === "SHOP_MANAGER") {
      result.managers += 1;
    } else if (rawRole === "SUPERVISOR" || rawRole === "SHOP_SUPERVISOR") {
      result.supervisors += 1;
    } else {
      result.staff += 1;
    }
  }

  return result;
}

function formatLastUpdated(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCompactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function getBarWidthClass(value: number, max: number) {
  if (!max || value <= 0) return "w-[4%]";

  const percent = (value / max) * 100;

  if (percent >= 95) return "w-full";
  if (percent >= 85) return "w-[90%]";
  if (percent >= 75) return "w-[80%]";
  if (percent >= 65) return "w-[70%]";
  if (percent >= 55) return "w-[60%]";
  if (percent >= 45) return "w-[50%]";
  if (percent >= 35) return "w-[40%]";
  if (percent >= 25) return "w-[30%]";
  if (percent >= 15) return "w-[20%]";
  if (percent >= 8) return "w-[12%]";
  return "w-[6%]";
}

function LoadingValue() {
  return (
    <span className="inline-flex h-9 w-20 animate-pulse rounded-xl bg-slate-200/80" />
  );
}

function StatCard({
  item,
  value,
  loading,
}: {
  item: StatCardConfig;
  value: number;
  loading: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={[
        "group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        item.cardClassName,
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition duration-300 group-hover:scale-150",
          item.glowClassName,
        ].join(" ")}
      />
      <div className="relative z-10">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
              item.iconClassName,
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
          </div>
          <span
            className={[
              "mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
              item.chipClassName,
            ].join(" ")}
          >
            Live
          </span>
        </div>
        <p className="text-[11px] font-semibold leading-none text-slate-500">
          {item.caption}
        </p>
        <p className="mt-0.5 text-sm font-black text-slate-800">{item.label}</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <h3 className="text-[30px] font-black leading-none tracking-tight text-slate-950">
            {loading ? <LoadingValue /> : formatCompactNumber(value)}
          </h3>
          <ArrowRight className="mb-1 h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}

function GrowthPanel({ counts }: { counts: DashboardCounts }) {
  const maxValue = Math.max(
    counts.category,
    counts.brand,
    counts.model,
    counts.product,
    counts.shops,
    counts.subcategory,
    1
  );

  const rows = [
    {
      label: "Products",
      value: counts.product,
      barClassName: "bg-violet-600",
    },
    {
      label: "Brands",
      value: counts.brand,
      barClassName: "bg-orange-500",
    },
    {
      label: "Models",
      value: counts.model,
      barClassName: "bg-emerald-500",
    },
    {
      label: "Categories",
      value: counts.category,
      barClassName: "bg-blue-600",
    },
    {
      label: "Shops",
      value: counts.shops,
      barClassName: "bg-cyan-600",
    },
  ];

  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
            <BarChart3 className="h-5 w-5" />
          </span>

          <div>
            <h2 className="text-lg font-black text-slate-950">
              Master Data Growth
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Current distribution by active modules
            </p>
          </div>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-600">
          Live Snapshot
        </span>
      </div>

      <div className="space-y-3.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-extrabold text-slate-600">
              {row.label}
            </span>
            <div className="relative flex-1 overflow-hidden rounded-full bg-slate-100" style={{ height: "10px" }}>
              <div
                className={[
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-700",
                  row.barClassName,
                  getBarWidthClass(row.value, maxValue),
                ].join(" ")}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-black text-slate-900">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 to-[#00008b] p-4">
        <svg viewBox="0 0 640 180" className="h-40 w-full" aria-hidden="true">
          <path d="M20 30 H620" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />
          <path d="M20 70 H620" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />
          <path d="M20 110 H620" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />
          <path d="M20 150 H620" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" />
          <path
            d="M20 148 C95 112, 120 116, 180 94 C245 70, 285 78, 340 54 C410 24, 475 50, 620 26"
            fill="none" strokeWidth="3" strokeLinecap="round" stroke="rgba(255,255,255,0.85)"
          />
          <path
            d="M20 158 C120 142, 155 128, 230 120 C320 108, 365 86, 440 80 C520 72, 560 62, 620 54"
            fill="none" strokeWidth="3" strokeLinecap="round" stroke="#ec0677"
          />
          <path
            d="M20 166 C100 160, 175 154, 245 144 C320 133, 390 128, 470 118 C535 110, 585 100, 620 94"
            fill="none" strokeWidth="3" strokeLinecap="round" stroke="#22d3ee"
          />
        </svg>
        <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/85" />
            <span className="text-[11px] font-bold text-white/70">Catalog</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ec0677]" />
            <span className="text-[11px] font-bold text-white/70">Products</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-bold text-white/70">Shops</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ManagementOverview({ counts }: { counts: DashboardCounts }) {
  const totalPeople = counts.managers + counts.supervisors + counts.staff;

  const items = [
    {
      label: "Managers",
      value: counts.managers,
      icon: UserCog,
      rowClassName: "bg-blue-50 border-blue-100",
      iconClassName: "text-blue-700 bg-blue-100",
      pillClassName: "bg-blue-100 text-blue-700",
    },
    {
      label: "Supervisors",
      value: counts.supervisors,
      icon: UserRoundCheck,
      rowClassName: "bg-pink-50 border-pink-100",
      iconClassName: "text-pink-700 bg-pink-100",
      pillClassName: "bg-pink-100 text-pink-700",
    },
    {
      label: "Staff",
      value: counts.staff,
      icon: Users,
      rowClassName: "bg-emerald-50 border-emerald-100",
      iconClassName: "text-emerald-700 bg-emerald-100",
      pillClassName: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Users className="h-5 w-5" />
          </span>

          <div>
            <h2 className="text-lg font-black text-slate-950">Team Overview</h2>
            <p className="text-xs font-semibold text-slate-500">
              Role-based access count
            </p>
          </div>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
          {totalPeople} Users
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          const pct = totalPeople ? Math.round((item.value / totalPeople) * 100) : 0;

          return (
            <div
              key={item.label}
              className={`overflow-hidden rounded-2xl border px-4 py-3.5 ${item.rowClassName}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconClassName}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-800">{item.label}</p>
                    <p className="text-[11px] font-semibold text-slate-500">Active role users</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block min-w-10 rounded-lg px-2.5 py-1 text-center text-sm font-black ${item.pillClassName}`}>
                    {item.value}
                  </span>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-400">{pct}%</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${item.pillClassName}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#00008b]/10 bg-[#00008b]/5 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#00008b]" />
        <p className="text-xs font-semibold leading-5 text-slate-600">
          Counts are grouped by role from the current staff list response.
        </p>
      </div>
    </section>
  );
}

export default function MasterDashboardPage() {
  const auth = useAuth();
  const isReady = auth?.isReady ?? false;
  const hasAccessToken = Boolean(auth?.accessToken);

  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("--");

  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!isReady) return;

      if (!hasAccessToken) {
        setCounts(initialCounts);
        setError("Session unavailable. Please log in again.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const endpoints: EndpointResult[] = [
          { key: "staffList", label: "Staff", url: SummaryApi.staff_list.url },
          { key: "shops", label: "Shops", url: SummaryApi.master_list_shops.url },
          {
            key: "category",
            label: "Category",
            url: SummaryApi.category_list.url,
          },
          {
            key: "subcategory",
            label: "Subcategory",
            url: SummaryApi.sub_category_list.url,
          },
          {
            key: "brand",
            label: "Brand",
            url: SummaryApi.brand_list.url,
          },
          {
            key: "model",
            label: "Model",
            url: SummaryApi.model_list.url,
          },
          {
            key: "compatibility",
            label: "Compatibility",
            url: SummaryApi.product_compatibility_list.url,
          },
          {
            key: "product",
            label: "Product",
            url: SummaryApi.product_list.url,
          },
        ];

        const responses = await Promise.allSettled(
          endpoints.map((endpoint) => fetchJson<unknown>(endpoint.url))
        );

        const resolvedMap = new Map<string, unknown>();

        responses.forEach((result, index) => {
          if (result.status === "fulfilled") {
            resolvedMap.set(endpoints[index].key, result.value);
          }
        });

        const staffCounts = extractStaffCounts(resolvedMap.get("staffList"));

        const nextCounts: DashboardCounts = {
          category: getListCount(resolvedMap.get("category")),
          subcategory: getListCount(resolvedMap.get("subcategory")),
          brand: getListCount(resolvedMap.get("brand")),
          model: getListCount(resolvedMap.get("model")),
          compatibility: getListCount(resolvedMap.get("compatibility")),
          product: getListCount(resolvedMap.get("product")),
          shops: getListCount(resolvedMap.get("shops")),
          managers: staffCounts.managers,
          supervisors: staffCounts.supervisors,
          staff: staffCounts.staff,
        };

        setCounts(nextCounts);
        setLastUpdated(formatLastUpdated(new Date()));

        const failedRequired = responses.filter((result, index) => {
          return result.status === "rejected" && !endpoints[index].optional;
        });

        if (failedRequired.length > 0) {
          const failedLabels = responses
            .map((result, index) => ({ result, index }))
            .filter(
              ({ result, index }) =>
                result.status === "rejected" && !endpoints[index].optional
            )
            .map(({ index }) => endpoints[index].label);

          setError(
            `${failedRequired.length} dashboard API call(s) failed: ${failedLabels.join(
              ", "
            )}`
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hasAccessToken, isReady]
  );

  useEffect(() => {
    if (!isReady) return;
    void loadDashboard(false);
  }, [isReady, loadDashboard]);

  useEffect(() => {
    if (!isReady || !hasAccessToken) {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }

      return;
    }

    pollerRef.current = setInterval(() => {
      void loadDashboard(true);
    }, 15000);

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [hasAccessToken, isReady, loadDashboard]);

  const totalRecords = useMemo(() => {
    return Object.values(counts).reduce((sum, value) => sum + value, 0);
  }, [counts]);

  const totalCatalog = useMemo(() => {
    return (
      counts.category +
      counts.subcategory +
      counts.brand +
      counts.model +
      counts.compatibility +
      counts.product
    );
  }, [counts]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e8ecff_0,#f7f8fc_34%,#f8fafc_100%)] px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-395 space-y-6">

        {/* ── Hero header ── */}
        <div className="relative overflow-hidden rounded-card bg-linear-to-br from-[#060c2c] via-[#0d1433] to-[#00008b] p-6 shadow-[0_32px_80px_rgba(0,0,139,0.35)]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#ec0677]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-1/3 top-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white/80 backdrop-blur-sm">
                <Database className="h-3.5 w-3.5" />
                Master Admin Dashboard
              </span>
              <h1 className="mt-4 text-[34px] font-black tracking-tight text-white sm:text-[42px]">
                Dashboard
              </h1>
              <p className="mt-1.5 max-w-sm text-sm font-medium leading-6 text-white/55">
                Manage inventory, shops, catalog, and team from one control panel.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2.5 sm:items-end">
              <div className="flex h-10 items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm backdrop-blur-sm">
                <Clock3 className="h-3.5 w-3.5 text-white/50" />
                <span className="font-semibold text-white/55">Updated</span>
                <span className="font-black text-white">{lastUpdated}</span>
              </div>
              <Button
                type="button"
                onClick={() => void loadDashboard(true)}
                disabled={refreshing || loading}
                className="h-10 rounded-2xl bg-white px-5 text-sm font-black text-[#00008b] shadow-lg transition hover:bg-white/90 disabled:opacity-60"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary strip */}
          <div className="relative z-10 mt-5 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
            {[
              { label: "Total Records", value: loading ? "…" : formatCompactNumber(totalRecords), Icon: Activity,   bg: "bg-white/10",          color: "text-indigo-200" },
              { label: "Catalog Items",  value: loading ? "…" : formatCompactNumber(totalCatalog),  Icon: TrendingUp, bg: "bg-emerald-500/20",    color: "text-emerald-300" },
              { label: "Active Shops",   value: loading ? "…" : formatCompactNumber(counts.shops),  Icon: Store,      bg: "bg-cyan-500/20",       color: "text-cyan-300"    },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg} ${s.color}`}>
                  <s.Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">{s.label}</p>
                  <p className="text-[22px] font-black leading-none text-white">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-black">Some dashboard data could not load.</p>
              <p className="mt-0.5 font-semibold text-amber-800">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {statCards.map((item) => (
            <StatCard
              key={item.key}
              item={item}
              value={counts[item.key]}
              loading={loading}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
          <GrowthPanel counts={counts} />
          <ManagementOverview counts={counts} />
        </section>

      </div>
    </main>
  );
}
