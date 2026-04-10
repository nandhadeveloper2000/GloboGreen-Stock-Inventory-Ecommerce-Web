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

type BrandRef =
  | string
  | {
      _id?: string;
      name?: string;
    };

type ModelRef =
  | string
  | {
      _id?: string;
      name?: string;
    };

type ProductCompatibilityItem = {
  _id: string;
  productTypeId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  productBrandId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  compatible?: Array<{
    _id?: string;
    brandIds?: BrandRef[];
    modelIds?: ModelRef[];
    notes?: string;
    sortOrder?: number;
    isActive?: boolean;
  }>;
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

function normalizeCompatibilityList(
  response: ProductCompatibilityListResponse
): ProductCompatibilityItem[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.productCompatibilities))
    return response.productCompatibilities;
  return [];
}

function getNameFromRef(
  item?:
    | string
    | {
        _id?: string;
        name?: string;
      }
    | null
): string {
  if (!item) return "-";
  if (typeof item === "string") return item;
  return item.name || "-";
}

function getRefId(
  item?:
    | string
    | {
        _id?: string;
        name?: string;
      }
    | null
): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item._id || "";
}

const PAGE_SIZE = 10;

export default function ProductCompatibilityListPage() {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [items, setItems] = useState<ProductCompatibilityItem[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCompatibilities = async () => {
    try {
      setLoading(true);

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
    }
  };

  useEffect(() => {
    void fetchCompatibilities();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const productTypeName = getNameFromRef(item.productTypeId).toLowerCase();
      const productBrandName = getNameFromRef(item.productBrandId).toLowerCase();

      const compatibleBrands =
        item.compatible
          ?.flatMap((row) => row.brandIds || [])
          .map((brand) => getNameFromRef(brand).toLowerCase())
          .join(" ") || "";

      const compatibleModels =
        item.compatible
          ?.flatMap((row) => row.modelIds || [])
          .map((model) => getNameFromRef(model).toLowerCase())
          .join(" ") || "";

      return (
        productTypeName.includes(q) ||
        productBrandName.includes(q) ||
        compatibleBrands.includes(q) ||
        compatibleModels.includes(q)
      );
    });
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
    const ok = window.confirm("Are you sure you want to delete this compatibility?");
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
    <div className="min-h-screen bg-[#f6f7fb] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-r from-[#2e3192] via-[#7a24ff] to-[#ec0677] p-8 text-white shadow-[0_24px_80px_rgba(46,49,146,0.22)]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] bg-[size:42px_42px]" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Compatibility Management
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Product Compatibility List
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-white/85 md:text-base">
                View product type, product brand, compatible brands, and selected
                model summary.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`${basePath}/productcompatibility/create`)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-900 shadow-[0_18px_40px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5"
            >
              <BadgePlus className="h-4 w-4" />
              Add Compatibility
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Compatibility Records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search by product type, brand, compatible brand, or model.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:min-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search compatibility..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-fuchsia-100"
                />
              </div>

              <button
                type="button"
                onClick={() => void fetchCompatibilities()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
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
                  ) : paginatedItems.length ? (
                    paginatedItems.map((item, index) => {
                      const serialNo = startIndex + index + 1;
                      const productTypeName = getNameFromRef(item.productTypeId);
                      const productBrandName = getNameFromRef(item.productBrandId);

                      const compatibleRows = item.compatible || [];

                      return (
                        <tr key={item._id} className="align-top">
                          <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                            {serialNo}
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-[160px] text-sm font-semibold text-slate-900">
                              {productTypeName}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-[160px] text-sm font-medium text-slate-700">
                              {productBrandName}
                            </div>
                          </td>

                          <td className="min-w-[430px] px-4 py-4">
                            {compatibleRows.length ? (
                              <div className="space-y-3">
                                {compatibleRows.map((row, rowIndex) => {
                                  const brandNames = (row.brandIds || [])
                                    .map((brand) => getNameFromRef(brand))
                                    .filter(Boolean);

                                  const modelNames = (row.modelIds || [])
                                    .map((model) => getNameFromRef(model))
                                    .filter(Boolean);

                                  return (
                                    <div
                                      key={row._id || `${item._id}-${rowIndex}`}
                                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                                    >
                                      <div className="text-sm font-semibold text-slate-900">
                                        {brandNames.join(", ") || "-"}
                                      </div>

                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {modelNames.length ? (
                                          modelNames.map((modelName, modelIndex) => (
                                            <span
                                              key={`${modelName}-${modelIndex}`}
                                              className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
                                            >
                                              {modelName}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-xs text-slate-400">
                                            No models selected
                                          </span>
                                        )}
                                      </div>

                                      {row.notes ? (
                                        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
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
                              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold transition ${
                                item.isActive !== false
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
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
                                    `${basePath}/productcompatibility/edit/${item._id}`
                                  )
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(item._id)}
                                disabled={actionLoadingId === item._id}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                      <td
                        colSpan={6}
                        className="px-4 py-14 text-center text-sm text-slate-500"
                      >
                        No compatibility records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing {showingFrom} to {showingTo} of {totalEntries} entries
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}