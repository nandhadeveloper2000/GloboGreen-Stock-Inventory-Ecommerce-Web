"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  IndianRupee,
  Loader2,
  PackagePlus,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import MyShopProductView from "./view";

type MediaAsset = {
  url?: string;
  publicId?: string;
};

type ProductVariantReference = {
  title?: string;
  images?: MediaAsset[];
};

type ProductReference =
  | string
  | {
      _id?: string;
      itemName?: string;
      itemModelNumber?: string;
      itemKey?: string;
      approvalStatus?: string;
      images?: MediaAsset[];
      variant?: ProductVariantReference[];
    };

type VendorReference =
  | string
  | {
      vendorName?: string;
      name?: string;
      mobile?: string;
      email?: string;
    };

type VariantAttribute = {
  label?: string;
  value?: string;
};

type DiscountValue = {
  rangeDownPercent?: number;
  fromDate?: string | null;
  toDate?: string | null;
};

type ShopProductVariantEntry = {
  variantIndex?: number;
  title?: string;
  attributes?: VariantAttribute[];
  mainUnit?: string;
  qty?: number;
  lowStockQty?: number;
  minQty?: number;
  vendorPrice?: number;
  inputPrice?: number;
  mrpPrice?: number;
  baseRangeDownPercent?: number;
  rangeDownPercent?: number;
  minSellingPrice?: number;
  maxSellingPrice?: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  isActive?: boolean;
  discount?: DiscountValue;
};

type ShopProductItem = {
  _id: string;
  mainUnit?: string;
  qty?: number;
  lowStockQty?: number;
  minQty?: number;
  vendorPrice?: number;
  inputPrice?: number;
  mrpPrice?: number;
  baseRangeDownPercent?: number;
  rangeDownPercent?: number;
  minSellingPrice?: number;
  maxSellingPrice?: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  productId?: ProductReference;
  vendorId?: VendorReference | null;
  variantEntries?: ShopProductVariantEntry[];
  discount?: DiscountValue;
};

type ShopProductListResponse = {
  success?: boolean;
  message?: string;
  data?: ShopProductItem[];
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function isShopProductAllowedShop(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  return (
    normalized === "WAREHOUSE_RETAIL_SHOP" ||
    normalized === "WHOLESALE_SHOP"
  );
}

function getShopProductShopLabel(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  if (normalized === "WHOLESALE_SHOP") return "wholesale shop";
  if (normalized === "WAREHOUSE_RETAIL_SHOP") return "warehouse retail shop";

  return "warehouse retail shop / wholesale shop";
}

function getQtyTitles(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  if (normalized === "WHOLESALE_SHOP") {
    return {
      unit: "Main Unit",
      qty: "Available Stock",
      lowStockQty: "Low Stock",
      minQty: "Bulk Purchase Min",
      fullQty: "Available Stock Quantity",
      fullLowStockQty: "Low Stock Quantity",
      fullMinQty: "Bulk Purchase Quantity Min",
      emptyText: "Start by mapping your first product to this wholesale shop.",
    };
  }

  return {
    unit: "Main Unit",
    qty: "Available Stock",
    lowStockQty: "Low Stock",
    minQty: "Purchase Qty",
    fullQty: "Available Stock Quantity",
    fullLowStockQty: "Low Stock Quantity",
    fullMinQty: "Purchase Quantity",
    emptyText:
      "Start by mapping your first product to this warehouse retail shop.",
  };
}

function toSafeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function clampPercent(value: unknown, fallback = 0) {
  const num = toSafeNumber(value, fallback);
  return Math.min(Math.max(num, 0), 90);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value?: number | null) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
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

function getProductId(item?: ShopProductItem | null) {
  const product = item?.productId;

  if (!product) return "";
  if (typeof product === "string") return product;

  return String(product._id || "");
}

function getProductName(item?: ShopProductItem | null) {
  const product = item?.productId;

  if (!product) return "Unnamed Product";
  if (typeof product === "string") return product;

  return product.itemName || "Unnamed Product";
}

function getProductModel(item?: ShopProductItem | null) {
  const product = item?.productId;

  if (!product || typeof product === "string") return "-";

  return product.itemModelNumber || "-";
}

function getProductKey(item?: ShopProductItem | null) {
  const product = item?.productId;

  if (!product || typeof product === "string") return "-";

  return product.itemKey || "-";
}

function getVendorName(vendor?: VendorReference | null) {
  if (!vendor) return "-";
  if (typeof vendor === "string") return vendor;

  return vendor.vendorName || vendor.name || "-";
}

function getVariantEntries(item?: ShopProductItem | null) {
  return Array.isArray(item?.variantEntries)
    ? item.variantEntries.filter((entry) => entry?.isActive !== false)
    : [];
}

function hasVariantEntries(item?: ShopProductItem | null) {
  return getVariantEntries(item).length > 0;
}

function getVariantCount(item?: ShopProductItem | null) {
  return getVariantEntries(item).length;
}

function getMainUnit(item?: ShopProductItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return String(item?.mainUnit || "Pcs");
  }

  return String(entries[0]?.mainUnit || item?.mainUnit || "Pcs");
}

