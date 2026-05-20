"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

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
};

type PhysicalStockItem = {
  productId: string;
  shopProductId: string;
  itemName?: string;
  itemCode?: string;
  itemModelNumber?: string;
  systemQty: number;
  physicalQty: number;
  reason: string;
};

type PhysicalStockEntry = {
  _id: string;
  referenceNo?: string;
  shopId?: string;
  shopName?: string;
  notes?: string;
  status?: string;
  items?: PhysicalStockItem[];
  createdAt?: string;
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

const REASONS = [
  "Free quantity received",
  "Stock adjustment (excess found)",
  "Audit adjustment",
  "Local purchase",
  "Branch transfer in",
  "Sample/Free issue",
  "Theft/loss",
  "Warranty replacement out",
  "Expired Goods",
  "Transport Damage",
  "Damage/Breakage",
  "Other",
];

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

export default function CreatePhysicalStockPage({
  mode = "create",
  physicalStockId = "",
}: {
  mode?: "create" | "edit";
  physicalStockId?: string;
}) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const isEditMode = mode === "edit";

  const [shops, setShops] = useState<ShopItem[]>([]);
  const [products, setProducts] = useState<ShopProductItem[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PhysicalStockItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
  }, []);

  const shopLabel = useMemo(() => {
    return selectedShopName || "Select Location";
  }, [selectedShopName]);

  const availableProducts = useMemo(() => {
    if (!search.trim()) return products;
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      return [product.itemName, product.itemCode, product.itemModelNumber]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [products, search]);

  const totalDifference = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (item.physicalQty - item.systemQty),
      0
    );
  }, [items]);

  const loadShops = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(`${baseURL}${SummaryApi.shop_list.url}`, {
        method: SummaryApi.shop_list.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        credentials: "include",
      });

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        data?: ShopItem[];
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load shops");
      }

      setShops(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load shop list"
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadProducts = useCallback(
    async (shopId: string) => {
      if (!accessToken || !shopId) return;
      try {
        setRefreshing(true);
        setErrorMessage("");

        const response = await fetch(
          `${baseURL}${SummaryApi.shop_product_list.url(shopId)}`,
          {
            method: SummaryApi.shop_product_list.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        const result = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          data?: ShopProductItem[];
          message?: string;
        };

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load products");
        }

        setProducts(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load products"
        );
      } finally {
        setRefreshing(false);
      }
    },
    [accessToken]
  );

  const loadEntry = useCallback(async () => {
    if (!accessToken || !isEditMode || !physicalStockId) return;

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(
        `${baseURL}${SummaryApi.physical_stock_get.url(physicalStockId)}`,
        {
          method: SummaryApi.physical_stock_get.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        data?: PhysicalStockEntry;
        message?: string;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to load stock entry");
      }

      const entry = result.data;
      setReferenceNo(entry.referenceNo || "");
      setNotes(entry.notes || "");
      setSelectedShopId(entry.shopId || "");
      setSelectedShopName(entry.shopName || "");
      setItems(
        Array.isArray(entry.items)
          ? entry.items.map((item) => ({
              ...item,
              physicalQty: Number(item.physicalQty || item.systemQty || 0),
              reason: item.reason || REASONS[0],
            }))
          : []
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load stock entry"
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, isEditMode, physicalStockId]);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

  useEffect(() => {
    if (selectedShopId) {
      void loadProducts(selectedShopId);
    }
  }, [loadProducts, selectedShopId]);

  useEffect(() => {
    if (isEditMode) {
      void loadEntry();
    }
  }, [isEditMode, loadEntry]);

  function addProduct(product: ShopProductItem) {
    setItems((prev) => {
      if (prev.some((item) => item.productId === product._id)) return prev;
      return [
        ...prev,
        {
          productId: product._id,
          shopProductId: product._id,
          itemName: product.itemName || "Unnamed Product",
          itemCode: product.itemCode || product.itemModelNumber || "-",
          itemModelNumber: product.itemModelNumber || "",
          systemQty: Number(product.qty || 0),
          physicalQty: Number(product.qty || 0),
          reason: REASONS[0],
        },
      ];
    });
  }

  function updateQuantity(productId: string, value: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              physicalQty: Math.max(0, value),
            }
          : item
      )
    );
  }

  function updateReason(productId: string, reason: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, reason } : item
      )
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  async function handleSubmit() {
    if (!selectedShopId) {
      toast.error("Please select a warehouse/location before saving.");
      return;
    }

    if (!items.length) {
      toast.error("Add at least one product to save physical stock entry.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        shopId: selectedShopId,
        referenceNo,
        notes,
        items: items.map((item) => ({
          productId: item.productId,
          shopProductId: item.shopProductId,
          physicalQty: item.physicalQty,
          reason: item.reason,
        })),
      };

      const requestUrl = isEditMode
        ? SummaryApi.physical_stock_update.url(physicalStockId)
        : SummaryApi.physical_stock_create.url;
      const requestMethod = isEditMode
        ? SummaryApi.physical_stock_update.method
        : SummaryApi.physical_stock_create.method;

      const response = await fetch(`${baseURL}${requestUrl}`, {
        method: requestMethod,
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
        data?: { _id?: string };
      };

      if (!response.ok || !result.success || !result.data?._id) {
        throw new Error(result.message || "Unable to save physical stock entry");
      }

      toast.success(
        isEditMode
          ? "Physical stock entry updated successfully."
          : "Physical stock entry created successfully."
      );

      router.push(`/shopowner/physical-stock/view/${result.data._id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save physical stock entry"
      );
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save physical stock entry"
      );
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
                <Save className="h-3.5 w-3.5" />
                Physical Stock Entry
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                {isEditMode ? "Edit Physical Stock Entry" : "Create Physical Stock Entry"}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Record and correct physical inventory for your selected warehouse or location.
              </p>
            </div>

            <div className="text-sm text-white/85">
              <p>Location: {shopLabel}</p>
              <p>{isEditMode ? "Edit mode" : "Create new entry"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Warehouse / Location
              </label>
              <select
                value={selectedShopId}
                onChange={(event) => {
                  setSelectedShopId(event.target.value);
                  const matched = shops.find((shop) => shop._id === event.target.value);
                  setSelectedShopName(matched?.name || "");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
              >
                <option value="">Select location</option>
                {shops.map((shop) => (
                  <option key={shop._id} value={shop._id}>
                    {shop.name || "Unnamed Location"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Reference No
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                placeholder="Enter reference number"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400"
              placeholder="Additional notes for this stock entry"
            />
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Products</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add products and record physical stock counts for this entry.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Search</span>
                <input
                  className="ml-2 w-full bg-transparent text-sm text-slate-900 outline-none"
                  placeholder="Search products"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedShopId) {
                    void loadProducts(selectedShopId);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh Products
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="min-w-full border-collapse bg-white text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-4">Product</th>
                  <th className="px-4 py-4">SKU</th>
                  <th className="px-4 py-4">System Stock</th>
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
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={items.some((row) => row.productId === product._id)}
                        onClick={() => addProduct(product)}
                        className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
                {availableProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      No products found for this location.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Selected Products</h3>
                <p className="text-sm text-slate-500">Adjust physical quantity and reason for each line.</p>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                Net Difference: <span className={totalDifference >= 0 ? "text-emerald-700" : "text-rose-700"}>{totalDifference >= 0 ? `+${totalDifference}` : totalDifference}</span>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                Add products from the table above to begin a stock entry.
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="min-w-full border-collapse text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Product</th>
                      <th className="px-4 py-4">System</th>
                      <th className="px-4 py-4">Physical</th>
                      <th className="px-4 py-4">Difference</th>
                      <th className="px-4 py-4">Reason</th>
                      <th className="px-4 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.productId} className="border-t border-slate-200">
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {item.itemName}
                          <div className="text-xs text-slate-500">{item.itemCode || item.itemModelNumber || "-"}</div>
                        </td>
                        <td className="px-4 py-4">{item.systemQty}</td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min={0}
                            value={item.physicalQty}
                            onChange={(event) =>
                              updateQuantity(item.productId, Number(event.target.value))
                            }
                            className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                          />
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {item.physicalQty - item.systemQty}
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={item.reason}
                            onChange={(event) => updateReason(item.productId, event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                          >
                            {REASONS.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
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

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Total products: <span className="font-semibold text-slate-900">{items.length}</span>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loading || !selectedShopId}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditMode ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
