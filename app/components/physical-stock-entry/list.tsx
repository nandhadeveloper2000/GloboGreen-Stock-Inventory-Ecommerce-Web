"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type PhysicalStockEntry = {
  _id: string;
  referenceNo?: string;
  shopName?: string;
  status?: string;
  notes?: string;
  totalDifference?: number;
  createdAt?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

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

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export default function PhysicalStockListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [rows, setRows] = useState<PhysicalStockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
  }, []);

  const fetchEntries = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage("");

      try {
        const response = await fetch(
          `${baseURL}${SummaryApi.physical_stock_list.url({
            shopId: selectedShopId,
          })}`,
          {
            method: SummaryApi.physical_stock_list.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        );

        const result = (await response.json().catch(() => ({}))) as ApiResponse<PhysicalStockEntry[]>;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load entries");
        }

        setRows(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load entries"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShopId]
  );

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const query = normalizeText(search);
    return rows.filter((row) => {
      return [row.referenceNo, row.shopName, row.status, row.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [rows, search]);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-30" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.21em] text-white/95">
                <Eye className="h-3.5 w-3.5" />
                Physical Stock Entries
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                View Physical Stock Entries
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Review your warehouse/location physical stock entry history.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/shopowner/physical-stock/create"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <Plus className="h-4 w-4" />
                New Stock Entry
              </Link>
              <button
                type="button"
                onClick={() => void fetchEntries(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Selected Location</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{selectedShopName || "No location selected"}</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="Search reference, location, status"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No physical stock entries found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <table className="min-w-full border-collapse text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Reference No</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Location</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Net Difference</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row._id} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-900">{row.referenceNo || "-"}</td>
                      <td className="px-4 py-4">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-4">{row.shopName || "-"}</td>
                      <td className="px-4 py-4">{row.status || "Open"}</td>
                      <td className="px-4 py-4 text-slate-900">
                        {typeof row.totalDifference === "number" ? (
                          <span className={row.totalDifference >= 0 ? "text-emerald-700" : "text-rose-700"}>
                            {row.totalDifference >= 0 ? `+${row.totalDifference}` : row.totalDifference}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/shopowner/physical-stock/view/${row._id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                          <Link
                            href={`/shopowner/physical-stock/edit/${row._id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
