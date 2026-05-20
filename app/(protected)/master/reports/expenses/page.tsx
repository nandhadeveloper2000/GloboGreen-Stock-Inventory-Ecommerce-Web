"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type ByCategory = { _id: string; total: number; count: number };

export default function Page() {
  const { accessToken } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [byCategory, setByCategory] = useState<ByCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!accessToken) {
      setByCategory([]);
      return;
    }

    setLoading(true);
    try {
      const url = typeof SummaryApi.report_master_expenses.url === "function"
        ? SummaryApi.report_master_expenses.url({ from, to })
        : SummaryApi.report_master_expenses.url;
      const res = await fetch(`${baseURL}${url}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const json = await res.json();
      if (json.success) setByCategory(json.data?.byCategory ?? []);
    } catch { toast.error("Failed to load expense report"); }
    finally { setLoading(false); }
  }, [accessToken, from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const total = byCategory.reduce((s, r) => s + r.total, 0);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Master Expense Report</h1>
      <div className="flex gap-3 mb-6 p-4 bg-gray-50 rounded-lg flex-wrap">
        <div><label className="block text-xs font-medium mb-1 text-gray-600">From</label>
          <input type="date" className="border rounded px-3 py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="block text-xs font-medium mb-1 text-gray-600">To</label>
          <input type="date" className="border rounded px-3 py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex items-end"><button onClick={fetch_} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm">Apply</button></div>
      </div>
      <div className="border rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-500">Total Expenses</p>
        <p className="text-2xl font-bold text-red-600">₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-gray-400" /></div> : (
        byCategory.length > 0 ? (
          <div className="border rounded-lg overflow-hidden"><table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr>
              <th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-right">Count</th><th className="px-4 py-2 text-right">Total</th>
            </tr></thead>
            <tbody className="divide-y">{byCategory.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2">{r._id || "—"}</td>
                <td className="px-4 py-2 text-right text-gray-500">{r.count}</td>
                <td className="px-4 py-2 text-right font-medium text-red-600">₹{Number(r.total).toLocaleString("en-IN")}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className="text-center py-12 text-gray-500">No expense data found</div>
      )}
    </div>
  );
}
