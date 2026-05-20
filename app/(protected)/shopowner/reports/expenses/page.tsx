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
} from "@/components/reports/shop-report-utils";

type ByCategory = {
  _id: string;
  total: number;
  count: number;
};

type TrendRow = {
  _id: Record<string, number>;
  total: number;
};

type Summary = {
  totalAmount: number;
  totalItems: number;
};

export default function Page() {
  const { accessToken } = useAuth();
  const selectedShop = useSelectedShopContext();
  const initialRange = useMemo(() => getInitialReportRange(), []);

  const [from, setFrom] = useState(initialRange.firstOfMonth);
  const [to, setTo] = useState(initialRange.today);
  const [byCategory, setByCategory] = useState<ByCategory[]>([]);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const dateRangeError = useMemo(() => {
    if (!hasInvalidDateRange(from, to)) return "";
    return "From date must be before or equal to To date.";
  }, [from, to]);

  const fetchReport = useCallback(
    async (showValidationToast = false) => {
      if (!selectedShop.id) {
        setByCategory([]);
        setTrend([]);
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
        setByCategory([]);
        setTrend([]);
        setSummary(null);
        return;
      }

      setLoading(true);
      try {
        const url =
          typeof SummaryApi.report_shop_expenses.url === "function"
            ? SummaryApi.report_shop_expenses.url({
                shopId: selectedShop.id,
                from,
                to,
              })
            : SummaryApi.report_shop_expenses.url;
        const res = await fetch(`${baseURL}${url}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load expense report");
        }

        setByCategory(json.data?.byCategory ?? []);
        setTrend(json.data?.trend ?? []);
        setSummary(json.data?.summary ?? null);
      } catch (error) {
        setByCategory([]);
        setTrend([]);
        setSummary(null);
        toast.error(
          error instanceof Error ? error.message : "Failed to load expense report"
        );
      } finally {
        setLoading(false);
      }
    },
    [accessToken, dateRangeError, from, selectedShop.id, to]
  );

  useEffect(() => {
    void fetchReport(false);
  }, [fetchReport]);

  const hasData = Boolean(summary) || byCategory.length > 0 || trend.length > 0;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Expense Report</h1>
        <p className="text-sm text-gray-500">
          Shop: {selectedShop.name || "No shop selected"}
        </p>
      </div>

      <div className="flex gap-3 p-4 bg-gray-50 rounded-lg flex-wrap">
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
        <div className="flex items-end">
          <button
            onClick={() => void fetchReport(true)}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm"
          >
            Apply
          </button>
        </div>
      </div>

      {!selectedShop.id ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Select a shop from the sidebar to view expense and accounting totals.
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
          No expense data found for the selected date range.
        </div>
      ) : (
        <>
          {summary ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(Number(summary.totalAmount || 0))}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Expense Entries</p>
                <p className="text-2xl font-bold">
                  {Number(summary.totalItems || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ) : null}

          {byCategory.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-right">Count</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {byCategory.map((row, index) => (
                    <tr key={`${row._id}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{row._id || "-"}</td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {row.count}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-red-600">
                        {formatCurrency(Number(row.total || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {trend.length > 0 ? (
            <div>
              <h2 className="text-base font-semibold mb-3">Expense Trend</h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {trend.map((row, index) => (
                      <tr key={`${formatGroupedDateLabel(row._id)}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {formatGroupedDateLabel(row._id)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-red-600">
                          {formatCurrency(Number(row.total || 0))}
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
