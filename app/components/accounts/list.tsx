"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type PartyAccountItem = {
  _id: string;
  partyType?: string;
  partyName?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  currentBalance?: number;
  balanceType?: string;
  creditLimit?: number;
  createdAt?: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  count?: number;
  data?: PartyAccountItem[];
};

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

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export default function PartyAccountListPage() {
  const { accessToken } = useAuth();
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [accounts, setAccounts] = useState<PartyAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const syncSelectedShop = useCallback(() => {
    const shop = readSelectedShop();
    setSelectedShopId(shop.id);
    setSelectedShopName(shop.name);
  }, []);

  const fetchAccounts = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId) {
        setAccounts([]);
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

        const endpoint = SummaryApi.party_account_list.url(selectedShopId, search);

        const response = await fetch(`${baseURL}${endpoint}`, {
          method: SummaryApi.party_account_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const result = (await response.json().catch(() => ({}))) as ApiResponse;

        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          throw new Error(result.message || "Unable to load accounts");
        }

        setAccounts(result.data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load party accounts"
        );
        setAccounts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShopId, search]
  );

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
    void fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = accounts.filter((account) => {
    const query = normalizeText(search);
    if (!query) return true;

    return [
      account.partyName,
      account.partyType,
      account.mobile,
      account.email,
      account.gstNumber,
      account.balanceType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-30" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.21em] text-white/95">
                <Search className="h-3.5 w-3.5" />
                Party Accounts
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Shop Account Ledger
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Manage all party accounts for the selected shop location.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/shopowner/accounts/create"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <Plus className="h-4 w-4" />
                New Account
              </Link>
              <button
                type="button"
                onClick={() => void fetchAccounts(true)}
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
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Selected Location</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {selectedShopName || "No location selected"}
              </p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="Search party name, type, mobile"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No party accounts found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <table className="min-w-full border-collapse text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Mobile</th>
                    <th className="px-4 py-4">Balance</th>
                    <th className="px-4 py-4">Credit Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account._id} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-900">{account.partyName || "-"}</td>
                      <td className="px-4 py-4">{account.partyType || "-"}</td>
                      <td className="px-4 py-4">{account.mobile || "-"}</td>
                      <td className="px-4 py-4">{account.currentBalance?.toFixed(2) ?? "0.00"} {account.balanceType ? `(${account.balanceType})` : ""}</td>
                      <td className="px-4 py-4">{account.creditLimit?.toFixed(2) ?? "0.00"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
