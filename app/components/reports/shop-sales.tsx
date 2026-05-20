"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  formatCurrency,
  formatGroupedDateLabel,
  getInitialReportRange,
  hasInvalidDateRange,
  useSelectedShopContext,
} from "./shop-report-utils";

type SalesByDate = {
  _id: Record<string, number>;
  revenue: number;
  orders: number;
};

type TopProduct = {
  _id: string;
  name: string;
  qty: number;
  revenue: number;
};

type StatusBreakdown = {
  _id: string;
  count: number;
  revenue: number;
};

type Summary = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
};

export default function ShopSalesReportPage() {
  const { accessToken } = useAuth();
  const selectedShop = useSelectedShopContext();
  const initialRange = useMemo(() => getInitialReportRange(), []);

  const [from, setFrom] = useState(initialRange.firstOfMonth);
  const [to, setTo] = useState(initialRange.today);
  const [groupBy, setGroupBy] = useState("day");
  const [salesByDate, setSalesByDate] = useState<SalesByDate[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const dateRangeError = useMemo(() => {
    if (!hasInvalidDateRange(from, to)) return "";
    return "From date must be before or equal to To date.";
  }, [from, to]);

  const fetchReport = useCallback(
    async (showValidationToast = false) => {
      if (!selectedShop.id) {
        setSalesByDate([]);
        setTopProducts([]);
        setStatusBreakdown([]);
        setSummary(null);

        if (showValidationToast) {
          toast.error("Select a shop first");
        }
        return;
      }

      if (dateRangeError) {
        if (showValidationToast) {
          toast.error(dateRangeError);
        }
        return;
      }

      if (!accessToken) {
        setSalesByDate([]);
        setTopProducts([]);
        setStatusBreakdown([]);
        setSummary(null);
        return;
      }

      setLoading(true);
      try {
        const url =
          typeof SummaryApi.report_shop_sales.url === "function"
            ? SummaryApi.report_shop_sales.url({
                shopId: selectedShop.id,
                from,
                to,
                groupBy,
              })
            : SummaryApi.report_shop_sales.url;
        const res = await fetch(`${baseURL}${url}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load sales report");
        }

        setSalesByDate(json.data?.salesByDate ?? []);
        setTopProducts(json.data?.topProducts ?? []);
        setStatusBreakdown(json.data?.statusBreakdown ?? []);
        setSummary(json.data?.summary ?? null);
      } catch (error) {
        setSalesByDate([]);
        setTopProducts([]);
        setStatusBreakdown([]);
        setSummary(null);
        toast.error(
          error instanceof Error ? error.message : "Failed to load sales report"
        );
      } finally {
        setLoading(false);
      }
    },
    [accessToken, dateRangeError, from, groupBy, selectedShop.id, to]
  );

  useEffect(() => {
    void fetchReport(false);
  }, [fetchReport]);

  const hasData =
    Boolean(summary) ||
    salesByDate.length > 0 ||
    topProducts.length > 0 ||
    statusBreakdown.length > 0;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Sales Report</h1>
        <p className="text-sm text-gray-500">
          Shop: {selectedShop.name || "No shop selected"}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600">
            From
          </label>
          <input
            type="date"
            className="border rounded px-3 py-1.5 text-sm"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600">
            To
          </label>
          <input
            type="date"
            className="border rounded px-3 py-1.5 text-sm"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600">
            Group By
          </label>
          <select
            className="border rounded px-3 py-1.5 text-sm"
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value)}
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => void fetchReport(true)}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>

      {!selectedShop.id ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Select a shop from the sidebar to view billing and sales data.
        </div>
      ) : dateRangeError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {dateRangeError}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
        </div>
      ) : !hasData ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No sales data found for the selected date range.
        </div>
      ) : (
        <>
          {summary ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(Number(summary.totalRevenue || 0))}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">
                  {Number(summary.totalOrders || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(Number(summary.avgOrderValue || 0))}
                </p>
              </div>
            </div>
          ) : null}

          {statusBreakdown.length > 0 ? (
            <div>
              <h2 className="text-base font-semibold mb-3">Order Status Summary</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {statusBreakdown.map((row) => (
                  <div key={row._id || "UNKNOWN"} className="border rounded-lg p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {row._id || "Unknown"}
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {Number(row.count || 0).toLocaleString("en-IN")} orders
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(Number(row.revenue || 0))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {salesByDate.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-base font-semibold mb-3">Sales Trend</h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Orders</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {salesByDate.map((row, index) => (
                      <tr key={`${formatGroupedDateLabel(row._id)}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{formatGroupedDateLabel(row._id)}</td>
                        <td className="px-4 py-2 text-right">{row.orders}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(Number(row.revenue || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {topProducts.length > 0 ? (
            <div>
              <h2 className="text-base font-semibold mb-3">Top Products</h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-right">Qty Sold</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topProducts.slice(0, 10).map((product, index) => (
                      <tr key={product._id || `${product.name}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2">{product.name || "-"}</td>
                        <td className="px-4 py-2 text-right">{product.qty}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(Number(product.revenue || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
