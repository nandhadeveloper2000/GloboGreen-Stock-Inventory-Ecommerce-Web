"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Eye,
  Loader2,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type SalesOrderRecord,
  buildSalesInvoicePdf,
  formatDate,
  formatDateTime,
  getCustomerName,
  getSalesShopLabel,
  getStatusLabel,
  isSalesAllowedShop,
  money,
  normalizeValue,
  readSelectedShop,
  sanitizeFileName,
} from "./shared";

async function downloadOrPrintInvoice(
  accessToken: string,
  orderId: string,
  fallbackShopName: string,
  mode: "download" | "print"
) {
  const response = await fetch(`${baseURL}${SummaryApi.sales_detail.url(orderId)}`, {
    method: SummaryApi.sales_detail.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    credentials: "include",
    cache: "no-store",
  });

  const result = (await response
    .json()
    .catch(() => ({}))) as ApiResponse<SalesOrderRecord>;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Failed to load invoice details");
  }

  const pdfBlob = buildSalesInvoicePdf(result.data, fallbackShopName);
  const url = URL.createObjectURL(pdfBlob);

  if (mode === "download") {
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sales-Invoice-${sanitizeFileName(
      result.data.invoiceNo || result.data.invoiceId?.invoiceNo || result.data.orderNo
    )}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }

  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function SalesListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [rows, setRows] = useState<SalesOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMessage, setErrorMessage] = useState("");

  const salesAllowedShopSelected = useMemo(
    () => isSalesAllowedShop(selectedShopType),
    [selectedShopType]
  );

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const fetchSales = useCallback(async (isRefresh = false) => {
    if (!accessToken) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!selectedShopId || !salesAllowedShopSelected) {
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
        `${baseURL}${SummaryApi.sales_list.url({
          shopId: selectedShopId,
          source: "DIRECT",
          limit: 100,
        })}`,
        {
          method: SummaryApi.sales_list.method,
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
        .catch(() => ({}))) as ApiResponse<SalesOrderRecord[]>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load sales");
      }

      setRows(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load sales";

      setRows([]);
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, salesAllowedShopSelected, selectedShopId]);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((item) => {
      const paymentMethod = normalizeValue(item.payment?.method);
      const status = normalizeValue(item.status);

      if (paymentFilter !== "ALL" && paymentMethod !== paymentFilter) {
        return false;
      }

      if (statusFilter !== "ALL" && status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        item.orderNo,
        item.invoiceNo,
        item.invoiceId?.invoiceNo,
        item.customerNameSnapshot,
        item.customerMobileSnapshot,
        getCustomerName(item.customerId || null),
        item.payment?.method,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [paymentFilter, rows, search, statusFilter]);

  const stats = useMemo(() => {
    const totalAmount = rows.reduce((sum, row) => sum + Number(row.grandTotal || 0), 0);
    const credit = rows.filter(
      (row) => normalizeValue(row.payment?.method) === "CREDIT"
    ).length;

    return {
      total: rows.length,
      amount: totalAmount,
      credit,
    };
  }, [rows]);

  async function handleInvoiceAction(orderId: string, mode: "download" | "print") {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    try {
      setActionLoadingId(`${orderId}:${mode}`);
      await downloadOrPrintInvoice(accessToken, orderId, selectedShopName, mode);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${mode} invoice`
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
                Sales Register
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Sales List
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
                View completed direct sales, print invoices, and download PDF bills for the currently selected {getSalesShopLabel(selectedShopType).toLowerCase()}.
              </p>

              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-md">
                <Store className="h-4 w-4" />
                <span>{selectedShopName || "No shop selected"}</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                  {selectedShopType || "Unknown shop type"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Bills
                </p>
                <p className="mt-1 text-xl font-bold text-white">{stats.total}</p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Credit Bills
                </p>
                <p className="mt-1 text-xl font-bold text-white">{stats.credit}</p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Revenue
                </p>
                <p className="mt-1 text-sm font-bold text-white">{money(stats.amount)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-card-solid rounded-card p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Sales Register
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search by invoice number, customer, payment method, or bill status.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search invoice, customer, phone..."
                  className="premium-input pl-11"
                />
              </div>

              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="premium-select min-w-[160px]"
              >
                <option value="ALL">All Payments</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="CREDIT">Credit</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="premium-select min-w-[160px]"
              >
                <option value="ALL">All Status</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                type="button"
                onClick={() => void fetchSales(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <Link
                href="/shopowner/sales/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                Create Sale
              </Link>
            </div>
          </div>
        </section>

        {!selectedShopId ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-slate-950">No shop selected</h3>
            <p className="mt-2 text-sm text-slate-500">
              Select a shop from the dashboard switcher first, then reopen this page.
            </p>
          </div>
        ) : !salesAllowedShopSelected ? (
          <div className="rounded-[30px] border border-dashed border-amber-300 bg-amber-50 px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-amber-900">
              Sales is available only for warehouse retail or wholesale shops
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-amber-800">
              Switch the selected shop to Warehouse Retail Shop or Wholesale Shop to continue.
            </p>
          </div>
        ) : loading ? (
          <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Loading sales orders...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-rose-900">
              Unable to load sales
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-rose-700">
              {errorMessage}
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-slate-950">No sales found</h3>
            <p className="mt-2 text-sm text-slate-500">
              {search.trim() || paymentFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try another search or remove one of the filters."
                : "Create your first sale for the selected shop."}
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Invoice No",
                      "Order No",
                      "Customer",
                      "Date",
                      "Items",
                      "Payment",
                      "Status",
                      "Total",
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
                    const downloading = actionLoadingId === `${item._id}:download`;
                    const printing = actionLoadingId === `${item._id}:print`;

                    return (
                      <tr key={item._id} className="transition hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-bold text-slate-950">
                              {item.invoiceNo || item.invoiceId?.invoiceNo || "-"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(item.createdAt)}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-slate-900">
                          {item.orderNo || item._id}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.customerNameSnapshot || getCustomerName(item.customerId || null)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.customerMobileSnapshot || item.customerId?.mobile || "-"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {formatDate(item.createdAt)}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {item.itemCount || item.items?.length || 0} items / {item.totalQty || 0} qty
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {String(item.payment?.method || "-").replace(/_/g, " ")}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.payment?.paid ? "Paid" : "Pending"}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            {getStatusLabel(item.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-slate-950">
                          {money(item.grandTotal)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/shopowner/sales/view?id=${item._id}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => void handleInvoiceAction(item._id, "print")}
                              disabled={printing || downloading}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Print invoice"
                            >
                              {printing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleInvoiceAction(item._id, "download")}
                              disabled={printing || downloading}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Download invoice PDF"
                            >
                              {downloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
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
