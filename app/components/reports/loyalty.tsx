"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

const SHOP_ID_KEY = "selected_shop_id_web";
function getShopId() {
  if (typeof window === "undefined") return "";
  return String(window.localStorage.getItem(SHOP_ID_KEY) || "").trim();
}

type Customer = { _id: string; name?: string; mobile?: string; points?: number; createdAt?: string };
type Summary = { totalPoints: number; totalCustomers: number; avgPoints: number };

export default function LoyaltyReportPage() {
  const { accessToken } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    const shopId = getShopId();
    if (!shopId) { toast.error("Select a shop first"); return; }
    if (!accessToken) {
      setCustomers([]);
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const url = typeof SummaryApi.report_shop_loyalty.url === "function"
        ? SummaryApi.report_shop_loyalty.url({ shopId })
        : SummaryApi.report_shop_loyalty.url;
      const res = await fetch(`${baseURL}${url}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data?.topCustomers ?? []);
        setSummary(json.data?.summary ?? null);
      }
    } catch {
      toast.error("Failed to load loyalty report");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Loyalty Points Report</h1>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-gray-400" /></div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Points Issued</p>
                <p className="text-2xl font-bold text-yellow-600">{Number(summary.totalPoints).toLocaleString("en-IN")}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold">{summary.totalCustomers}</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-500">Avg Points / Customer</p>
                <p className="text-2xl font-bold">{Number(summary.avgPoints).toFixed(0)}</p>
              </div>
            </div>
          )}

          {customers.length > 0 ? (
            <div>
              <h2 className="text-base font-semibold mb-3">Top 20 Customers by Points</h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Mobile</th>
                      <th className="px-4 py-2 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customers.map((c, i) => (
                      <tr key={c._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500">
                          {i === 0 ? <Star className="w-4 h-4 text-yellow-500 inline" /> : i + 1}
                        </td>
                        <td className="px-4 py-2 font-medium">{c.name || "—"}</td>
                        <td className="px-4 py-2 text-gray-500">{c.mobile || "—"}</td>
                        <td className="px-4 py-2 text-right font-semibold text-yellow-600">{Number(c.points ?? 0).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No customer loyalty data found</div>
          )}
        </>
      )}
    </div>
  );
}
