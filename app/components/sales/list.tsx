"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Eye,
  Loader2,
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ROWS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_ROWS_PER_PAGE);

  const salesAllowedShopSelected = useMemo(
    () => isSalesAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const selectedShopTypeLabel = useMemo(
    () => getSalesShopLabel(selectedShopType),
    [selectedShopType]
  );

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const fetchSales = useCallback(
    async (isRefresh = false) => {
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
    },
    [accessToken, salesAllowedShopSelected, selectedShopId]
  );

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, paymentFilter, statusFilter, rowsPerPage]);

  const totalEntries = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry =
    totalEntries === 0 ? 0 : Math.min(startIndex + rowsPerPage, totalEntries);

  const paginatedRows = useMemo(
    () => filteredRows.slice(startIndex, startIndex + rowsPerPage),
    [filteredRows, rowsPerPage, startIndex]
  );

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
      <div className="mx-auto w-full max-w-9xl">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#00008b]/5 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#00008b]">
                  <ReceiptText className="h-3.5 w-3.5" />
                  Sales Register
                </span>

                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                  Sales List
                </h1>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  View completed direct sales, print invoices, and download PDF
                  bills for the currently selected{" "}
                  {selectedShopTypeLabel.toLowerCase()}.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-700">
                    <Store className="h-3.5 w-3.5 text-[#00008b]" />
                    {selectedShopName || "No shop selected"}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-[#00008b]/6 px-3 text-[12px] font-semibold text-[#00008b]">
                    {selectedShopTypeLabel}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-700">
                    Direct Sales Only
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void fetchSales(true)}
                  disabled={refreshing || !selectedShopId || !salesAllowedShopSelected}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {selectedShopId && salesAllowedShopSelected ? (
              <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_190px_190px_170px]">
                <div className="relative xl:max-w-none">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search invoice, customer, phone..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                  />
                </div>

                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
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
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                >
                  <option value="ALL">All Status</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <div className="flex h-10 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-center">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Search by
                  </span>
                  <span className="text-[12px] font-bold text-[#00008b]">
                    Invoice / Customer
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {!selectedShopId ? (
            <div className="px-6 py-14 text-center">
              <h3 className="text-2xl font-bold text-slate-950">
                No shop selected
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Select a shop from the dashboard switcher first, then reopen this
                page.
              </p>
            </div>
          ) : !salesAllowedShopSelected ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-2xl font-bold text-amber-900">
                Sales is available only for warehouse retail, wholesale, or branch shops
              </h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-amber-800">
                Switch the selected shop to a Warehouse Retail Shop, Retail Branch Shop, or Wholesale Shop
                to continue.
              </p>
            </div>
          ) : loading ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading sales orders...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="px-6 py-14 text-center">
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
            <div className="px-6 py-14 text-center">
              <h3 className="text-2xl font-bold text-slate-950">
                No sales found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {search.trim() || paymentFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try another search or remove one of the filters."
                  : "No direct sales found for the selected shop."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-295 border-collapse">
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
                    {paginatedRows.map((item) => {
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
                                {item.customerNameSnapshot ||
                                  getCustomerName(item.customerId || null)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.customerMobileSnapshot ||
                                  item.customerId?.mobile ||
                                  "-"}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatDate(item.createdAt)}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {item.itemCount || item.items?.length || 0} items /{" "}
                            {item.totalQty || 0} qty
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
                      {startEntry}–{endEntry} of {totalEntries}
                    </p>

                    <button
                      type="button"
                      aria-label="Previous page"
                      onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                      disabled={currentPage === 1 || totalEntries === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      &lt;
                    </button>

                    <button
                      type="button"
                      aria-label="Next page"
                      onClick={() =>
                        setCurrentPage((page) => Math.min(page + 1, totalPages))
                      }
                      disabled={currentPage === totalPages || totalEntries === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}