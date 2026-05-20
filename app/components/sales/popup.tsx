// app/components/sales/popup.tsx

"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  CreditCard,
  Edit3,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import { money, toNumber } from "./shared";

export type PosPaymentMethod = "CASH" | "CARD" | "UPI" | "CREDIT" | "PAYNOW" | "CREDIT_CARD";

export type SplitPaymentRow = {
  id: string;
  method: PosPaymentMethod;
  amount: string;
  refNo: string;
};

export type HoldBillRecord = {
  id: string;
  name: string;
  customerName: string;
  itemCount: number;
  total: number;
  createdAt: string;
  payload: unknown;
};

export type SalesHistoryRecord = {
  _id: string;
  invoiceNo?: string;
  orderNo?: string;
  createdAt?: string;
  customerNameSnapshot?: string;
  grandTotal?: number;
  payment?: { method?: string };
};

function makeSplitRow(amount = "0"): SplitPaymentRow {
  return {
    id: crypto.randomUUID(),
    method: "CASH",
    amount,
    refNo: "",
  };
}

function paymentBadgeClass(method?: string) {
  const value = String(method || "CASH").toUpperCase();

  if (value.includes("CREDIT")) {
    return "border-orange-300 bg-orange-50 text-orange-700";
  }

  if (value.includes("CASH")) {
    return "border-green-300 bg-green-50 text-green-700";
  }

  return "border-blue-300 bg-blue-50 text-blue-700";
}

type PopupShellProps = {
  title: string;
  widthClass?: string;
  children: React.ReactNode;
  onClose: () => void;
};

function PopupShell({ title, widthClass = "max-w-5xl", children, onClose }: PopupShellProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/45 p-3 md:p-6">
      <div className={`mt-3 w-full ${widthClass} overflow-hidden rounded-md bg-white shadow-2xl`}>
        <div className="flex items-center justify-between bg-[#00008b] px-4 py-3 text-white">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Clock3 className="h-5 w-5" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition hover:bg-white/15"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function HoldBillNamePopup({
  customerName,
  itemCount,
  onCancel,
  onSave,
}: {
  customerName: string;
  itemCount: number;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <PopupShell title="Hold Bill" widthClass="max-w-xl" onClose={onCancel}>
      <form
        className="space-y-5 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name.trim() || `Hold Bill ${new Date().toLocaleTimeString("en-IN")}`);
        }}
      >
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Customer: <b>{customerName || "Walk-in Customer"}</b>
          </p>
          <p>
            Items in Cart: <b>{itemCount}</b>
          </p>
        </div>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Bill Name"
          autoFocus
          className="h-12 w-full rounded-md border border-slate-300 px-4 text-sm outline-none focus:border-[#00008b]"
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="h-10 rounded-md px-4 text-sm font-bold text-[#00008b] hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" className="h-10 rounded-md bg-[#00008b] px-5 text-sm font-black text-white hover:bg-[#000070]">
            Hold Bill
          </button>
        </div>
      </form>
    </PopupShell>
  );
}

