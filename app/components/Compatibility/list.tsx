"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
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
  X,
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

const PAGE_SIZE = 10;

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

function getNameFromRef(item?: RefItem | null): string {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  return String(item.name || "").trim();
}

function getDisplayNameFromRef(item?: RefItem | null): string {
  const value = getNameFromRef(item);
  return value || "-";
}

function getSubCategoryDisplayName(item: ProductCompatibilityItem): string {
  return (
    getDisplayNameFromRef(item.subCategoryId) ||
    getDisplayNameFromRef(item.productTypeId) ||
    "-"
  );
}

function buildSearchText(item: ProductCompatibilityItem): string {
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

export default function ProductCompatibilityListPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [items, setItems] = useState<ProductCompatibilityItem[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
  }, [search]);

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + PAGE_SIZE, totalEntries);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.isActive !== false).length,
      inactive: items.filter((item) => item.isActive === false).length,
    }),
    [items]
  );

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
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-3 sm:px-4 lg:px-5">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5 md:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00008b]/20 bg-[#00008b]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00008b]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Compatibility Management
              </div>

              <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Product Compatibility
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                View sub category, product brand, compatible brands, and selected
                model summary.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchCompatibilities(true)}
                disabled={refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-70"
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
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#000070] hover:shadow-md"
              >
                <BadgePlus className="h-4 w-4" />
                Add Compatibility
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Total</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              {stats.total}
            </h3>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Active</p>
            <h3 className="mt-1 text-2xl font-bold text-emerald-700">
              {stats.active}
            </h3>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Inactive</p>
            <h3 className="mt-1 text-2xl font-bold text-rose-700">
              {stats.inactive}
            </h3>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00008b] text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Compatibility Records
                </h2>
                <p className="text-sm text-slate-500">
                  Search by sub category, product brand, compatible brand, or
                  model.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search compatibility..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-280 w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Sub Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Product Brand
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Compatible Summary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center">
                      <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
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

                    return (
                      <tr key={item._id} className="align-top hover:bg-slate-50">
                        <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                          {serialNo}
                        </td>

                        <td className="px-4 py-4">
                          <div className="min-w-40 text-sm font-semibold text-slate-900">
                            {subCategoryName}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="min-w-40 text-sm font-medium text-slate-600">
                            {productBrandName}
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
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-semibold text-slate-900">
                                        {brandName}
                                      </span>

                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
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

                                    <p className="mt-2 text-xs text-slate-600">
                                      <span className="font-semibold text-slate-700">
                                        Models:
                                      </span>{" "}
                                      {modelNames.length
                                        ? modelNames.join(", ")
                                        : "No specific models selected"}
                                    </p>

                                    {row.notes ? (
                                      <p className="mt-1 text-xs text-slate-500">
                                        <span className="font-semibold text-slate-700">
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
                            <span className="text-sm text-slate-400">
                              No compatibility rows
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => void handleToggleActive(item._id)}
                            disabled={isBusy}
                            className={`inline-flex min-w-20 items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              item.isActive === false
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : item.isActive === false ? (
                              "Inactive"
                            ) : (
                              "Active"
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item._id)}
                              disabled={isBusy}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item._id)}
                              disabled={isBusy}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Delete"
                            >
                              {isBusy ? (
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
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Search className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold text-slate-900">
                          No compatibility records found
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Try changing your search or create a new compatibility
                          record.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {showingFrom}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">{showingTo}</span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {totalEntries}
              </span>{" "}
              entries
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1 || totalEntries === 0}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                {totalEntries === 0 ? 0 : safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={safeCurrentPage === totalPages || totalEntries === 0}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {modalState.open ? (
        <div
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={closeCompatibilityModal}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeCompatibilityModal}
              className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

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