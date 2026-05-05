"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BadgePlus,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Shapes,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import CreateModelPage from "./create";

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

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  id: string;
};

const PAGE_SIZE = 10;

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

function isValidMongoId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
}

function getBrandName(brand: BrandRef | undefined) {
  if (!brand) return "-";
  if (typeof brand === "string") return brand;
  return brand.name?.trim() || "-";
}

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

function StatCard({
  title,
  value,
  icon,
  iconWrapClassName,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  iconWrapClassName: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconWrapClassName}`}
        >
          {icon}
        </div>
      </div>
    </section>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-3 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200" />
              <div className="flex-1">
                <div className="h-3.5 w-40 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
              </div>
              <div className="h-8 w-24 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModelListPage() {
  const [items, setItems] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
    id: "",
  });

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
      toast.error(getErrorMessage(error, "Unable to load models"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchModels(true);
  }, [fetchModels]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, startIndex]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      inactive: items.filter((item) => !item.isActive).length,
    }),
    [items]
  );

  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry =
    totalEntries === 0 ? 0 : Math.min(startIndex + PAGE_SIZE, totalEntries);

  function openCreateModal() {
    setModalState({
      open: true,
      mode: "create",
      id: "",
    });
  }

  function openEditModal(id?: string) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid model id");
      return;
    }

    setModalState({
      open: true,
      mode: "edit",
      id,
    });
  }

  function closeModelModal() {
    setModalState({
      open: false,
      mode: "create",
      id: "",
    });
  }

  async function handleModelSaved() {
    closeModelModal();
    await fetchModels(false);
  }

  function handleDelete(id?: string) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid model id");
      return;
    }

    toast("Delete model?", {
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

  async function performDelete(id: string) {
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
      toast.error(getErrorMessage(error, "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(id?: string, currentStatus?: boolean) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid model id");
      return;
    }

    try {
      setTogglingId(id);

      const nextStatus = !currentStatus;

      const toggleUrl =
        typeof SummaryApi.model_toggle_active.url === "function"
          ? SummaryApi.model_toggle_active.url(id)
          : `${SummaryApi.model_toggle_active.url}/${id}/active`;

      const response = await apiClient.patch<ToggleResponse>(
        toggleUrl,
        {
          isActive: nextStatus,
        },
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
          `Model ${nextStatus ? "activated" : "deactivated"} successfully`
      );

      setItems((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                isActive: nextStatus,
              }
            : item
        )
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Status update failed"));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-3 sm:px-4 lg:px-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5 md:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00008b]/20 bg-[#00008b]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00008b]">
                <BadgePlus className="h-3.5 w-3.5" />
                Catalog Management
              </div>

              <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Models
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                View, search, create, edit, activate, deactivate, and delete
                models.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchModels(false)}
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
                onClick={openCreateModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#000070] hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create Model
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard
            title="Total Models"
            value={stats.total}
            icon={<Boxes className="h-5 w-5" />}
            iconWrapClassName="bg-[#00008b]/10 text-[#00008b]"
          />

          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconWrapClassName="bg-emerald-100 text-emerald-700"
          />

          <StatCard
            title="Inactive"
            value={stats.inactive}
            icon={<XCircle className="h-5 w-5" />}
            iconWrapClassName="bg-rose-100 text-rose-700"
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00008b] text-white shadow-sm">
                <Boxes className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Model Directory
                </h2>
                <p className="text-sm text-slate-500">
                  Search by model name, key, or brand.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search models..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10"
              />
            </div>
          </div>
        </section>

        <div>
          {loading ? (
            <TableSkeleton />
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Boxes className="h-8 w-8" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No models found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search.trim()
                  ? "No records matched your search. Try another keyword."
                  : "No models are available yet. Create your first model to get started."}
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#000070] hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Create Model
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          S.No
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Brand
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Model
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Updated
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {paginatedItems.map((item, index) => {
                        const id = item._id || "";
                        const isActive = Boolean(item.isActive);
                        const isToggling = togglingId === id;
                        const isDeleting = deletingId === id;

                        return (
                          <tr
                            key={id || `${item.name}-${index}`}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                              {startIndex + index + 1}
                            </td>

                            <td className="px-4 py-3">
                              <span className="inline-flex max-w-47.5 items-center gap-1.5 rounded-full bg-[#00008b]/5 px-2.5 py-1 text-xs font-semibold text-[#00008b]">
                                <Shapes className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  {getBrandName(item.brandId)}
                                </span>
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <p className="text-sm font-bold text-slate-900">
                                {item.name || "-"}
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-slate-500">
                                Key: {item.nameKey || "-"}
                              </p>
                            </td>

                            <td className="px-4 py-3">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm font-medium text-slate-600">
                              <div className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {formatDate(item.updatedAt || item.createdAt)}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleToggleStatus(id, item.isActive)
                                  }
                                  disabled={isToggling}
                                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    isActive
                                      ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                >
                                  {isToggling ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Power className="h-4 w-4" />
                                  )}
                                  {isToggling
                                    ? "Updating..."
                                    : isActive
                                      ? "Deactivate"
                                      : "Activate"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEditModal(id)}
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(id)}
                                  disabled={isDeleting}
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  {isDeleting ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:hidden">
                {paginatedItems.map((item, index) => {
                  const id = item._id || "";
                  const isActive = Boolean(item.isActive);
                  const isToggling = togglingId === id;
                  const isDeleting = deletingId === id;

                  return (
                    <div
                      key={id || `${item.name}-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-400">
                              #{startIndex + index + 1}
                            </span>
                            <h3 className="truncate text-sm font-bold text-slate-900">
                              {item.name || "-"}
                            </h3>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                              Key: {item.nameKey || "-"}
                            </p>
                          </div>

                          {isActive ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                              Brand
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {getBrandName(item.brandId)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                              Updated
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {formatDate(item.updatedAt || item.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() =>
                              void handleToggleStatus(id, item.isActive)
                            }
                            disabled={isToggling}
                            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isActive
                                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                            {isToggling
                              ? "Updating..."
                              : isActive
                                ? "Deactivate"
                                : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(id)}
                            disabled={isDeleting}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {startEntry}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900">
                    {endEntry}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {totalEntries}
                  </span>{" "}
                  entries
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1 || totalEntries === 0}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    {totalEntries === 0 ? 0 : currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages)
                      )
                    }
                    disabled={currentPage === totalPages || totalEntries === 0}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalState.open ? (
        <div
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={closeModelModal}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModelModal}
              className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <CreateModelPage
              key={`${modalState.mode}-${modalState.id || "new"}`}
              mode={modalState.mode}
              modelId={modalState.id}
              isModal
              onClose={closeModelModal}
              onSuccess={handleModelSaved}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}