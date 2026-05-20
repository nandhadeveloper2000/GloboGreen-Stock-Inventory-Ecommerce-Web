"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  CalendarDays,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type SelectedShopContext = {
  id: string;
  name: string;
  type: string;
};

type TransferItem = {
  itemName?: string;
  itemCode?: string;
  itemModelNumber?: string;
  qty?: number;
  unit?: string;
};

type StockTransfer = {
  _id?: string;
  fromShopName?: string;
  toShopName?: string;
  referenceNo?: string;
  transferDate?: string;
  notes?: string;
  status?: string;
  items?: TransferItem[];
  createdAt?: string;
};

type ListResponse = {
  success?: boolean;
  message?: string;
  data?: StockTransfer[];
  transfers?: StockTransfer[];
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;

    if (response?.data?.message) return response.data.message;
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong";
}

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "", type: "" };
  }

  const rawShopId = window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "";
  const rawShopName = window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "";
  const rawShopType = window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "";

  if (rawShopId.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawShopId) as {
        _id?: string;
        id?: string;
        shopName?: string;
        name?: string;
        shopType?: string;
        type?: string;
      };

      return {
        id: cleanText(parsed?._id || parsed?.id),
        name: cleanText(parsed?.shopName || parsed?.name || rawShopName),
        type: cleanText(parsed?.shopType || parsed?.type || rawShopType),
      };
    } catch {
      return {
        id: cleanText(rawShopId),
        name: cleanText(rawShopName),
        type: cleanText(rawShopType),
      };
    }
  }

  return {
    id: cleanText(rawShopId),
    name: cleanText(rawShopName),
    type: cleanText(rawShopType),
  };
}

function getStatusClass(status?: string | null) {
  const normalized = normalizeValue(status);

  if (normalized === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "CANCELLED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

type StockTransferListPageProps = {
  createHref?: string;
  viewHref?: string;
};

export default function StockTransferListPage({
  createHref = "/shopowner/stock-transfers/create",
  viewHref = "/shopowner/stock/view",
}: StockTransferListPageProps = {}) {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [selectedShop, setSelectedShop] = useState<SelectedShopContext>(
    readSelectedShop()
  );
  const [items, setItems] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

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

  const fetchTransfers = useCallback(
    async (showLoader = true) => {
      if (!accessToken) {
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const url =
          typeof SummaryApi.stock_transfer_list.url === "function"
            ? SummaryApi.stock_transfer_list.url(
                selectedShop.id ? { shopId: selectedShop.id } : undefined
              )
            : SummaryApi.stock_transfer_list.url;

        const response = await fetch(`${baseURL}${url}`, {
          method: SummaryApi.stock_transfer_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const result = (await response.json().catch(() => ({}))) as ListResponse;
        const rows = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.transfers)
            ? result.transfers
            : [];

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load stock transfers");
        }

        setItems(rows);
      } catch (error) {
        toast.error(getErrorMessage(error));
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShop.id]
  );

  useEffect(() => {
    void fetchTransfers(true);
  }, [fetchTransfers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, search, selectedShop.id]);

  const filteredItems = useMemo(() => {
    const query = cleanText(search).toLowerCase();

    if (!query) return items;

    return items.filter((item) =>
      [
        item.referenceNo,
        item.fromShopName,
        item.toShopName,
        item.status,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;

  const paginatedItems = useMemo(
    () => filteredItems.slice(startIndex, startIndex + rowsPerPage),
    [filteredItems, rowsPerPage, startIndex]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startEntry = filteredItems.length === 0 ? 0 : startIndex + 1;
  const endEntry =
    filteredItems.length === 0
      ? 0
      : Math.min(startIndex + rowsPerPage, filteredItems.length);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-30" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.21em] text-white/95">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Stock Transfers
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Transfer History
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Review transfer records for the selected shop and open any
                completed transfer in detail.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void fetchTransfers(false)}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={classNames(
                    "h-4 w-4",
                    refreshing && "animate-spin"
                  )}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => router.push(createHref)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#00008b] shadow-[0_18px_40px_rgba(255,255,255,0.16)] transition hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                New Transfer
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                <Store className="h-4 w-4 text-[#00008b]" />
                {selectedShop.name || "All accessible shops"}
              </span>

              {selectedShop.type ? (
                <span className="inline-flex items-center rounded-2xl border border-[#00008b]/15 bg-[#00008b]/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#00008b]">
                  {normalizeValue(selectedShop.type)}
                </span>
              ) : null}

              <span className="inline-flex items-center rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                Total: {filteredItems.length}
              </span>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by reference, shop, note, or status"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-5 flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#00008b]" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <ArrowRightLeft className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-4 text-base font-black text-slate-950">
                No transfers found
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {search.trim()
                  ? "Try another search keyword."
                  : "Start by creating a new stock transfer."}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
                <table className="min-w-full border-collapse bg-white">
                  <thead className="bg-slate-50/80">
                    <tr>
                      {[
                        "S.No",
                        "Reference No",
                        "Transfer Route",
                        "Items",
                        "Date",
                        "Status",
                        "Action",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={classNames(
                            "px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500",
                            heading === "Action" ? "text-right" : "text-left"
                          )}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedItems.map((item, index) => (
                      <tr
                        key={item._id || `transfer-${index}`}
                        className="border-t border-slate-100 transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4 text-sm font-black text-slate-700">
                          {startIndex + index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-sm font-bold text-slate-900">
                            {item.referenceNo || "-"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {cleanText(item.notes) || "No notes"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          <div className="font-semibold text-slate-900">
                            {item.fromShopName || "-"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            to {item.toShopName || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                          {item.items?.length ?? 0} item(s)
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                          <div className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {formatDate(item.transferDate || item.createdAt)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={classNames(
                              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black uppercase",
                              getStatusClass(item.status)
                            )}
                          >
                            {item.status || "COMPLETED"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            disabled={!item._id}
                            onClick={() =>
                              item._id
                                ? router.push(`${viewHref}?id=${item._id}`)
                                : undefined
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#00008b]/20 hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-3 lg:hidden">
                {paginatedItems.map((item, index) => (
                  <article
                    key={item._id || `mobile-transfer-${index}`}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-950">
                          {item.referenceNo || "Transfer Record"}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {formatDate(item.transferDate || item.createdAt)}
                        </p>
                      </div>

                      <span
                        className={classNames(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase",
                          getStatusClass(item.status)
                        )}
                      >
                        {item.status || "COMPLETED"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div>
                        <p className="font-bold uppercase tracking-[0.12em] text-slate-400">
                          From
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {item.fromShopName || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-[0.12em] text-slate-400">
                          To
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {item.toShopName || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-[0.12em] text-slate-400">
                          Items
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {item.items?.length ?? 0} item(s)
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-[0.12em] text-slate-400">
                          Notes
                        </p>
                        <p className="mt-1 line-clamp-2 font-semibold text-slate-800">
                          {cleanText(item.notes) || "No notes"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!item._id}
                      onClick={() =>
                        item._id
                          ? router.push(`${viewHref}?id=${item._id}`)
                          : undefined
                      }
                      className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Eye className="h-4 w-4" />
                      View Transfer
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          {!loading && filteredItems.length > 0 ? (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  Rows per page:
                  <select
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-slate-800">
                    {startEntry}-{endEntry} of {filteredItems.length}
                  </p>

                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(page - 1, 1))
                    }
                    disabled={currentPage === 1}
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
                    disabled={currentPage === totalPages}
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
    </div>
  );
}
