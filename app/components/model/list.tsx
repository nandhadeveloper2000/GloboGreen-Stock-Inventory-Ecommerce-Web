"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  XCircle,
  Boxes,
  Shapes,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type BrandRef =
  | string
  | {
      _id?: string;
      name?: string;
      nameKey?: string;
    };

type ModelItem = {
  _id?: string;
  name?: string;
  nameKey?: string;
  brandId?: BrandRef;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ModelListResponse = {
  success?: boolean;
  message?: string;
  data?: ModelItem[];
  models?: ModelItem[];
};

type DeleteResponse = {
  success?: boolean;
  message?: string;
};

type ToggleResponse = {
  success?: boolean;
  message?: string;
  data?: ModelItem;
};

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message
  ) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message || "Something went wrong"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

function isValidMongoId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
}

function normalizeRole(role?: string | null) {
  return String(role ?? "").trim().toUpperCase();
}

function getRoleBasePath(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "MASTER_ADMIN") return "/master";
  if (normalizedRole === "MANAGER") return "/manager";
  if (normalizedRole === "SUPERVISOR") return "/supervisor";
  if (normalizedRole === "STAFF") return "/staff";

  return "/master";
}

function getBrandName(brand: BrandRef | undefined) {
  if (!brand) return "-";
  if (typeof brand === "string") return brand;
  return brand.name?.trim() || "-";
}

function formatDate(date?: string) {
  if (!date) return "-";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  title,
  value,
  icon,
  iconWrapClassName,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconWrapClassName: string;
}) {
  return (
    <div className="premium-card-solid rounded-[28px] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconWrapClassName}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="premium-card-solid overflow-hidden rounded-[28px] p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-4" />
              <th className="px-4 py-4" />
              <th className="px-4 py-4" />
              <th className="px-4 py-4" />
              <th className="px-4 py-4" />
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody className="bg-white">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="px-4 py-4">
                  <div className="h-4 w-8 animate-pulse rounded bg-slate-200" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                </td>
                <td className="px-4 py-4">
                  <div className="ml-auto h-9 w-44 animate-pulse rounded-xl bg-slate-200" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaginationFooter({
  page,
  totalPages,
  totalEntries,
  startEntry,
  endEntry,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalEntries: number;
  startEntry: number;
  endEntry: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-500">
        Showing {startEntry} to {endEntry} of {totalEntries} entries
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 1}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700">
          {page} / {totalPages}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={page === totalPages}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ModelListPage() {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);

  const [items, setItems] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchModels = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await apiClient.get<ModelListResponse>(
        SummaryApi.model_list.url,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to fetch models");
      }

      const list = result.data || result.models || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Unable to load models");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchModels(true);
  }, [fetchModels]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => {
      const modelName = item.name?.toLowerCase() || "";
      const modelKey = item.nameKey?.toLowerCase() || "";
      const brandName = getBrandName(item.brandId).toLowerCase();

      return (
        modelName.includes(q) ||
        modelKey.includes(q) ||
        brandName.includes(q)
      );
    });
  }, [items, search]);

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / limit));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, page]);

  const totalActive = items.filter((item) => item.isActive).length;
  const totalInactive = items.filter((item) => !item.isActive).length;
  const startEntry = totalEntries === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, totalEntries);

  const handleEdit = (id?: string) => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid model id");
      return;
    }

    router.push(`${basePath}/model/edit/${id}`);
  };

  const handleDelete = async (id?: string) => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid model id");
      return;
    }

    try {
      setDeletingId(id);

      const deleteUrl =
        typeof SummaryApi.model_delete.url === "function"
          ? SummaryApi.model_delete.url(id)
          : `${SummaryApi.model_delete.url}/${id}`;

      const response = await apiClient.delete<DeleteResponse>(deleteUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to delete model");
      }

      toast.success(result?.message || "Model deleted successfully");
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (id?: string, currentStatus?: boolean) => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid model id");
      return;
    }

    try {
      setTogglingId(id);

      const toggleUrl =
        typeof SummaryApi.model_toggle_active.url === "function"
          ? SummaryApi.model_toggle_active.url(id)
          : `${SummaryApi.model_toggle_active.url}/${id}/active`;

      const response = await apiClient.patch<ToggleResponse>(
        toggleUrl,
        { isActive: !currentStatus },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to update model status");
      }

      toast.success(
        result?.message ||
          `Model ${currentStatus ? "deactivated" : "activated"} successfully`
      );

      setItems((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                isActive: !currentStatus,
              }
            : item
        )
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Status update failed");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Model List
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage model records, monitor status, and navigate to edit screens
            from one premium dashboard.
          </p>
        </div>

        <section className="premium-hero premium-glow relative overflow-hidden rounded-[28px] px-6 py-7 md:px-8">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </div>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
                Models
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
                View, search, edit, activate, deactivate, and delete models with
                a clean professional admin experience.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void fetchModels(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => router.push(`${basePath}/model/create`)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                + Create Model
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Models"
            value={items.length}
            icon={<Boxes className="h-5 w-5 text-violet-600" />}
            iconWrapClassName="bg-violet-100"
          />

          <StatCard
            title="Active"
            value={totalActive}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            iconWrapClassName="bg-emerald-100"
          />

          <StatCard
            title="Inactive"
            value={totalInactive}
            icon={<XCircle className="h-5 w-5 text-rose-600" />}
            iconWrapClassName="bg-rose-100"
          />
        </section>

        <section className="premium-card-solid rounded-[28px] p-0">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-700 to-fuchsia-600 text-white shadow-sm">
                <Boxes className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Model Directory
                </h3>
                <p className="text-sm text-slate-500">
                  Search by model name, key, or brand.
                </p>
              </div>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search models..."
                className="premium-input pl-10"
              />
            </div>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        S.No
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Brand
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Model
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Updated
                      </th>
                      <th className="px-4 py-4 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    {paginatedItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-16 text-center text-sm font-medium text-slate-500"
                        >
                          No models found.
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((item, index) => {
                        const id = item._id || "";
                        const isActive = Boolean(item.isActive);
                        const serialNumber = (page - 1) * limit + index + 1;

                        return (
                          <tr
                            key={id || `${item.name}-${index}`}
                            className="border-t border-slate-100 transition hover:bg-slate-50"
                          >
                            <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                              {serialNumber}
                            </td>

                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">
                                <Shapes className="h-3.5 w-3.5" />
                                {getBrandName(item.brandId)}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {item.name || "-"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Key: {item.nameKey || "-"}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {formatDate(item.updatedAt)}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap items-center justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(id, item.isActive)}
                                  disabled={togglingId === id}
                                  className={`inline-flex h-10 min-w-32.5 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                                    isActive
                                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                >
                                  <Power className="h-4 w-4" />
                                  {togglingId === id
                                    ? "Updating..."
                                    : isActive
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleEdit(id)}
                                  className="inline-flex h-10 min-w-23.75 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(id)}
                                  disabled={deletingId === id}
                                  className="inline-flex h-10 min-w-26.25 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {deletingId === id ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationFooter
                page={page}
                totalPages={totalPages}
                totalEntries={totalEntries}
                startEntry={startEntry}
                endEntry={endEntry}
                onPrev={() => setPage((prev) => Math.max(prev - 1, 1))}
                onNext={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}