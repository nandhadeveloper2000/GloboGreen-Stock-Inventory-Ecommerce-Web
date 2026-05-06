"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ROWS_PER_PAGE = 10;

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

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
      <XCircle className="h-3.5 w-3.5" />
      Inactive
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "edit" | "delete" | "toggleActive" | "toggleInactive";
  children: ReactNode;
}) {
  const className =
    variant === "edit"
      ? "border-[#00008b]/15 bg-[#00008b]/5 text-[#00008b] hover:border-[#00008b]/25 hover:bg-[#00008b]/10"
      : variant === "delete"
        ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
        : variant === "toggleActive"
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-t border-slate-100">
          <td className="px-4 py-4">
            <div className="h-4 w-8 animate-pulse rounded bg-slate-200" />
          </td>
          <td className="px-4 py-4">
            <div className="h-7 w-32 animate-pulse rounded-full bg-slate-200" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </td>
          <td className="px-4 py-4">
            <div className="ml-auto h-9 w-32 animate-pulse rounded-xl bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
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
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    DEFAULT_ROWS_PER_PAGE
  );

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
    id: "",
  });

  const fetchModels = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

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
  }, [search, rowsPerPage]);

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
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * rowsPerPage;

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredItems, rowsPerPage, startIndex]);

  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry =
    totalEntries === 0 ? 0 : Math.min(startIndex + rowsPerPage, totalEntries);

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
    <div className="page-shell">
      <div className="mx-auto w-full max-w-9xl">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">


                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                    Models
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    All Models in your system are listed here. You can search, filter, edit, or delete any model.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void fetchModels(false)}
                  disabled={refreshing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f]"
                >
                  <Plus className="h-4 w-4" />
                  Create Model
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by model name, name key, or brand"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                />
              </div>

              <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-700">
                Total:
                <span className="ml-1 text-[#00008b]">
                  {filteredItems.length}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      S.No
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Brand
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Model
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Updated
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {loading ? (
                    <TableSkeleton />
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Search className="h-7 w-7" />
                          </div>
                          <h3 className="mt-4 text-base font-black text-slate-950">
                            No models found
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {search.trim()
                              ? "Try another search keyword."
                              : "Start by creating your first model."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const id = item._id || "";
                      const isActive = Boolean(item.isActive);
                      const isToggling = togglingId === id;
                      const isDeleting = deletingId === id;

                      return (
                        <tr
                          key={id || `${item.name}-${index}`}
                          className="border-t border-slate-100 transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-4 text-sm font-black text-slate-700">
                            {startIndex + index + 1}
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex max-w-47.5 items-center gap-1.5 rounded-full border border-[#00008b]/10 bg-[#00008b]/5 px-2.5 py-1 text-xs font-black text-[#00008b]">
                              <Shapes className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {getBrandName(item.brandId)}
                              </span>
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <p className="text-sm font-black text-slate-950">
                              {item.name || "-"}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              Key: {item.nameKey || "-"}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge active={isActive} />
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                            <div className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-slate-400" />
                              {formatDate(item.updatedAt || item.createdAt)}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <ActionButton
                                label={isActive ? "Deactivate" : "Activate"}
                                variant={
                                  isActive ? "toggleActive" : "toggleInactive"
                                }
                                disabled={isToggling}
                                onClick={() =>
                                  void handleToggleStatus(id, item.isActive)
                                }
                              >
                                {isToggling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </ActionButton>

                              <ActionButton
                                label="Edit"
                                variant="edit"
                                onClick={() => openEditModal(id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </ActionButton>

                              <ActionButton
                                label="Delete"
                                variant="delete"
                                disabled={isDeleting}
                                onClick={() => handleDelete(id)}
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </ActionButton>
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

          <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                  <div className="mt-3 h-8 w-full rounded-xl bg-slate-100" />
                </div>
              ))
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-950">
                  No models found
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {search.trim()
                    ? "Try another search keyword."
                    : "Start by creating your first model."}
                </p>
              </div>
            ) : (
              paginatedItems.map((item, index) => {
                const id = item._id || "";
                const isActive = Boolean(item.isActive);
                const isToggling = togglingId === id;
                const isDeleting = deletingId === id;

                return (
                  <div
                    key={id || `${item.name}-${index}`}
                    className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                          #{startIndex + index + 1}
                        </p>
                        <h4 className="mt-1 truncate text-sm font-black text-slate-950">
                          {item.name || "-"}
                        </h4>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          Key: {item.nameKey || "-"}
                        </p>
                      </div>

                      <StatusBadge active={isActive} />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Brand
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-800">
                          {getBrandName(item.brandId)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Updated
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-800">
                          {formatDate(item.updatedAt || item.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(id, item.isActive)}
                        disabled={isToggling}
                        className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isActive
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(id)}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-[#00008b]/15 bg-[#00008b]/5 px-2 text-xs font-bold text-[#00008b] transition hover:bg-[#00008b]/10"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(id)}
                        disabled={isDeleting}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>


          {!loading ? (
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <label className="inline-flex items-center justify-end gap-2 text-sm font-semibold text-slate-700">
                  Rows per page:
                  <select
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-end gap-3">
                  <p className="min-w-21.5 text-right text-sm font-bold text-slate-800">
                    {startEntry}-{endEntry} of {totalEntries}
                  </p>

                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1 || totalEntries === 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &lt;
                  </button>

                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages || totalEntries === 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {modalState.open ? (
        <div
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={closeModelModal}
        >
          <div
            className="relative my-2 w-full max-w-5xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
              <div>
                <h2 className="text-base font-black text-slate-950">
                  {modalState.mode === "edit" ? "Edit Model" : "Create Model"}
                </h2>
                <p className="text-xs font-semibold text-slate-500">
                  Complete model details inside this popup.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModelModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
