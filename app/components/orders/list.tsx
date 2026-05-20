"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import { type ApiResponse, type SalesOrderRecord, readSelectedShop } from "@/components/sales/shared";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

const ORDER_STATUSES = ["ALL", "PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const STATUS_COLORS: Record<string, string> = {
  PLACED:    "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PACKED:    "bg-purple-100 text-purple-700",
  SHIPPED:   "bg-yellow-100 text-yellow-800",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function money(n?: number) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeStatus(s?: string) {
  return String(s ?? "").toUpperCase();
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function CustomerOrdersListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId]   = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [rows, setRows]         = useState<SalesOrderRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMessage, setErrorMessage] = useState("");

  const syncShop = useCallback(() => {
    const shop = readSelectedShop();
    setSelectedShopId(shop.id);
    setSelectedShopName(shop.name);
  }, []);

  useEffect(() => {
    syncShop();
    window.addEventListener("shop-selection-changed", syncShop);
    window.addEventListener("storage", syncShop);
    return () => {
      window.removeEventListener("shop-selection-changed", syncShop);
      window.removeEventListener("storage", syncShop);
    };
  }, [syncShop]);

  const fetchOrders = useCallback(
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

      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setErrorMessage("");

        const url = SummaryApi.sales_list.url({
          shopId: selectedShopId,
          source: "ONLINE",
          limit: 200,
        });

        const response = await fetch(`${baseURL}${url}`, {
          method: SummaryApi.sales_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const result = (await response.json().catch(() => ({}))) as ApiResponse<SalesOrderRecord[]>;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load orders");
        }

        setRows(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to load orders";
        setRows([]);
        setErrorMessage(msg);
        if (isRefresh) toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShopId]
  );

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  /* ── Status update ── */
  async function handleStatusUpdate(orderId: string, newStatus: string) {
    if (!accessToken) return;
    try {
      const response = await fetch(`${baseURL}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to update status");
      toast.success(`Order status updated to ${newStatus}`);
      void fetchOrders(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const status = normalizeStatus(row.status);
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!q) return true;
      return [
        row.orderNo,
        row.customerNameSnapshot,
        row.customerMobileSnapshot,
        row.status,
      ].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);

  /* ── Render ── */
  if (!selectedShopId) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-slate-500">
        <Store className="h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium">Select a shop to view customer orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Customer Orders</h1>
          <p className="text-sm text-slate-500">
            Online orders placed by customers — {selectedShopName}
          </p>
        </div>
        <button
          onClick={() => void fetchOrders(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order no, customer name…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s === "ALL" ? "All Statuses" : s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-16">
          <ShoppingBag className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No customer orders found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["#", "Order No", "Customer", "Items", "Amount", "Payment", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => {
                  const status = normalizeStatus(row.status);
                  return (
                    <tr key={row._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-slate-700">{row.orderNo ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{row.customerNameSnapshot || "Walk-in"}</div>
                        {row.customerMobileSnapshot ? (
                          <div className="text-xs text-slate-400">{row.customerMobileSnapshot}</div>
                        ) : null}
                        {row.address?.state ? (
                          <div className="text-xs text-slate-400">{row.address.state}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{row.itemCount ?? row.items?.length ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{money(row.grandTotal)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-slate-600">{row.payment?.method ?? "—"}</span>
                        {row.payment?.paid ? (
                          <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Paid</span>
                        ) : (
                          <span className="ml-1 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-700">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"}`}>
                          {status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {status !== "DELIVERED" && status !== "CANCELLED" ? (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) void handleStatusUpdate(row._id, e.target.value);
                                e.target.value = "";
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
                            >
                              <option value="">Update…</option>
                              {ORDER_STATUSES.filter((s) => s !== "ALL" && s !== status).map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            Showing {filteredRows.length} of {rows.length} orders
          </div>
        </div>
      )}
    </div>
  );
}
