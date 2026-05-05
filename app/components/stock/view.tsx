"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

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

function money(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

type StockTransferItem = {
  productId: string;
  shopProductId?: string;
  itemName?: string;
  itemCode?: string;
  itemModelNumber?: string;
  qty?: number;
  unit?: string;
};

type StockTransferDetail = {
  _id: string;
  referenceNo?: string;
  transferDate?: string;
  notes?: string;
  fromShopName?: string;
  toShopName?: string;
  status?: string;
  items?: StockTransferItem[];
  createdAt?: string;
};

export default function StockTransferViewPage() {
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const [transfer, setTransfer] = useState<StockTransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const transferId = searchParams.get("id") || "";

  const fetchTransfer = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !transferId) {
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
          `${baseURL}${SummaryApi.stock_transfer_get.url(transferId)}`,
          {
            method: SummaryApi.stock_transfer_get.method,
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
          data?: StockTransferDetail;
        };

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load transfer details");
        }

        setTransfer(result.data || null);
      } catch (error) {
        setTransfer(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load transfer details"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, transferId]
  );

  useEffect(() => {
    void fetchTransfer();
  }, [fetchTransfer]);

  const totalQuantity = useMemo(() => {
    if (!transfer?.items) return 0;
    return transfer.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [transfer]);

  if (!transferId) {
    return (
      <div className="page-shell">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
            <p className="text-lg font-semibold">Stock transfer id is required.</p>
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
                <RefreshCw className="h-3.5 w-3.5" />
                Transfer Details
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Stock Transfer View
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Review the completed stock transfer between your warehouse and branch shop.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchTransfer(true)}
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
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
              {errorMessage}
            </div>
          ) : !transfer ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
              Transfer not found.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Reference No</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{transfer.referenceNo || "-"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Transfer Date</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(transfer.transferDate || transfer.createdAt)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Total Quantity</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{totalQuantity}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">From</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{transfer.fromShopName || "-"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">To</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{transfer.toShopName || "-"}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{transfer.notes || "No notes provided."}</p>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="min-w-full border-collapse text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Product</th>
                      <th className="px-4 py-4">SKU</th>
                      <th className="px-4 py-4">Qty</th>
                      <th className="px-4 py-4">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.items?.map((item) => (
                      <tr key={item.productId} className="border-t border-slate-200">
                        <td className="px-4 py-4 font-semibold text-slate-900">{item.itemName || "Unnamed Product"}</td>
                        <td className="px-4 py-4">{item.itemCode || item.itemModelNumber || "-"}</td>
                        <td className="px-4 py-4">{item.qty ?? 0}</td>
                        <td className="px-4 py-4">{item.unit || "Pcs"}</td>
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
