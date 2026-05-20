"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  IndianRupee,
  Loader2,
  Package2,
  Pencil,
  ShieldCheck,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";

type MediaAsset = {
  url?: string;
  publicId?: string;
};

type ProductReference =
  | string
  | {
      _id?: string;
      itemName?: string;
      itemModelNumber?: string;
      itemKey?: string;
      images?: MediaAsset[];
    };

type VendorReference =
  | string
  | {
      vendorName?: string;
      name?: string;
      mobile?: string;
      email?: string;
    };

type DiscountValue = {
  rangeDownPercent?: number;
  fromDate?: string | null;
  toDate?: string | null;
};

type VariantAttribute = {
  label?: string;
  value?: string;
};

type ShopProductVariantEntry = {
  variantIndex?: number;
  title?: string;
  attributes?: VariantAttribute[];
  qty?: number;
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

type ShopProductViewItem = {
  _id?: string;
  qty?: number;
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
  updatedAt?: string;
  createdAt?: string;
  productId?: ProductReference;
  vendorId?: VendorReference | null;
  variantEntries?: ShopProductVariantEntry[];
  discount?: DiscountValue;
};

type ShopProductListResponse = {
  success?: boolean;
  message?: string;
  data?: ShopProductViewItem[];
};

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

function getProductId(item?: ShopProductViewItem | null) {
  const product = item?.productId;

  if (!product) return "";
  if (typeof product === "string") return product;

  return String(product._id || "");
}

function getProductImage(item?: ShopProductViewItem | null) {
  const product = item?.productId;

  if (!product || typeof product === "string") return "";

  return String(
    product.images?.find((image) => image.url?.trim())?.url || ""
  ).trim();
}

function getProductName(item?: ShopProductViewItem | null) {
  const product = item?.productId;

  if (!product) return "Shop Product";
  if (typeof product === "string") return product;

  return product.itemName || "Shop Product";
}

function getProductModel(item?: ShopProductViewItem | null) {
  const product = item?.productId;

  if (!product || typeof product === "string") return "-";

  return product.itemModelNumber || "-";
}

function getProductKey(item?: ShopProductViewItem | null) {
  const product = item?.productId;

  if (!product || typeof product === "string") return "-";

  return product.itemKey || "-";
}

function getVendorName(vendor?: VendorReference | null) {
  if (!vendor) return "-";
  if (typeof vendor === "string") return vendor;

  return vendor.vendorName || vendor.name || "-";
}

function getVariantEntries(item?: ShopProductViewItem | null) {
  return Array.isArray(item?.variantEntries)
    ? item.variantEntries.filter((entry) => entry?.isActive !== false)
    : [];
}

function getVariantCount(item?: ShopProductViewItem | null) {
  return getVariantEntries(item).length;
}

function hasVariantEntries(item?: ShopProductViewItem | null) {
  return getVariantCount(item) > 0;
}

function getTotalQuantity(item?: ShopProductViewItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return Number(item?.qty || 0);
  }

  return entries.reduce((sum, entry) => sum + Number(entry.qty || 0), 0);
}

function getTotalMinQuantity(item?: ShopProductViewItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return Number(item?.minQty || 0);
  }

  return entries.reduce((sum, entry) => sum + Number(entry.minQty || 0), 0);
}

function isLowStock(item?: ShopProductViewItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return Number(item?.qty || 0) <= Number(item?.minQty || 0);
  }

  return entries.some(
    (entry) => Number(entry.qty || 0) <= Number(entry.minQty || 0)
  );
}

function getInventoryValue(item?: ShopProductViewItem | null) {
  const entries = getVariantEntries(item);

  if (!entries.length) {
    return Number(item?.sellingPrice || 0) * Number(item?.qty || 0);
  }

  return entries.reduce(
    (sum, entry) =>
      sum + Number(entry.sellingPrice || 0) * Number(entry.qty || 0),
    0
  );
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

function renderStateMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
      <p className="text-base font-black">{title}</p>
      <p className="mt-1 font-medium">{description}</p>
    </div>
  );
}

