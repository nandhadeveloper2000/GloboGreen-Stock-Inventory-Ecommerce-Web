/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FolderKanban,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import CreateMasterCategoryPage from "./create";

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

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  id: string;
};

const PAGE_SIZE = 10;

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

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const message = (error as { response?: { data?: { message?: string } } })
      .response?.data?.message;

    if (message) return message;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}

function StatCard({
  label,
  value,
  icon,
  iconClassName,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">{value}</h3>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      </div>
    </section>
  );
}

export default function MasterCategoryListPage() {
  const router = useRouter();

  const [items, setItems] = useState<MasterCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
    id: "",
  });

  const fetchMasterCategories = useCallback(async (showLoader = true) => {
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
      toast.error(getErrorMessage(error, "Unable to load master categories"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMasterCategories(true);
  }, [fetchMasterCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const nameKey = String(item.nameKey || "").toLowerCase();

      return name.includes(q) || nameKey.includes(q);
    });
  }, [items, search]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      inactive: items.filter((item) => !item.isActive).length,
    }),
    [items]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, startIndex]);

  const startEntry = filteredItems.length === 0 ? 0 : startIndex + 1;
  const endEntry =
    filteredItems.length === 0
      ? 0
      : Math.min(startIndex + PAGE_SIZE, filteredItems.length);

  function handleCreate() {
    setModalState({
      open: true,
      mode: "create",
      id: "",
    });
  }

  function handleEdit(id: string) {
    setModalState({
      open: true,
      mode: "edit",
      id,
    });
  }

  function closeCategoryModal() {
    setModalState({
      open: false,
      mode: "create",
      id: "",
    });
  }

  async function handleCategorySaved() {
    closeCategoryModal();
    await fetchMasterCategories(false);
  }

  async function performDelete(id: string) {
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
      toast.success(result.message || "Master category deleted successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  }

  function handleDelete(id: string) {
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
        onClick: () => undefined,
      },
      duration: 5000,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-3 sm:px-4 lg:px-5">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5 md:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#00008b]/20 bg-[#00008b]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00008b]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catalog Management
                </span>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                    Master Categories
                  </h1>

                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    View, search, edit, and manage your master categories.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchMasterCategories(false)}
                disabled={refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#000070] hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create Category
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard
            label="Total"
            value={stats.total}
            icon={<Layers3 className="h-5 w-5" />}
            iconClassName="bg-[#00008b]/10 text-[#00008b]"
          />

          <StatCard
            label="Active"
            value={stats.active}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconClassName="bg-emerald-100 text-emerald-700"
          />

          <StatCard
            label="Inactive"
            value={stats.inactive}
            icon={<XCircle className="h-5 w-5" />}
            iconClassName="bg-rose-100 text-rose-700"
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00008b]/10 text-[#00008b]">
                <FolderKanban className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Category Records
                </h2>
                <p className="text-sm text-slate-500">
                  Search by category name or name key.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search master category..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10"
              />
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      S.No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Image
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Name Key
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Created
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading master categories...
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-sm text-slate-500"
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
                          className="border-t border-slate-100 transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-700">
                            {startIndex + index + 1}
                          </td>

                          <td className="px-4 py-3">
                            <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={item.name}
                                  fill
                                  sizes="44px"
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

                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {item.name}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {item.nameKey}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {item.isActive ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                                Inactive
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-600">
                            {formatDate(item.createdAt)}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(item._id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#00008b]/20 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(item._id)}
                                disabled={deletingId === item._id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                <div className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading master categories...
                </div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No master categories found.
              </div>
            ) : (
              paginatedItems.map((item, index) => {
                const imageUrl = getImageUrl(item);

                return (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={item.name}
                            fill
                            sizes="48px"
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500">
                              #{startIndex + index + 1}
                            </p>
                            <h4 className="truncate text-sm font-semibold text-slate-900">
                              {item.name}
                            </h4>
                          </div>

                          {item.isActive ? (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1.5 text-sm">
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

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item._id)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b]/20 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item._id)}
                            disabled={deletingId === item._id}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {startEntry}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">{endEntry}</span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {filteredItems.length}
                </span>{" "}
                entries
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {modalState.open ? (
        <div
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={closeCategoryModal}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeCategoryModal}
              className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <CreateMasterCategoryPage
              key={`${modalState.mode}-${modalState.id || "new"}`}
              mode={modalState.mode}
              masterCategoryId={modalState.id}
              isModal
              onClose={closeCategoryModal}
              onSuccess={handleCategorySaved}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}