"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Printer, ReceiptText, X } from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type SalesReturnRecord,
  formatDate,
  getCustomerName,
  getStatusLabel,
  money,
  round,
  toNumber,
} from "../sales/shared";

type SalesReturnViewModalProps = {
  open: boolean;
  returnId: string;
  shopId: string;
  onClose: () => void;
};

function StatusPill({ label, variant }: { label: string; variant: "blue" | "green" | "amber" | "slate" }) {
  const cls = {
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    slate: "bg-slate-400 text-white",
  }[variant];

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function getStatusVariant(status?: string): "blue" | "green" | "amber" | "slate" {
  const s = String(status || "").toUpperCase();
  if (s === "RETURNED" || s === "COMPLETED") return "green";
  if (s === "PENDING") return "amber";
  if (s === "REFUNDED") return "blue";
  return "slate";
}

function getPaymentStatusVariant(status?: string): "blue" | "green" | "amber" | "slate" {
  const s = String(status || "").toUpperCase();
  if (s === "REFUNDED" || s === "PAID") return "blue";
  if (s === "PENDING") return "amber";
  return "slate";
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function SalesReturnViewModal({
  open,
  returnId,
  shopId,
  onClose,
}: SalesReturnViewModalProps) {
  const { accessToken } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [record, setRecord] = useState<SalesReturnRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !returnId || !shopId || !accessToken) {
      setRecord(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function fetchReturn() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${baseURL}${SummaryApi.sales_return_detail.url(shopId, returnId)}`,
          {
            method: SummaryApi.sales_return_detail.method,
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
          .catch(() => ({}))) as ApiResponse<SalesReturnRecord>;

        if (cancelled) return;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Failed to load return details");
        }

        setRecord(result.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load return details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchReturn();
    return () => { cancelled = true; };
  }, [open, returnId, shopId, accessToken]);

  function handlePrint() {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank", "width=700,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return Receipt - ${record?.returnNo || returnId}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 24px; }
            h2 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
            .sub { font-size: 11px; color: #64748b; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
            .field label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; display: block; }
            .field span { font-size: 13px; font-weight: 600; }
            .pill { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #2563eb; color: #fff; }
            .pill.green { background: #16a34a; }
            .pill.amber { background: #d97706; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #1e3a8a; color: #fff; font-size: 11px; text-transform: uppercase; padding: 8px 10px; text-align: left; }
            th:last-child { text-align: right; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            td:last-child { text-align: right; font-weight: 600; }
            .totals { margin-top: 8px; display: flex; justify-content: flex-end; }
            .totals-inner { width: 220px; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
            .total-row.grand { border-top: 2px solid #1e3a8a; margin-top: 4px; font-weight: 800; font-size: 14px; padding-top: 8px; }
            .disclaimer { margin-top: 20px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }

  if (!open) return null;

  const subtotal = round(
    (record?.items || []).reduce((sum, item) => sum + toNumber(item.returnTotal, 0), 0)
  );

  const paymentStatus = (record as (SalesReturnRecord & { paymentStatus?: string }) | null)?.paymentStatus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-[#00008b]" />
            <h2 className="text-lg font-black text-slate-900">Return Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-3 text-sm font-semibold">Loading…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
              {error}
            </div>
          ) : record ? (
            <div ref={printRef}>
              <h2 className="text-xl font-black text-slate-900">
                Return Receipt
              </h2>
              <p className="sub text-xs text-slate-500">
                {record.returnNo || returnId} · {formatDate(record.returnDate || record.createdAt)}
              </p>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-5">
                <MetaField label="Return Number">
                  <span className="text-sm font-semibold text-slate-900">
                    {record.returnNo || "-"}
                  </span>
                </MetaField>
                <MetaField label="Original Order">
                  <span className="text-sm font-semibold text-slate-900">
                    {record.orderNo ||
                      (typeof record.orderId === "object" && record.orderId?.orderNo) ||
                      "-"}
                  </span>
                </MetaField>
                <MetaField label="Return Date">
                  <span className="text-sm font-semibold text-slate-900">
                    {formatDate(record.returnDate || record.createdAt)}
                  </span>
                </MetaField>
                <MetaField label="Customer">
                  <span className="text-sm font-semibold text-slate-900">
                    {record.customerNameSnapshot ||
                      getCustomerName(record.customerId ?? null)}
                  </span>
                </MetaField>
                <MetaField label="Status">
                  <StatusPill
                    label={getStatusLabel(record.status)}
                    variant={getStatusVariant(record.status)}
                  />
                </MetaField>
                {paymentStatus && (
                  <MetaField label="Payment Status">
                    <StatusPill
                      label={paymentStatus}
                      variant={getPaymentStatusVariant(paymentStatus)}
                    />
                  </MetaField>
                )}
              </div>

              {/* Items */}
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                  Returned Items
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: "#00008b" }}>
                      <tr className="text-left text-white">
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 text-center font-semibold">Quantity</th>
                        <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(record.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                            No items
                          </td>
                        </tr>
                      ) : (
                        (record.items || []).map((item, idx) => (
                          <tr
                            key={item._id || idx}
                            className={`border-t border-slate-100 ${idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}
                          >
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">
                                {item.productName || "Product"}
                              </p>
                              {item.itemCode && (
                                <p className="text-xs text-slate-400">{item.itemCode}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-900">
                              {item.returnQty ?? 0}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {money(item.unitPrice)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {money(item.returnTotal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-3 flex justify-end">
                  <div className="w-52 space-y-1">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold">{money(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
                      <span>Total</span>
                      <span className="text-base">{money(record.totalReturnAmount ?? subtotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {record.notes && (
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">{record.notes}</p>
                </div>
              )}

              {/* Reason */}
              {record.reason && (
                <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Return Reason</p>
                  <p className="mt-1 text-sm text-slate-700">{record.reason}</p>
                </div>
              )}

              <p className="disclaimer mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
                This receipt confirms that the above items have been returned and
                processed. Refund will be issued as per store policy.
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          {record && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#00008b" }}
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