function getTotalQuantity(item?: ShopProductItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return toSafeNumber(item?.qty, 0);
  }

  return entries.reduce((sum, entry) => sum + toSafeNumber(entry.qty, 0), 0);
}

function getTotalLowStockQuantity(item?: ShopProductItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return toSafeNumber(item?.lowStockQty, 0);
  }

  return entries.reduce(
    (sum, entry) => sum + toSafeNumber(entry.lowStockQty, 0),
    0
  );
}

function getTotalMinQuantity(item?: ShopProductItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return toSafeNumber(item?.minQty, 0);
  }

  return entries.reduce((sum, entry) => sum + toSafeNumber(entry.minQty, 0), 0);
}

function isLowStock(item?: ShopProductItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    const lowStockQty = toSafeNumber(item?.lowStockQty, 0);

    if (lowStockQty <= 0) return false;

    return toSafeNumber(item?.qty, 0) <= lowStockQty;
  }

  return entries.some((entry) => {
    const lowStockQty = toSafeNumber(entry.lowStockQty, 0);

    if (lowStockQty <= 0) return false;

    return toSafeNumber(entry.qty, 0) <= lowStockQty;
  });
}

function getProductImage(item?: ShopProductItem | null) {
  const product = item?.productId;

  if (!product || typeof product === "string") return "";

  const firstVariantIndex = Number(getVariantEntries(item)[0]?.variantIndex ?? 0);

  const selectedVariantImage =
    product.variant?.[firstVariantIndex]?.images?.find((image) =>
      image.url?.trim()
    )?.url || "";

  const anyVariantImage =
    product.variant
      ?.flatMap((variant) => variant.images || [])
      ?.find((image) => image.url?.trim())?.url || "";

  const productImage =
    product.images?.find((image) => image.url?.trim())?.url || "";

  return String(selectedVariantImage || anyVariantImage || productImage).trim();
}

function getCalculatedSellingPrice(
  target?: {
    inputPrice?: number;
    baseRangeDownPercent?: number;
    maxSellingPrice?: number;
    sellingPrice?: number;
  } | null
) {
  const savedSellingPrice = toSafeNumber(target?.sellingPrice, 0);
  const savedMaxSellingPrice = toSafeNumber(target?.maxSellingPrice, 0);

  if (savedSellingPrice > 0) return savedSellingPrice;
  if (savedMaxSellingPrice > 0) return savedMaxSellingPrice;

  const inputPrice = toSafeNumber(target?.inputPrice, 0);
  const marginPercent = clampPercent(target?.baseRangeDownPercent, 0);

  return roundMoney(inputPrice + (inputPrice * marginPercent) / 100);
}

function getCalculatedMinSellingPrice(
  target?: {
    inputPrice?: number;
    baseRangeDownPercent?: number;
    rangeDownPercent?: number;
    minSellingPrice?: number;
    discount?: DiscountValue;
    maxSellingPrice?: number;
    sellingPrice?: number;
  } | null
) {
  const savedMinSellingPrice = toSafeNumber(target?.minSellingPrice, 0);

  if (savedMinSellingPrice > 0) return savedMinSellingPrice;

  const maxSellingPrice = getCalculatedSellingPrice(target);
  const negotiationPercent = clampPercent(
    target?.discount?.rangeDownPercent ?? target?.rangeDownPercent,
    0
  );

  return roundMoney(
    maxSellingPrice - (maxSellingPrice * negotiationPercent) / 100
  );
}

function getInventoryValue(item?: ShopProductItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return getCalculatedSellingPrice(item) * toSafeNumber(item?.qty, 0);
  }

  return entries.reduce(
    (sum, entry) =>
      sum + getCalculatedSellingPrice(entry) * toSafeNumber(entry.qty, 0),
    0
  );
}

function formatCurrencyRange(values: number[]) {
  const validValues = values.filter(
    (value) => Number.isFinite(value) && value >= 0
  );

  if (!validValues.length) return formatCurrency(0);

  const minValue = Math.min(...validValues);
  const maxValue = Math.max(...validValues);

  if (minValue === maxValue) {
    return formatCurrency(minValue);
  }

  return `${formatCurrency(minValue)} - ${formatCurrency(maxValue)}`;
}

function getInputPriceLabel(item?: ShopProductItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return formatCurrency(item?.inputPrice);
  }

  return formatCurrencyRange(
    entries.map((entry) => toSafeNumber(entry.inputPrice, 0))
  );
}

