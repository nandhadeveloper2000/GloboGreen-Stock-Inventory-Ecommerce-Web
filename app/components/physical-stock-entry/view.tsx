"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type PhysicalStockItem = {
  productId: string;
  itemName?: string;
  itemCode?: string;
  itemModelNumber?: string;
  systemQty?: number;
  physicalQty?: number;
  reason?: string;
};

type PhysicalStockEntry = {
  _id: string;
  referenceNo?: string;
  shopName?: string;
  notes?: string;
  status?: string;
  items?: PhysicalStockItem[];
  createdAt?: string;
};

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

export default function PhysicalStockViewPage() {
  const params = useParams();
  const rawId = params?.id;

  const id = Array.isArray(rawId) ? String(rawId[0] || "") : String(rawId || "");
  const { accessToken } = useAuth();

  const [entry, setEntry] = useState<PhysicalStockEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadEntry = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !id) {
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
          `${baseURL}${SummaryApi.physical_stock_get.url(id)}`,
          {
            method: SummaryApi.physical_stock_get.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        );

        const result = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          data?: PhysicalStockEntry;
        };

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load entry");
        }

        setEntry(result.data || null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load entry"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, id]
  );

  useEffect(() => {
    void loadEntry();
  }, [loadEntry]);

  const totalQty = entry?.items?.reduce(
    (sum, item) => sum + Number(item.physicalQty || 0),
    0
  );

  if (!id) {
    return (
      <div className="page-shell">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
            <p className="text-lg font-semibold">Physical stock entry id is required.</p>
          </div>
        </div>
      </div>
    );
  }

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
                Stock Entry Details
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Physical Stock Entry View
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Review the recorded physical stock entry for this location.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadEntry(true)}
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
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : !entry ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
              Physical stock entry not found.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Reference No</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{entry.referenceNo || "-"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(entry.createdAt)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Total Physical Qty</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{totalQty ?? 0}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Location</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{entry.shopName || "-"}</p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{entry.notes || "No notes provided."}</p>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="min-w-full border-collapse text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Product</th>
                      <th className="px-4 py-4">SKU</th>
                      <th className="px-4 py-4">System Qty</th>
                      <th className="px-4 py-4">Physical Qty</th>
                      <th className="px-4 py-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.items?.map((item) => (
                      <tr key={item.productId} className="border-t border-slate-200">
                        <td className="px-4 py-4 font-semibold text-slate-900">{item.itemName || "Unnamed Product"}</td>
                        <td className="px-4 py-4">{item.itemCode || item.itemModelNumber || "-"}</td>
                        <td className="px-4 py-4">{item.systemQty ?? 0}</td>
                        <td className="px-4 py-4">{item.physicalQty ?? 0}</td>
                        <td className="px-4 py-4">{item.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
