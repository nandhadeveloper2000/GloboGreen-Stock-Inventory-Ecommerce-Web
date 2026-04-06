"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  FolderTree,
  Layers3,
  Package2,
  RefreshCw,
  ShieldAlert,
  Store,
  Tag,
  TrendingUp,
  UserCog,
  UserRoundCheck,
  Users,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DashboardCounts = {
  masterCategory: number;
  category: number;
  subcategory: number;
  brand: number;
  model: number;
  complaint: number;
  product: number;
  shops: number;
  managers: number;
  supervisors: number;
  staff: number;
};

type CountCard = {
  key: keyof DashboardCounts;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  helper: string;
};

const initialCounts: DashboardCounts = {
  masterCategory: 0,
  category: 0,
  subcategory: 0,
  brand: 0,
  model: 0,
  complaint: 0,
  product: 0,
  shops: 0,
  managers: 0,
  supervisors: 0,
  staff: 0,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseURL}${url}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Request failed: ${response.status} ${url} ${text}`);
  }

  return (await response.json()) as T;
}

function getListCount(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== "object") return 0;

  const obj = payload as Record<string, unknown>;

  const numberKeys = [
    "total",
    "count",
    "totalCount",
    "totalItems",
    "totalRecords",
    "length",
  ];

  for (const key of numberKeys) {
    if (typeof obj[key] === "number") {
      return obj[key] as number;
    }
  }

  const collectionKeys = [
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
    "complaints",
    "shops",
    "staff",
    "supervisors",
    "subadmins",
    "users",
  ];

  for (const key of collectionKeys) {
    const value = obj[key];

    if (Array.isArray(value)) {
      return value.length;
    }

    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;

      for (const nestedKey of ["data", "items", "rows", "list", "records", "docs"]) {
        if (Array.isArray(nested[nestedKey])) {
          return (nested[nestedKey] as unknown[]).length;
        }
      }

      for (const nestedNumberKey of ["total", "count", "totalCount", "totalItems"]) {
        if (typeof nested[nestedNumberKey] === "number") {
          return nested[nestedNumberKey] as number;
        }
      }
    }
  }

  return 0;
}

function formatLastUpdated(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SoftStatCard({
  title,
  value,
  delta,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number | string;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400">{title}</p>
          <div className="mt-2 flex items-end gap-2">
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {loading ? "..." : value}
            </h3>
            <span className="pb-1 text-xs font-semibold text-lime-600">{delta}</span>
          </div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-lime-500 text-white shadow-[0_10px_24px_rgba(132,204,22,0.35)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
        {loading ? "..." : value}
      </div>
    </div>
  );
}

export default function MasterDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("--");
  const [isLive, setIsLive] = useState<boolean>(true);

  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const responses = await Promise.allSettled([
        fetchJson<unknown>(SummaryApi.master_all_subadmin.url),
        fetchJson<unknown>(SummaryApi.supervisor_list.url),
        fetchJson<unknown>(SummaryApi.staff_list.url),
        fetchJson<unknown>(SummaryApi.master_list_shops.url),
        fetchJson<unknown>("/api/master-category"),
        fetchJson<unknown>("/api/category"),
        fetchJson<unknown>("/api/subcategory"),
        fetchJson<unknown>("/api/brand"),
        fetchJson<unknown>("/api/model"),
        fetchJson<unknown>("/api/complaint"),
        fetchJson<unknown>("/api/product"),
      ]);

      const values = responses.map((item) =>
        item.status === "fulfilled" ? item.value : null
      );

      const nextCounts: DashboardCounts = {
        managers: getListCount(values[0]),
        supervisors: getListCount(values[1]),
        staff: getListCount(values[2]),
        shops: getListCount(values[3]),
        masterCategory: getListCount(values[4]),
        category: getListCount(values[5]),
        subcategory: getListCount(values[6]),
        brand: getListCount(values[7]),
        model: getListCount(values[8]),
        complaint: getListCount(values[9]),
        product: getListCount(values[10]),
      };

      setCounts(nextCounts);
      setLastUpdated(formatLastUpdated(new Date()));
      setIsLive(true);

      const failedCalls = responses.filter((item) => item.status === "rejected");
      if (failedCalls.length > 0) {
        setError(`${failedCalls.length} dashboard API call(s) failed.`);
      }
    } catch (err) {
      setIsLive(false);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  useEffect(() => {
    pollerRef.current = setInterval(() => {
      void loadDashboard(true);
    }, 15000);

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
      }
    };
  }, [loadDashboard]);

  const totalCount = useMemo(() => {
    return Object.values(counts).reduce((sum, value) => sum + value, 0);
  }, [counts]);

  const teamTotal = useMemo(() => {
    return counts.managers + counts.supervisors + counts.staff;
  }, [counts]);

  const inventoryStrength = useMemo(() => {
    return counts.product + counts.brand + counts.model;
  }, [counts]);

  const cards: CountCard[] = [
    {
      key: "masterCategory",
      label: "Master Category",
      value: counts.masterCategory,
      icon: Layers3,
      helper: "Core taxonomy base",
    },
    {
      key: "category",
      label: "Category",
      value: counts.category,
      icon: FolderTree,
      helper: "Structured classification",
    },
    {
      key: "subcategory",
      label: "Subcategory",
      value: counts.subcategory,
      icon: Boxes,
      helper: "Granular grouping",
    },
    {
      key: "brand",
      label: "Brand",
      value: counts.brand,
      icon: Tag,
      helper: "Registered brands",
    },
    {
      key: "model",
      label: "Model",
      value: counts.model,
      icon: Wrench,
      helper: "Mapped model catalog",
    },
    {
      key: "complaint",
      label: "Complaint",
      value: counts.complaint,
      icon: ShieldAlert,
      helper: "Open issue pipeline",
    },
    {
      key: "product",
      label: "Product",
      value: counts.product,
      icon: Package2,
      helper: "Active product items",
    },
    {
      key: "shops",
      label: "Shops",
      value: counts.shops,
      icon: Store,
      helper: "Connected stores",
    },
    {
      key: "managers",
      label: "Managers",
      value: counts.managers,
      icon: UserCog,
      helper: "Manager access layer",
    },
    {
      key: "supervisors",
      label: "Supervisors",
      value: counts.supervisors,
      icon: UserRoundCheck,
      helper: "Supervisor accounts",
    },
    {
      key: "staff",
      label: "Staff",
      value: counts.staff,
      icon: Users,
      helper: "Operational staff",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,0.10),transparent_18%),linear-gradient(180deg,#eaf6ff_0%,#dff2ff_36%,#f6f7fb_100%)] p-4 md:p-6">
      <div className="mx-auto max-w-9xl">
        <section className="rounded-[28px] border border-white/70 bg-white/95 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge className="rounded-full border-0 bg-lime-100 px-3 py-1 text-lime-700 hover:bg-lime-100">
                Master Dashboard
              </Badge>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                Dashboard Overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                Live operational summary for master categories, catalog structure,
                shops, complaints, and team accounts.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
                <span className="font-medium text-slate-500">Last updated:</span>{" "}
                <span className="font-semibold text-slate-900">{lastUpdated}</span>
              </div>

              <Button
                type="button"
                onClick={() => void loadDashboard(true)}
                className="h-11 rounded-2xl bg-lime-500 px-5 text-white shadow-[0_12px_24px_rgba(132,204,22,0.28)] hover:bg-lime-600"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SoftStatCard
              title="Total Records"
              value={totalCount}
              delta="+0%"
              icon={TrendingUp}
              loading={loading}
            />
            <SoftStatCard
              title="Team Members"
              value={teamTotal}
              delta="+0%"
              icon={Users}
              loading={loading}
            />
            <SoftStatCard
              title="Shops"
              value={counts.shops}
              delta="+0%"
              icon={Store}
              loading={loading}
            />
            <SoftStatCard
              title="Inventory Strength"
              value={inventoryStrength}
              delta="+0%"
              icon={Package2}
              loading={loading}
            />
            <SoftStatCard
              title="Complaints"
              value={counts.complaint}
              delta="+0%"
              icon={ShieldAlert}
              loading={loading}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-[#f8fafc] shadow-none">
              <CardContent className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1fr_220px]">
                <div className="flex flex-col justify-between">
                  <div>
                    <Badge className="mb-3 rounded-full border-0 bg-lime-100 text-lime-700 hover:bg-lime-100">
                      Realtime summary
                    </Badge>

                    <h2 className="text-2xl font-extrabold text-slate-900">
                      Operational Metrics
                    </h2>

                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      Monitor structure counts, users, inventory strength, shop volume,
                      and complaint load from one clean master panel.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-400">Managers</p>
                      <p className="mt-2 text-xl font-extrabold text-slate-900">
                        {loading ? "..." : counts.managers}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-400">Supervisors</p>
                      <p className="mt-2 text-xl font-extrabold text-slate-900">
                        {loading ? "..." : counts.supervisors}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-400">Staff</p>
                      <p className="mt-2 text-xl font-extrabold text-slate-900">
                        {loading ? "..." : counts.staff}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-400">Products</p>
                      <p className="mt-2 text-xl font-extrabold text-slate-900">
                        {loading ? "..." : counts.product}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center rounded-[22px] bg-gradient-to-br from-lime-300 to-lime-500 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <div className="relative h-36 w-24">
                    <div className="absolute left-1/2 top-0 h-9 w-9 -translate-x-1/2 rounded-full bg-white" />
                    <div className="absolute inset-x-5 top-4 h-20 rounded-t-full bg-white shadow-md" />
                    <div className="absolute inset-x-6 top-11 h-11 rounded-full bg-slate-100" />
                    <div className="absolute left-1/2 top-8 h-4 w-4 -translate-x-1/2 rounded-full bg-lime-500" />
                    <div className="absolute bottom-4 left-1/2 h-14 w-8 -translate-x-1/2 rounded-b-3xl bg-white" />
                    <div className="absolute bottom-2 left-4 h-7 w-4 rotate-12 rounded-b-2xl bg-white" />
                    <div className="absolute bottom-2 right-4 h-7 w-4 -rotate-12 rounded-b-2xl bg-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#202646_0%,#11182f_100%)] text-white shadow-none">
              <CardContent className="h-full p-5">
                <div className="rounded-[20px] bg-white/5 p-5 backdrop-blur-sm">
                  <Badge className="mb-4 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/10">
                    Live status
                  </Badge>

                  <h3 className="text-2xl font-bold">Connection & Sync</h3>

                  <p className="mt-3 text-sm leading-7 text-white/70">
                    Check whether your dashboard is actively syncing and when the
                    latest refresh completed.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <div className="flex items-center gap-2 text-white/70">
                        {isLive ? (
                          <Wifi className="h-4 w-4" />
                        ) : (
                          <WifiOff className="h-4 w-4" />
                        )}
                        <span className="text-xs">Connection</span>
                      </div>

                      <p className="mt-2 text-lg font-semibold">
                        {isLive ? "Active" : "Offline"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <div className="flex items-center gap-2 text-white/70">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">Updated</span>
                      </div>

                      <p className="mt-2 text-lg font-semibold">{lastUpdated}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void loadDashboard(true)}
                    className="mt-6 h-11 rounded-2xl bg-white text-slate-900 hover:bg-white/90"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={card.value}
                helper={card.helper}
                icon={card.icon}
                loading={loading}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}