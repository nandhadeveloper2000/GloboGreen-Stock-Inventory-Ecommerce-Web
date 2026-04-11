"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgePlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type RefItem =
  | string
  | {
      _id?: string;
      name?: string;
    };

type CompatibilityRow = {
  _id?: string;
  brandId?: RefItem;
  modelId?: RefItem[];
  notes?: string;
  isActive?: boolean;
};

type ProductCompatibilityItem = {
  _id: string;
  productTypeId?: RefItem;
  productBrandId?: RefItem;
  compatible?: CompatibilityRow[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ProductCompatibilityListResponse = {
  success?: boolean;
  message?: string;
  data?: ProductCompatibilityItem[];
  productCompatibilities?: ProductCompatibilityItem[];
};

function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong"
): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object"
  ) {
    const response = error.response as {
      data?: {
        message?: string;
      };
    };

    if (response.data?.message) return response.data.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeRole(role?: string | null) {
  return String(role ?? "")
    .trim()
    .toUpperCase();
}

function getRoleBasePath(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "MASTER_ADMIN") return "/master";
  if (normalizedRole === "MANAGER") return "/manager";
  if (normalizedRole === "SUPERVISOR") return "/supervisor";
  if (normalizedRole === "STAFF") return "/staff";

  return "/master";
}

function normalizeCompatibilityList(
  response: ProductCompatibilityListResponse
): ProductCompatibilityItem[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.productCompatibilities)) {
    return response.productCompatibilities;
  }
  return [];
}

function getNameFromRef(item?: RefItem | null): string {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  return String(item.name || "").trim();
}

function getDisplayNameFromRef(item?: RefItem | null): string {
  const value = getNameFromRef(item);
  return value || "-";
}

