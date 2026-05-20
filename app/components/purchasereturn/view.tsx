"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  FilePlus2,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type PurchaseReturnRecord,
  PRIMARY_COLOR,
  SUCCESS_COLOR,
  formatDate,
  getPurchaseNumber,
  getPurchaseShopLabel,
  getPurchaseSupplier,
  getStatusLabel,
  getSupplierName,
  isPurchaseAllowedShop,
  money,
  readSelectedShop,
  toNumber,
} from "./shared";

type PurchaseReturnViewPageProps = {
  id?: string;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function PurchaseReturnViewPage({
  id = "",
}: PurchaseReturnViewPageProps) {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [data, setData] = useState<PurchaseReturnRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const purchaseAllowedShopSelected = useMemo(
    () => isPurchaseAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const selectedShopTypeLabel = useMemo(
    () => getPurchaseShopLabel(selectedShopType),
    [selectedShopType]
  );

  const syncSelectedShop = useCallback(() => {
    const selectedShop = readSelectedShop();

    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId || !purchaseAllowedShopSelected || !id) {
        setData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        const response = await fetch(
          `${baseURL}${SummaryApi.purchase_return_detail.url(selectedShopId, id)}`,
          {
            method: SummaryApi.purchase_return_detail.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        );

        const result = (await response
          .json()
          .catch(() => ({}))) as ApiResponse<PurchaseReturnRecord>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Failed to load purchase return");
        }

        setData(result.data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load purchase return";

        setData(null);
        setErrorMessage(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, id, purchaseAllowedShopSelected, selectedShopId]
  );

  useEffect(() => {
    syncSelectedShop();

    function handleShopChange() {
      syncSelectedShop();
    }

    window.addEventListener("shop-selection-changed", handleShopChange);
    window.addEventListener("storage", handleShopChange);

    return () => {
      window.removeEventListener("shop-selection-changed", handleShopChange);
      window.removeEventListener("storage", handleShopChange);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!id) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Purchase Return View</h1>
        <p className="mt-3 text-sm text-slate-600">
          No purchase return id was provided.
        </p>
      </div>
    );
  }

  if (!selectedShopId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Purchase Return View</h1>
        <p className="mt-3 text-sm text-slate-600">
          Select a shop first to view this purchase return.
        </p>
      </div>
    );
  }

  if (!purchaseAllowedShopSelected) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Purchase Return View</h1>
            <p className="mt-2 text-sm text-slate-700">
              Purchase returns are available only for {selectedShopTypeLabel}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="overflow-hidden rounded-[2rem] text-white shadow-[0_24px_70px_rgba(0,0,139,0.18)]"
        style={{
          background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #0b2cbf 58%, #1d4ed8 100%)`,
        }}
      >
        <div className="flex flex-col gap-5 px-6 py-7 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-white/70">
              Purchase Return Details
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {data?.returnNo || "Purchase Return"}
            </h1>
            <p className="mt-2 text-sm text-blue-100">
              {selectedShopName || "Selected shop"} · {formatDate(data?.returnDate, "long")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur">
              Qty: {Math.max(toNumber(data?.totalQty, 0), 0)}
            </span>
            <span className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur">
              {money(data?.totalReturnAmount)}
            </span>
            <Link
              href="/shopowner/purchasereturn/list"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            {data ? (
              <Link
                href={`/shopowner/purchasereturn/edit/${data._id}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            ) : null}
            <Link
              href="/shopowner/purchasereturn/create"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <FilePlus2 className="h-4 w-4" />
              New Return
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading purchase return...
          </div>
        </div>
      ) : errorMessage || !data ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-600">
                Unable to load record
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {errorMessage || "Purchase return was not found."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchData(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.32em]"
                    style={{ color: PRIMARY_COLOR }}
                  >
                    Return Summary
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {data.returnNo || "-"}
                  </h2>
                </div>

                <span
                  className="inline-flex rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "#dcfce7",
                    color: SUCCESS_COLOR,
                  }}
                >
                  {getStatusLabel(data.status)}
                </span>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <DetailRow label="Return Date" value={formatDate(data.returnDate, "long")} />
                <DetailRow label="Return Reason" value={data.reason || "-"} />
                <DetailRow
                  label="Purchase Order"
                  value={getPurchaseNumber(data.purchaseId, data.purchaseNo)}
                />
                <DetailRow
                  label="Supplier"
                  value={getSupplierName(data.supplierId || getPurchaseSupplier(data.purchaseId))}
                />
                <DetailRow
                  label="Invoice Number"
                  value={
                    data.purchaseId && typeof data.purchaseId !== "string"
                      ? String(data.purchaseId.invoiceNo || "-")
                      : "-"
                  }
                />
                <DetailRow
                  label="Pay Mode"
                  value={
                    data.purchaseId && typeof data.purchaseId !== "string"
                      ? String(data.purchaseId.payMode || "-")
                      : "-"
                  }
                />
              </div>

              {data.notes ? (
                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {data.notes}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p
                className="text-xs font-semibold uppercase tracking-[0.32em]"
                style={{ color: PRIMARY_COLOR }}
              >
                Return Totals
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Item Count</span>
                  <span className="font-semibold text-slate-900">
                    {Math.max(toNumber(data.itemCount, 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Return Qty</span>
                  <span className="font-semibold text-slate-900">
                    {Math.max(toNumber(data.totalQty, 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-slate-500">Return Amount</span>
                  <span className="text-xl font-black" style={{ color: PRIMARY_COLOR }}>
                    {money(data.totalReturnAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <p>
                    This purchase return has been processed and the linked inventory
                    quantities have already been updated.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.32em]"
                  style={{ color: PRIMARY_COLOR }}
                >
                  Returned Items
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Item Breakdown
                </h2>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-[980px] text-sm">
                  <thead style={{ backgroundColor: PRIMARY_COLOR }}>
                    <tr className="text-left text-white">
                      <th className="px-5 py-4 font-semibold">Item Code</th>
                      <th className="px-5 py-4 font-semibold">Product</th>
                      <th className="px-5 py-4 font-semibold">Batch</th>
                      <th className="px-5 py-4 font-semibold">Ordered Qty</th>
                      <th className="px-5 py-4 font-semibold">Return Qty</th>
                      <th className="px-5 py-4 font-semibold">Unit Price</th>
                      <th className="px-5 py-4 font-semibold">Return Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items || []).map((item) => (
                      <tr key={item._id || item.purchaseItemId} className="border-t border-slate-200 bg-white hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {item.itemCode || "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {item.productName || "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {item.batch || "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {Math.max(toNumber(item.orderedQty, 0), 0)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {Math.max(toNumber(item.returnQty, 0), 0)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {money(item.unitPrice)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {money(item.returnTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
