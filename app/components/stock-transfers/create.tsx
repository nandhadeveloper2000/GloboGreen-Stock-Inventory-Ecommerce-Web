"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Boxes,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

type SelectedShopContext = {
  id: string;
  name: string;
  type: string;
};

type ShopOwnerReference =
  | string
  | {
      _id?: string;
      name?: string;
    };

type ShopOption = {
  _id: string;
  name?: string;
  shopType?: string;
  isActive?: boolean;
  shopOwnerAccountId?: ShopOwnerReference;
};

type ProductReference =
  | string
  | {
      _id?: string;
      itemName?: string;
      sku?: string;
      itemModelNumber?: string;
      itemKey?: string;
    };

type NamedReference =
  | string
  | {
      _id?: string;
      name?: string;
    };

type ShopProductItem = {
  _id: string;
  productId?: ProductReference;
  itemName?: string;
  itemCode?: string;
  itemModelNumber?: string;
  qty?: number | string | null;
  sellingPrice?: number | string | null;
  mainUnit?: string;
  categoryId?: NamedReference;
  subcategoryId?: NamedReference;
  brandId?: NamedReference;
  modelId?: NamedReference;
  updatedAt?: string;
};

type ShopListResponse = {
  success?: boolean;
  message?: string;
  data?: ShopOption[];
  shops?: ShopOption[];
};

type ShopProductResponse = {
  success?: boolean;
  message?: string;
  data?: ShopProductItem[];
  products?: ShopProductItem[];
};

type CreateTransferResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
  };
};

type SelectedTransferItem = {
  productId: string;
  shopProductId: string;
  itemName: string;
  sku: string;
  unit: string;
  availableQty: number;
  qty: number;
  unitPrice: number;
  categoryName: string;
  brandName: string;
  modelName: string;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value?: number | string | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;

    if (response?.data?.message) return response.data.message;
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong";
}

function formatTransferError(message: string) {
  const match = message.match(/^LOW_STOCK:[^:]+:([^:]+):need=([^:]+):have=(.+)$/);

  if (!match) return message;

  return `${match[1]} has only ${match[3]} stock available, but ${match[2]} was requested.`;
}

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "", type: "" };
  }

  const rawShopId = window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "";
  const rawShopName = window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "";
  const rawShopType = window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "";

  if (rawShopId.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawShopId) as {
        _id?: string;
        id?: string;
        shopName?: string;
        name?: string;
        shopType?: string;
        type?: string;
      };

      return {
        id: cleanText(parsed?._id || parsed?.id),
        name: cleanText(parsed?.shopName || parsed?.name || rawShopName),
        type: cleanText(parsed?.shopType || parsed?.type || rawShopType),
      };
    } catch {
      return {
        id: cleanText(rawShopId),
        name: cleanText(rawShopName),
        type: cleanText(rawShopType),
      };
    }
  }

  return {
    id: cleanText(rawShopId),
    name: cleanText(rawShopName),
    type: cleanText(rawShopType),
  };
}

function getOwnerId(value?: ShopOwnerReference) {
  if (!value) return "";
  if (typeof value === "string") return cleanText(value);
  return cleanText(value._id);
}

function getProductId(value?: ProductReference) {
  if (!value) return "";
  if (typeof value === "string") return cleanText(value);
  return cleanText(value._id);
}

function getReferenceName(value?: NamedReference, fallback = "-") {
  if (!value) return fallback;
  if (typeof value === "string") return cleanText(value) || fallback;
  return cleanText(value.name) || fallback;
}

function getProductDisplayName(row: ShopProductItem) {
  return (
    cleanText(row.itemName) ||
    (typeof row.productId === "object"
      ? cleanText(row.productId?.itemName || row.productId?.itemKey)
      : "") ||
    "Unnamed Product"
  );
}

function getProductCode(row: ShopProductItem) {
  return (
    cleanText(row.itemCode || row.itemModelNumber) ||
    (typeof row.productId === "object"
      ? cleanText(row.productId?.sku || row.productId?.itemModelNumber)
      : "") ||
    "-"
  );
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

function isWarehouseShop(shopType?: string | null) {
  return normalizeShopType(shopType) === "WAREHOUSE_RETAIL_SHOP";
}

function isBranchShop(shopType?: string | null) {
  return normalizeShopType(shopType) === "RETAIL_BRANCH_SHOP";
}

function FloatingField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
    </div>
  );
}

