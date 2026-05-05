"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type FieldErrors = Partial<Record<"partyType" | "partyName" | "mobile" | "email" | "gstNumber" | "balanceType", string>>;

const PARTY_TYPES = ["SUPPLIER", "DEALER", "WHOLESALER", "CUSTOMER"];
const BALANCE_TYPES = ["RECEIVABLE", "PAYABLE", "NONE"];

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "" };
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
  };
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 15);
}

export default function CreatePartyAccountPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [partyType, setPartyType] = useState("SUPPLIER");
  const [partyName, setPartyName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [gstState, setGstState] = useState("");
  const [balanceType, setBalanceType] = useState("NONE");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const syncSelectedShop = useCallback(() => {
    const shop = readSelectedShop();
    setSelectedShopId(shop.id);
    setSelectedShopName(shop.name);
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

  useEffect(() => {
    setLoading(false);
  }, []);

  async function handleSubmit() {
    if (!selectedShopId) {
      toast.error("Please select a shop before saving the account.");
      return;
    }

    const nextErrors: FieldErrors = {};

    if (!partyType) {
      nextErrors.partyType = "Account type is required.";
    }

    if (!partyName.trim()) {
      nextErrors.partyName = "Party name is required.";
    }

    if (mobile && mobile.length < 7) {
      nextErrors.mobile = "Enter a valid mobile number.";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!BALANCE_TYPES.includes(balanceType)) {
      nextErrors.balanceType = "Valid balance type required.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const payload = {
        shopId: selectedShopId,
        partyType,
        partyName,
        mobile,
        email,
        gstNumber,
        balanceType,
        openingBalance,
        creditLimit,
        notes,
      };

      const response = await fetch(`${baseURL}${SummaryApi.party_account_create.url}`, {
        method: SummaryApi.party_account_create.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save account.");
      }

      toast.success("Party account created successfully.");
      router.push("/shopowner/accounts/list");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-30" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.21em] text-white/95">
                <Save className="h-3.5 w-3.5" />
                Add Account
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Create Party Account
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Create a supplier, dealer, wholesaler, or customer account for this shop.
              </p>
            </div>

            <div className="text-sm text-white/85">
              <p>Location: {selectedShopName || "No location selected"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Party Type</label>
              <select
                value={partyType}
                onChange={(event) => setPartyType(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
              >
                {PARTY_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.partyType ? <p className="mt-1 text-xs text-rose-600">{errors.partyType}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Party Name</label>
              <input
                type="text"
                value={partyName}
                onChange={(event) => setPartyName(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="Enter account name"
              />
              {errors.partyName ? <p className="mt-1 text-xs text-rose-600">{errors.partyName}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Mobile</label>
              <input
                type="tel"
                value={mobile}
                onChange={(event) => setMobile(normalizePhone(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="Enter mobile number"
              />
              {errors.mobile ? <p className="mt-1 text-xs text-rose-600">{errors.mobile}</p> : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="Enter email address"
              />
              {errors.email ? <p className="mt-1 text-xs text-rose-600">{errors.email}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">GST Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(event) => setGstNumber(event.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="Enter GST number"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Balance Type</label>
              <select
                value={balanceType}
                onChange={(event) => setBalanceType(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
              >
                {BALANCE_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.balanceType ? <p className="mt-1 text-xs text-rose-600">{errors.balanceType}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Opening Balance</label>
              <input
                type="number"
                min={0}
                value={openingBalance}
                onChange={(event) => setOpeningBalance(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Credit Limit</label>
              <input
                type="number"
                min={0}
                value={creditLimit}
                onChange={(event) => setCreditLimit(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
              placeholder="Optional notes for this account"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={submitting || loading || !selectedShopId}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
