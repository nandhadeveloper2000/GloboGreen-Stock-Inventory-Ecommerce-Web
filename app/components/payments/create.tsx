"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  Receipt,
  RotateCcw,
  Save,
  Store,
  Tag,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  TopLabelInput,
  TopLabelNativeSelect,
} from "@/components/ui/top-label-fields";
import {
  PARTY_TYPE_OPTIONS,
  PAYMENT_FOR_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  type PartyType,
  type PaymentFor,
  type PaymentMode,
  type PaymentStatus,
  formatMoney,
  formatPartyTypeLabel,
  formatPaymentForLabel,
  formatPaymentModeLabel,
  formatPaymentStatusLabel,
  readSelectedShop,
  todayInputValue,
} from "./shared";

type PaymentCreateResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

type PaymentFormState = {
  paymentFor: PaymentFor;
  partyType: PartyType;
  partyName: string;
  amount: string;
  mode: PaymentMode;
  status: PaymentStatus;
  referenceNo: string;
  paymentDate: string;
  notes: string;
};

function buildInitialForm(): PaymentFormState {
  return {
    paymentFor: "SALE",
    partyType: "CUSTOMER",
    partyName: "",
    amount: "",
    mode: "CASH",
    status: "COMPLETED",
    referenceNo: "",
    paymentDate: todayInputValue(),
    notes: "",
  };
}

export default function CreatePaymentPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [selectedShop, setSelectedShop] = useState(readSelectedShop());
  const [form, setForm] = useState<PaymentFormState>(buildInitialForm);
  const [submitting, setSubmitting] = useState(false);

  const syncSelectedShop = useCallback(() => {
    setSelectedShop(readSelectedShop());
  }, []);

  useEffect(() => {
    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  const amountPreview = useMemo(() => {
    const amount = Number(form.amount || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }, [form.amount]);

  function updateForm<K extends keyof PaymentFormState>(
    key: K,
    value: PaymentFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setForm(buildInitialForm());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    if (!selectedShop.id) {
      toast.error("Select a shop first");
      return;
    }

    const amount = Number(form.amount || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (!form.paymentDate) {
      toast.error("Please choose the payment date");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${baseURL}${SummaryApi.payment_create.url}`, {
        method: SummaryApi.payment_create.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          shopId: selectedShop.id,
          paymentFor: form.paymentFor,
          partyType: form.partyType,
          partyName: form.partyName.trim(),
          amount,
          mode: form.mode,
          status: form.status,
          referenceNo: form.referenceNo.trim(),
          paymentDate: form.paymentDate,
          notes: form.notes.trim(),
        }),
      });

      const result =
        (await response.json().catch(() => ({}))) as PaymentCreateResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to record payment");
      }

      toast.success(result.message || "Payment recorded successfully");
      router.push("/shopowner/payments/list");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to record payment"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <section className="rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/10 bg-[#00008b]/5 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#00008b]">
                <Receipt className="h-3.5 w-3.5" />
                Payment Entry
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                Record Payment
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Add a payment with a cleaner finance layout, clear party
                details, and a quick payment summary before saving.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => router.push("/shopowner/payments/list")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#00008b]/20 bg-[#00008b]/5 px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:bg-[#00008b]/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Form
              </button>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:px-6">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Selected Shop
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
                  <Store className="h-4 w-4 text-[#00008b]" />
                  {selectedShop.name || "No shop selected"}
                </div>
                {!selectedShop.id ? (
                  <p className="mt-2 text-sm font-semibold text-rose-600">
                    Please select a shop before recording a payment.
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Payment Preview
                </p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                  {formatMoney(amountPreview)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {formatPaymentForLabel(form.paymentFor)}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {formatPaymentModeLabel(form.mode)}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {formatPaymentStatusLabel(form.status)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_390px]">
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-extrabold text-slate-950">
                  Payment Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Capture who the payment belongs to, what it is for, and the
                  amount being recorded.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TopLabelNativeSelect
                  label="Payment For"
                  value={form.paymentFor}
                  onChange={(event) =>
                    updateForm("paymentFor", event.target.value as PaymentFor)
                  }
                  icon={Tag}
                  required
                >
                  {PAYMENT_FOR_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {formatPaymentForLabel(value)}
                    </option>
                  ))}
                </TopLabelNativeSelect>

                <TopLabelNativeSelect
                  label="Party Type"
                  value={form.partyType}
                  onChange={(event) =>
                    updateForm("partyType", event.target.value as PartyType)
                  }
                  icon={UserRound}
                  required
                >
                  {PARTY_TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {formatPartyTypeLabel(value)}
                    </option>
                  ))}
                </TopLabelNativeSelect>

                <TopLabelInput
                  label="Party Name"
                  value={form.partyName}
                  onChange={(event) => updateForm("partyName", event.target.value)}
                  placeholder="Customer / vendor / other party"
                  icon={UserRound}
                />

                <TopLabelInput
                  label="Amount"
                  value={form.amount}
                  onChange={(event) => updateForm("amount", event.target.value)}
                  placeholder="0.00"
                  type="number"
                  icon={Wallet}
                  required
                />
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-extrabold text-slate-950">
                  Transaction Setup
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set the mode, status, transaction date, and the reference
                  details you want to keep with the payment.
                </p>
              </div>

              <div className="space-y-4">
                <TopLabelNativeSelect
                  label="Payment Mode"
                  value={form.mode}
                  onChange={(event) =>
                    updateForm("mode", event.target.value as PaymentMode)
                  }
                  icon={CreditCard}
                  required
                >
                  {PAYMENT_MODE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {formatPaymentModeLabel(value)}
                    </option>
                  ))}
                </TopLabelNativeSelect>

                <TopLabelNativeSelect
                  label="Status"
                  value={form.status}
                  onChange={(event) =>
                    updateForm("status", event.target.value as PaymentStatus)
                  }
                  icon={Receipt}
                  required
                >
                  {PAYMENT_STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {formatPaymentStatusLabel(value)}
                    </option>
                  ))}
                </TopLabelNativeSelect>

                <TopLabelInput
                  label="Reference No."
                  value={form.referenceNo}
                  onChange={(event) =>
                    updateForm("referenceNo", event.target.value)
                  }
                  placeholder="Optional transaction reference"
                  icon={FileText}
                />

                <TopLabelInput
                  label="Payment Date"
                  value={form.paymentDate}
                  onChange={(event) =>
                    updateForm("paymentDate", event.target.value)
                  }
                  placeholder="Choose payment date"
                  type="date"
                  icon={CalendarDays}
                  required
                />

                <div className="space-y-1.5">
                  <div className="relative">
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      placeholder="Optional notes about this payment"
                      rows={5}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-7 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/50 focus:ring-4 focus:ring-[#00008b]/10"
                    />
                    <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500">
                      Notes
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Quick Notes
                  </p>
                  <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-600">
                    <li>- Amount must be greater than zero before saving.</li>
                    <li>- Reference number is optional for cash payments.</li>
                    <li>
                      - Split mode can be selected now and extended with a full
                      breakdown later.
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => router.push("/shopowner/payments/list")}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !selectedShop.id}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-5 text-sm font-extrabold text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitting ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
