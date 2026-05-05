"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
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

  const stats = useMemo(() => {
    const amount = rows.reduce(
      (sum, row) => sum + Number(row.totalReturnAmount || 0),
      0
    );
    const qty = rows.reduce((sum, row) => sum + Number(row.totalQty || 0), 0);

    return {
      total: rows.length,
      qty,
      amount,
    };
  }, [rows]);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <RotateCcw className="h-3.5 w-3.5" />
                Sales Return Register
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Sales Return List
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
                Track processed customer returns for the currently selected {getSalesShopLabel(selectedShopType).toLowerCase()}.
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
                  Returns
                </p>
                <p className="mt-1 text-xl font-bold text-white">{stats.total}</p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Qty
                </p>
                <p className="mt-1 text-xl font-bold text-white">{stats.qty}</p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Return Amount
                </p>
                <p className="mt-1 text-sm font-bold text-white">{money(stats.amount)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Sales Return Register
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search by return number, invoice number, customer, or reason.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search return no, invoice, customer..."
                  className="premium-input pl-11"
                />
              </div>

              <button
                type="button"
                onClick={() => void fetchSalesReturns(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
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
              Sales return is available only for warehouse retail or wholesale shops
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
              Loading sales returns...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-rose-900">
              Unable to load sales returns
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-rose-700">
              {errorMessage}
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-slate-950">No sales returns found</h3>
            <p className="mt-2 text-sm text-slate-500">
              {search.trim()
                ? "Try another search."
                : "Create a return from the sales view page when a customer brings items back."}
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
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
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className={`border-b border-slate-200 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 ${
                          heading === "Action" ? "text-center" : "text-left"
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row._id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-4 font-bold text-slate-950">
                        {row.returnNo || row._id}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {formatDate(row.returnDate)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {row.orderNo || row.orderId?.orderNo || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {row.invoiceNo || row.orderId?.invoiceNo || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {row.customerNameSnapshot || getCustomerName(row.customerId || null)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {row.totalQty || 0}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-slate-950">
                        {money(row.totalReturnAmount)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {row.reason || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <Link
                            href={`/shopowner/sales/view?id=${row.orderId?._id || ""}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                            title="View sale"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
