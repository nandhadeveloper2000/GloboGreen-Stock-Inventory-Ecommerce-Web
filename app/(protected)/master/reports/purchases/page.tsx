"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type Row = { _id: Record<string, number>; totalAmount: number; orders: number };
type Vendor = { _id: string; vendorName: string; totalAmount: number; orders: number };

export default function Page() {
  const { accessToken } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!accessToken) {
      setRows([]);
      setVendors([]);
      return;
    }

    setLoading(true);
    try {
      const url = typeof SummaryApi.report_master_purchases.url === "function"
        ? SummaryApi.report_master_purchases.url({ from, to })
        : SummaryApi.report_master_purchases.url;
      const res = await fetch(`${baseURL}${url}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const json = await res.json();
      if (json.success) { setRows(json.data?.purchasesByDate ?? []); setVendors(json.data?.topVendors ?? []); }
    } catch { toast.error("Failed to load purchase report"); }
    finally { setLoading(false); }
  }, [accessToken, from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Master Purchase Report</h1>
      <div className="flex gap-3 mb-6 p-4 bg-gray-50 rounded-lg flex-wrap">
        <div><label className="block text-xs font-medium mb-1 text-gray-600">From</label>
          <input type="date" className="border rounded px-3 py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="block text-xs font-medium mb-1 text-gray-600">To</label>
          <input type="date" className="border rounded px-3 py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex items-end"><button onClick={fetch_} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm">Apply</button></div>
      </div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-gray-400" /></div> : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border rounded-lg p-4"><p className="text-sm text-gray-500">Total Purchased</p>
              <p className="text-2xl font-bold text-blue-600">₹{rows.reduce((s, r) => s + r.totalAmount, 0).toLocaleString("en-IN")}</p></div>
            <div className="border rounded-lg p-4"><p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold">{rows.reduce((s, r) => s + r.orders, 0)}</p></div>
          </div>
          {vendors.length > 0 && (
            <div><h2 className="text-base font-semibold mb-3">Top Vendors</h2>
              <div className="border rounded-lg overflow-hidden"><table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600"><tr>
                  <th className="px-4 py-2 text-left">#</th><th className="px-4 py-2 text-left">Vendor</th>
                  <th className="px-4 py-2 text-right">Orders</th><th className="px-4 py-2 text-right">Total</th>
                </tr></thead>
                <tbody className="divide-y">{vendors.map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2">{v.vendorName}</td>
                    <td className="px-4 py-2 text-right">{v.orders}</td>
                    <td className="px-4 py-2 text-right font-medium">₹{Number(v.totalAmount).toLocaleString("en-IN")}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
