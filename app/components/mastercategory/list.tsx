"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
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

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.nameKey?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalCount = items.length;
  const activeCount = items.filter((item) => item.isActive).length;
  const inactiveCount = items.filter((item) => !item.isActive).length;

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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Master Category List
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage all top-level catalog categories from one premium dashboard.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-r from-[#082a5e] via-[#5b21b6] to-[#9116a1] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:p-8">
          <div className="absolute inset-0 bg-white/5" />
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
                Master Categories
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                View, search, edit, and manage your master categories with a
                clean premium experience.
              </p>
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
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
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
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
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
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
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
          </div>
        </div>

        <div className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)] md:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                Category Records
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Search by category name or name key.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search master category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 lg:block">
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
                    filteredItems.map((item, index) => {
                      const imageUrl = getImageUrl(item);

                      return (
                        <tr
                          key={item._id}
                          className="border-t border-slate-100 transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {index + 1}
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
                                <Trash2 className="h-4 w-4" />
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
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Loading master categories...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No master categories found.
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const imageUrl = getImageUrl(item);

                return (
                  <div
                    key={item._id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
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
                              #{index + 1}
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
                            <Trash2 className="h-4 w-4" />
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
        </div>
      </div>
    </div>
  );
}