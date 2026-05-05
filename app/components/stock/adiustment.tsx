"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
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

function normalizeSearchText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function money(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

type ShopItem = {
  _id: string;
  name?: string;
  shopType?: string;
};

type ShopProductItem = {
  _id: string;
  itemName?: string;
  itemCode?: string;
  itemModelNumber?: string;
  qty?: number;
  sellingPrice?: number;
};

type TransferRow = {
  productId: string;
  shopProductId: string;
  name: string;
  sku: string;
  availableQty: number;
  qty: number;
  unitPrice: number;
};

export default function StockAdjustmentPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [destinationShopId, setDestinationShopId] = useState("");
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [products, setProducts] = useState<ShopProductItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<TransferRow[]>([]);
  const [search, setSearch] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [transferDate, setTransferDate] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!accessToken) {
      setProducts([]);
      setShops([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!selectedShopId) {
      setProducts([]);
      setShops([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage("");

    try {
      const [shopsResponse, productsResponse] = await Promise.all([
        fetch(`${baseURL}${SummaryApi.shop_list.url}`, {
          method: SummaryApi.shop_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${baseURL}${SummaryApi.shop_product_list.url(selectedShopId)}`, {
          method: SummaryApi.shop_product_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const shopsResult = (await shopsResponse.json().catch(() => ({}))) as {
        success?: boolean;
        data?: ShopItem[];
        message?: string;
      };
      const productsResult = (await productsResponse.json().catch(() => ({}))) as {
        success?: boolean;
        data?: ShopProductItem[];
        message?: string;
      };

      if (!shopsResponse.ok || !shopsResult.success) {
        throw new Error(shopsResult.message || "Failed to load shops");
      }

      if (!productsResponse.ok || !productsResult.success) {
        throw new Error(productsResult.message || "Failed to load products");
      }

      setShops(Array.isArray(shopsResult.data) ? shopsResult.data : []);
      setProducts(Array.isArray(productsResult.data) ? productsResult.data : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load transfer data"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, selectedShopId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const destinationShops = useMemo(
    () =>
      shops.filter(
        (shop) =>
          normalizeValue(shop.shopType) === "RETAIL_BRANCH_SHOP" &&
          String(shop._id) !== String(selectedShopId)
      ),
    [shops, selectedShopId]
  );

  const searchQuery = useMemo(() => normalizeSearchText(search), [search]);

  const availableProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter((product) => {
      return [product.itemName, product.itemCode, product.itemModelNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchQuery);
    });
  }, [products, searchQuery]);

  const selectedShopAllowed = normalizeValue(selectedShopType) === "WAREHOUSE_RETAIL_SHOP";

  const transferEligibleRows = useMemo(() => {
    return selectedItems.map((item) => ({
      ...item,
      canIncrease: item.qty < item.availableQty,
    }));
  }, [selectedItems]);

  function addProduct(product: ShopProductItem) {
    setSelectedItems((prev) => {
      const existing = prev.find((row) => row.productId === product._id);
      if (existing) return prev;
      return [
        ...prev,
        {
          productId: product._id,
          shopProductId: product._id,
          name: product.itemName || "Unnamed Product",
          sku: product.itemCode || product.itemModelNumber || "-",
          availableQty: Number(product.qty || 0),
          qty: 1,
          unitPrice: Number(product.sellingPrice || 0),
        },
      ];
    });
  }

  function updateQuantity(productId: string, newQty: number) {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              qty: Math.max(0, Math.min(newQty, item.availableQty)),
            }
          : item
      )
    );
  }

  function removeItem(productId: string) {
    setSelectedItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  async function handleSubmit() {
    if (!selectedShopId || !selectedShopAllowed) {
      toast.error("Select a Warehouse Retail Shop to start a transfer.");
      return;
    }

    if (!destinationShopId) {
      toast.error("Please select a destination branch shop.");
      return;
    }

    const items = selectedItems.filter((item) => item.qty > 0);
    if (!items.length) {
      toast.error("Add at least one product to transfer.");
      return;
    }

    setSubmitting(true);

    try {
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
          fromShopId: selectedShopId,
          toShopId: destinationShopId,
          referenceNo,
          transferDate,
          notes,
          items: items.map((item) => ({ productId: item.productId, qty: item.qty })),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        data?: { _id?: string };
      };

      if (!response.ok || !result.success || !result.data?._id) {
        throw new Error(result.message || "Failed to complete transfer");
      }

      toast.success("Stock transfer completed successfully.");
      router.push(`/shopowner/stock/view?id=${result.data._id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setSubmitting(false);
    }
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
                <Send className="h-3.5 w-3.5" />
                Stock Transfer
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Create Stock Transfer
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Transfer products from your warehouse retail shop to a retail branch shop.
              </p>
            </div>

            <div className="text-sm text-white/85">
              <p>From: {selectedShopName || "No shop selected"}</p>
              {selectedShopType ? <p>{normalizeValue(selectedShopType)}</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Reference No</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="Enter reference number"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Transfer Date</label>
              <input
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Location (From)</label>
              <input
                type="text"
                readOnly
                value={selectedShopName || "No shop selected"}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Location (To)</label>
              <select
                value={destinationShopId}
                onChange={(event) => setDestinationShopId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
              >
                <option value="">Select branch shop</option>
                {destinationShops.map((shop) => (
                  <option key={shop._id} value={shop._id}>
                    {shop.name || "Unnamed Branch"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedShopAllowed ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              Stock transfer can only be created from a Warehouse Retail Shop.
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Select Products</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search and add products from the source warehouse to transfer.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search className="mr-2 h-4 w-4 text-slate-500" />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  placeholder="Search products"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => void fetchData(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
              {errorMessage}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full border-collapse bg-white text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Product</th>
                    <th className="px-4 py-4">SKU</th>
                    <th className="px-4 py-4">Available</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableProducts.map((product) => (
                    <tr key={product._id} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {product.itemName || "Unnamed Product"}
                      </td>
                      <td className="px-4 py-4">{product.itemCode || product.itemModelNumber || "-"}</td>
                      <td className="px-4 py-4">{product.qty ?? 0}</td>
                      <td className="px-4 py-4">{money(product.sellingPrice ?? 0)}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          disabled={selectedItems.some((item) => item.productId === product._id)}
                          onClick={() => addProduct(product)}
                          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-900">Selected Items</h3>

            {selectedItems.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                Add at least one product to continue.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="min-w-full border-collapse text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Product</th>
                      <th className="px-4 py-4">Quantity</th>
                      <th className="px-4 py-4">Available</th>
                      <th className="px-4 py-4">Subtotal</th>
                      <th className="px-4 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item) => (
                      <tr key={item.productId} className="border-t border-slate-200">
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {item.name}
                          <div className="text-xs text-slate-500">{item.sku}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.qty - 1)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={item.availableQty}
                              value={item.qty}
                              onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
                              className="w-16 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.qty + 1)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4">{item.availableQty}</td>
                        <td className="px-4 py-4">{money(item.qty * item.unitPrice)}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-1">
            <label className="block text-sm font-semibold text-slate-700">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
              placeholder="Enter any additional notes..."
            />
          </div>

          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Total items: <span className="font-semibold text-slate-900">{selectedItems.length}</span>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedShopAllowed}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Complete Transfer
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