export function HoldBillsPopup({
  bills,
  onClose,
  onRestore,
  onDelete,
}: {
  bills: HoldBillRecord[];
  onClose: () => void;
  onRestore: (bill: HoldBillRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredBills = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return bills;
    return bills.filter((bill) => `${bill.name} ${bill.customerName} ${bill.total}`.toLowerCase().includes(q));
  }, [bills, query]);

  return (
    <PopupShell title="Hold Bills" widthClass="max-w-4xl" onClose={onClose}>
      <div className="p-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Bills"
          className="h-12 w-full rounded-md border border-slate-300 px-4 text-sm outline-none focus:border-[#00008b]"
        />
      </div>
      <div className="max-h-[62vh] overflow-y-auto px-4 pb-4">
        {filteredBills.length ? (
          filteredBills.map((bill) => (
            <div key={bill.id} className="flex items-center justify-between gap-4 border-b border-slate-200 py-4">
              <div>
                <p className="text-base font-black text-slate-900">{bill.name}</p>
                <p className="mt-1 text-sm text-slate-600">Customer: {bill.customerName || "Walk-in Customer"}</p>
                <p className="text-sm text-slate-600">Items: {bill.itemCount} · Total: {money(bill.total)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onRestore(bill)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#00008b] hover:bg-[#00008b]/10" title="Restore bill">
                  <ShoppingCart className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => onDelete(bill.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100" title="Delete bill">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-sm font-semibold text-slate-500">No hold bills found.</div>
        )}
      </div>
      <div className="flex justify-end border-t border-slate-200 p-4">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#00008b]/30 px-5 text-sm font-bold text-[#00008b] hover:bg-[#00008b]/5">
          Close
        </button>
      </div>
    </PopupShell>
  );
}

export function SalesHistoryPopup({
  sales,
  onClose,
  onPrint,
  onEdit,
}: {
  sales: SalesHistoryRecord[];
  onClose: () => void;
  onPrint: (sale: SalesHistoryRecord) => void;
  onEdit?: (sale: SalesHistoryRecord) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sales;
    return sales.filter((sale) => `${sale.invoiceNo || ""} ${sale.orderNo || ""} ${sale.customerNameSnapshot || ""} ${sale.grandTotal || 0}`.toLowerCase().includes(q));
  }, [sales, query]);

  const pageCount = Math.max(Math.ceil(filtered.length / rowsPerPage), 1);
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <PopupShell title="Sales History" widthClass="max-w-6xl" onClose={onClose}>
      <div className="border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by Bill No, Customer Name or Amount..."
            className="h-14 w-full rounded-md border border-slate-300 pl-12 pr-4 text-sm outline-none focus:border-[#00008b]"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-[#00008b] text-white">
            <tr>
              <th className="border-r border-white/25 px-4 py-3 text-center">Bill No</th>
              <th className="border-r border-white/25 px-4 py-3 text-center">Date</th>
              <th className="border-r border-white/25 px-4 py-3 text-center">Customer</th>
              <th className="border-r border-white/25 px-4 py-3 text-center">Payment</th>
              <th className="border-r border-white/25 px-4 py-3 text-center">Total (₹)</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((sale) => {
                const method = String(sale.payment?.method || "CASH").toUpperCase();
                return (
                  <tr key={sale._id} className="border-b border-slate-200">
                    <td className="px-4 py-4 text-center font-bold text-slate-800">{sale.invoiceNo || sale.orderNo || "-"}</td>
                    <td className="px-4 py-4 text-center text-slate-700">{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString("en-IN") : "-"}</td>
                    <td className="px-4 py-4 text-center text-slate-700">{sale.customerNameSnapshot || "Walk-in Customer"}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${paymentBadgeClass(method)}`}>{method}</span>
                    </td>
                    <td className="px-4 py-4 text-center font-black text-blue-700">{toNumber(sale.grandTotal, 0).toFixed(2)}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => onPrint(sale)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" title="Print invoice">
                          <Printer className="h-4 w-4" />
                        </button>
                        {onEdit ? (
                          <button type="button" onClick={() => onEdit(sale)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100" title="Edit bill">
                            <Edit3 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-sm font-semibold text-slate-500">No sales found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-5 border-t border-slate-200 px-4 py-3 text-sm text-slate-700">
        <span>Rows per page: <b>{rowsPerPage}</b></span>
        <span>{filtered.length ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length}</span>
        <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(p - 1, 1))} className="text-2xl font-black disabled:opacity-30">‹</button>
        <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(p + 1, pageCount))} className="text-2xl font-black disabled:opacity-30">›</button>
      </div>
      <div className="flex justify-end bg-slate-50 p-4">
        <button type="button" onClick={onClose} className="h-10 rounded-md border border-[#00008b]/30 px-5 text-sm font-bold text-[#00008b] hover:bg-[#00008b]/5">Close</button>
      </div>
    </PopupShell>
  );
}

export function SplitPaymentPopup({
  totalAmount,
  onCancel,
  onSave,
}: {
  totalAmount: number;
  onCancel: () => void;
  onSave: (rows: SplitPaymentRow[]) => void;
}) {
  const [rows, setRows] = useState<SplitPaymentRow[]>([makeSplitRow(totalAmount.toFixed(2))]);
  const totalEntered = useMemo(() => rows.reduce((sum, row) => sum + toNumber(row.amount, 0), 0), [rows]);
  const balance = Number((totalAmount - totalEntered).toFixed(2));

  function updateRow(id: string, patch: Partial<SplitPaymentRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  return (
    <PopupShell title="Split Bill Payment (F2)" widthClass="max-w-5xl" onClose={onCancel}>
      <div className="space-y-4 p-4">
        <div>
          <p className="text-2xl font-black text-blue-700">TOTAL BILL AMOUNT: {money(totalAmount)}</p>
          <p className={`mt-2 text-2xl font-black ${balance === 0 ? "text-green-700" : "text-orange-600"}`}>
            {balance === 0 ? "BALANCE TO PAY: ₹0.00" : `BALANCE TO PAY: ${money(Math.max(balance, 0))}`}
          </p>
        </div>

        <div className="overflow-hidden rounded-md border border-slate-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100 text-slate-800">
              <tr>
                <th className="px-4 py-3 text-left">Payment Mode</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Ref No / Remarks</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-2">
                    <select value={row.method} onChange={(event) => updateRow(row.id, { method: event.target.value as PosPaymentMethod })} className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-[#00008b]">
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min={0} step="0.01" value={row.amount} onChange={(event) => updateRow(row.id, { amount: event.target.value })} className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-[#00008b]" />
                  </td>
                  <td className="px-4 py-2">
                    <input value={row.refNo} onChange={(event) => updateRow(row.id, { refNo: event.target.value })} placeholder="Ref No / Remarks" className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-[#00008b]" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button type="button" onClick={() => setRows((current) => current.length === 1 ? [makeSplitRow(totalAmount.toFixed(2))] : current.filter((item) => item.id !== row.id))} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-red-600 hover:bg-red-50">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={() => setRows((current) => [...current, makeSplitRow(Math.max(totalAmount - totalEntered, 0).toFixed(2))])} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#00008b] px-5 text-sm font-black text-white hover:bg-[#000070]">
          <Plus className="h-4 w-4" /> Add Payment Mode
        </button>

        <div className="font-black text-slate-900">Total Entered: {money(totalEntered)}</div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className={`inline-flex rounded-md border px-5 py-3 text-xl font-black ${balance === 0 ? "border-green-300 bg-green-50 text-green-700" : "border-orange-300 bg-orange-50 text-orange-600"}`}>
            {balance === 0 ? "Ready to save" : balance > 0 ? `Short by ${money(balance)}` : `Return ${money(Math.abs(balance))}`}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="h-11 rounded-md px-5 text-sm font-bold text-[#00008b] hover:bg-slate-100">Cancel</button>
          <button type="button" disabled={Math.abs(balance) > 0.01} onClick={() => onSave(rows)} className="h-11 rounded-md bg-green-700 px-6 text-sm font-black text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50">
            SAVE & PRINT
          </button>
        </div>
      </div>
    </PopupShell>
  );
}
