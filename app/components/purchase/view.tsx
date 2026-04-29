"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type PurchaseOrder = {
  _id: string;
  purchaseNo: string;
  mode: string;
  purchaseDate: string;
  invoiceNo?: string;
  invoiceDate?: string;
  payMode?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  netAmount?: number;
  status?: string;
  supplierId?: {
    vendorName?: string;
    code?: string;
  } | null;
  items?: Array<{
    _id: string;
    supplierId?: {
      vendorName?: string;
      code?: string;
    } | null;
    itemCode?: string;
    productName?: string;
    batch?: string;
    qty?: number;
    purchasePrice?: number;
    discount?: {
      percent?: number;
      amount?: number;
    };
    tax?: {
      label?: string;
      percent?: number;
    };
    purchaseAfterTax?: number;
    amount?: number;
  }>;
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";

function readShopId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "";
}

function date(value?: string) {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function money(value?: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function PurchaseViewPage({ id }: { id: string }) {
  const { accessToken } = useAuth();

  const [shopId, setShopId] = useState("");
  const [data, setData] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPurchase = useCallback(async () => {
    if (!accessToken || !shopId || !id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.purchase_detail.url(shopId, id)}`,
        {
          method: SummaryApi.purchase_detail.method,
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
        .catch(() => ({}))) as ApiResponse<PurchaseOrder>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load purchase");
      }

      setData(result.data || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load purchase");
    } finally {
      setLoading(false);
    }
  }, [accessToken, shopId, id]);

  useEffect(() => {
    setShopId(readShopId());
  }, []);

  useEffect(() => {
    void loadPurchase();
  }, [loadPurchase]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border bg-white p-6 text-center text-slate-500">
          Purchase order not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-3xl bg-gradient-hero p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black">{data.purchaseNo}</h1>
            <p className="mt-1 text-sm text-white/75">
              {data.mode?.replace("_", " ")} · {date(data.purchaseDate)}
            </p>
          </div>

          <Link
            href="/shopowner/purchase/list"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-bold text-slate-400">Supplier</p>
            <p className="font-black">
              {data.mode === "MULTI_SUPPLIER"
                ? "Multiple Supplier"
                : data.supplierId?.vendorName || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Invoice No</p>
            <p className="font-black">{data.invoiceNo || "-"}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Invoice Date</p>
            <p className="font-black">{date(data.invoiceDate)}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Pay Mode</p>
            <p className="font-black">{data.payMode || "-"}</p>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-3 py-3">S.No</th>

              {data.mode === "MULTI_SUPPLIER" ? (
                <th className="px-3 py-3">Supplier</th>
              ) : null}

              <th className="px-3 py-3">Item Code</th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Batch</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Purchase Price</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Tax</th>
              <th className="px-3 py-3">After Tax</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {(data.items || []).map((item, index) => (
              <tr key={item._id} className="border-b">
                <td className="px-3 py-3">{index + 1}</td>

                {data.mode === "MULTI_SUPPLIER" ? (
                  <td className="px-3 py-3">
                    {item.supplierId?.vendorName || "-"}
                  </td>
                ) : null}

                <td className="px-3 py-3">{item.itemCode || "-"}</td>
                <td className="px-3 py-3 font-bold">{item.productName || "-"}</td>
                <td className="px-3 py-3">{item.batch || "-"}</td>
                <td className="px-3 py-3">{item.qty || 0}</td>
                <td className="px-3 py-3">{money(item.purchasePrice)}</td>
                <td className="px-3 py-3">{money(item.discount?.amount)}</td>
                <td className="px-3 py-3">
                  {item.tax?.label || "None"} ({item.tax?.percent || 0}%)
                </td>
                <td className="px-3 py-3">{money(item.purchaseAfterTax)}</td>
                <td className="px-3 py-3 text-right font-black">
                  {money(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ml-auto max-w-lg rounded-2xl border bg-white p-4 shadow-sm">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <b>{money(data.subtotal)}</b>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <b>{money(data.taxAmount)}</b>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <b>{money(data.discountAmount)}</b>
          </div>
          <div className="mt-3 rounded-xl bg-blue-50 p-4 text-right">
            <p className="text-xs font-black text-primary">Net Amount</p>
            <p className="text-2xl font-black text-primary">
              {money(data.netAmount)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}