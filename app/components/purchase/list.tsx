"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
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

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function isPurchaseAllowedShop(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  return (
    normalized === "WAREHOUSE_RETAIL_SHOP" ||
    normalized === "WHOLESALE_SHOP"
  );
}

function getPurchaseShopLabel(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

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
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <ReceiptText className="h-3.5 w-3.5" />
                Purchase Register
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Purchase Orders
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
                View, search, and manage purchase bills created for the
                currently selected {selectedShopTypeLabel.toLowerCase()}.
              </p>

              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-md">
                <Store className="h-4 w-4" />
                <span>{selectedShopName || "No shop selected"}</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                  {selectedShopType || "Unknown shop type"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Total Bills
                </p>
                <p className="mt-1 text-xl font-bold text-white">{stats.total}</p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Open
                </p>
                <p className="mt-1 text-xl font-bold text-white">{stats.open}</p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Cancelled
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {stats.cancelled}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Net Amount
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {money(stats.totalAmount)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-card-solid rounded-card p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Purchase Register
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search by purchase number, invoice, supplier, pay mode, or bill
                status.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search purchase no, invoice, supplier..."
                  className="premium-input pl-11"
                />
              </div>

              <select
                value={modeFilter}
                onChange={(event) =>
                  setModeFilter(event.target.value as "ALL" | PurchaseMode)
                }
                className="premium-select min-w-[180px]"
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
                className="premium-select min-w-[160px]"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                type="button"
                onClick={() => void fetchPurchases(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <Link
                href="/shopowner/purchase/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                Create Purchase
              </Link>
            </div>
          </div>
        </section>

        {!selectedShopId ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-slate-100 text-slate-500">
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
          <div className="rounded-[30px] border border-dashed border-amber-300 bg-amber-50 px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-amber-900">
              Purchase is available only for warehouse retail or wholesale shops
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-amber-800">
              Switch the selected shop to <strong>Warehouse Retail Shop</strong>{" "}
              or <strong>Wholesale Shop</strong> to continue.
            </p>
          </div>
        ) : loading ? (
          <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Loading purchase orders...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-rose-100 text-rose-700">
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
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <ReceiptText className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-950">
              No purchase orders found
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {search.trim() || statusFilter !== "ALL" || modeFilter !== "ALL"
                ? "Try another search or remove one of the filters."
                : "Create your first purchase order for the selected shop."}
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
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
                          heading === "Actions" ? "text-center" : "text-left"
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((item) => {
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
                              Updated {formatDate(item.updatedAt || item.createdAt)}
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
          </section>
        )}
      </div>
    </div>
  );
}