type CreateStockTransferPageProps = {
  listHref?: string;
  stockListHref?: string;
  successViewHref?: string;
  successListHref?: string;
};

export default function CreateStockTransferPage({
  listHref = "/shopowner/stock-transfers/list",
  stockListHref = "/shopowner/stock/list",
  successViewHref = "/shopowner/stock/view",
  successListHref = "/shopowner/stock-transfers/list",
}: CreateStockTransferPageProps = {}) {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [selectedShopContext, setSelectedShopContext] = useState<SelectedShopContext>(
    readSelectedShop()
  );
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [fromShopId, setFromShopId] = useState("");
  const [toShopId, setToShopId] = useState("");
  const [products, setProducts] = useState<ShopProductItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedTransferItem[]>([]);
  const [search, setSearch] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshingProducts, setRefreshingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const syncSelectedShop = useCallback(() => {
    setSelectedShopContext(readSelectedShop());
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

  const loadShops = useCallback(async () => {
    if (!accessToken) {
      setShops([]);
      setLoadingShops(false);
      return;
    }

    try {
      setLoadingShops(true);

      const query = new URLSearchParams({
        scope: "stock-transfer",
        isActive: "true",
      });

      const response = await fetch(`${baseURL}${SummaryApi.shop_list.url}?${query}`, {
        method: SummaryApi.shop_list.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      const result = (await response.json().catch(() => ({}))) as ShopListResponse;
      const shopRows = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.shops)
          ? result.shops
          : [];

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load shops");
      }

      setShops(shopRows);
    } catch (error) {
      setShops([]);
      toast.error(error instanceof Error ? error.message : "Failed to load shops");
    } finally {
      setLoadingShops(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

  const isReverseTransfer = normalizeShopType(selectedShopContext.type) === "RETAIL_BRANCH_SHOP";

  const sourceShops = useMemo(
    () =>
      shops
        .filter((shop) => {
          if (shop.isActive === false) return false;
          return isReverseTransfer
            ? isBranchShop(shop.shopType)
            : isWarehouseShop(shop.shopType);
        })
        .sort((a, b) => cleanText(a.name).localeCompare(cleanText(b.name))),
    [shops, isReverseTransfer]
  );

  useEffect(() => {
    if (!sourceShops.length) return;
    if (fromShopId && sourceShops.some((shop) => shop._id === fromShopId)) return;

    const selectedSource = sourceShops.find(
      (shop) => String(shop._id) === String(selectedShopContext.id)
    );

    if (selectedSource) {
      setFromShopId(selectedSource._id);
      return;
    }

    if (sourceShops.length === 1) {
      setFromShopId(sourceShops[0]._id);
    }
  }, [fromShopId, selectedShopContext.id, sourceShops]);

  const selectedFromShop = useMemo(
    () => shops.find((shop) => String(shop._id) === String(fromShopId)) || null,
    [fromShopId, shops]
  );

  const destinationShops = useMemo(() => {
    const sourceOwnerId = getOwnerId(selectedFromShop?.shopOwnerAccountId);

    return shops
      .filter((shop) => {
        if (shop.isActive === false) return false;
        const matchesType = isReverseTransfer
          ? isWarehouseShop(shop.shopType)
          : isBranchShop(shop.shopType);
        if (!matchesType) return false;
        if (String(shop._id) === String(fromShopId)) return false;
        if (sourceOwnerId && getOwnerId(shop.shopOwnerAccountId) !== sourceOwnerId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => cleanText(a.name).localeCompare(cleanText(b.name)));
  }, [fromShopId, isReverseTransfer, selectedFromShop?.shopOwnerAccountId, shops]);

  useEffect(() => {
    if (!toShopId) return;
    if (destinationShops.some((shop) => shop._id === toShopId)) return;
    setToShopId("");
  }, [destinationShops, toShopId]);

  const loadProducts = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !fromShopId) {
        setProducts([]);
        setSelectedItems([]);
        setLoadingProducts(false);
        setRefreshingProducts(false);
        setErrorMessage("");
        return;
      }

      try {
        if (isRefresh) {
          setRefreshingProducts(true);
        } else {
          setLoadingProducts(true);
        }

        setErrorMessage("");

        const response = await fetch(
          `${baseURL}${SummaryApi.shop_product_list.url(fromShopId)}`,
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

        const result = (await response.json().catch(() => ({}))) as ShopProductResponse;
        const rows = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.products)
            ? result.products
            : [];

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load source products");
        }

        setProducts(
          rows.sort((a, b) =>
            getProductDisplayName(a).localeCompare(getProductDisplayName(b))
          )
        );
      } catch (error) {
        setProducts([]);
        setSelectedItems([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load source products"
        );
      } finally {
        setLoadingProducts(false);
        setRefreshingProducts(false);
      }
    },
    [accessToken, fromShopId]
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const availableProducts = useMemo(() => {
    const query = cleanText(search).toLowerCase();

    return products.filter((product) => {
      const availableQty = toNumber(product.qty);
      if (availableQty <= 0) return false;

      if (!query) return true;

      return [
        getProductDisplayName(product),
        getProductCode(product),
        getReferenceName(product.categoryId, ""),
        getReferenceName(product.subcategoryId, ""),
        getReferenceName(product.brandId, ""),
        getReferenceName(product.modelId, ""),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [products, search]);

  const selectedSourceAllowed = isReverseTransfer
    ? isBranchShop(selectedFromShop?.shopType)
    : isWarehouseShop(selectedFromShop?.shopType);

  function handleFromShopChange(value: string) {
    setFromShopId(value);
    setToShopId("");
    setProducts([]);
    setSelectedItems([]);
    setSearch("");
    setErrorMessage("");
  }

  function addProduct(product: ShopProductItem) {
    const productId = getProductId(product.productId);

    if (!productId) {
      toast.error("This stock item is missing a product reference");
      return;
    }

    setSelectedItems((prev) => {
      if (prev.some((item) => item.productId === productId)) return prev;

      return [
        ...prev,
        {
          productId,
          shopProductId: cleanText(product._id),
          itemName: getProductDisplayName(product),
          sku: getProductCode(product),
          availableQty: toNumber(product.qty),
          qty: 1,
          unit: cleanText(product.mainUnit) || "Pcs",
          unitPrice: toNumber(product.sellingPrice),
          categoryName: getReferenceName(product.categoryId),
          brandName: getReferenceName(product.brandId),
          modelName: getReferenceName(product.modelId),
        },
      ];
    });
  }

  function removeItem(productId: string) {
    setSelectedItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function updateItemQuantity(productId: string, nextQty: number) {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        const safeQty = Math.min(
          item.availableQty,
          Math.max(1, Number.isFinite(nextQty) ? nextQty : 1)
        );

        return { ...item, qty: safeQty };
      })
    );
  }

  const totalItems = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.qty, 0),
    [selectedItems]
  );

  const totalValue = useMemo(
    () =>
      selectedItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0),
    [selectedItems]
  );

  async function handleSubmit() {
    if (!accessToken) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    if (!fromShopId) {
      toast.error(
        isReverseTransfer
          ? "Please select a source branch shop."
          : "Please select a source warehouse shop."
      );
      return;
    }

    if (!selectedSourceAllowed) {
      toast.error(
        isReverseTransfer
          ? "Transfer source must be a Retail Branch Shop."
          : "Transfer source must be a Warehouse Retail Shop."
      );
      return;
    }

    if (!toShopId) {
      toast.error(
        isReverseTransfer
          ? "Please select a destination warehouse shop."
          : "Please select a destination branch shop."
      );
      return;
    }

    if (fromShopId === toShopId) {
      toast.error("Source and destination shops must be different.");
      return;
    }

    const validItems = selectedItems
      .filter((item) => item.qty > 0 && item.productId)
      .map((item) => ({
        productId: item.productId,
        qty: item.qty,
      }));

    if (!validItems.length) {
      toast.error("Add at least one product to transfer.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${baseURL}${SummaryApi.stock_transfer_create.url}`, {
        method: SummaryApi.stock_transfer_create.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          fromShopId,
          toShopId,
          referenceNo: cleanText(referenceNo),
          transferDate,
          notes: cleanText(notes),
          items: validItems,
        }),
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as CreateTransferResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create stock transfer");
      }

      toast.success(result.message || "Stock transfer created successfully");

      if (result.data?._id) {
        router.push(`${successViewHref}?id=${result.data._id}`);
        return;
      }

      router.push(successListHref);
    } catch (error) {
      const message = formatTransferError(getErrorMessage(error));
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingShops) {
    return (
      <div className="page-shell">
        <div className="mx-auto w-full max-w-6xl">
          <div className="premium-card-solid flex min-h-[55vh] items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-bold text-primary-text">
              <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
              Loading transfer setup...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-30" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.21em] text-white/95">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Stock Transfer
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Create Stock Transfer
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                {isReverseTransfer
                  ? "Return live stock from a retail branch shop back to the warehouse retail shop."
                  : "Move live stock from a warehouse retail shop to a retail branch shop using real source inventory."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href={listHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4" />
                Transfer List
              </Link>

              <Link
                href={stockListHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#00008b] shadow-[0_18px_40px_rgba(255,255,255,0.16)] transition hover:bg-slate-100"
              >
                <Store className="h-4 w-4" />
                Stock List
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <FloatingField label="From Shop *">
                <select
                  value={fromShopId}
                  onChange={(event) => handleFromShopChange(event.target.value)}
                  disabled={submitting}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">
                    {isReverseTransfer ? "Select branch shop" : "Select warehouse shop"}
                  </option>
                  {sourceShops.map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      {shop.name || "Unnamed Shop"}
                    </option>
                  ))}
                </select>
              </FloatingField>

              <FloatingField label="To Shop *">
                <select
                  value={toShopId}
                  onChange={(event) => setToShopId(event.target.value)}
                  disabled={submitting || !fromShopId || destinationShops.length === 0}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">
                    {!fromShopId
                      ? "Select source shop first"
                      : destinationShops.length === 0
                        ? isReverseTransfer
                          ? "No warehouse shops available"
                          : "No branch shops available"
                        : isReverseTransfer
                          ? "Select warehouse shop"
                          : "Select branch shop"}
                  </option>
                  {destinationShops.map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      {shop.name || "Unnamed Shop"}
                    </option>
                  ))}
                </select>
              </FloatingField>

              <FloatingField label="Transfer Date *">
                <input
                  type="date"
                  value={transferDate}
                  onChange={(event) => setTransferDate(event.target.value)}
                  disabled={submitting}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </FloatingField>

              <FloatingField label="Reference No">
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(event) => setReferenceNo(event.target.value)}
                  placeholder="Optional reference"
                  disabled={submitting}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </FloatingField>

              <div className="md:col-span-2">
                <FloatingField label="Notes">
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    disabled={submitting}
                    placeholder="Optional notes for this transfer"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-6 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </FloatingField>
              </div>
            </div>

            <div className="rounded-3xl border border-[#00008b]/10 bg-[#00008b]/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#00008b] shadow-sm">
                  <Boxes className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-950">
                    Transfer Summary
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Selected shop context:{" "}
                    <span className="font-bold text-slate-900">
                      {selectedShopContext.name || "No shop selected"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  { label: "Products", value: selectedItems.length },
                  { label: "Total Qty", value: totalItems },
                  { label: "Value", value: money(totalValue) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-black text-[#00008b]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {fromShopId && !selectedSourceAllowed ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {isReverseTransfer
                    ? "Return transfers must start from a Retail Branch Shop."
                    : "Transfers can only start from a Warehouse Retail Shop."}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Source Shop Products
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Search source stock and add the products you want to move.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-80">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by product, code, brand, or model"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                />
              </div>

              <button
                type="button"
                onClick={() => void loadProducts(true)}
                disabled={refreshingProducts || !fromShopId}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/25 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={classNames(
                    "h-4 w-4",
                    refreshingProducts && "animate-spin"
                  )}
                />
                Refresh
              </button>
            </div>
          </div>

          {!fromShopId ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <Store className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                Select a source warehouse shop to load stock items.
              </p>
            </div>
          ) : !selectedSourceAllowed ? (
            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-sm text-amber-900">
              This source shop type is not allowed for stock transfer.
            </div>
          ) : loadingProducts ? (
            <div className="mt-5 flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#00008b]" />
            </div>
          ) : errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                {search.trim()
                  ? "No matching source products found."
                  : "No transferable stock found in this shop."}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
                <table className="min-w-full border-collapse bg-white text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Product
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Category
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Brand / Model
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Stock
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Rate
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-[0.14em]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {availableProducts.map((product) => {
                      const productId = getProductId(product.productId);
                      const added = selectedItems.some(
                        (item) => item.productId === productId
                      );

                      return (
                        <tr
                          key={product._id}
                          className="border-t border-slate-200 transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-950">
                              {getProductDisplayName(product)}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-500">
                              SKU: {getProductCode(product)}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {getReferenceName(product.categoryId)}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700">
                            {getReferenceName(product.brandId)}
                            {" / "}
                            {getReferenceName(product.modelId)}
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-[#00008b]/5 px-3 py-1 text-xs font-black text-[#00008b]">
                              {toNumber(product.qty)} {cleanText(product.mainUnit) || "Pcs"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                            {money(product.sellingPrice)}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              disabled={added || toNumber(product.qty) <= 0}
                              onClick={() => addProduct(product)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                              <Plus className="h-4 w-4" />
                              {added ? "Added" : "Add"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-3 lg:hidden">
                {availableProducts.map((product) => {
                  const productId = getProductId(product.productId);
                  const added = selectedItems.some(
                    (item) => item.productId === productId
                  );

                  return (
                    <article
                      key={product._id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-slate-950">
                            {getProductDisplayName(product)}
                          </h3>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {getProductCode(product)}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#00008b]">
                          {toNumber(product.qty)} {cleanText(product.mainUnit) || "Pcs"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                        <div>
                          <p className="font-bold uppercase tracking-[0.12em] text-slate-400">
                            Category
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {getReferenceName(product.categoryId)}
                          </p>
                        </div>

                        <div>
                          <p className="font-bold uppercase tracking-[0.12em] text-slate-400">
                            Brand / Model
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {getReferenceName(product.brandId)}
                            {" / "}
                            {getReferenceName(product.modelId)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-slate-800">
                          {money(product.sellingPrice)}
                        </p>

                        <button
                          type="button"
                          disabled={added || toNumber(product.qty) <= 0}
                          onClick={() => addProduct(product)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          <Plus className="h-4 w-4" />
                          {added ? "Added" : "Add"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Selected Transfer Items
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Review quantities before creating the transfer.
              </p>
            </div>

            <div className="inline-flex items-center rounded-2xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              {selectedItems.length} product{selectedItems.length === 1 ? "" : "s"}
            </div>
          </div>

          {selectedItems.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <Boxes className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                Add at least one product to continue.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
                <table className="min-w-full border-collapse bg-white text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Product
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Available
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Qty
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em]">
                        Subtotal
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-[0.14em]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedItems.map((item) => (
                      <tr
                        key={item.productId}
                        className="border-t border-slate-200"
                      >
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-950">
                            {item.itemName}
                          </div>
                          <div className="mt-1 text-xs font-medium text-slate-500">
                            {item.sku} | {item.brandName} / {item.modelName}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                          {item.availableQty} {item.unit}
                        </td>

                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateItemQuantity(item.productId, item.qty - 1)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-black text-slate-700 transition hover:bg-slate-100"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min={1}
                              max={item.availableQty}
                              value={item.qty}
                              onChange={(event) =>
                                updateItemQuantity(
                                  item.productId,
                                  Number(event.target.value)
                                )
                              }
                              className="h-9 w-18 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-bold text-slate-900 outline-none focus:border-[#00008b]"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateItemQuantity(item.productId, item.qty + 1)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-black text-slate-700 transition hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-slate-900">
                          {money(item.qty * item.unitPrice)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-3 lg:hidden">
                {selectedItems.map((item) => (
                  <article
                    key={item.productId}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-950">
                          {item.itemName}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {item.sku}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div>
                        <p className="font-bold uppercase tracking-[0.12em] text-slate-400">
                          Available
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {item.availableQty} {item.unit}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase tracking-[0.12em] text-slate-400">
                          Value
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {money(item.qty * item.unitPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateItemQuantity(item.productId, item.qty - 1)
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-lg font-black text-slate-700 transition hover:bg-slate-100"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min={1}
                        max={item.availableQty}
                        value={item.qty}
                        onChange={(event) =>
                          updateItemQuantity(
                            item.productId,
                            Number(event.target.value)
                          )
                        }
                        className="h-9 w-18 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-bold text-slate-900 outline-none focus:border-[#00008b]"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          updateItemQuantity(item.productId, item.qty + 1)
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-lg font-black text-slate-700 transition hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/shopowner/stock-transfers/list"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-[#00008b]/20 hover:bg-[#00008b]/5 hover:text-[#00008b]"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                submitting ||
                !selectedSourceAllowed ||
                !fromShopId ||
                !toShopId ||
                selectedItems.length === 0
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#00008b] px-6 text-sm font-black text-white shadow-[0_18px_36px_rgba(0,0,139,0.18)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Create Transfer
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
