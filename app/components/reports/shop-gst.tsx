"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  formatCurrency,
  getInitialReportRange,
  hasInvalidDateRange,
  useSelectedShopContext,
} from "./shop-report-utils";

type GstByRate = {
  _id: number;
  taxableValue: number;
  taxAmount: number;
  count: number;
};

type MonthlySummary = {
  _id: { year: number; month: number };
  totalTaxable: number;
  totalTax: number;
  totalRevenue: number;
  orders: number;
};

export default function ShopGstReportPage() {
  const { accessToken } = useAuth();
  const selectedShop = useSelectedShopContext();
  const initialRange = useMemo(() => getInitialReportRange(), []);

  const [from, setFrom] = useState(initialRange.firstOfMonth);
  const [to, setTo] = useState(initialRange.today);
  const [gstByRate, setGstByRate] = useState<GstByRate[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(false);

  const dateRangeError = useMemo(() => {
    if (!hasInvalidDateRange(from, to)) return "";
    return "From date must be before or equal to To date.";
  }, [from, to]);

  const fetchReport = useCallback(
    async (showValidationToast = false) => {
      if (!selectedShop.id) {
        setGstByRate([]);
        setMonthlySummary([]);

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
        setGstByRate([]);
        setMonthlySummary([]);
        return;
      }

      setLoading(true);
      try {
        const url =
          typeof SummaryApi.report_shop_gst.url === "function"
            ? SummaryApi.report_shop_gst.url({
                shopId: selectedShop.id,
                from,
                to,
              })
            : SummaryApi.report_shop_gst.url;
        const res = await fetch(`${baseURL}${url}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load GST report");
        }

        setGstByRate(json.data?.gstByRate ?? []);
        setMonthlySummary(json.data?.monthlySummary ?? []);
      } catch (error) {
        setGstByRate([]);
        setMonthlySummary([]);
        toast.error(
          error instanceof Error ? error.message : "Failed to load GST report"
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

  const totalTax = gstByRate.reduce(
    (sum, row) => sum + Number(row.taxAmount || 0),
    0
  );
  const totalTaxable = gstByRate.reduce(
    (sum, row) => sum + Number(row.taxableValue || 0),
    0
  );
  const totalRevenue = monthlySummary.reduce(
    (sum, row) => sum + Number(row.totalRevenue || 0),
    0
  );
  const totalOrders = monthlySummary.reduce(
    (sum, row) => sum + Number(row.orders || 0),
    0
  );

  const hasData = gstByRate.length > 0 || monthlySummary.length > 0;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">GST / Tax Report</h1>
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
          Select a shop from the sidebar to view GST billing totals.
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
          No GST data found for the selected date range.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Taxable Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalTaxable)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Tax Collected</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalTax)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Orders</p>
              <p className="text-2xl font-bold">
                {totalOrders.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {gstByRate.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-base font-semibold mb-3">
                GST Slab-wise Breakdown
              </h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">GST Rate</th>
                      <th className="px-4 py-2 text-right">Taxable Value</th>
                      <th className="px-4 py-2 text-right">Tax Amount</th>
                      <th className="px-4 py-2 text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {gstByRate.map((row, index) => (
                      <tr key={`${row._id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{row._id}%</td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(Number(row.taxableValue || 0))}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-orange-600">
                          {formatCurrency(Number(row.taxAmount || 0))}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {monthlySummary.length > 0 ? (
            <div>
              <h2 className="text-base font-semibold mb-3">Monthly Summary</h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Month</th>
                      <th className="px-4 py-2 text-right">Taxable</th>
                      <th className="px-4 py-2 text-right">Tax</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                      <th className="px-4 py-2 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthlySummary.map((row, index) => (
                      <tr
                        key={`${row._id.year}-${row._id.month}-${index}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-2">
                          {row._id.year}-{String(row._id.month).padStart(2, "0")}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(Number(row.totalTaxable || 0))}
                        </td>
                        <td className="px-4 py-2 text-right text-orange-600">
                          {formatCurrency(Number(row.totalTax || 0))}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatCurrency(Number(row.totalRevenue || 0))}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {row.orders}
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
