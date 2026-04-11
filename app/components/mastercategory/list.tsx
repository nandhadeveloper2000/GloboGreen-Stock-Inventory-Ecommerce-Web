"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  FolderKanban,
  Layers3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type MasterCategoryItem = {
  _id: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  image?: {
    url?: string;
    publicId?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type MasterCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: MasterCategoryItem[];
  categories?: MasterCategoryItem[];
  masterCategories?: MasterCategoryItem[];
};

type DeleteResponse = {
  success?: boolean;
  message?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getImageUrl(item: MasterCategoryItem) {
  return item.image?.url?.trim() || "";
}

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

export default function MasterCategoryListPage() {
  const router = useRouter();

  const [items, setItems] = useState<MasterCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  const fetchMasterCategories = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await apiClient.get<MasterCategoryListResponse>(
        SummaryApi.master_category_list.url,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to fetch master categories");
      }

      const list =
        result.data || result.categories || result.masterCategories || [];

      setItems(Array.isArray(list) ? list : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Unable to load master categories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchMasterCategories(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.nameKey?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  const totalCount = items.length;
  const activeCount = items.filter((item) => item.isActive).length;
  const inactiveCount = items.filter((item) => !item.isActive).length;

  const startEntry =
    filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry =
    filteredItems.length === 0
      ? 0
      : Math.min(currentPage * pageSize, filteredItems.length);

  const handleEdit = (id: string) => {
    router.push(`/master/mastercategory/edit/${id}`);
  };

  const handleCreate = () => {
    router.push("/master/mastercategory/create");
  };

  const performDelete = async (id: string) => {
    try {
      setDeletingId(id);

      const deleteUrl =
        typeof SummaryApi.master_category_delete.url === "function"
          ? SummaryApi.master_category_delete.url(id)
          : `${SummaryApi.master_category_delete.url}/${id}`;

      const response = await apiClient.delete<DeleteResponse>(deleteUrl);
      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to delete master category");
      }

      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success(result?.message || "Master category deleted successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: string) => {
    toast("Delete master category?", {
      description: "This action will permanently remove the selected record.",
      action: {
        label: deletingId === id ? "Deleting..." : "Delete",
        onClick: () => {
          void performDelete(id);
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
      duration: 5000,
    });
  };

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  Master Categories
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  View, search, edit, and manage your master categories with a
                  clean premium experience.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchMasterCategories(false)}
                disabled={refreshing}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition duration-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#082a5e] shadow-[0_12px_30px_rgba(255,255,255,0.18)] transition duration-200 hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                Create Category
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="premium-card-solid rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {totalCount}
                </h3>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Layers3 className="h-6 w-6" />
              </div>
            </div>
          </section>

          <section className="premium-card-solid rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {activeCount}
                </h3>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </section>

          <section className="premium-card-solid rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Inactive</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {inactiveCount}
                </h3>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
          </section>
        </div>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <FolderKanban className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Category Records
                </h2>
                <p className="text-sm text-slate-500">
                  Search by category name or name key.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search master category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="premium-input pl-11"
              />
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      S.No
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Image
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Name
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Name Key
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Created
                    </th>
                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center text-sm text-slate-500"
                      >
                        Loading master categories...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center text-sm text-slate-500"
                      >
                        No master categories found.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const imageUrl = getImageUrl(item);

                      return (
                        <tr
                          key={item._id}
                          className="border-t border-slate-100 transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <FolderKanban className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {item.name}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                              {item.nameKey}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {item.isActive ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                                Inactive
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(item.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(item._id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(item._id)}
                                disabled={deletingId === item._id}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Delete"
                              >
                                {deletingId === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
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
          </div>

          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Loading master categories...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No master categories found.
              </div>
            ) : (
              paginatedItems.map((item, index) => {
                const imageUrl = getImageUrl(item);

                return (
                  <div
                    key={item._id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <FolderKanban className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-slate-500">
                              #{(currentPage - 1) * pageSize + index + 1}
                            </p>
                            <h4 className="truncate text-base font-semibold text-slate-900">
                              {item.name}
                            </h4>
                          </div>

                          {item.isActive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <p className="text-slate-600">
                            <span className="font-semibold text-slate-800">
                              Name Key:
                            </span>{" "}
                            {item.nameKey}
                          </p>
                          <p className="text-slate-600">
                            <span className="font-semibold text-slate-800">
                              Created:
                            </span>{" "}
                            {formatDate(item.createdAt)}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item._id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item._id)}
                            disabled={deletingId === item._id}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === item._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && filteredItems.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {startEntry} to {endEntry} of {filteredItems.length} entries
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
          ) : null}
        </section>
      </div>
    </div>
  );
}