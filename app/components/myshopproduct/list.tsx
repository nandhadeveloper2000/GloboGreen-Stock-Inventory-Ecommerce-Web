"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  PackagePlus,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";


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
  isActive?: boolean;
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

function getShopProductBasePath(role?: string | null) {
  const normalized = normalizeRole(role);

  if (normalized === "SHOP_MANAGER") return "/shopmanager/product";
  if (normalized === "SHOP_SUPERVISOR") return "/shopsupervisor/product";

  return "/shopowner/product";
}

function normalizeShopType(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

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

function isShopProductAllowedShop(shopType?: string | null) {
  const normalized = normalizeShopType(shopType);

  return (
    normalized === "WAREHOUSE_RETAIL_SHOP" ||
    normalized === "WHOLESALE_SHOP" ||
    normalized === "RETAIL_BRANCH_SHOP"
  );
}

function getShopProductShopLabel(shopType?: string | null) {
  const normalized = normalizeShopType(shopType);

  if (normalized === "WHOLESALE_SHOP") return "wholesale shop";
  if (normalized === "WAREHOUSE_RETAIL_SHOP") return "main shop";
  if (normalized === "RETAIL_BRANCH_SHOP") return "branch shop";

  return "main shop / branch shop / wholesale shop";
}

function getQtyTitles(shopType?: string | null) {
  const normalized = normalizeShopType(shopType);

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

  if (normalized === "RETAIL_BRANCH_SHOP") {
    return {
      unit: "Main Unit",
      qty: "Available Stock",
      lowStockQty: "Low Stock",
      minQty: "Purchase Qty",
      fullQty: "Available Stock Quantity",
      fullLowStockQty: "Low Stock Quantity",
      fullMinQty: "Purchase Quantity",
      emptyText: "Start by mapping your first product to this branch shop.",
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
    emptyText: "Start by mapping your first product to this main shop.",
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
  const router = useRouter();
  const { accessToken, role } = useAuth();

  const currentRole = useMemo(() => normalizeRole(role), [role]);
  const shopProductBasePath = useMemo(
    () => getShopProductBasePath(currentRole),
    [currentRole]
  );

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
  const [togglingProductId, setTogglingProductId] = useState("");
  const [openingCreatePage, setOpeningCreatePage] = useState(false);
  const [openingViewProductId, setOpeningViewProductId] = useState("");
  const [openingEditProductId, setOpeningEditProductId] = useState("");
  const [search, setSearch] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [errorMessage, setErrorMessage] = useState("");

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

  const runOnNextFrame = useCallback((callback: () => void) => {
    if (
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      callback();
      return;
    }

    window.requestAnimationFrame(() => {
      callback();
    });
  }, []);

  const openCreatePage = useCallback(() => {
    setOpeningCreatePage(true);

    runOnNextFrame(() => {
      router.push(`${shopProductBasePath}/create`);
    });
  }, [router, runOnNextFrame, shopProductBasePath]);

  const openEditPage = useCallback(
    (productId: string) => {
      if (!productId) return;

      setOpeningEditProductId(productId);

      runOnNextFrame(() => {
        router.push(
          `${shopProductBasePath}/edit/${encodeURIComponent(productId)}`
        );
      });
    },
    [router, runOnNextFrame, shopProductBasePath]
  );

  const openViewPage = useCallback(
    (item: ShopProductItem) => {
      const actionProductId = getProductId(item) || item._id;

      if (!actionProductId) return;

      setOpeningViewProductId(actionProductId);

      runOnNextFrame(() => {
        router.push(
          `${shopProductBasePath}/view?id=${encodeURIComponent(actionProductId)}`
        );
      });
    },
    [router, runOnNextFrame, shopProductBasePath]
  );

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
    const lowStockCount = rows.filter(isLowStock).length;
    return {
      total: rows.length,
      inStock: rows.length - lowStockCount,
      lowStock: lowStockCount,
    };
  }, [rows]);

  const paginatedRows = useMemo(
    () => filteredRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [filteredRows, page, rowsPerPage]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const paginationStart =
    filteredRows.length === 0 ? 0 : page * rowsPerPage + 1;
  const paginationEnd = Math.min(
    (page + 1) * rowsPerPage,
    filteredRows.length
  );

  async function handleToggleStatus(item: ShopProductItem) {
    const productId = getProductId(item);

    if (!productId || !accessToken || !selectedShopId) return;

    try {
      setTogglingProductId(productId);

      const nextStatus = !item.isActive;

      const response = await fetch(
        `${baseURL}${SummaryApi.shop_product_update.url(selectedShopId, productId)}`,
        {
          method: SummaryApi.shop_product_update.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ isActive: nextStatus }),
        }
      );

      const result = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string };

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to update status");
      }

      toast.success(nextStatus ? "Product activated" : "Product deactivated");
      setRows((prev) =>
        prev.map((row) =>
          getProductId(row) === productId
            ? { ...row, isActive: nextStatus }
            : row
        )
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update product status";
      toast.error(message);
    } finally {
      setTogglingProductId("");
    }
  }

  async function performDelete(item: ShopProductItem) {
    const productId = getProductId(item);

    if (!productId || !accessToken) return;

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

  function handleDelete(item: ShopProductItem) {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    if (!getProductId(item)) {
      toast.error("Unable to resolve product id");
      return;
    }

    toast(`Remove ${getProductName(item)}?`, {
      description: `This will remove the product from ${selectedShopName || "this shop"}.`,
      action: {
        label: "Remove",
        onClick: () => {
          void performDelete(item);
        },
      },
    });
  }

  return (
    <div className="page-shell">
      <div className="w-full">
        <section className="premium-card-solid overflow-hidden rounded-[20px]">
          <div className="border-b border-token px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,139,0.14)] bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <PackagePlus className="h-3.5 w-3.5" />
                  Shop Owner Panel
                </div>

                <h1 className="mt-3 text-[24px] font-bold tracking-tight text-heading md:text-[26px]">
                  My Shop Products
                </h1>

                <p className="mt-1.5 text-[13px] text-secondary-text">
                  View and manage products mapped to your{" "}
                  {selectedShopTypeLabel}.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-token bg-soft-token px-3 text-[12px] font-semibold text-primary-text">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    {selectedShopName || "No shop selected"}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-primary-soft px-3 text-[12px] font-semibold text-primary">
                    Total: {stats.total}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-success-soft px-3 text-[12px] font-semibold text-success-dark">
                    In Stock: {stats.inStock}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-amber-100 px-3 text-[12px] font-semibold text-amber-700">
                    Low Stock: {stats.lowStock}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchShopProducts(true)}
                  disabled={refreshing}
                  className="premium-btn-secondary h-10 rounded-lg px-4 py-0 text-[13px]"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                {canManage && shopProductAllowedShopSelected ? (
                  <button
                    type="button"
                    onClick={openCreatePage}
                    disabled={openingCreatePage}
                    className="premium-btn h-10 rounded-lg px-4 py-0 text-[13px] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {openingCreatePage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PackagePlus className="h-4 w-4" />
                    )}
                    {openingCreatePage ? "Opening..." : "Add Product"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, model, key, vendor, unit..."
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                />
              </div>

              <div className="flex h-10 flex-col items-center justify-center rounded-lg border border-[rgba(0,0,139,0.18)] bg-primary-soft px-3 text-center">
                <span className="text-[10px] font-semibold text-secondary-text">
                  Search by
                </span>

                <span className="text-[12px] font-bold text-primary">
                  Name / Model / Key
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowLowStockOnly((prev) => !prev)}
                className={`h-10 rounded-lg border px-4 text-[13px] font-semibold transition ${
                  showLowStockOnly
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-token bg-white text-primary-text hover:bg-soft-token"
                }`}
              >
                {showLowStockOnly ? "Low Stock: On" : "Low Stock Only"}
              </button>
            </div>
          </div>

          {!selectedShopId ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Store className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No shop selected
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Select a shop from the dashboard switcher to view its products.
              </p>
            </div>
          ) : !shopProductAllowedShopSelected ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                Wrong Shop Type
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                My shop products are available only for{" "}
                <strong>Main Shop</strong>,{" "}
                <strong>Branch Shop</strong>, or{" "}
                <strong>Wholesale Shop</strong> types.
              </p>
            </div>
          ) : loading ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>

              <p className="mt-4 text-sm font-semibold text-secondary-text">
                Loading shop products...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                Unable to load products
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                {errorMessage}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <PackagePlus className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No shop products found
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                {search.trim() || showLowStockOnly
                  ? "Try another search or remove the low stock filter."
                  : qtyTitles.emptyText}
              </p>

              {canManage ? (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={openCreatePage}
                    disabled={openingCreatePage}
                    className="premium-btn h-10 rounded-lg px-5 py-0 text-[13px] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {openingCreatePage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PackagePlus className="h-4 w-4" />
                    )}
                    {openingCreatePage ? "Opening..." : "Add Product"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-235 border-collapse">
                  <thead className="bg-soft-token">
                    <tr>
                      {[
                        "S.No",
                        "Image",
                        "Name",
                        "Unit",
                        "Available Stock",
                        "Selling Price",
                        "Status",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={`border-b border-token px-3 py-3 text-[11px] font-bold text-primary-text ${
                            heading === "Actions" ? "text-center" : "text-left"
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-divider bg-card-token">
                    {paginatedRows.map((item, index) => {
                      const productId = getProductId(item);
                      const actionProductId = productId || item._id;
                      const previewImage = getProductImage(item);
                      const lowStock = isLowStock(item);
                      const mainUnit = getMainUnit(item);
                      const totalQuantity = getTotalQuantity(item);
                      const totalLowStockQuantity =
                        getTotalLowStockQuantity(item);
                      const isDeleting = deletingProductId === productId;
                      const isToggling = togglingProductId === productId;
                      const isOpeningView =
                        openingViewProductId === actionProductId;
                      const isOpeningEdit =
                        openingEditProductId === actionProductId;
                      const isRowBusy =
                        isDeleting ||
                        isToggling ||
                        isOpeningView ||
                        isOpeningEdit;

                      return (
                        <tr
                          key={item._id}
                          className="transition hover:bg-primary-soft/60"
                        >
                          <td className="px-3 py-3 text-[12px] text-secondary-text">
                            {page * rowsPerPage + index + 1}
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-token bg-soft-token">
                              {previewImage ? (
                                <img
                                  src={previewImage}
                                  alt={getProductName(item)}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Store className="h-4 w-4 text-muted-text" />
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="text-[12px] font-semibold text-heading">
                              {getProductName(item)}
                            </div>

                            <div className="mt-0.5 flex flex-wrap gap-1">
                              <span className="rounded border border-token bg-soft-token px-1.5 py-0.5 text-[10px] text-secondary-text">
                                {getProductModel(item)}
                              </span>

                              <span className="rounded border border-token bg-soft-token px-1.5 py-0.5 text-[10px] text-secondary-text">
                                {getProductKey(item)}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            {mainUnit}
                          </td>

                          <td className="px-3 py-3">
                            <div className="text-[12px] font-semibold text-heading">
                              {totalQuantity}
                            </div>

                            {totalLowStockQuantity > 0 ? (
                              <div
                                className={`text-[11px] ${
                                  lowStock
                                    ? "text-amber-700"
                                    : "text-secondary-text"
                                }`}
                              >
                                Low: {totalLowStockQuantity}
                              </div>
                            ) : null}
                          </td>

                          <td className="px-3 py-3 text-[12px] font-semibold text-heading">
                            {getSellingPriceLabel(item)}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                lowStock
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-success-soft text-success-dark"
                              }`}
                            >
                              {lowStock ? "Low Stock" : "In Stock"}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openViewPage(item)}
                                disabled={isRowBusy}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-secondary-text transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                                title="View"
                              >
                                {isOpeningView ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {canManage && productId ? (
                                <button
                                  type="button"
                                  onClick={() => openEditPage(actionProductId)}
                                  disabled={isRowBusy}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-secondary-text transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                                  title="Edit"
                                >
                                  {isOpeningEdit ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Pencil className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : null}

                              {canManage ? (
                                <button
                                  type="button"
                                  disabled={isRowBusy}
                                  onClick={() => void handleToggleStatus(item)}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    item.isActive !== false
                                      ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                  }`}
                                  title={item.isActive !== false ? "Deactivate" : "Activate"}
                                  aria-label={item.isActive !== false ? "Deactivate" : "Activate"}
                                >
                                  {isToggling ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Power className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : null}

                              {canManage ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(item)}
                                  disabled={isRowBusy}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
                                  title="Remove"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-token bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex flex-wrap items-center justify-end gap-3 text-[12px] text-secondary-text">
                  <span className="font-medium text-primary-text">
                    Rows per page:
                  </span>

                  <select
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setPage(0);
                    }}
                    className="h-8 rounded-md border border-token bg-white px-2 text-[12px] font-semibold text-primary-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>

                  <span className="min-w-19.5 text-right font-semibold text-primary-text">
                    {paginationStart}-{paginationEnd} of {filteredRows.length}
                  </span>

                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[16px] font-bold text-secondary-text transition hover:bg-soft-token disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    {"<"}
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages - 1, current + 1)
                      )
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[16px] font-bold text-secondary-text transition hover:bg-soft-token disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    {">"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
