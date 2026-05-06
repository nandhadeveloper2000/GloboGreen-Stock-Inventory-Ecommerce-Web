"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgePlus,
  CheckCircle2,
  Loader2,
  Pencil,
  Power,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import ProductCompatibilityCreatePage from "./create";

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
  subCategoryId?: RefItem;
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

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  id: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ROWS_PER_PAGE = 10;

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
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

function normalizeCompatibilityList(
  response: ProductCompatibilityListResponse
): ProductCompatibilityItem[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.productCompatibilities)) {
    return response.productCompatibilities;
  }

  return [];
}

function getNameFromRef(item?: RefItem | null) {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  return String(item.name || "").trim();
}

function getDisplayNameFromRef(item?: RefItem | null) {
  const value = getNameFromRef(item);
  return value || "-";
}

function getSubCategoryDisplayName(item: ProductCompatibilityItem) {
  return (
    getDisplayNameFromRef(item.subCategoryId) ||
    getDisplayNameFromRef(item.productTypeId) ||
    "-"
  );
}

function buildSearchText(item: ProductCompatibilityItem) {
  const subCategoryName =
    getNameFromRef(item.subCategoryId) || getNameFromRef(item.productTypeId);

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

  return `${subCategoryName} ${productBrandName} ${compatibleText}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isValidMongoId(id?: string): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
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

export default function ProductCompatibilityListPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [items, setItems] = useState<ProductCompatibilityItem[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    DEFAULT_ROWS_PER_PAGE
  );

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
    id: "",
  });

  async function fetchCompatibilities(showRefreshLoader = false) {
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
  }

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
  }, [search, rowsPerPage]);

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + rowsPerPage);
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + rowsPerPage, totalEntries);

  function openCreateModal() {
    setModalState({
      open: true,
      mode: "create",
      id: "",
    });
  }

  function openEditModal(id: string) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid compatibility id");
      return;
    }

    setModalState({
      open: true,
      mode: "edit",
      id,
    });
  }

  function closeCompatibilityModal() {
    setModalState({
      open: false,
      mode: "create",
      id: "",
    });
  }

  async function refreshAfterModalSave() {
    closeCompatibilityModal();
    await fetchCompatibilities(true);
  }

  function handleDelete(id: string) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid compatibility id");
      return;
    }

    toast("Delete compatibility?", {
      description: "This action will permanently remove the selected record.",
      action: {
        label: actionLoadingId === id ? "Deleting..." : "Delete",
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
  }

  async function handleToggleActive(id: string) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid compatibility id");
      return;
    }

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
                isActive: item.isActive === false,
              }
            : item
        )
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Status update failed"));
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-9xl">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#00008b]/5 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#00008b]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Compatibility Management
                </span>

                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                    Product Compatibility
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    All Product Compatibility records in your system are listed here. You can search, filter, edit, or delete any compatibility record.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void fetchCompatibilities(true)}
                  disabled={refreshing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f]"
                >
                  <BadgePlus className="h-4 w-4" />
                  Add Compatibility
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
                  placeholder="Search by sub category, product brand, compatible brand, or model"
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
              <table className="min-w-280 w-full border-collapse">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      S.No
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Sub Category
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Product Brand
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Compatible Summary
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center">
                        <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading compatibility list...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedItems.length > 0 ? (
                    paginatedItems.map((item, index) => {
                      const serialNo = startIndex + index + 1;
                      const subCategoryName = getSubCategoryDisplayName(item);

                      const productBrandName = getDisplayNameFromRef(
                        item.productBrandId
                      );

                      const compatibleRows = item.compatible || [];
                      const isBusy = actionLoadingId === item._id;
                      const active = item.isActive !== false;

                      return (
                        <tr
                          key={item._id}
                          className="border-t border-slate-100 align-top transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-4 text-sm font-black text-slate-700">
                            {serialNo}
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-40 text-sm font-black text-slate-950">
                              {subCategoryName}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="inline-flex max-w-47.5 rounded-full border border-[#00008b]/10 bg-[#00008b]/5 px-2.5 py-1 text-xs font-black text-[#00008b]">
                              <span className="truncate">
                                {productBrandName}
                              </span>
                            </div>
                          </td>

                          <td className="min-w-107.5 px-4 py-4">
                            {compatibleRows.length > 0 ? (
                              <div className="space-y-2">
                                {compatibleRows.map((row, rowIndex) => {
                                  const brandName = getDisplayNameFromRef(
                                    row.brandId
                                  );

                                  const modelNames = (row.modelId || [])
                                    .map((model) => getNameFromRef(model))
                                    .filter(
                                      (name) =>
                                        Boolean(name) && name.trim().length > 0
                                    );

                                  return (
                                    <div
                                      key={`${item._id}-${rowIndex}`}
                                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-black text-slate-900">
                                          {brandName}
                                        </span>

                                        <span
                                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${
                                            row.isActive === false
                                              ? "bg-rose-100 text-rose-700"
                                              : "bg-emerald-100 text-emerald-700"
                                          }`}
                                        >
                                          {row.isActive === false
                                            ? "Inactive"
                                            : "Active"}
                                        </span>
                                      </div>

                                      <p className="mt-2 text-xs font-semibold text-slate-600">
                                        <span className="font-black text-slate-700">
                                          Models:
                                        </span>{" "}
                                        {modelNames.length
                                          ? modelNames.join(", ")
                                          : "No specific models selected"}
                                      </p>

                                      {row.notes ? (
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                          <span className="font-black text-slate-700">
                                            Notes:
                                          </span>{" "}
                                          {row.notes}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-slate-400">
                                No compatibility rows
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => void handleToggleActive(item._id)}
                              disabled={isBusy}
                              className="disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isBusy ? (
                                <span className="inline-flex h-8 min-w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                </span>
                              ) : (
                                <StatusBadge active={active} />
                              )}
                            </button>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <ActionButton
                                label={active ? "Deactivate" : "Activate"}
                                variant={
                                  active ? "toggleActive" : "toggleInactive"
                                }
                                disabled={isBusy}
                                onClick={() => void handleToggleActive(item._id)}
                              >
                                {isBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </ActionButton>

                              <ActionButton
                                label="Edit"
                                variant="edit"
                                disabled={isBusy}
                                onClick={() => openEditModal(item._id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </ActionButton>

                              <ActionButton
                                label="Delete"
                                variant="delete"
                                disabled={isBusy}
                                onClick={() => handleDelete(item._id)}
                              >
                                {isBusy ? (
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
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center">
                        <div className="mx-auto max-w-md">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Search className="h-6 w-6" />
                          </div>

                          <h3 className="mt-4 text-base font-black text-slate-950">
                            No compatibility records found
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            Try changing your search or create a new
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

          <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
            {loading ? (
              <div className="rounded-[22px] border border-slate-200 bg-white p-6 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#00008b]" />
                <p className="mt-2 text-sm font-black text-slate-600">
                  Loading compatibility list...
                </p>
              </div>
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => {
                const serialNo = startIndex + index + 1;
                const subCategoryName = getSubCategoryDisplayName(item);
                const productBrandName = getDisplayNameFromRef(
                  item.productBrandId
                );
                const compatibleRows = item.compatible || [];
                const isBusy = actionLoadingId === item._id;
                const active = item.isActive !== false;

                return (
                  <div
                    key={item._id}
                    className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                          #{serialNo}
                        </p>

                        <h4 className="mt-1 text-sm font-black text-slate-950">
                          {subCategoryName}
                        </h4>

                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          Product Brand: {productBrandName}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleToggleActive(item._id)}
                        disabled={isBusy}
                        className="disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </span>
                        ) : (
                          <StatusBadge active={active} />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {compatibleRows.length > 0 ? (
                        compatibleRows.map((row, rowIndex) => {
                          const brandName = getDisplayNameFromRef(row.brandId);

                          const modelNames = (row.modelId || [])
                            .map((model) => getNameFromRef(model))
                            .filter(Boolean);

                          return (
                            <div
                              key={`${item._id}-${rowIndex}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <p className="text-sm font-black text-slate-900">
                                {brandName}
                              </p>

                              <p className="mt-1 text-xs font-semibold text-slate-600">
                                Models:{" "}
                                {modelNames.length
                                  ? modelNames.join(", ")
                                  : "No specific models selected"}
                              </p>

                              {row.notes ? (
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  Notes: {row.notes}
                                </p>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-400">
                          No compatibility rows
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(item._id)}
                        disabled={isBusy}
                        className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          active
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(item._id)}
                        disabled={isBusy}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-[#00008b]/15 bg-[#00008b]/5 px-2 text-xs font-bold text-[#00008b] transition hover:bg-[#00008b]/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        disabled={isBusy}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? (
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
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400">
                  <Search className="h-7 w-7" />
                </div>

                <h3 className="mt-4 text-base font-black text-slate-950">
                  No compatibility records found
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Try changing your search or create a new compatibility record.
                </p>
              </div>
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
                    {showingFrom}-{showingTo} of {totalEntries}
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
          onMouseDown={closeCompatibilityModal}
        >
          <div
            className="relative my-2 w-full max-w-6xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
              <div>
                <h2 className="text-base font-black text-slate-950">
                  {modalState.mode === "edit"
                    ? "Edit Compatibility"
                    : "Create Compatibility"}
                </h2>
                <p className="text-xs font-semibold text-slate-500">
                  Complete compatibility details inside this popup.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCompatibilityModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ProductCompatibilityCreatePage
              key={`${modalState.mode}-${modalState.id || "new"}`}
              mode={modalState.mode}
              compatibilityId={modalState.id}
              isModal
              onClose={closeCompatibilityModal}
              onSuccess={refreshAfterModalSave}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
