"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type SalesReturnRecord,
  formatDate,
  getCustomerName,
  getSalesShopLabel,
  getStatusLabel,
  isSalesAllowedShop,
  money,
  readSelectedShop,
} from "../sales/shared";

import SalesReturnViewModal from "./view";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ROWS_PER_PAGE = 10;

export default function SalesReturnListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [rows, setRows] = useState<SalesReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [viewingReturnId, setViewingReturnId] = useState<string | null>(null);
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

  const fetchSalesReturns = useCallback(async (isRefresh = false) => {
    if (!accessToken) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!selectedShopId || !salesAllowedShopSelected) {
      setRows([]);
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
        `${baseURL}${SummaryApi.sales_return_list.url(selectedShopId, {
          q: search.trim() || undefined,
        })}`,
        {
          method: SummaryApi.sales_return_list.method,
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
        .catch(() => ({}))) as ApiResponse<SalesReturnRecord[]>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load sales returns");
      }

      setRows(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setRows([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load sales returns"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, salesAllowedShopSelected, search, selectedShopId]);

  useEffect(() => {
    void fetchSalesReturns();
  }, [fetchSalesReturns]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter((row) => {
      const haystack = [
        row.returnNo,
        row.orderNo,
        row.invoiceNo,
        row.customerNameSnapshot,
        getCustomerName(row.customerId || null),
        row.reason,
        row.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, search]);

  useEffect(() => { setCurrentPage(1); }, [search, rowsPerPage]);

  const totalEntries = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry = totalEntries === 0 ? 0 : Math.min(startIndex + rowsPerPage, totalEntries);

  const paginatedRows = useMemo(
    () => filteredRows.slice(startIndex, startIndex + rowsPerPage),
    [filteredRows, rowsPerPage, startIndex]
  );

  return (
    <div className="page-shell">
      <div className="w-full">
        <section className="premium-card-solid overflow-hidden rounded-[20px]">
          {/* ── Header ── */}
          <div className="border-b border-token px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,139,0.14)] bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Sales Return Register
                </div>

                <h1 className="mt-3 text-[24px] font-bold tracking-tight text-heading md:text-[26px]">
                  Sales Return List
                </h1>

                <p className="mt-1.5 text-[13px] text-secondary-text">
                  Track processed customer returns for the currently selected{" "}
                  {selectedShopTypeLabel.toLowerCase()}.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-token bg-soft-token px-3 text-[12px] font-semibold text-primary-text">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    {selectedShopName || "No shop selected"}
                  </span>
                  <span className="inline-flex h-8 items-center rounded-lg bg-primary-soft px-3 text-[12px] font-semibold text-primary">
                    {selectedShopTypeLabel}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-start">
                <button
                  type="button"
                  onClick={() => void fetchSalesReturns(true)}
                  disabled={refreshing || !selectedShopId || !salesAllowedShopSelected}
                  className="premium-btn-secondary h-10 rounded-lg px-4 py-0 text-[13px]"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_190px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by return no, invoice no, customer, or reason"
                  disabled={!selectedShopId || !salesAllowedShopSelected}
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px] disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
              <div className="flex h-10 flex-col items-center justify-center rounded-lg border border-[rgba(0,0,139,0.18)] bg-primary-soft px-3 text-center">
                <span className="text-[10px] font-semibold text-secondary-text">Search by</span>
                <span className="text-[12px] font-bold text-primary">Return / Invoice</span>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          {!selectedShopId ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Store className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-heading">No shop selected</h3>
              <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-secondary-text">
                Select a shop from the dashboard switcher first, then reopen this page.
              </p>
            </div>
          ) : !salesAllowedShopSelected ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-heading">
                Sales return is available only for warehouse retail, wholesale, or branch shops
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-secondary-text">
                Switch the selected shop to a Warehouse Retail Shop, Retail Branch Shop, or Wholesale Shop to continue.
              </p>
            </div>
          ) : loading ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <p className="mt-4 text-[13px] font-semibold text-secondary-text">
                Loading sales returns…
              </p>
            </div>
          ) : errorMessage ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-heading">Unable to load sales returns</h3>
              <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-secondary-text">
                {errorMessage}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-xl font-semibold text-heading">No sales returns found</h3>
              <p className="mt-2 text-[13px] text-secondary-text">
                {search.trim()
                  ? "Try another search."
                  : "Create a return from the sales view page when a customer brings items back."}
              </p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-275 border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Return No",
                      "Date",
                      "Order No",
                      "Invoice No",
                      "Customer",
                      "Qty",
                      "Amount",
                      "Reason",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className={`border-b border-token px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary-text ${
                          heading === "Actions" ? "text-center" : "text-left"
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-token">
                  {paginatedRows.map((row) => (
                    <tr key={row._id} className="transition hover:bg-soft-token">
                      <td className="px-4 py-3.5 text-[13px] font-bold text-heading">
                        {row.returnNo || row._id}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-primary-text">
                        {formatDate(row.returnDate)}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-primary-text">
                        {row.orderNo || row.orderId?.orderNo || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-primary-text">
                        {row.invoiceNo || row.orderId?.invoiceNo || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-primary-text">
                        {row.customerNameSnapshot || getCustomerName(row.customerId || null)}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-primary-text">
                        {row.totalQty || 0}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-bold text-heading">
                        {money(row.totalReturnAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-primary-text">
                        {row.reason || "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingReturnId(row._id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-primary-text transition hover:bg-soft-token"
                            title="View return"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingReturnId(row._id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-primary-text transition hover:bg-soft-token"
                            title="Print receipt"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <label className="flex items-center gap-2 text-[12px] text-secondary-text">
                  Rows per page:
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="rounded border border-token bg-white px-2 py-1 text-[12px] text-primary-text"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-2 text-[12px] text-secondary-text">
                  <span>{startEntry}–{endEntry} of {totalEntries}</span>
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={currentPage === 1 || totalEntries === 0}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-token bg-white text-[13px] text-primary-text transition hover:bg-soft-token disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={currentPage === totalPages || totalEntries === 0}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-token bg-white text-[13px] text-primary-text transition hover:bg-soft-token disabled:cursor-not-allowed disabled:opacity-40"
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

      <SalesReturnViewModal
        open={Boolean(viewingReturnId)}
        returnId={viewingReturnId ?? ""}
        shopId={selectedShopId}
        onClose={() => setViewingReturnId(null)}
      />
    </div>
  );
}
