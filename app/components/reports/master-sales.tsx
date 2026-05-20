"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type SalesByDate = { _id: Record<string, number>; revenue: number; orders: number };
type TopShop = { _id: string; shopName: string; revenue: number; orders: number };

export default function MasterSalesReportPage() {
  const { accessToken } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState("day");
  const [salesByDate, setSalesByDate] = useState<SalesByDate[]>([]);
  const [topShops, setTopShops] = useState<TopShop[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!accessToken) {
      setSalesByDate([]);
      setTopShops([]);
      return;
    }
    setLoading(true);
    try {
      const url = typeof SummaryApi.report_master_sales.url === "function"
        ? SummaryApi.report_master_sales.url({ from, to, groupBy })
        : SummaryApi.report_master_sales.url;
      const res = await fetch(`${baseURL}${url}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setSalesByDate(json.data?.salesByDate ?? []);
        setTopShops(json.data?.topShops ?? []);
      }
    } catch {
      toast.error("Failed to load sales report");
    } finally {
      setLoading(false);
    }
  }, [accessToken, from, to, groupBy]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const totalRevenue = salesByDate.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = salesByDate.reduce((s, r) => s + r.orders, 0);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Master Sales Report</h1>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600">From</label>
          <input type="date" className="border rounded px-3 py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600">To</label>
          <input type="date" className="border rounded px-3 py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600">Group By</label>
          <select className="border rounded px-3 py-1.5 text-sm" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="week">Week</option>
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={fetchReport} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Apply</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-gray-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{Number(totalRevenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>
          </div>

          {salesByDate.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold mb-3">Sales Trend</h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Period</th>
                      <th className="px-4 py-2 text-right">Orders</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {salesByDate.map((row, i) => {
                      const id = row._id;
                      const label = id.day
                        ? `${id.year}-${String(id.month).padStart(2, "0")}-${String(id.day).padStart(2, "0")}`
                        : id.week
                        ? `${id.year} W${id.week}`
                        : `${id.year}-${String(id.month).padStart(2, "0")}`;
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{label}</td>
                          <td className="px-4 py-2 text-right">{row.orders}</td>
                          <td className="px-4 py-2 text-right font-medium">₹{Number(row.revenue).toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {topShops.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-3">Top 10 Shops</h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Shop</th>
                      <th className="px-4 py-2 text-right">Orders</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topShops.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2">{s.shopName}</td>
                        <td className="px-4 py-2 text-right">{s.orders}</td>
                        <td className="px-4 py-2 text-right font-medium">₹{Number(s.revenue).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
