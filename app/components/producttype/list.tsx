/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import SummaryApi, { withQuery } from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import type { AxiosError } from "axios";

type ApiImage = {
  url?: string;
  publicId?: string;
};

type RelatedSubCategory =
  | string
  | {
      _id?: string;
      id?: string;
      name?: string;
      categoryId?:
        | string
        | {
            _id?: string;
            name?: string;
            masterCategoryId?:
              | string
              | {
                  _id?: string;
                  name?: string;
                };
          };
    };

type ProductTypeItem = {
  _id: string;
  name: string;
  nameKey?: string;
  image?: ApiImage;
  isActive?: boolean;
  updatedAt?: string;
  subCategoryId?: RelatedSubCategory;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.message || fallback;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getSubCategoryName(item: ProductTypeItem) {
  if (!item.subCategoryId) return "-";
  if (typeof item.subCategoryId === "string") return item.subCategoryId;
  return item.subCategoryId.name || "-";
}

export default function ProductTypeList() {
  const [rows, setRows] = useState<ProductTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);

      const url = withQuery(SummaryApi.product_type_list.url, {
        q: search || undefined,
      });

      const res = await apiClient.get<ApiResponse<ProductTypeItem[]>>(url);

      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load product types"));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  async function onRefresh() {
    await fetchRows();
    toast.success("Product type list refreshed");
  }

  async function onToggleStatus(id: string) {
    try {
      setBusyId(id);

      const res = await apiClient.patch<ApiResponse<unknown>>(
        SummaryApi.product_type_toggle_active.url(id),
        {}
      );

      toast.success(res.data?.message || "Status updated successfully");
      await fetchRows();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update status"));
    } finally {
      setBusyId("");
    }
  }

  async function onDelete(id: string) {
    try {
      setBusyId(id);

      const res = await apiClient.delete<ApiResponse<unknown>>(
        SummaryApi.product_type_delete.url(id)
      );

      toast.success(res.data?.message || "Product type deleted successfully");

      const updatedRows = rows.filter((item) => item._id !== id);
      const nextTotalPages = Math.max(
        1,
        Math.ceil(updatedRows.filter((item) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;

          const values = [item.name, item.nameKey, getSubCategoryName(item)]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return values.includes(q);
        }).length / pageSize)
      );

      if (currentPage > nextTotalPages) {
        setCurrentPage(nextTotalPages);
      }

      await fetchRows();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete product type"));
    } finally {
      setBusyId("");
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((item) => {
      const values = [item.name, item.nameKey, getSubCategoryName(item)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(q);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  const total = filteredRows.length;
  const activeCount = filteredRows.filter((r) => r.isActive).length;
  const inactiveCount = filteredRows.filter((r) => !r.isActive).length;
  const withImageCount = filteredRows.filter((r) => r.image?.url).length;

  const startEntry = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-425 space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[34px] px-5 py-6 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                Catalog Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-6xl">
                  Product Types
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
                  View, search, edit, activate, deactivate, and delete product
                  types with a clean, modern, enterprise-grade admin experience.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <Link
                href="/master/producttype/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create Product Type
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="premium-card-solid flex items-center justify-between rounded-3xl p-5">
            <div>
              <p className="text-sm text-slate-500">Total Product Types</p>
              <h3 className="mt-2 text-4xl font-extrabold text-slate-900">
                {total}
              </h3>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Boxes className="h-6 w-6" />
            </div>
          </div>

          <div className="premium-card-solid flex items-center justify-between rounded-3xl p-5">
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <h3 className="mt-2 text-4xl font-extrabold text-slate-900">
                {activeCount}
              </h3>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>

          <div className="premium-card-solid flex items-center justify-between rounded-3xl p-5">
            <div>
              <p className="text-sm text-slate-500">Inactive</p>
              <h3 className="mt-2 text-4xl font-extrabold text-slate-900">
                {inactiveCount}
              </h3>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <XCircle className="h-6 w-6" />
            </div>
          </div>

          <div className="premium-card-solid flex items-center justify-between rounded-3xl p-5">
            <div>
              <p className="text-sm text-slate-500">With Image</p>
              <h3 className="mt-2 text-4xl font-extrabold text-slate-900">
                {withImageCount}
              </h3>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <ImageIcon className="h-6 w-6" />
            </div>
          </div>
        </section>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  ProductType Directory
                </h2>
                <p className="text-sm text-slate-500">
                  Search by product type name, key, or sub category.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product types..."
                className="premium-input pl-11"
              />
            </div>
          </div>
        </section>

        <section className="premium-card-solid overflow-hidden rounded-[28px] p-0">
          {loading ? (
            <div className="flex min-h-70 items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <span className="text-sm font-medium text-slate-600">
                  Loading product types...
                </span>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-70 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <Boxes className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                No product types found
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Try changing the search keyword or create a new product type.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b bg-slate-50/90">
                    <tr className="text-left">
                      <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                        S.No
                      </th>
                      <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                        Product Type
                      </th>
                      <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                        Sub Category
                      </th>
                      <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                        Updated
                      </th>
                      <th className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedRows.map((item, index) => {
                      const isBusy = busyId === item._id;

                      return (
                        <tr
                          key={item._id}
                          className="border-b border-slate-200/80 bg-white transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 align-middle text-sm font-semibold text-slate-700">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>

                          <td className="px-5 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-slate-50">
                                {item.image?.url ? (
                                  <img
                                    src={item.image.url}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-slate-400" />
                                )}
                              </div>

                              <div>
                                <p className="text-base font-bold text-slate-900">
                                  {item.name}
                                </p>
                                <p className="text-sm text-slate-500">
                                  Key: {item.nameKey || "-"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-middle">
                            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                              {getSubCategoryName(item)}
                            </span>
                          </td>

                          <td className="px-5 py-4 align-middle">
                            <span
                              className={
                                item.isActive
                                  ? "premium-badge-active"
                                  : "premium-badge-inactive"
                              }
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="px-5 py-4 align-middle text-sm text-slate-600">
                            {formatDate(item.updatedAt)}
                          </td>

                          <td className="px-5 py-4 align-middle">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => onToggleStatus(item._id)}
                                disabled={isBusy}
                                className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  item.isActive
                                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {isBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                                {item.isActive ? "Deactivate" : "Activate"}
                              </button>

                              <Link
                                href={`/master/producttype/edit/${item._id}`}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Link>

                              <button
                                type="button"
                                onClick={() => onDelete(item._id)}
                                disabled={isBusy}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isBusy ? (
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
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {startEntry} to {endEntry} of {total} entries
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}