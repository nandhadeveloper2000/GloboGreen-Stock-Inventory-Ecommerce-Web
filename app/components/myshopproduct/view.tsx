"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect } from "react";
import {
  CalendarDays,
  IndianRupee,
  Package2,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";

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
    (sum, entry) => sum + Number(entry.sellingPrice || 0) * Number(entry.qty || 0),
    0
  );
}

export default function MyShopProductView({
  open,
  item,
  onClose,
  editHref,
}: {
  open: boolean;
  item: ShopProductViewItem | null;
  onClose: () => void;
  editHref?: string;
}) {
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open || !item) return null;

  const previewImage = getProductImage(item);
  const productName = getProductName(item);
  const vendorName = getVendorName(item.vendorId);
  const lowStock = isLowStock(item);
  const variantProduct = hasVariantEntries(item);
  const variantEntries = getVariantEntries(item);
  const totalQuantity = getTotalQuantity(item);
  const totalMinQuantity = getTotalMinQuantity(item);
  const variantCount = getVariantCount(item);
  const inventoryValue = getInventoryValue(item);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-4xl border border-white/20 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.3)]">
        <div className="premium-hero premium-glow relative overflow-hidden px-5 py-5 md:px-6">
          <div className="premium-grid-bg premium-bg-animate opacity-35" />
          <div className="premium-bg-overlay" />

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

                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                  {productName}
                </h2>

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

            <div className="flex items-center gap-2 self-start">
              {editHref ? (
                <Link
                  href={editHref}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:shadow-md"
                >
                  Edit Product
                </Link>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white transition hover:bg-white/15"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5 md:px-6">
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
                                  {entry.attributes.map((attribute, attributeIndex) => (
                                    <span
                                      key={`${attribute.label}-${attribute.value}-${attributeIndex}`}
                                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                                    >
                                      {attribute.label}: {attribute.value}
                                    </span>
                                  ))}
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
                                Vendor Price
                              </p>
                              <p className="mt-1 text-lg font-bold text-slate-900">
                                {formatCurrency(entry.vendorPrice)}
                              </p>
                            </div>

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
                                {formatCurrency(entry.mrpPrice ?? entry.maxSellingPrice)}
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
                        Vendor Price
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {formatCurrency(item.vendorPrice)}
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
                        MRP Price
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {formatCurrency(item.mrpPrice ?? item.maxSellingPrice)}
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
    </div>
  );
}
