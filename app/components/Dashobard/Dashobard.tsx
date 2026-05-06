"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Clock3,
  Database,
  FolderTree,
  Info,
  Layers3,
  Package2,
  PieChart,
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
  masterCategory: number;
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
  cardClassName: string;
  glowClassName: string;
  iconClassName: string;
  chipClassName: string;
};

const initialCounts: DashboardCounts = {
  masterCategory: 0,
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
    key: "masterCategory",
    label: "Master Categories",
    caption: "Top-level inventory groups",
    icon: Layers3,
    cardClassName: "border-indigo-100 bg-indigo-50/70",
    glowClassName: "bg-indigo-500/15",
    iconClassName: "bg-indigo-600 text-white",
    chipClassName: "bg-indigo-600/10 text-indigo-700",
  },
  {
    key: "category",
    label: "Categories",
    caption: "Organized product families",
    icon: FolderTree,
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

function getPercentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
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
    <div
      className={[
        "group relative min-h-38.5 overflow-hidden rounded-card border p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]",
        item.cardClassName,
      ].join(" ")}
    >
      <div
        className={[
          "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition duration-300 group-hover:scale-125",
          item.glowClassName,
        ].join(" ")}
      />

      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white to-transparent" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div
          className={[
            "flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl shadow-[0_14px_30px_rgba(15,23,42,0.18)]",
            item.iconClassName,
          ].join(" ")}
        >
          <Icon className="h-6 w-6" />
        </div>

        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold",
            item.chipClassName,
          ].join(" ")}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Live
        </span>
      </div>

      <div className="relative z-10 mt-5">
        <p className="text-sm font-extrabold text-slate-800">{item.label}</p>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
          {item.caption}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <h3 className="text-[34px] font-black leading-none tracking-tight text-slate-950">
            {loading ? <LoadingValue /> : formatCompactNumber(value)}
          </h3>

          <div className="flex h-9 items-end gap-1">
            <span className="h-3 w-1.5 rounded-full bg-slate-300" />
            <span className="h-5 w-1.5 rounded-full bg-slate-400" />
            <span className="h-4 w-1.5 rounded-full bg-slate-300" />
            <span className="h-7 w-1.5 rounded-full bg-slate-500" />
            <span className="h-6 w-1.5 rounded-full bg-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GrowthPanel({ counts }: { counts: DashboardCounts }) {
  const maxValue = Math.max(
    counts.category,
    counts.brand,
    counts.model,
    counts.product,
    counts.shops,
    counts.masterCategory,
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

      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[88px_1fr_46px] items-center gap-3"
          >
            <span className="text-xs font-extrabold text-slate-600">
              {row.label}
            </span>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={[
                  "h-full rounded-full shadow-sm",
                  row.barClassName,
                  getBarWidthClass(row.value, maxValue),
                ].join(" ")}
              />
            </div>

            <span className="text-right text-xs font-black text-slate-950">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-4">
        <svg viewBox="0 0 640 200" className="h-47.5 w-full" aria-hidden="true">
          <path d="M20 35 H620" className="stroke-slate-200" strokeDasharray="4 6" />
          <path d="M20 75 H620" className="stroke-slate-200" strokeDasharray="4 6" />
          <path d="M20 115 H620" className="stroke-slate-200" strokeDasharray="4 6" />
          <path d="M20 155 H620" className="stroke-slate-200" strokeDasharray="4 6" />

          <path
            d="M20 158 C95 120, 120 124, 180 102 C245 78, 285 86, 340 62 C410 32, 475 58, 620 34"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-[#00008b]"
          />
          <path
            d="M20 168 C120 152, 155 138, 230 130 C320 118, 365 96, 440 90 C520 82, 560 72, 620 64"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-[#ec0677]"
          />
          <path
            d="M20 176 C100 170, 175 164, 245 154 C320 143, 390 138, 470 128 C535 120, 585 110, 620 104"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-cyan-500"
          />
        </svg>

        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#00008b]" />
            <span className="text-xs font-bold text-slate-600">Catalog</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ec0677]" />
            <span className="text-xs font-bold text-slate-600">Products</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-500" />
            <span className="text-xs font-bold text-slate-600">Shops</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DonutPanel({ counts }: { counts: DashboardCounts }) {
  const total =
    counts.brand +
    counts.model +
    counts.category +
    counts.shops +
    counts.product +
    counts.compatibility +
    counts.masterCategory +
    counts.subcategory;

  const items = [
    {
      label: "Products",
      value: counts.product,
      percent: getPercentage(counts.product, total),
      colorClassName: "bg-[#00008b]",
      strokeClassName: "stroke-[#00008b]",
    },
    {
      label: "Brands",
      value: counts.brand,
      percent: getPercentage(counts.brand, total),
      colorClassName: "bg-orange-500",
      strokeClassName: "stroke-orange-500",
    },
    {
      label: "Models",
      value: counts.model,
      percent: getPercentage(counts.model, total),
      colorClassName: "bg-emerald-500",
      strokeClassName: "stroke-emerald-500",
    },
    {
      label: "Shops",
      value: counts.shops,
      percent: getPercentage(counts.shops, total),
      colorClassName: "bg-[#ec0677]",
      strokeClassName: "stroke-[#ec0677]",
    },
    {
      label: "Others",
      value:
        counts.category +
        counts.compatibility +
        counts.masterCategory +
        counts.subcategory,
      percent: getPercentage(
        counts.category +
          counts.compatibility +
          counts.masterCategory +
          counts.subcategory,
        total
      ),
      colorClassName: "bg-cyan-500",
      strokeClassName: "stroke-cyan-500",
    },
  ];

  const circumference = 339.292;
  let offset = 0;

  const segments = items.map((item) => {
    const length = total ? (item.value / total) * circumference : 0;

    const segment = {
      ...item,
      length,
      offset: -offset,
    };

    offset += length;

    return segment;
  });

  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ec0677]/10 text-[#ec0677]">
          <PieChart className="h-5 w-5" />
        </span>

        <div>
          <h2 className="text-lg font-black text-slate-950">Catalog Share</h2>
          <p className="text-xs font-semibold text-slate-500">
            Module-wise contribution
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center xl:grid-cols-1 2xl:grid-cols-[220px_1fr]">
        <div className="relative mx-auto h-55 w-55">
          <svg viewBox="0 0 180 180" className="h-full w-full" aria-hidden="true">
            <circle
              cx="90"
              cy="90"
              r="54"
              fill="none"
              strokeWidth="28"
              className="stroke-slate-100"
            />

            <g transform="rotate(-90 90 90)">
              {segments.map((segment) => (
                <circle
                  key={segment.label}
                  cx="90"
                  cy="90"
                  r="54"
                  fill="none"
                  strokeWidth="28"
                  strokeDasharray={`${segment.length} ${
                    circumference - segment.length
                  }`}
                  strokeDashoffset={segment.offset}
                  strokeLinecap="round"
                  className={segment.strokeClassName}
                />
              ))}
            </g>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">
              Total
            </span>
            <span className="text-[30px] font-black leading-none text-slate-950">
              {total}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={`h-3.5 w-3.5 rounded-full ${item.colorClassName}`} />
                <span className="text-sm font-black text-slate-700">
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">
                  {item.percent}%
                </span>
                <span className="min-w-8 text-right text-sm font-black text-slate-950">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
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

          return (
            <div
              key={item.label}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${item.rowClassName}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClassName}`}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <div>
                  <span className="text-sm font-black text-slate-800">
                    {item.label}
                  </span>
                  <p className="text-xs font-semibold text-slate-500">
                    Active role users
                  </p>
                </div>
              </div>

              <span
                className={`min-w-12 rounded-xl px-3 py-2 text-center text-sm font-black ${item.pillClassName}`}
              >
                {item.value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#00008b]/10 bg-[#00008b]/5 px-4 py-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#00008b]" />
        <p className="text-sm font-bold leading-6 text-slate-700">
          These counts are calculated from the current staff list response and grouped
          by role.
        </p>
      </div>
    </section>
  );
}

function MiniSummaryCard({
  title,
  value,
  icon: Icon,
  className,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
      <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${className}`} />

      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.2)]">
          <Icon className="h-5 w-5" />
        </span>

        <div>
          <p className="text-sm font-black text-slate-500">{title}</p>
          <h3 className="text-[28px] font-black text-slate-950">{value}</h3>
        </div>
      </div>
    </div>
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
            key: "masterCategory",
            label: "Master Category",
            url: SummaryApi.master_category_list.url,
          },
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
          masterCategory: getListCount(resolvedMap.get("masterCategory")),
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
      counts.masterCategory +
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
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/10 bg-white px-3 py-1.5 text-xs font-black text-[#00008b] shadow-sm">
              <Database className="h-4 w-4" />
              Master Admin Dashboard
            </div>

            <h1 className="mt-3 text-[30px] font-black tracking-tight text-slate-950 sm:text-[38px]">
              Dashboard
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Welcome back, Master Admin. Manage inventory, shops, catalog, and staff
              from one premium control panel.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm">
              <Clock3 className="h-4 w-4 text-[#00008b]" />
              <span>Updated</span>
              <span className="font-black text-slate-950">{lastUpdated}</span>
            </div>

            <Button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing || loading}
              className="h-11 rounded-2xl bg-[#00008b] px-5 font-black text-white shadow-[0_16px_32px_rgba(0,0,139,0.25)] transition hover:bg-[#000070]"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-black">Some dashboard data could not load.</p>
              <p className="mt-1 font-semibold text-amber-800">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {statCards.map((item) => (
            <StatCard
              key={item.key}
              item={item}
              value={counts[item.key]}
              loading={loading}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.18fr_0.95fr_0.9fr]">
          <GrowthPanel counts={counts} />
          <DonutPanel counts={counts} />
          <ManagementOverview counts={counts} />
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <MiniSummaryCard
            title="Total Records"
            value={loading ? "..." : formatCompactNumber(totalRecords)}
            icon={Activity}
            className="bg-indigo-500/15"
          />

          <MiniSummaryCard
            title="Catalog Data"
            value={loading ? "..." : formatCompactNumber(totalCatalog)}
            icon={TrendingUp}
            className="bg-emerald-500/15"
          />

          <MiniSummaryCard
            title="Active Shops"
            value={loading ? "..." : formatCompactNumber(counts.shops)}
            icon={Store}
            className="bg-cyan-500/15"
          />
        </section>
      </div>
    </main>
  );
}