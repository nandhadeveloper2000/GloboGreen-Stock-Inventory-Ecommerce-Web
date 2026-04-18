/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Boxes,
  FolderTree,
  Layers3,
  Package2,
  RefreshCw,
  ShieldAlert,
  Store,
  Tag,
  UserCog,
  UserRoundCheck,
  Users,
  Wrench,
} from "lucide-react";

import SummaryApi from "@/constants/SummaryApi";
import { Button } from "@/components/ui/button";
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
  key: string;
  label: string;
  url: string;
  optional?: boolean;
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

      for (const nestedKey of ["data", "items", "rows", "list", "records", "docs"]) {
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

function extractStaffCounts(payload: unknown) {
  const result = {
    managers: 0,
    supervisors: 0,
    staff: 0,
  };

  let rows: Record<string, unknown>[] = [];

  if (Array.isArray(payload)) {
    rows = payload as Record<string, unknown>[];
  } else if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    for (const key of ["data", "items", "result", "rows", "list", "records", "docs"]) {
      if (Array.isArray(obj[key])) {
        rows = obj[key] as Record<string, unknown>[];
        break;
      }
    }

    if (!rows.length && obj.data && typeof obj.data === "object") {
      const nested = obj.data as Record<string, unknown>;
      for (const key of ["items", "rows", "list", "records", "docs"]) {
        if (Array.isArray(nested[key])) {
          rows = nested[key] as Record<string, unknown>[];
          break;
        }
      }
    }
  }

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
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} K`;
  return String(value);
}

function MiniStatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[18px] border border-token bg-card-token px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <p className="text-secondary-text text-[12px] font-medium">{title}</p>
      <div className="mt-2">
        <h3 className="text-heading text-[30px] font-extrabold leading-none tracking-tight">
          {value}
        </h3>
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
          { key: "staff", label: "Staff", url: SummaryApi.staff_list.url },
          { key: "shops", label: "Shops", url: SummaryApi.master_list_shops.url },
          {
            key: "masterCategory",
            label: "Master Category",
            url: SummaryApi.master_category_list.url,
          },
          { key: "category", label: "Category", url: SummaryApi.category_list.url },
          { key: "subcategory", label: "Sub Category", url: SummaryApi.sub_category_list.url },
          { key: "brand", label: "Brand", url: SummaryApi.brand_list.url },
          { key: "model", label: "Model", url: SummaryApi.model_list.url },
          {
            key: "compatibility",
            label: "Compatibility",
            url: SummaryApi.product_compatibility_list.url,
          },
          { key: "product", label: "Product", url: SummaryApi.product_list.url },
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

        const staffCounts = extractStaffCounts(resolvedMap.get("staff"));

        const nextCounts: DashboardCounts = {
          managers: staffCounts.managers,
          supervisors: staffCounts.supervisors,
          staff: staffCounts.staff,
          shops: getListCount(resolvedMap.get("shops")),
          masterCategory: getListCount(resolvedMap.get("masterCategory")),
          category: getListCount(resolvedMap.get("category")),
          subcategory: getListCount(resolvedMap.get("subcategory")),
          brand: getListCount(resolvedMap.get("brand")),
          model: getListCount(resolvedMap.get("model")),
          compatibility: getListCount(resolvedMap.get("compatibility")),
          product: getListCount(resolvedMap.get("product")),
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
            `${failedRequired.length} dashboard API call(s) failed: ${failedLabels.join(", ")}`
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
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
      if (pollerRef.current) clearInterval(pollerRef.current);
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

  const totalShopOwner = useMemo(() => {
    return counts.managers;
  }, [counts.managers]);

  const categoryBreakdown = useMemo(() => {
    return [
      { label: "Master Category", value: counts.masterCategory, icon: Layers3 },
      { label: "Category", value: counts.category, icon: FolderTree },
      { label: "Subcategory", value: counts.subcategory, icon: Boxes },
      { label: "Brand", value: counts.brand, icon: Tag },
      { label: "Model", value: counts.model, icon: Wrench },
      { label: "Compatibility", value: counts.compatibility, icon: ShieldAlert },
      { label: "Product", value: counts.product, icon: Package2 },
      { label: "Shops", value: counts.shops, icon: Store },
      { label: "Managers", value: counts.managers, icon: UserCog },
      { label: "Supervisors", value: counts.supervisors, icon: UserRoundCheck },
      { label: "Staff", value: counts.staff, icon: Users },
    ];
  }, [counts]);


  return (
    <main className="page-premium">
      <div className="mx-auto max-w-400 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-heading text-[34px] font-extrabold tracking-tight">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-token bg-card-token px-4 py-2 text-sm text-secondary-text md:flex">
              Last updated: <span className="text-heading ml-2 font-semibold">{lastUpdated}</span>
            </div>

            <Button
              type="button"
              onClick={() => void loadDashboard(true)}
              className="premium-btn h-11 rounded-xl px-5"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-[18px] border border-(--warning) bg-(--warning-soft) px-4 py-3 text-sm text-(--primary-text)">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-(--warning)" />
            <div>
              <p className="font-semibold">Some dashboard data could not load.</p>
              <p className="mt-1 text-secondary-text">{error}</p>
            </div>
          </div>
        ) : null}



        <section className="rounded-[22px] border border-token bg-card-token p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] md:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h3 className="text-heading text-[28px] font-bold">Dashboard count</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categoryBreakdown.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-token bg-soft-token px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--primary-soft) text-(--primary)">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-heading text-sm font-semibold">{item.label}</span>
                  </div>
                  <span className="text-secondary-text text-sm font-bold">
                    {loading ? "..." : item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}