function getSellingPriceLabel(item?: ShopProductItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return formatCurrencyRange([
      getCalculatedMinSellingPrice(item),
      getCalculatedSellingPrice(item),
    ]);
  }

  const values = entries.flatMap((entry) => [
    getCalculatedMinSellingPrice(entry),
    getCalculatedSellingPrice(entry),
  ]);

  return formatCurrencyRange(values);
}

function getVariantSearchText(item?: ShopProductItem | null) {
  return getVariantEntries(item)
    .flatMap((entry) => [
      entry.title,
      entry.mainUnit,
      ...(Array.isArray(entry.attributes)
        ? entry.attributes.flatMap((attribute) => [
            attribute.label,
            attribute.value,
          ])
        : []),
    ])
    .filter(Boolean)
    .join(" ");
}

function getErrorMessage(result: { message?: string } | null, fallback: string) {
  const message = String(result?.message || fallback).trim() || fallback;

  if (
    message.includes("Cannot populate path") &&
    message.includes("productId.productTypeId")
  ) {
    return "Shop product details are temporarily unavailable because product metadata is out of sync. Please reload after updating the server.";
  }

  return message;
}

export default function MyShopProductListPage() {
  const { accessToken, role } = useAuth();

  const currentRole = useMemo(() => normalizeRole(role), [role]);

  const canManage = useMemo(
    () =>
      currentRole === "SHOP_OWNER" ||
      currentRole === "SHOP_MANAGER" ||
      currentRole === "SHOP_SUPERVISOR",
    [currentRole]
  );

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [rows, setRows] = useState<ShopProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState("");
  const [search, setSearch] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewingItem, setViewingItem] = useState<ShopProductItem | null>(null);

  const shopProductAllowedShopSelected = useMemo(
    () => isShopProductAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const selectedShopTypeLabel = useMemo(
    () => getShopProductShopLabel(selectedShopType),
    [selectedShopType]
  );

  const qtyTitles = useMemo(
    () => getQtyTitles(selectedShopType),
    [selectedShopType]
  );

  const syncSelectedShop = useCallback(() => {
    if (typeof window === "undefined") return;

    setSelectedShopId(window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "");
    setSelectedShopName(
      window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || ""
    );
    setSelectedShopType(
      window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || ""
    );
  }, []);

  const fetchShopProducts = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId || !shopProductAllowedShopSelected) {
        setRows([]);
        setErrorMessage("");
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

        const result = (await response
          .json()
          .catch(() => ({}))) as ShopProductListResponse;

        if (!response.ok || !result?.success) {
          throw new Error(
            getErrorMessage(result, "Failed to load my shop products")
          );
        }

        setRows(Array.isArray(result?.data) ? result.data : []);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load my shop products";

        setRows([]);
        setErrorMessage(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShopId, shopProductAllowedShopSelected]
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
    void fetchShopProducts();
  }, [fetchShopProducts]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((item) => {
      if (showLowStockOnly && !isLowStock(item)) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        getProductName(item),
        getProductModel(item),
        getProductKey(item),
        getVendorName(item.vendorId),
        getMainUnit(item),
        getVariantSearchText(item),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, search, showLowStockOnly]);

  const stats = useMemo(() => {
    const totalProducts = rows.length;
    const lowStockCount = rows.filter((item) => isLowStock(item)).length;
    const totalQuantity = rows.reduce(
      (sum, item) => sum + getTotalQuantity(item),
      0
    );
    const inventoryValue = rows.reduce(
      (sum, item) => sum + getInventoryValue(item),
      0
    );

    return {
      totalProducts,
      lowStockCount,
      totalQuantity,
      inventoryValue,
    };
  }, [rows]);

  async function handleDelete(item: ShopProductItem) {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    const productId = getProductId(item);

    if (!productId) {
      toast.error("Unable to resolve product id");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${getProductName(item)} from ${selectedShopName || "this shop"}?`
    );

    if (!confirmed) return;

    try {
      setDeletingProductId(productId);

      const response = await fetch(
        `${baseURL}${SummaryApi.shop_product_delete.url(
          selectedShopId,
          productId
        )}`,
        {
          method: SummaryApi.shop_product_delete.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as ShopProductListResponse;

      if (!response.ok || !result?.success) {
        throw new Error(getErrorMessage(result, "Failed to remove shop product"));
      }

      toast.success(result?.message || "Shop product removed successfully");
      await fetchShopProducts(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to remove shop product";
      toast.error(message);
    } finally {
      setDeletingProductId("");
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                My Shop Product
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                My Shop Products
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
                View and manage products mapped only to your currently selected{" "}
                {selectedShopTypeLabel}.
              </p>

              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-md">
                <Store className="h-4 w-4" />
                <span>{selectedShopName || "No shop selected"}</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                  {selectedShopType || "Unknown shop type"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Products
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {stats.totalProducts}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Low Stock
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {stats.lowStockCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  {qtyTitles.fullQty}
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {stats.totalQuantity}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Inventory Value
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {formatCurrency(stats.inventoryValue)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-card-solid rounded-card p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Selected Shop Inventory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search mapped products, review low stock items, and open full
                pricing details.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search item name, model, key, vendor, unit, variant..."
                  className="premium-input pl-11"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowLowStockOnly((prev) => !prev)}
                className={`inline-flex h-12 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition ${
                  showLowStockOnly
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {showLowStockOnly ? "Showing Low Stock" : "Low Stock Only"}
              </button>

              <button
                type="button"
                onClick={() => void fetchShopProducts(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              {canManage && shopProductAllowedShopSelected ? (
                <Link
                  href="/shopowner/myshoppage/create"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01]"
                >
                  <PackagePlus className="h-4 w-4" />
                  Add Product
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {!selectedShopId ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Store className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-950">
              No shop selected
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Select a shop from the dashboard switcher first, then reopen this
              page to manage its mapped products.
            </p>
          </div>
        ) : !shopProductAllowedShopSelected ? (
          <div className="rounded-[30px] border border-dashed border-amber-300 bg-amber-50 px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-amber-900">
              Warehouse Retail Shop / Wholesale Shop Only
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-amber-800">
              My shop product management is available only when the selected
              shop type is <strong>Warehouse Retail Shop</strong> or{" "}
              <strong>Wholesale Shop</strong>.
            </p>
          </div>
        ) : loading ? (
          <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Loading shop products...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-rose-900">
              Unable to load products
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-rose-700">
              {errorMessage}
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <PackagePlus className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-950">
              No shop products found
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {search.trim() || showLowStockOnly
                ? "Try another search or remove the low stock filter."
                : qtyTitles.emptyText}
            </p>

            {canManage ? (
              <div className="mt-6">
                <Link
                  href="/shopowner/myshoppage/create"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <PackagePlus className="h-4 w-4" />
                  Add Product
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredRows.map((item) => {
              const productId = getProductId(item);
              const previewImage = getProductImage(item);
              const lowStock = isLowStock(item);
              const variantProduct = hasVariantEntries(item);
              const variantCount = getVariantCount(item);
              const mainUnit = getMainUnit(item);
              const totalQuantity = getTotalQuantity(item);
              const totalLowStockQuantity = getTotalLowStockQuantity(item);
              const totalMinQuantity = getTotalMinQuantity(item);
              const inventoryValue = getInventoryValue(item);
              const isDeleting = deletingProductId === productId;
              const editHref = productId
                ? `/shopowner/myshoppage/edit/${productId}`
                : "";

              return (
                <article
                  key={item._id}
                  className="premium-card-solid group overflow-hidden rounded-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100">
                        {previewImage ? (
                          <img
                            src={previewImage}
                            alt={getProductName(item)}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Store className="h-7 w-7 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-xl font-bold tracking-tight text-slate-950">
                            {getProductName(item)}
                          </h3>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                              lowStock
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {lowStock ? "Low Stock" : "In Stock"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            Model: {getProductModel(item)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            Key: {getProductKey(item)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            Unit: {mainUnit}
                          </span>
                          {variantProduct ? (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">
                              Variants: {variantCount}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                            Vendor: {getVendorName(item.vendorId)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingItem(item)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {canManage && editHref ? (
                        <Link
                          href={editHref}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      ) : null}

                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={isDeleting}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Remove"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {qtyTitles.unit}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {mainUnit}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {qtyTitles.qty}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {totalQuantity}
                      </p>
                    </div>

                    <div
                      className={`rounded-[20px] border p-3 ${
                        lowStock
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold ${
                          lowStock ? "text-amber-700" : "text-slate-500"
                        }`}
                      >
                        {qtyTitles.lowStockQty}
                      </p>
                      <p
                        className={`mt-1 text-lg font-bold ${
                          lowStock ? "text-amber-900" : "text-slate-950"
                        }`}
                      >
                        {totalLowStockQuantity}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {qtyTitles.minQty}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {totalMinQuantity}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-[11px] font-semibold text-emerald-700">
                        {variantProduct ? "Selling Range" : "Selling"}
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-900">
                        {getSellingPriceLabel(item)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <IndianRupee className="h-4 w-4 text-slate-400" />
                      Inventory value:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(inventoryValue)}
                      </span>
                    </div>

                    <div className="text-sm text-slate-500">
                      Updated:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatDate(item.updatedAt || item.createdAt)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <MyShopProductView
        open={Boolean(viewingItem)}
        item={viewingItem}
        onClose={() => setViewingItem(null)}
        editHref={
          canManage && viewingItem && getProductId(viewingItem)
            ? `/shopowner/myshoppage/edit/${getProductId(viewingItem)}`
            : undefined
        }
      />
    </div>
  );
}