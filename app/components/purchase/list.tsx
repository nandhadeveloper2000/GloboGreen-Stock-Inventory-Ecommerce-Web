"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  IndianRupee,
  Loader2,
  Pencil,
  ReceiptText,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type PurchaseMode = "SINGLE_SUPPLIER" | "MULTI_SUPPLIER";

type PayMode =
  | "CASH"
  | "UPI"
  | "CARD"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "CREDIT";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type SupplierReference =
  | string
  | {
      _id?: string;
      vendorName?: string;
      name?: string;
      code?: string;
    }
  | null;

type PurchaseListItem = {
  _id: string;
  purchaseNo?: string;
  mode?: PurchaseMode | string;
  purchaseDate?: string | null;
  invoiceNo?: string;
  invoiceDate?: string | null;
  payMode?: PayMode | string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  overallDiscount?: number;
  netAmount?: number;
  status?: string;
  supplierId?: SupplierReference;
  items?: Array<{
    _id?: string;
    qty?: number;
    amount?: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function normalizeShopType(value?: string | null) {
  const normalized = normalizeValue(value);

  if (normalized === "BRANCH_RETAIL_SHOP" || normalized === "BRANCH") {
    return "RETAIL_BRANCH_SHOP";
  }

  if (normalized === "MAIN") {
    return "WAREHOUSE_RETAIL_SHOP";
  }

  if (normalized === "WHOLESALE") {
    return "WHOLESALE_SHOP";
  }

  return normalized;
}

function isPurchaseAllowedShop(shopType?: string | null) {
  const normalized = normalizeShopType(shopType);

  return (
    normalized === "WAREHOUSE_RETAIL_SHOP" ||
    normalized === "WHOLESALE_SHOP"
  );
}

function getPurchaseShopLabel(shopType?: string | null) {
  const normalized = normalizeShopType(shopType);

  if (normalized === "WHOLESALE_SHOP") return "Wholesale Shop";
  if (normalized === "WAREHOUSE_RETAIL_SHOP") return "Warehouse Retail Shop";

  return "Warehouse Retail Shop / Wholesale Shop";
}

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "", type: "" };
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
    type: window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getSupplierName(supplier?: SupplierReference) {
  if (!supplier) return "-";
  if (typeof supplier === "string") return supplier;

  return String(
    supplier.vendorName || supplier.name || supplier.code || "Supplier"
  ).trim();
}

function getModeLabel(mode?: string | null) {
  return normalizeValue(mode) === "MULTI_SUPPLIER"
    ? "Multi Supplier"
    : "Single Supplier";
}

function getStatusLabel(status?: string | null) {
  const normalized = normalizeValue(status);

  if (!normalized) return "Open";

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function isCancelled(status?: string | null) {
  return normalizeValue(status) === "CANCELLED";
}

function getStatusClasses(status?: string | null) {
  return isCancelled(status)
    ? "bg-rose-100 text-rose-700"
    : "bg-emerald-100 text-emerald-700";
}

function getItemCount(item?: PurchaseListItem | null) {
  return Array.isArray(item?.items) ? item.items.length : 0;
}

function getTotalQty(item?: PurchaseListItem | null) {
  return Array.isArray(item?.items)
    ? item.items.reduce((sum, row) => sum + Number(row.qty || 0), 0)
    : 0;
}

export default function PurchaseListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [rows, setRows] = useState<PurchaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CANCELLED">(
    "ALL"
  );
  const [modeFilter, setModeFilter] = useState<"ALL" | PurchaseMode>("ALL");
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const purchaseAllowedShopSelected = useMemo(
    () => isPurchaseAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const selectedShopTypeLabel = useMemo(
    () => getPurchaseShopLabel(selectedShopType),
    [selectedShopType]
  );

  const syncSelectedShop = useCallback(() => {
    const selectedShop = readSelectedShop();

    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const fetchPurchases = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId || !purchaseAllowedShopSelected) {
        setRows([]);
        setErrorMessage("");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        const response = await fetch(
          `${baseURL}${SummaryApi.purchase_list.url(selectedShopId)}`,
          {
            method: SummaryApi.purchase_list.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        );

        const result = (await response
          .json()
          .catch(() => ({}))) as ApiResponse<PurchaseListItem[]>;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load purchases");
        }

        setRows(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load purchases";

        setRows([]);
        setErrorMessage(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, purchaseAllowedShopSelected, selectedShopId]
  );

  useEffect(() => {
    syncSelectedShop();

    function handleShopChange() {
      syncSelectedShop();
    }

    window.addEventListener("shop-selection-changed", handleShopChange);
    window.addEventListener("storage", handleShopChange);

    return () => {
      window.removeEventListener("shop-selection-changed", handleShopChange);
      window.removeEventListener("storage", handleShopChange);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void fetchPurchases();
  }, [fetchPurchases]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((item) => {
      const currentStatus = isCancelled(item.status) ? "CANCELLED" : "OPEN";

      if (statusFilter !== "ALL" && currentStatus !== statusFilter) {
        return false;
      }

      if (modeFilter !== "ALL" && normalizeValue(item.mode) !== modeFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        item.purchaseNo,
        item.invoiceNo,
        getSupplierName(item.supplierId),
        getModeLabel(item.mode),
        item.payMode,
        getStatusLabel(item.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [modeFilter, rows, search, statusFilter]);

  const stats = useMemo(() => {
    const cancelled = rows.filter((item) => isCancelled(item.status)).length;
    const open = rows.length - cancelled;
    const totalAmount = rows.reduce(
      (sum, item) => sum + Number(item.netAmount || 0),
      0
    );

    return {
      total: rows.length,
      open,
      cancelled,
      totalAmount,
    };
  }, [rows]);

  const totalFilteredRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredRows / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  const pageStart = totalFilteredRows === 0 ? 0 : page * rowsPerPage + 1;
  const pageEnd = Math.min((page + 1) * rowsPerPage, totalFilteredRows);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, modeFilter]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  async function handleCancel(item: PurchaseListItem) {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    const confirmed = window.confirm(
      `Cancel purchase ${item.purchaseNo || item._id}?`
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(item._id);

      const response = await fetch(
        `${baseURL}${SummaryApi.purchase_cancel.url(selectedShopId, item._id)}`,
        {
          method: SummaryApi.purchase_cancel.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<PurchaseListItem>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to cancel purchase");
      }

      toast.success(result.message || "Purchase cancelled successfully");
      await fetchPurchases(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel purchase"
      );
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-9xl">
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
          <div className="px-5 py-5 md:px-6 md:py-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#00008b]">
                  <ReceiptText className="h-3.5 w-3.5" />
                  Shop Owner Panel
                </span>

                <h1 className="mt-4 text-[34px] font-black tracking-tight text-slate-950">
                  Purchase Orders
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  View, search, and manage purchase bills created for the
                  currently selected {selectedShopTypeLabel.toLowerCase()}.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700">
                    <Store className="h-3.5 w-3.5 text-[#00008b]" />
                    {selectedShopName || "No shop selected"}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-[#00008b]/6 px-3 text-[12px] font-semibold text-[#00008b]">
                    {selectedShopTypeLabel}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-3 text-[12px] font-semibold text-slate-700">
                    Total: {stats.total}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-700">
                    Open: {stats.open}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-rose-50 px-3 text-[12px] font-semibold text-rose-700">
                    Cancelled: {stats.cancelled}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-amber-50 px-3 text-[12px] font-semibold text-amber-700">
                    Net: {money(stats.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchPurchases(true)}
                  disabled={
                    refreshing || !selectedShopId || !purchaseAllowedShopSelected
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#00008b] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {selectedShopId && purchaseAllowedShopSelected ? (
              <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.3fr)_180px_180px_170px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search purchase no, invoice, supplier..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/35 focus:ring-4 focus:ring-[#00008b]/10"
                  />
                </div>

                <select
                  value={modeFilter}
                  onChange={(event) =>
                    setModeFilter(event.target.value as "ALL" | PurchaseMode)
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#00008b]/35 focus:ring-4 focus:ring-[#00008b]/10"
                >
                  <option value="ALL">All Modes</option>
                  <option value="SINGLE_SUPPLIER">Single Supplier</option>
                  <option value="MULTI_SUPPLIER">Multi Supplier</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "ALL" | "OPEN" | "CANCELLED"
                    )
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#00008b]/35 focus:ring-4 focus:ring-[#00008b]/10"
                >
                  <option value="ALL">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <div className="flex h-10 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-center">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Search by
                  </span>
                  <span className="text-[12px] font-bold text-[#00008b]">
                    Purchase / Supplier
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200">
            {!selectedShopId ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Store className="h-8 w-8" />
                </div>

                <h3 className="mt-5 text-2xl font-bold text-slate-950">
                  No shop selected
                </h3>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Select a shop from the dashboard switcher first, then reopen this
                  page to manage purchase orders for that shop.
                </p>
              </div>
            ) : !purchaseAllowedShopSelected ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-8 w-8" />
                </div>

                <h3 className="mt-5 text-2xl font-bold text-amber-900">
                  Purchase is available only for warehouse retail or wholesale shops
                </h3>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-amber-800">
                  Switch the selected shop to Warehouse Retail Shop or Wholesale
                  Shop to continue.
                </p>
              </div>
            ) : loading ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-500">
                  Loading purchase orders...
                </p>
              </div>
            ) : errorMessage ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                  <AlertTriangle className="h-8 w-8" />
                </div>

                <h3 className="mt-5 text-2xl font-bold text-rose-900">
                  Unable to load purchases
                </h3>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-rose-700">
                  {errorMessage}
                </p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <ReceiptText className="h-8 w-8" />
                </div>

                <h3 className="mt-5 text-2xl font-bold text-slate-950">
                  No purchase orders found
                </h3>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  {search.trim() || statusFilter !== "ALL" || modeFilter !== "ALL"
                    ? "Try another search or remove one of the filters."
                    : "No purchase orders available for the selected shop."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-295 border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Purchase No",
                          "Date",
                          "Supplier",
                          "Mode",
                          "Invoice",
                          "Items",
                          "Qty",
                          "Pay Mode",
                          "Status",
                          "Net Amount",
                          "Actions",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className={`border-b border-slate-200 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 ${
                              heading === "Actions"
                                ? "text-center"
                                : "text-left"
                            }`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedRows.map((item) => {
                        const cancelling = actionLoadingId === item._id;
                        const canEdit = !isCancelled(item.status);

                        return (
                          <tr
                            key={item._id}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-bold text-slate-950">
                                  {item.purchaseNo || item._id}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Updated{" "}
                                  {formatDate(item.updatedAt || item.createdAt)}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              <div>
                                <p>{formatDate(item.purchaseDate)}</p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Bill {formatDate(item.invoiceDate)}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm font-medium text-slate-900">
                              {normalizeValue(item.mode) === "MULTI_SUPPLIER"
                                ? "Multiple Supplier"
                                : getSupplierName(item.supplierId)}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {getModeLabel(item.mode)}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              <div>
                                <p>{item.invoiceNo || "-"}</p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(item.invoiceDate)}
                                </p>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {getItemCount(item)}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {getTotalQty(item)}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-700">
                              {String(item.payMode || "-").replace(/_/g, " ")}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                                  item.status
                                )}`}
                              >
                                {getStatusLabel(item.status)}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                                <IndianRupee className="h-4 w-4 text-slate-400" />
                                <span>{money(item.netAmount)}</span>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  href={`/shopowner/purchase/view?id=${item._id}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                                  title="View"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>

                                {canEdit ? (
                                  <Link
                                    href={`/shopowner/purchase/edit/${item._id}`}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                ) : null}

                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleCancel(item)}
                                    disabled={cancelling}
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="Cancel purchase"
                                  >
                                    {cancelling ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4" />
                                    )}
                                    Cancel
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 md:flex-row md:items-center md:justify-between">
                  <span>
                    Open: {stats.open} | Cancelled: {stats.cancelled}
                  </span>

                  <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <span>Rows per page:</span>

                      <select
                        value={rowsPerPage}
                        onChange={(event) => {
                          setRowsPerPage(Number(event.target.value));
                          setPage(0);
                        }}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-slate-800 outline-none transition focus:border-[#00008b]/35 focus:ring-4 focus:ring-[#00008b]/10"
                      >
                        {ROWS_PER_PAGE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <span className="min-w-20 text-center text-sm font-bold text-slate-700">
                      {pageStart}-{pageEnd} of {totalFilteredRows}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        disabled={page === 0}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        {"<"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPage((current) =>
                            Math.min(totalPages - 1, current + 1)
                          )
                        }
                        disabled={page >= totalPages - 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Next page"
                      >
                        {">"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}