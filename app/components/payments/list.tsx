"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  Store,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  PAYMENT_FOR_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  type PaymentItem,
  formatDate,
  formatMoney,
  formatPartyTypeLabel,
  formatPaymentForLabel,
  formatPaymentModeLabel,
  formatPaymentStatusLabel,
  readSelectedShop,
} from "./shared";

type PaymentListResponse = {
  success?: boolean;
  message?: string;
  count?: number;
  summary?: {
    totalAmount?: number;
  };
  data?: PaymentItem[];
};

type PaymentFilters = {
  q: string;
  paymentFor: string;
  mode: string;
  status: string;
  fromDate: string;
  toDate: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const INITIAL_FILTERS: PaymentFilters = {
  q: "",
  paymentFor: "",
  mode: "",
  status: "",
  fromDate: "",
  toDate: "",
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getStatusMeta(status?: string | null) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "COMPLETED") {
    return {
      label: "Completed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (normalized === "PENDING") {
    return {
      label: "Pending",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (normalized === "FAILED") {
    return {
      label: "Failed",
      className: "border-rose-200 bg-rose-50 text-rose-600",
    };
  }

  if (normalized === "REFUNDED") {
    return {
      label: "Refunded",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: formatPaymentStatusLabel(normalized),
    className: "border-slate-200 bg-slate-100 text-slate-600",
  };
}

export default function PaymentListPage() {
  const { accessToken } = useAuth();

  const [selectedShop, setSelectedShop] = useState(readSelectedShop());
  const [filters, setFilters] = useState<PaymentFilters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<PaymentFilters>(INITIAL_FILTERS);
  const [rows, setRows] = useState<PaymentItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const syncSelectedShop = useCallback(() => {
    setSelectedShop(readSelectedShop());
  }, []);

  useEffect(() => {
    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  const fetchPayments = useCallback(
    async (
      variant: "load" | "filter" | "refresh" = "load",
      activeFilters: PaymentFilters = appliedFilters
    ) => {
      if (!accessToken || !selectedShop.id) {
        setRows([]);
        setTotalAmount(0);
        setLoading(false);
        setFiltering(false);
        setRefreshing(false);
        return;
      }

      try {
        if (variant === "load") {
          setLoading(true);
        } else if (variant === "filter") {
          setFiltering(true);
        } else {
          setRefreshing(true);
        }

        const url =
          typeof SummaryApi.payment_list.url === "function"
            ? SummaryApi.payment_list.url({
                shopId: selectedShop.id,
                q: activeFilters.q.trim(),
                paymentFor: activeFilters.paymentFor,
                mode: activeFilters.mode,
                status: activeFilters.status,
                from: activeFilters.fromDate,
                to: activeFilters.toDate,
              })
            : SummaryApi.payment_list.url;

        const response = await fetch(`${baseURL}${url}`, {
          method: SummaryApi.payment_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const result =
          (await response.json().catch(() => ({}))) as PaymentListResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load payments");
        }

        const data = Array.isArray(result.data) ? result.data : [];
        setRows(data);
        setTotalAmount(
          Number(
            result.summary?.totalAmount ??
              data.reduce(
                (sum, row) => sum + Number(row.amount || 0),
                0
              )
          )
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load payments"
        );
        setRows([]);
        setTotalAmount(0);
      } finally {
        setLoading(false);
        setFiltering(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShop.id]
  );

  useEffect(() => {
    void fetchPayments("load", appliedFilters);
  }, [fetchPayments]);

  const stats = useMemo(() => {
    const completed = rows.filter(
      (row) => String(row.status || "").toUpperCase() === "COMPLETED"
    ).length;
    const pending = rows.filter(
      (row) => String(row.status || "").toUpperCase() === "PENDING"
    ).length;
    const failed = rows.filter(
      (row) => String(row.status || "").toUpperCase() === "FAILED"
    ).length;
    const refunded = rows.filter(
      (row) => String(row.status || "").toUpperCase() === "REFUNDED"
    ).length;

    return {
      total: rows.length,
      completed,
      pending,
      failed,
      refunded,
    };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  const paginationStart = rows.length === 0 ? 0 : page * rowsPerPage + 1;
  const paginationEnd = Math.min(rows.length, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    setPage(0);
  }, [rowsPerPage, rows.length]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  function updateFilter<K extends keyof PaymentFilters>(
    key: K,
    value: PaymentFilters[K]
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleApplyFilters() {
    const nextFilters = { ...filters };
    setPage(0);
    setAppliedFilters(nextFilters);
    void fetchPayments("filter", nextFilters);
  }

  function handleClearFilters() {
    setPage(0);
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    void fetchPayments("filter", INITIAL_FILTERS);
  }

  function handleDelete(id?: string, partyName?: string) {
    if (!id) {
      toast.error("Invalid payment id");
      return;
    }

    toast(`Delete ${partyName || "this payment"}?`, {
      description:
        "This will deactivate the selected payment and remove it from the active list.",
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
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    try {
      setDeletingId(id);

      const url =
        typeof SummaryApi.payment_delete.url === "function"
          ? SummaryApi.payment_delete.url(id)
          : SummaryApi.payment_delete.url;

      const response = await fetch(`${baseURL}${url}`, {
        method: SummaryApi.payment_delete.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const result =
        (await response.json().catch(() => ({}))) as PaymentListResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete payment");
      }

      setRows((prev) => prev.filter((row) => row._id !== id));
      setTotalAmount((prev) => {
        const removed = rows.find((row) => row._id === id);
        return Math.max(0, prev - Number(removed?.amount || 0));
      });
      toast.success(result.message || "Payment deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete payment"
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="premium-card-solid w-full px-8 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#00008b]/10 border-t-[#00008b]">
              <Loader2 className="h-6 w-6 animate-spin text-[#00008b]" />
            </div>

            <p className="mt-4 text-sm font-semibold text-secondary-text">
              Loading payments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="w-full">
        <section className="premium-card-solid overflow-hidden rounded-[20px]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#00008b]">
                  <Wallet className="h-3.5 w-3.5" />
                  Finance Desk
                </div>

                <h1 className="mt-3 text-[24px] font-bold tracking-tight text-heading md:text-[26px]">
                  Payments
                </h1>

                <p className="mt-1.5 text-[13px] text-secondary-text">
                  Track payment entries by party, mode, status, and payment date
                  for the currently selected shop.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-token bg-soft-token px-3 text-[12px] font-semibold text-primary-text">
                    <Store className="h-3.5 w-3.5 text-[#00008b]" />
                    {selectedShop.name || "No shop selected"}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-[#00008b]/5 px-3 text-[12px] font-semibold text-[#00008b]">
                    Total: {stats.total}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-700">
                    Completed: {stats.completed}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-amber-50 px-3 text-[12px] font-semibold text-amber-700">
                    Pending: {stats.pending}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-sky-50 px-3 text-[12px] font-semibold text-sky-700">
                    Total Amount: {formatMoney(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchPayments("refresh", appliedFilters)}
                  disabled={refreshing || !selectedShop.id}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/25 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={classNames(
                      "h-4 w-4",
                      refreshing && "animate-spin"
                    )}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <Link
                  href="/shopowner/payments/create"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#00008b] bg-[#00008b] px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#06066f]"
                >
                  <CircleDollarSign className="h-4 w-4" />
                  Record Payment
                </Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_160px_170px_170px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />

                <input
                  value={filters.q}
                  onChange={(event) => updateFilter("q", event.target.value)}
                  placeholder="Search by party, reference, or notes"
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                />
              </div>

              <div className="flex h-10 flex-col items-center justify-center rounded-lg border border-[#00008b]/15 bg-[#00008b]/5 px-3 text-center">
                <span className="text-[10px] font-semibold text-secondary-text">
                  Search by
                </span>

                <span className="text-[12px] font-bold text-[#00008b]">
                  Party / Ref
                </span>
              </div>

              <select
                value={filters.paymentFor}
                onChange={(event) =>
                  updateFilter("paymentFor", event.target.value)
                }
                className="premium-select h-10 rounded-lg px-3 text-[13px]"
              >
                <option value="">All Types</option>
                {PAYMENT_FOR_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {formatPaymentForLabel(value)}
                  </option>
                ))}
              </select>

              <select
                value={filters.mode}
                onChange={(event) => updateFilter("mode", event.target.value)}
                className="premium-select h-10 rounded-lg px-3 text-[13px]"
              >
                <option value="">All Modes</option>
                {PAYMENT_MODE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {formatPaymentModeLabel(value)}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
                className="premium-select h-10 rounded-lg px-3 text-[13px]"
              >
                <option value="">All Status</option>
                {PAYMENT_STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {formatPaymentStatusLabel(value)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[170px_170px_1fr]">
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(event) =>
                    updateFilter("fromDate", event.target.value)
                  }
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                />
              </div>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(event) =>
                    updateFilter("toDate", event.target.value)
                  }
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  disabled={filtering}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleApplyFilters}
                  disabled={filtering || !selectedShop.id}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#00008b] bg-[#00008b] px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#06066f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {filtering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {filtering ? "Applying..." : "Apply Filter"}
                </button>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] text-secondary-text">
              Search matches party name, reference number, and notes. Combine
              type, mode, status, and date filters for the selected shop.
            </p>
          </div>

          {!selectedShop.id ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00008b]/5 text-[#00008b]">
                <Store className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No shop selected
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Select a shop first to view payments linked to that shop.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00008b]/5 text-[#00008b]">
                <Wallet className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No payments found
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Adjust the search or filters, or record a new payment to start
                tracking finance entries.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse">
                  <thead className="bg-soft-token">
                    <tr>
                      {[
                        "S.No",
                        "Party",
                        "Payment For",
                        "Mode",
                        "Reference",
                        "Amount",
                        "Status",
                        "Payment Date",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={classNames(
                            "border-b border-token px-3 py-3 text-[11px] font-bold text-primary-text",
                            heading === "Actions" ? "text-center" : "text-left"
                          )}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-divider bg-card-token">
                    {paginatedRows.map((row, index) => {
                      const status = getStatusMeta(row.status);
                      const isDeleting = deletingId === row._id;

                      return (
                        <tr
                          key={row._id}
                          className="transition hover:bg-[#00008b]/5"
                        >
                          <td className="px-3 py-3 text-[12px] text-secondary-text">
                            {page * rowsPerPage + index + 1}
                          </td>

                          <td className="px-3 py-3">
                            <div className="min-w-0">
                              <div className="text-[12px] font-semibold text-heading">
                                {row.partyName || "-"}
                              </div>
                              <p className="mt-1 text-[11px] text-secondary-text">
                                {formatPartyTypeLabel(row.partyType)}
                              </p>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-[12px] font-semibold text-primary-text">
                            {formatPaymentForLabel(row.paymentFor)}
                          </td>

                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-2.5 py-1 text-[11px] font-bold text-[#00008b]">
                              <CreditCard className="h-3.5 w-3.5" />
                              {formatPaymentModeLabel(row.mode)}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            {row.referenceNo || "-"}
                          </td>

                          <td className="px-3 py-3 text-[12px] font-bold text-heading">
                            {formatMoney(row.amount)}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <div className="inline-flex items-start gap-2 text-[12px] text-primary-text">
                              <CalendarDays className="mt-0.5 h-4 w-4 text-muted-text" />
                              <div>{formatDate(row.paymentDate)}</div>
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDelete(row._id, row.partyName)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Delete"
                                aria-label="Delete"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
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

              <div className="border-t border-token px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <label className="inline-flex items-center justify-end gap-2 text-[13px] font-semibold text-primary-text">
                    Rows per page:
                    <select
                      value={rowsPerPage}
                      onChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                      }}
                      className="premium-select h-10 rounded-lg px-3 text-[13px]"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center justify-end gap-3">
                    <p className="text-[13px] font-semibold text-primary-text">
                      {paginationStart}-{paginationEnd} of {rows.length}
                    </p>

                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                      disabled={page === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      &lt;
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPage((prev) => Math.min(prev + 1, totalPages - 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-40"
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
