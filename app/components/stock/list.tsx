"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Loader2,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function normalizeShopType(value?: string | null) {
  const normalized = normalizeValue(value);

  if (normalized === "BRANCH_RETAIL_SHOP" || normalized === "BRANCH") {
    return "RETAIL_BRANCH_SHOP";
  }

  if (normalized === "MAIN") {
    return "WAREHOUSE_RETAIL_SHOP";
  }

  if (normalized === "WHOLESALE") {
    return "WHOLESALE_SHOP";
  }

  return normalized;
}

function normalizeSearchText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "", type: "" };
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
    type: window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "",
  };
}

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

function isStockAllowedShop(shopType?: string | null) {
  const normalized = normalizeShopType(shopType);
  return normalized === "WAREHOUSE_RETAIL_SHOP" || normalized === "WHOLESALE_SHOP";
}

type ShopProductItem = {
  _id: string;
  itemName?: string;
  itemCode?: string;
  itemModelNumber?: string;
  qty?: number;
  lowStockQty?: number;
  sellingPrice?: number;
  createdAt?: string;
  updatedAt?: string;
};

type ShopProductListResponse = {
  success?: boolean;
  message?: string;
  data?: ShopProductItem[];
};

export default function StockListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [rows, setRows] = useState<ShopProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const syncSelectedShop = () => {
      const selectedShop = readSelectedShop();
      setSelectedShopId(selectedShop.id);
      setSelectedShopName(selectedShop.name);
      setSelectedShopType(selectedShop.type);
    };

    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, []);

  const fetchProducts = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!isStockAllowedShop(selectedShopType)) {
        setRows([]);
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
          `${baseURL}${SummaryApi.shop_product_list.url(selectedShopId)}`,
          {
            method: SummaryApi.shop_product_list.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        );

        const result = (await response.json().catch(() => ({}))) as ShopProductListResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load stock list");
        }

        setRows(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        setRows([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load stock list"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShopId, selectedShopType]
  );

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const filteredRows = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return rows;

    return rows.filter((item) => {
      return [
        item.itemName,
        item.itemCode,
        item.itemModelNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [rows, search]);

  const stockSummary = useMemo(() => {
    return filteredRows.reduce(
      (summary, item) => {
        const qty = Number(item.qty || 0);
        const lowStockQty = Number(item.lowStockQty || 0);
        const sellingPrice = Number(item.sellingPrice || 0);

        summary.skuCount += 1;
        summary.totalUnits += qty;
        summary.inventoryValue += qty * sellingPrice;

        if (qty <= lowStockQty) {
          summary.lowStockCount += 1;
        }

        return summary;
      },
      {
        skuCount: 0,
        totalUnits: 0,
        lowStockCount: 0,
        inventoryValue: 0,
      }
    );
  }, [filteredRows]);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-30" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.21em] text-white/95">
                <Store className="h-3.5 w-3.5" />
                Stock Register
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Stock List
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Review current inventory for the selected shop and manage stock transfers.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/shopowner/stock-transfers/list"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Transfer History
              </Link>

              <Link
                href="/shopowner/stock-transfers/create"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                New Stock Transfer
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Selected shop</p>
              <p className="text-lg font-semibold text-slate-900">
                {selectedShopName || "No shop selected"}
              </p>
              {selectedShopType ? (
                <p className="text-sm text-slate-500">{normalizeValue(selectedShopType)}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search className="mr-2 h-4 w-4 text-slate-500" />
                <input
                  className="min-w-0 bg-transparent text-sm text-slate-900 outline-none"
                  placeholder="Search products"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => void fetchProducts(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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

          {selectedShopId && !isStockAllowedShop(selectedShopType) ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
              Stock list is available only for Warehouse Retail Shop or Wholesale Shop.
            </div>
          ) : null}

          {!loading && filteredRows.length > 0 ? (
            <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  SKUs
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {stockSummary.skuCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Units
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {stockSummary.totalUnits}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Low Stock Items
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-900">
                  {stockSummary.lowStockCount}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Inventory Value
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">
                  {money(stockSummary.inventoryValue)}
                </p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
              {errorMessage}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              {selectedShopId
                ? search.trim()
                  ? "No stock items match your search."
                  : "No stock items found for the selected shop."
                : "Select a shop to view stock items."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full border-collapse bg-white text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Product</th>
                    <th className="px-4 py-4">SKU</th>
                    <th className="px-4 py-4">Available Stock</th>
                    <th className="px-4 py-4">Low Stock</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Selling Price</th>
                    <th className="px-4 py-4">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((item) => (
                    <tr key={item._id} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {item.itemName || "Unnamed Product"}
                      </td>
                      <td className="px-4 py-4">{item.itemCode || item.itemModelNumber || "-"}</td>
                      <td className="px-4 py-4">{item.qty ?? 0}</td>
                      <td className="px-4 py-4">{item.lowStockQty ?? 0}</td>
                      <td className="px-4 py-4">
                        {(item.qty ?? 0) <= (item.lowStockQty ?? 0) ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">{money(item.sellingPrice ?? 0)}</td>
                      <td className="px-4 py-4">{formatDate(item.updatedAt)}</td>
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