function buildSearchText(item: ProductCompatibilityItem): string {
  const productTypeName = getNameFromRef(item.productTypeId);
  const productBrandName = getNameFromRef(item.productBrandId);

  const compatibleText = (item.compatible || [])
    .map((row) => {
      const brandName = getNameFromRef(row.brandId);
      const models = (row.modelId || [])
        .map((model) => getNameFromRef(model))
        .filter(Boolean)
        .join(" ");

      const notes = String(row.notes || "").trim();
      return `${brandName} ${models} ${notes}`.trim();
    })
    .join(" ");

  return `${productTypeName} ${productBrandName} ${compatibleText}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const PAGE_SIZE = 10;

export default function ProductCompatibilityListPage() {
  const router = useRouter();
  const { role } = useAuth();
  const basePath = getRoleBasePath(role);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [items, setItems] = useState<ProductCompatibilityItem[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCompatibilities = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        "";

      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          }
        : {
            Accept: "application/json",
          };

      const response = await apiClient.get<ProductCompatibilityListResponse>(
        SummaryApi.product_compatibility_list.url,
        { headers }
      );

      const list = normalizeCompatibilityList(response.data);
      setItems(list);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load compatibility list"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchCompatibilities();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => buildSearchText(item).includes(q));
  }, [items, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + PAGE_SIZE, totalEntries);

  const handleDelete = async (id: string) => {
    const ok = window.confirm(
      "Are you sure you want to delete this compatibility?"
    );
    if (!ok) return;

    try {
      setActionLoadingId(id);

      const endpoint =
        typeof SummaryApi.product_compatibility_delete.url === "function"
          ? SummaryApi.product_compatibility_delete.url(id)
          : `${SummaryApi.product_compatibility_delete.url}/${id}`;

      const response = await apiClient.delete(endpoint);

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Delete failed");
      }

      toast.success(response?.data?.message || "Deleted successfully");
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      toast.error(getErrorMessage(error, "Delete failed"));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      setActionLoadingId(id);

      const endpoint =
        typeof SummaryApi.product_compatibility_toggle_active.url === "function"
          ? SummaryApi.product_compatibility_toggle_active.url(id)
          : `${SummaryApi.product_compatibility_toggle_active.url}/${id}/active`;

      const response = await apiClient.put(endpoint);

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Status update failed");
      }

      toast.success(response?.data?.message || "Status updated successfully");

      setItems((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                isActive: !item.isActive,
              }
            : item
        )
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Status update failed"));
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <ShieldCheck className="h-3.5 w-3.5" />
                Compatibility Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  Product Compatibility List
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  View product type, product brand, compatible brands, and
                  selected model summary.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(`${basePath}/compatibility/create`)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <BadgePlus className="h-4 w-4" />
              Add Compatibility
            </button>
          </div>
        </section>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Compatibility Records
                </h2>
                <p className="text-sm text-slate-500">
                  Search by product type, product brand, compatible brand, or
                  model.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:min-w-[320px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search compatibility"
                  className="premium-input pl-11"
                />
              </div>

              <button
                type="button"
                onClick={() => void fetchCompatibilities(true)}
                disabled={refreshing}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      S.No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Product Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Product Brand
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Compatible Summary
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center">
                        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading compatibility list...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedItems.length > 0 ? (
                    paginatedItems.map((item, index) => {
                      const serialNo = startIndex + index + 1;
                      const productTypeName = getDisplayNameFromRef(
                        item.productTypeId
                      );
                      const productBrandName = getDisplayNameFromRef(
                        item.productBrandId
                      );
                      const compatibleRows = item.compatible || [];

                      return (
                        <tr key={item._id} className="align-top">
                          <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                            {serialNo}
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-40 text-sm font-semibold text-slate-900">
                              {productTypeName}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-40 text-sm font-medium text-slate-600">
                              {productBrandName}
                            </div>
                          </td>

                          <td className="min-w-107.5 px-4 py-4">
                            {compatibleRows.length > 0 ? (
                              <div className="space-y-3">
                                {compatibleRows.map((row, rowIndex) => {
                                  const brandName = getDisplayNameFromRef(
                                    row.brandId
                                  );

                                  const modelNames = (row.modelId || [])
                                    .map((model) => getNameFromRef(model))
                                    .filter(
                                      (name) =>
                                        Boolean(name) &&
                                        name.trim() !== "-" &&
                                        name.trim() !== ""
                                    );

                                  return (
                                    <div
                                      key={row._id || `${item._id}-${rowIndex}`}
                                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                                    >
                                      <div className="text-sm font-semibold text-slate-900">
                                        {brandName}
                                      </div>

                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {modelNames.length > 0 ? (
                                          modelNames.map(
                                            (modelName, modelIndex) => (
                                              <span
                                                key={`${modelName}-${modelIndex}`}
                                                className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                                              >
                                                {modelName}
                                              </span>
                                            )
                                          )
                                        ) : (
                                          <span className="text-xs text-slate-400">
                                            No models selected
                                          </span>
                                        )}
                                      </div>

                                      {row.notes ? (
                                        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                          {row.notes}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">
                                No compatible data
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => void handleToggleActive(item._id)}
                              disabled={actionLoadingId === item._id}
                              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                item.isActive !== false
                                  ? "bg-emerald-100 text-emerald-700 hover:opacity-90"
                                  : "bg-rose-100 text-rose-700 hover:opacity-90"
                              }`}
                            >
                              {actionLoadingId === item._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : item.isActive !== false ? (
                                "Active"
                              ) : (
                                "Inactive"
                              )}
                            </button>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `${basePath}/compatibility/edit/${item._id}`
                                  )
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(item._id)}
                                disabled={actionLoadingId === item._id}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoadingId === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center">
                        <div className="mx-auto max-w-md">
                          <div className="text-base font-semibold text-slate-900">
                            No compatibility records found
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Try changing the search term or add a new
                            compatibility record.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold">{showingFrom}</span> to{" "}
              <span className="font-semibold">{showingTo}</span> of{" "}
              <span className="font-semibold">{totalEntries}</span> entries
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <div className="inline-flex h-10 min-w-11 items-center justify-center rounded-xl bg-violet-50 px-4 text-sm font-bold text-violet-700">
                {safeCurrentPage}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={safeCurrentPage === totalPages}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}