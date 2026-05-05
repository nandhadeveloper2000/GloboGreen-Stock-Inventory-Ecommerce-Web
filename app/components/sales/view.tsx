"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  Printer,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type SalesOrderRecord,
  buildSalesInvoicePdf,
  formatDate,
  getCustomerName,
  getStatusLabel,
  money,
  readSelectedShop,
  RETURN_REASON_OPTIONS,
  sanitizeFileName,
  todayInput,
} from "./shared";

type ReturnQtyMap = Record<string, string>;

export default function SalesViewPage({
  id,
  autoPrint = false,
}: {
  id: string;
  autoPrint?: boolean;
}) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const hasAutoPrintedRef = useRef(false);

  const [shopId, setShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [data, setData] = useState<SalesOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnDate, setReturnDate] = useState(todayInput());
  const [returnReason, setReturnReason] = useState<string>(
    RETURN_REASON_OPTIONS[0]
  );
  const [returnNotes, setReturnNotes] = useState("");
  const [returnQty, setReturnQty] = useState<ReturnQtyMap>({});
  const [savingReturn, setSavingReturn] = useState(false);

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
  }, []);

  useEffect(() => {
    if (!accessToken || !id) {
      setLoading(false);
      return;
    }

    async function loadOrder() {
      try {
        setLoading(true);

        const response = await fetch(`${baseURL}${SummaryApi.sales_detail.url(id)}`, {
          method: SummaryApi.sales_detail.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const result = (await response
          .json()
          .catch(() => ({}))) as ApiResponse<SalesOrderRecord>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Failed to load sales order");
        }

        setData(result.data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load sales order"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOrder();
  }, [accessToken, id]);

  const totals = useMemo(() => {
    return {
      subtotal: Number(data?.subtotal || 0),
      tax: Number(data?.taxAmount || 0),
      discount: Number(data?.discount || 0),
      netAmount: Number(data?.grandTotal || 0),
    };
  }, [data]);

  function resetReturnForm() {
    setReturnDate(todayInput());
    setReturnReason(RETURN_REASON_OPTIONS[0]);
    setReturnNotes("");
    setReturnQty({});
  }

  async function handleDownloadInvoice() {
    if (!data) return;

    try {
      setDownloading(true);
      const pdfBlob = buildSalesInvoicePdf(data, selectedShopName);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Sales-Invoice-${sanitizeFileName(
        data.invoiceNo || data.invoiceId?.invoiceNo || data.orderNo
      )}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function handlePrintInvoice() {
    if (!data) return;

    try {
      setPrinting(true);
      const pdfBlob = buildSalesInvoicePdf(data, selectedShopName);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } finally {
      setPrinting(false);
    }
  }

  const autoPrintInvoice = useEffectEvent(async () => {
    await handlePrintInvoice();
  });

  useEffect(() => {
    if (!autoPrint || !data || hasAutoPrintedRef.current) {
      return;
    }

    hasAutoPrintedRef.current = true;
    void autoPrintInvoice();
  }, [autoPrint, data]);

  async function handleCreateReturn() {
    if (!accessToken || !shopId || !data) {
      toast.error("Missing sales context for return");
      return;
    }

    const items = (data.items || [])
      .map((item) => ({
        orderItemId: String(item._id || ""),
        returnQty: Number(returnQty[String(item._id || "")] || 0),
      }))
      .filter((item) => item.orderItemId && item.returnQty > 0);

    if (!items.length) {
      toast.error("Enter at least one return quantity");
      return;
    }

    try {
      setSavingReturn(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.sales_return_create.url(shopId)}`,
        {
          method: SummaryApi.sales_return_create.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            orderId: data._id,
            returnDate,
            reason: returnReason,
            notes: returnNotes,
            items,
          }),
        }
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<{ _id?: string; returnNo?: string }>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to process sales return");
      }

      toast.success(result.message || "Sales return created successfully");
      setShowReturnModal(false);
      resetReturnForm();
      router.push("/shopowner/salesreturn/list");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process sales return"
      );
    } finally {
      setSavingReturn(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00008b]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <div className="rounded-md border bg-white p-6 text-center text-slate-500">
          Sales order not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-[28px] bg-[#0f2f7c] p-5 text-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">
              {data.invoiceNo || data.invoiceId?.invoiceNo || data.orderNo}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {getCustomerName(data.customerId || null)} - {formatDate(data.createdAt, "long")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetReturnForm();
                setShowReturnModal(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
              Create Return
            </button>

            <button
              type="button"
              onClick={() => void handlePrintInvoice()}
              disabled={printing || downloading}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {printing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Print Invoice
            </button>

            <button
              type="button"
              onClick={() => void handleDownloadInvoice()}
              disabled={printing || downloading}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#0f2f7c] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </button>

            <Link
              href="/shopowner/sales/list"
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/40 px-4 text-sm font-black text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="text-xs font-bold text-slate-400">Customer</p>
            <p className="font-black text-slate-950">
              {getCustomerName(data.customerId || null)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {data.customerId?.mobile || data.customerMobileSnapshot || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Invoice No</p>
            <p className="font-black text-slate-950">
              {data.invoiceNo || data.invoiceId?.invoiceNo || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Payment</p>
            <p className="font-black text-slate-950">
              {String(data.payment?.method || "-").replace(/_/g, " ")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {data.payment?.salesmanName || "No salesman"}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Status</p>
            <p className="font-black text-emerald-700">{getStatusLabel(data.status)}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Due Balance</p>
            <p className="font-black text-rose-600">
              {money(data.customerId?.dueBalance || 0)}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-[#0f2f7c] text-white">
            <tr>
              <th className="px-3 py-3">S.No</th>
              <th className="px-3 py-3">Item Code</th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Batch</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">UOM</th>
              <th className="px-3 py-3">MRP</th>
              <th className="px-3 py-3">Sale Rate</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Tax</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {(data.items || []).map((item, index) => (
              <tr key={item._id || `${item.itemCode}-${index}`} className="border-b border-slate-100">
                <td className="px-3 py-3">{index + 1}</td>
                <td className="px-3 py-3">{item.itemCode || "-"}</td>
                <td className="px-3 py-3 font-bold text-slate-950">{item.name || "-"}</td>
                <td className="px-3 py-3">{item.batch || "-"}</td>
                <td className="px-3 py-3">{item.qty || 0}</td>
                <td className="px-3 py-3">{item.unit || "Pcs"}</td>
                <td className="px-3 py-3">{money(item.mrp)}</td>
                <td className="px-3 py-3">{money(item.price)}</td>
                <td className="px-3 py-3">{money(item.discountAmount)}</td>
                <td className="px-3 py-3">
                  {item.taxPercent || 0}% / {money(item.taxAmount)}
                </td>
                <td className="px-3 py-3 text-right font-black text-slate-950">
                  {money(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ml-auto max-w-lg rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <b>{money(totals.subtotal)}</b>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <b>{money(totals.tax)}</b>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <b>{money(totals.discount)}</b>
          </div>
          <div className="mt-3 rounded-2xl bg-[#e8f0fb] p-4 text-right">
            <p className="text-xs font-black text-[#0f2f7c]">Net Amount</p>
            <p className="text-2xl font-black text-[#0f2f7c]">
              {money(totals.netAmount)}
            </p>
          </div>
        </div>
      </section>

      {showReturnModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Create Sales Return</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select returned quantities for this sale and post them back to stock.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowReturnModal(false);
                  resetReturnForm();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                x
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Return Date
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(event) => setReturnDate(event.target.value)}
                  className="premium-input h-12"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason
                </label>
                <select
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  className="premium-select h-12"
                >
                  {RETURN_REASON_OPTIONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Sold Qty</th>
                    <th className="px-3 py-2 text-left">Return Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items || []).map((item) => (
                    <tr
                      key={item._id || item.itemCode}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.name || "-"}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.itemCode || "-"}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">{item.qty || 0}</td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          max={item.qty || 0}
                          value={returnQty[String(item._id || "")] || ""}
                          onChange={(event) =>
                            setReturnQty((current) => ({
                              ...current,
                              [String(item._id || "")]: event.target.value,
                            }))
                          }
                          className="premium-input h-10 w-[120px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Notes
              </label>
              <textarea
                value={returnNotes}
                onChange={(event) => setReturnNotes(event.target.value)}
                className="premium-input min-h-[92px] resize-y py-3"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReturnModal(false);
                  resetReturnForm();
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleCreateReturn()}
                disabled={savingReturn}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2e7d32] px-5 text-sm font-semibold text-white transition hover:bg-[#25682a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingReturn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Process Return"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