export default function MyShopProductViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const productId = String(searchParams.get("id") || "").trim();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [shopReady, setShopReady] = useState(false);
  const [item, setItem] = useState<ShopProductViewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const editHref = useMemo(() => {
    const resolvedId = getProductId(item) || item?._id || productId;

    if (!resolvedId) return "/shopowner/product/list";

    return `/shopowner/product/edit/${encodeURIComponent(resolvedId)}`;
  }, [item, productId]);

  const syncSelectedShop = useCallback(() => {
    if (typeof window === "undefined") return;

    setSelectedShopId(window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "");
    setShopReady(true);
  }, []);

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
    let cancelled = false;

    async function fetchProduct() {
      if (!shopReady) return;

      if (!productId) {
        if (!cancelled) {
          setItem(null);
          setErrorMessage("Shop product id is missing.");
          setLoading(false);
        }
        return;
      }

      if (!accessToken) {
        if (!cancelled) {
          setItem(null);
          setErrorMessage("Authentication token missing.");
          setLoading(false);
        }
        return;
      }

      if (!selectedShopId) {
        if (!cancelled) {
          setItem(null);
          setErrorMessage("Select a shop first to view its product details.");
          setLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setLoading(true);
          setErrorMessage("");
        }

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
            getErrorMessage(result, "Failed to load shop product details")
          );
        }

        const rows = Array.isArray(result?.data) ? result.data : [];
        const matchedItem =
          rows.find(
            (entry) =>
              String(getProductId(entry)) === productId ||
              String(entry?._id || "") === productId
          ) || null;

        if (!cancelled) {
          setItem(matchedItem);

          if (!matchedItem) {
            setErrorMessage(
              "The selected shop product could not be found for the current shop."
            );
          }
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load shop product details";

        if (!cancelled) {
          setItem(null);
          setErrorMessage(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [accessToken, productId, selectedShopId, shopReady]);

  const previewImage = getProductImage(item);
  const productName = getProductName(item);
  const vendorName = getVendorName(item?.vendorId);
  const lowStock = isLowStock(item);
  const variantProduct = hasVariantEntries(item);
  const variantEntries = getVariantEntries(item);
  const totalQuantity = getTotalQuantity(item);
  const totalMinQuantity = getTotalMinQuantity(item);
  const variantCount = getVariantCount(item);
  const inventoryValue = getInventoryValue(item);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push("/shopowner/product/list")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </button>

          {!loading && item ? (
            <Link
              href={editHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#00008b] px-4 text-sm font-semibold text-white transition hover:opacity-95"
            >
              <Pencil className="h-4 w-4" />
              Edit Product
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-card border border-slate-200 bg-white px-6 py-14 shadow-sm">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading shop product details...
              </p>
            </div>
          </div>
        ) : !item ? (
          <div className="space-y-4">
            {renderStateMessage({
              title: "Shop product not found",
              description:
                errorMessage ||
                "The selected shop product could not be loaded for this shop.",
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
            <div className="relative overflow-hidden bg-linear-to-br from-[#060c2c] via-[#0d1433] to-[#00008b] px-5 py-5 md:px-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-pink-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 left-8 h-36 w-36 rounded-full bg-indigo-600/20 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/25 bg-white/10">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package2 className="h-8 w-8 text-white" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      My Shop Product
                    </span>

                    <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                      {productName}
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/85">
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                        Model: {getProductModel(item)}
                      </span>
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                        Key: {getProductKey(item)}
                      </span>
                      {variantProduct ? (
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                          Variants: {variantCount}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 font-semibold ${
                          lowStock
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {lowStock ? "Low Stock" : "Healthy Stock"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/85">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                    Vendor
                  </p>
                  <p className="mt-1 font-bold text-white">{vendorName}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 md:px-6">
              <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Quantity
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-950">
                        {totalQuantity}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        Min Quantity
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-950">
                        {totalMinQuantity}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {variantProduct ? "Variants" : "Warranty"}
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-950">
                        {variantProduct
                          ? variantCount
                          : `${Number(item.warrantyMonths || 0)}m`}
                      </p>
                    </div>
                  </div>

                  {variantProduct ? (
                    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-[0_10px_34px_rgba(15,23,42,0.05)]">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                          <IndianRupee className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-950">
                            Variant Pricing & Stock
                          </h3>
                          <p className="text-sm text-slate-500">
                            Each variant keeps its own stock, pricing, and dates.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {variantEntries.map((entry, index) => {
                          const entryLowStock =
                            Number(entry.qty || 0) <= Number(entry.minQty || 0);

                          return (
                            <div
                              key={`${entry.variantIndex ?? index}-${entry.title || "variant"}`}
                              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <h4 className="text-base font-bold text-slate-950">
                                    {entry.title || `Variant ${index + 1}`}
                                  </h4>

                                  {entry.attributes?.length ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {entry.attributes.map(
                                        (attribute, attributeIndex) => (
                                          <span
                                            key={`${attribute.label}-${attribute.value}-${attributeIndex}`}
                                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                                          >
                                            {attribute.label}: {attribute.value}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  ) : null}
                                </div>

                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                    entryLowStock
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {entryLowStock ? "Low Stock" : "Healthy Stock"}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Qty
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-slate-950">
                                    {Number(entry.qty || 0)}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Min Qty
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-slate-950">
                                    {Number(entry.minQty || 0)}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Warranty
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-slate-950">
                                    {Number(entry.warrantyMonths || 0)}m
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Input Price
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-slate-900">
                                    {formatCurrency(entry.inputPrice)}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    MRP Price
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-slate-900">
                                    {formatCurrency(
                                      entry.mrpPrice ?? entry.maxSellingPrice
                                    )}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Min Selling Price
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-slate-900">
                                    {formatCurrency(entry.minSellingPrice)}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Max Selling Price
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-slate-900">
                                    {formatCurrency(entry.maxSellingPrice)}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-3 sm:col-span-2">
                                  <p className="text-xs font-semibold text-emerald-700">
                                    Final Selling Price
                                  </p>
                                  <p className="mt-1 text-xl font-extrabold text-emerald-900">
                                    {formatCurrency(entry.sellingPrice)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Purchase Date
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-900">
                                    {formatDate(entry.purchaseDate)}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Expiry Date
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-900">
                                    {formatDate(entry.expiryDate)}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Discount From
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-900">
                                    {formatDate(entry.discount?.fromDate)}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                                  <p className="text-xs font-semibold text-slate-500">
                                    Discount To
                                  </p>
                                  <p className="mt-1 font-semibold text-slate-900">
                                    {formatDate(entry.discount?.toDate)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-[0_10px_34px_rgba(15,23,42,0.05)]">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                          <IndianRupee className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-950">
                            Pricing Snapshot
                          </h3>
                          <p className="text-sm text-slate-500">
                            Purchase cost, margin range, and current selling values.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-500">
                            MRP Price
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {formatCurrency(item.mrpPrice ?? item.maxSellingPrice)}
                          </p>
                        </div>

                        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-500">
                            Input Price
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {formatCurrency(item.inputPrice)}
                          </p>
                        </div>

                        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-500">
                            Min Selling Price
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {formatCurrency(item.minSellingPrice)}
                          </p>
                        </div>

                        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-500">
                            Max Selling Price
                          </p>
                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {formatCurrency(item.maxSellingPrice)}
                          </p>
                        </div>

                        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
                          <p className="text-xs font-semibold text-emerald-700">
                            Final Selling Price
                          </p>
                          <p className="mt-2 text-2xl font-extrabold text-emerald-900">
                            {formatCurrency(item.sellingPrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-5">
                  {variantProduct ? (
                    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-[0_10px_34px_rgba(15,23,42,0.05)]">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                          <CalendarDays className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-950">
                            Variant Tracking
                          </h3>
                          <p className="text-sm text-slate-500">
                            Summary for all warehouse variant entries.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="font-medium text-slate-500">
                            Variants
                          </span>
                          <span className="font-semibold text-slate-900">
                            {variantCount}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="font-medium text-slate-500">
                            Total Quantity
                          </span>
                          <span className="font-semibold text-slate-900">
                            {totalQuantity}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="font-medium text-slate-500">
                            Total Min Quantity
                          </span>
                          <span className="font-semibold text-slate-900">
                            {totalMinQuantity}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="font-medium text-slate-500">
                            Inventory Value
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(inventoryValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-[0_10px_34px_rgba(15,23,42,0.05)]">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                          <CalendarDays className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-950">
                            Date Information
                          </h3>
                          <p className="text-sm text-slate-500">
                            Purchase, expiry, and active discount window.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="font-medium text-slate-500">
                            Purchase Date
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatDate(item.purchaseDate)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="font-medium text-slate-500">
                            Expiry Date
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatDate(item.expiryDate)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="font-medium text-slate-500">
                            Discount From
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatDate(item.discount?.fromDate)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <span className="font-medium text-slate-500">
                            Discount To
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatDate(item.discount?.toDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-card border border-slate-200 bg-white p-5 shadow-[0_10px_34px_rgba(15,23,42,0.05)]">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Store className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-950">
                          Additional Details
                        </h3>
                        <p className="text-sm text-slate-500">
                          Vendor and update metadata for this shop product.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Vendor
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {vendorName}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Margin / Negotiation
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {variantProduct
                            ? "Managed separately for each variant"
                            : `${Number(item.baseRangeDownPercent || 0)}% margin, ${Number(
                                item.discount?.rangeDownPercent ??
                                  item.rangeDownPercent ??
                                  0
                              )}% negotiation`}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Inventory Value
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatCurrency(inventoryValue)}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Last Updated
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatDate(item.updatedAt || item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {!loading && errorMessage && item ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
