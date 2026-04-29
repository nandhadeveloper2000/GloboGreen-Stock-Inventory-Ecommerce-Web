"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type PurchaseMode = "SINGLE_SUPPLIER" | "MULTI_SUPPLIER";

type PayMode = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "CREDIT";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type VendorItem = {
  _id: string;
  vendorName?: string;
  name?: string;
  code?: string;
  status?: string;
};

type VendorReference =
  | string
  | {
      _id?: string;
      vendorName?: string;
      name?: string;
      code?: string;
      status?: string;
    };

type ProductReference =
  | string
  | {
      _id?: string;
      itemName?: string;
      itemModelNumber?: string;
      itemKey?: string;
    };

type ShopProductItem = {
  _id: string;
  productId?: ProductReference;
  itemName?: string;
  itemKey?: string;
  itemCode?: string;
  itemModelNumber?: string;
  inputPrice?: number;
  qty?: number;
};

type PurchaseOrderItem = {
  _id?: string;
  supplierId?: VendorReference | null;
  shopProductId?: string | ShopProductItem | null;
  productId?: ProductReference | null;
  itemCode?: string;
  productName?: string;
  batch?: string;
  qty?: number;
  purchasePrice?: number;
  discount?: {
    percent?: number;
    amount?: number;
  };
  tax?: {
    label?: string;
    percent?: number;
  };
};

type PurchaseOrder = {
  _id: string;
  mode?: PurchaseMode | string;
  supplierId?: VendorReference | null;
  purchaseDate?: string | null;
  invoiceNo?: string;
  invoiceDate?: string | null;
  payMode?: PayMode | string;
  overallDiscount?: number;
  discountAmount?: number;
  status?: string;
  items?: PurchaseOrderItem[];
};

type PurchasePayloadItem = {
  supplierId: string | null;
  shopProductId: string | null;
  productId: string | null;
  itemCode: string;
  productName: string;
  batch: string;
  qty: number;
  purchasePrice: number;
  discount: {
    percent: number;
    amount: number;
  };
  tax: {
    label: string;
    percent: number;
  };
};

type PurchaseRow = {
  id: string;
  supplierId: string;
  shopProductId: string;
  productId: string;
  itemCode: string;
  productName: string;
  batch: string;
  qty: string;
  purchasePrice: string;
  discountPercent: string;
  discountAmount: string;
  taxLabel: string;
  taxPercent: string;
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

const TAX_OPTIONS = [
  { label: "None", percent: 0 },
  { label: "GST 5%", percent: 5 },
  { label: "GST 12%", percent: 12 },
  { label: "GST 18%", percent: 18 },
  { label: "GST 28%", percent: 28 },
];

const PAY_MODES: PayMode[] = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "CREDIT",
];

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function n(value: unknown, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) return fallback;

  return number;
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function makeRow(): PurchaseRow {
  return {
    id: crypto.randomUUID(),
    supplierId: "",
    shopProductId: "",
    productId: "",
    itemCode: "",
    productName: "",
    batch: "",
    qty: "1",
    purchasePrice: "",
    discountPercent: "0",
    discountAmount: "0",
    taxLabel: "None",
    taxPercent: "0",
  };
}

function getVendorName(vendor?: VendorItem | null) {
  return String(
    vendor?.vendorName || vendor?.name || vendor?.code || "Supplier",
  );
}

function getReferenceId(
  value?: VendorReference | ProductReference | ShopProductItem | null,
) {
  if (!value) return "";
  if (typeof value === "string") return value;

  if ("_id" in value && typeof value._id === "string") {
    return value._id;
  }

  return "";
}

function getShopProductName(item?: ShopProductItem | null) {
  if (!item) return "";

  if (item.productId && typeof item.productId !== "string") {
    const name = item.productId.itemName || item.productId.itemKey || "Product";
    const model = item.productId.itemModelNumber || "";
    return model ? `${name} (${model})` : name;
  }

  return item.itemName || item.itemModelNumber || item.itemKey || "Product";
}

function getShopProductProductId(item?: ShopProductItem | null) {
  if (!item?.productId) return "";

  if (typeof item.productId === "string") return item.productId;

  return String(item.productId._id || "");
}

function getShopProductCode(item?: ShopProductItem | null) {
  return String(item?.itemCode || item?.itemModelNumber || item?.itemKey || "");
}

function formatDateInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function normalizePurchaseMode(value?: string | null): PurchaseMode {
  return String(value || "").toUpperCase() === "MULTI_SUPPLIER"
    ? "MULTI_SUPPLIER"
    : "SINGLE_SUPPLIER";
}

function normalizePayMode(value?: string | null): PayMode {
  const normalized = String(value || "").toUpperCase();

  if (PAY_MODES.includes(normalized as PayMode)) {
    return normalized as PayMode;
  }

  return "CASH";
}

function buildPurchasePayloadItems(
  rows: PurchaseRow[],
  mode: PurchaseMode,
  supplierId: string,
): PurchasePayloadItem[] {
  const items = rows.map((row) => ({
    supplierId:
      (mode === "SINGLE_SUPPLIER" ? supplierId : row.supplierId) || null,
    shopProductId: row.shopProductId || null,
    productId: row.productId || null,
    itemCode: row.itemCode,
    productName: row.productName,
    batch: row.batch,
    qty: n(row.qty, 1),
    purchasePrice: n(row.purchasePrice, 0),
    discount: {
      percent: n(row.discountPercent, 0),
      amount: n(row.discountAmount, 0),
    },
    tax: {
      label: row.taxLabel,
      percent: n(row.taxPercent, 0),
    },
  }));

  if (mode !== "MULTI_SUPPLIER") {
    return items;
  }

  return [...items].sort((left, right) => {
    const supplierCompare = String(left.supplierId || "").localeCompare(
      String(right.supplierId || ""),
    );

    if (supplierCompare !== 0) return supplierCompare;

    const productCompare = left.productName.localeCompare(right.productName);

    if (productCompare !== 0) return productCompare;

    return left.itemCode.localeCompare(right.itemCode);
  });
}

function calculateRow(row: PurchaseRow) {
  const qty = Math.max(n(row.qty, 1), 1);
  const purchasePrice = n(row.purchasePrice, 0);

  const gross = qty * purchasePrice;

  const discountPercent = Math.min(n(row.discountPercent, 0), 100);
  const discountByPercent = (gross * discountPercent) / 100;
  const manualDiscount = n(row.discountAmount, 0);

  const discount = Math.min(
    gross,
    manualDiscount > 0 ? manualDiscount : discountByPercent,
  );

  const afterDiscount = Math.max(gross - discount, 0);

  const taxPercent = Math.min(n(row.taxPercent, 0), 100);
  const taxAmount = (afterDiscount * taxPercent) / 100;

  const purchaseAfterTax = afterDiscount + taxAmount;

  return {
    qty,
    gross: round(gross),
    discount: round(discount),
    taxAmount: round(taxAmount),
    purchaseAfterTax: round(purchaseAfterTax),
    amount: round(purchaseAfterTax),
  };
}

function calculateGrossValue(qty: string, purchasePrice: string) {
  return Math.max(n(qty, 1), 1) * n(purchasePrice, 0);
}

function calculateDiscountAmountValue(
  qty: string,
  purchasePrice: string,
  discountPercent: string,
) {
  const gross = calculateGrossValue(qty, purchasePrice);
  const percent = Math.min(n(discountPercent, 0), 100);

  return String(round((gross * percent) / 100));
}

function calculateDiscountPercentValue(
  qty: string,
  purchasePrice: string,
  discountAmount: string,
) {
  const gross = calculateGrossValue(qty, purchasePrice);

  if (gross <= 0) return "0";

  const amount = Math.min(n(discountAmount, 0), gross);

  return String(round((amount / gross) * 100));
}

function readSelectedShop() {
  if (typeof window === "undefined") return { id: "", name: "" };

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
  };
}

export default function PurchaseCreatePage({
  mode: pageMode = "create",
  purchaseId = "",
}: {
  mode?: "create" | "edit";
  purchaseId?: string;
}) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const isEditMode = pageMode === "edit";

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");

  const [mode, setMode] = useState<PurchaseMode>("SINGLE_SUPPLIER");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayInput());
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("CASH");
  const [overallDiscount, setOverallDiscount] = useState("0");

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [products, setProducts] = useState<ShopProductItem[]>([]);
  const [rows, setRows] = useState<PurchaseRow[]>([makeRow()]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading purchase entry.",
  );

  const supplierOptions = useMemo(
    () =>
      vendors.filter(
        (vendor) =>
          String(vendor.status || "ACTIVE").toUpperCase() === "ACTIVE",
      ),
    [vendors],
  );

  const distinctSupplierCount = useMemo(
    () =>
      new Set(
        rows
          .map((row) =>
            mode === "SINGLE_SUPPLIER" ? supplierId : row.supplierId,
          )
          .filter(Boolean),
      ).size,
    [mode, rows, supplierId],
  );

  const totals = useMemo(() => {
    const calculated = rows.map(calculateRow);

    const subtotal = round(
      calculated.reduce((sum, item) => sum + item.gross, 0),
    );
    const tax = round(
      calculated.reduce((sum, item) => sum + item.taxAmount, 0),
    );
    const lineDiscount = round(
      calculated.reduce((sum, item) => sum + item.discount, 0),
    );
    const totalQty = calculated.reduce((sum, item) => sum + item.qty, 0);
    const netAmount = round(
      Math.max(
        calculated.reduce((sum, item) => sum + item.amount, 0) -
          n(overallDiscount, 0),
        0,
      ),
    );

    return {
      itemCount: rows.length,
      totalQty,
      subtotal,
      tax,
      lineDiscount,
      overallDiscount: n(overallDiscount, 0),
      discount: round(lineDiscount + n(overallDiscount, 0)),
      netAmount,
    };
  }, [overallDiscount, rows]);

  const resetForm = useCallback(() => {
    setMode("SINGLE_SUPPLIER");
    setSupplierId("");
    setPurchaseDate(todayInput());
    setInvoiceNo("");
    setInvoiceDate("");
    setPayMode("CASH");
    setOverallDiscount("0");
    setRows([makeRow()]);
  }, []);

  const applyPurchaseToForm = useCallback((purchase: PurchaseOrder) => {
    const nextMode = normalizePurchaseMode(purchase.mode);
    const mappedRows =
      Array.isArray(purchase.items) && purchase.items.length
        ? purchase.items.map((item) => {
            const taxLabel = String(item.tax?.label || "None");
            const matchedTax =
              TAX_OPTIONS.find((option) => option.label === taxLabel) || null;

            return {
              id: item._id || crypto.randomUUID(),
              supplierId: getReferenceId(item.supplierId),
              shopProductId: getReferenceId(item.shopProductId),
              productId: getReferenceId(item.productId),
              itemCode: String(item.itemCode || ""),
              productName: String(item.productName || ""),
              batch: String(item.batch || ""),
              qty: String(item.qty ?? 1),
              purchasePrice: String(item.purchasePrice ?? ""),
              discountPercent: String(item.discount?.percent ?? 0),
              discountAmount: String(item.discount?.amount ?? 0),
              taxLabel: matchedTax?.label || taxLabel,
              taxPercent: String(item.tax?.percent ?? matchedTax?.percent ?? 0),
            };
          })
        : [makeRow()];

    setMode(nextMode);
    setSupplierId(
      getReferenceId(purchase.supplierId) ||
        (nextMode === "SINGLE_SUPPLIER" ? mappedRows[0]?.supplierId || "" : ""),
    );
    setPurchaseDate(formatDateInput(purchase.purchaseDate) || todayInput());
    setInvoiceNo(String(purchase.invoiceNo || ""));
    setInvoiceDate(formatDateInput(purchase.invoiceDate));
    setPayMode(normalizePayMode(purchase.payMode));
    setOverallDiscount(String(purchase.overallDiscount ?? 0));
    setRows(mappedRows);
  }, []);

  const loadData = useCallback(async () => {
    if (!accessToken || !selectedShopId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage(
        isEditMode
          ? "Loading purchase for editing."
          : "Loading purchase entry.",
      );

      const purchaseRequest =
        isEditMode && purchaseId
          ? fetch(
              `${baseURL}${SummaryApi.purchase_detail.url(
                selectedShopId,
                purchaseId,
              )}`,
              {
                method: SummaryApi.purchase_detail.method,
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: "application/json",
                },
                credentials: "include",
                cache: "no-store",
              },
            )
          : Promise.resolve(null);

      const [vendorsResponse, productsResponse, purchaseResponse] =
        await Promise.all([
          fetch(
            `${baseURL}${SummaryApi.vendors.listByShop(selectedShopId).url}`,
            {
              method: SummaryApi.vendors.listByShop(selectedShopId).method,
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
              },
              credentials: "include",
              cache: "no-store",
            },
          ),
          fetch(
            `${baseURL}${SummaryApi.shop_product_list.url(selectedShopId)}`,
            {
              method: SummaryApi.shop_product_list.method,
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
              },
              credentials: "include",
              cache: "no-store",
            },
          ),
          purchaseRequest,
        ]);

      const vendorsResult = (await vendorsResponse
        .json()
        .catch(() => ({}))) as ApiResponse<VendorItem[]>;

      const productsResult = (await productsResponse
        .json()
        .catch(() => ({}))) as ApiResponse<ShopProductItem[]>;

      if (!vendorsResponse.ok || !vendorsResult.success) {
        throw new Error(vendorsResult.message || "Failed to load suppliers");
      }

      if (!productsResponse.ok || !productsResult.success) {
        throw new Error(productsResult.message || "Failed to load products");
      }

      const nextVendors = Array.isArray(vendorsResult.data)
        ? vendorsResult.data
        : [];
      const nextProducts = Array.isArray(productsResult.data)
        ? productsResult.data
        : [];

      setVendors(nextVendors);
      setProducts(nextProducts);

      if (purchaseResponse) {
        const purchaseResult = (await purchaseResponse
          .json()
          .catch(() => ({}))) as ApiResponse<PurchaseOrder>;

        if (
          !purchaseResponse.ok ||
          !purchaseResult.success ||
          !purchaseResult.data
        ) {
          throw new Error(
            purchaseResult.message || "Failed to load purchase order",
          );
        }

        applyPurchaseToForm(purchaseResult.data);
      } else if (!isEditMode) {
        resetForm();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load purchase data",
      );
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    applyPurchaseToForm,
    isEditMode,
    purchaseId,
    resetForm,
    selectedShopId,
  ]);

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateRow(rowId: string, patch: Partial<PurchaseRow>) {
    setRows((previous) =>
      previous.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  }

  function updateRowWithPercentDiscount(
    rowId: string,
    patch: Partial<PurchaseRow>,
  ) {
    setRows((previous) =>
      previous.map((row) => {
        if (row.id !== rowId) return row;

        const nextRow = { ...row, ...patch };

        return {
          ...nextRow,
          discountAmount: calculateDiscountAmountValue(
            nextRow.qty,
            nextRow.purchasePrice,
            nextRow.discountPercent,
          ),
        };
      }),
    );
  }

  function updateRowDiscountPercent(rowId: string, discountPercent: string) {
    setRows((previous) =>
      previous.map((row) => {
        if (row.id !== rowId) return row;

        return {
          ...row,
          discountPercent,
          discountAmount: calculateDiscountAmountValue(
            row.qty,
            row.purchasePrice,
            discountPercent,
          ),
        };
      }),
    );
  }

  function updateRowDiscountAmount(rowId: string, discountAmount: string) {
    setRows((previous) =>
      previous.map((row) => {
        if (row.id !== rowId) return row;

        return {
          ...row,
          discountAmount,
          discountPercent: calculateDiscountPercentValue(
            row.qty,
            row.purchasePrice,
            discountAmount,
          ),
        };
      }),
    );
  }

  function selectProduct(rowId: string, shopProductId: string) {
    const product = products.find(
      (item) => String(item._id) === String(shopProductId),
    );

    updateRowWithPercentDiscount(rowId, {
      shopProductId,
      productId: getShopProductProductId(product),
      itemCode: getShopProductCode(product),
      productName: getShopProductName(product),
      purchasePrice: String(product?.inputPrice || ""),
    });
  }

  function selectTax(rowId: string, label: string) {
    const tax =
      TAX_OPTIONS.find((item) => item.label === label) || TAX_OPTIONS[0];

    updateRow(rowId, {
      taxLabel: tax.label,
      taxPercent: String(tax.percent),
    });
  }

  function addRow() {
    setRows((previous) => [...previous, makeRow()]);
  }

  function removeRow(rowId: string) {
    setRows((previous) => {
      if (previous.length === 1) return previous;
      return previous.filter((row) => row.id !== rowId);
    });
  }

  function clearForm() {
    if (isEditMode && purchaseId) {
      void loadData();
      return;
    }

    resetForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      toast.error("Unauthorized. Please login again.");
      return;
    }

    if (!selectedShopId) {
      toast.error("Please select a shop.");
      return;
    }

    if (mode === "SINGLE_SUPPLIER" && !supplierId) {
      toast.error("Please select supplier.");
      return;
    }

    for (const row of rows) {
      if (mode === "MULTI_SUPPLIER" && !row.supplierId) {
        toast.error("Please select supplier for every row.");
        return;
      }

      if (!row.productName.trim()) {
        toast.error("Please select or enter product name.");
        return;
      }

      if (n(row.qty, 0) <= 0) {
        toast.error("Quantity must be greater than zero.");
        return;
      }

      if (n(row.purchasePrice, 0) <= 0) {
        toast.error("Purchase price is required.");
        return;
      }
    }

    try {
      setSaving(true);
      const purchaseItems = buildPurchasePayloadItems(rows, mode, supplierId);

      const payload = {
        mode,
        supplierId: mode === "SINGLE_SUPPLIER" ? supplierId : null,
        purchaseDate,
        invoiceNo,
        invoiceDate: invoiceDate || null,
        payMode,
        overallDiscount: n(overallDiscount, 0),
        items: purchaseItems,
      };

      const endpoint =
        isEditMode && purchaseId
          ? SummaryApi.purchase_update.url(selectedShopId, purchaseId)
          : SummaryApi.purchase_create.url(selectedShopId);

      const method =
        isEditMode && purchaseId
          ? SummaryApi.purchase_update.method
          : SummaryApi.purchase_create.method;

      const response = await fetch(`${baseURL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<PurchaseOrder>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save purchase order");
      }

      toast.success(
        isEditMode
          ? "Purchase order updated successfully"
          : "Purchase order saved successfully",
      );
      router.push("/shopowner/purchase/list");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save purchase",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="premium-card-solid flex items-center gap-3 rounded-card px-6 py-5">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-semibold text-slate-700">
              {loadingMessage}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="page-shell product-create-form-compact"
    >
      <div className="mx-auto w-full max-w-[1800px] space-y-4">
        <section className="sticky top-4 z-30 premium-hero premium-glow overflow-hidden rounded-card px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                {isEditMode ? "Purchase Edit" : "Purchase Order"}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                {isEditMode ? "Update Purchase Bill" : "Create Purchase Bill"}
              </h1>
              <p className="mt-2 text-sm text-white/80">
                {selectedShopName || "No shop selected"} · Purchase Date{" "}
                {displayDate(new Date(purchaseDate))}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-10 items-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white/95">
                Items: {totals.itemCount}
              </span>
              <span className="inline-flex h-10 items-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white/95">
                Qty: {totals.totalQty}
              </span>
              {mode === "MULTI_SUPPLIER" ? (
                <span className="inline-flex h-10 items-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white/95">
                  Suppliers: {distinctSupplierCount}
                </span>
              ) : null}
              <Link
                href="/shopowner/purchase/list"
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/25 bg-white px-4 text-sm font-semibold text-primary transition hover:bg-white/90"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>

              <button
                type="button"
                onClick={clearForm}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/25 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className="premium-card-solid rounded-card p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-soft-token px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                {isEditMode ? "Edit Purchase Order" : "Create Purchase Order"}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                Shop: {selectedShopName || "No shop selected"}
              </p>
            </div>

            {isEditMode && purchaseId ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                Purchase ID: {purchaseId}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[200px_minmax(0,1fr)_160px_160px_160px_170px]">
            <div>
              <label className="premium-label">Mode</label>
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as PurchaseMode)
                }
                className="premium-select"
              >
                <option value="SINGLE_SUPPLIER">Single Supplier</option>
                <option value="MULTI_SUPPLIER">Multiple Supplier</option>
              </select>
            </div>

            {mode === "SINGLE_SUPPLIER" ? (
              <div>
                <label className="premium-label">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                  className="premium-select"
                >
                  <option value="">Search supplier...</option>
                  {supplierOptions.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {getVendorName(vendor)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="premium-label">Supplier</label>
                <div className="flex h-10 items-center rounded-xl border border-token bg-soft-token px-3 text-sm font-semibold text-secondary-text">
                  Row wise supplier
                </div>
              </div>
            )}

            <div>
              <label className="premium-label">Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className="premium-input"
              />
            </div>

            <div>
              <label className="premium-label">Inv No</label>
              <input
                value={invoiceNo}
                onChange={(event) => setInvoiceNo(event.target.value)}
                placeholder="Inv No"
                className="premium-input"
              />
            </div>

            <div>
              <label className="premium-label">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className="premium-input"
              />
            </div>

            <div>
              <label className="premium-label">Pay Mode</label>
              <select
                value={payMode}
                onChange={(event) => setPayMode(event.target.value as PayMode)}
                className="premium-select"
              >
                {PAY_MODES.map((item) => (
                  <option key={item} value={item}>
                    {item.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <div className="rounded-3xl border border-token bg-gradient-soft px-5 py-4 text-right shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary-text">
                Current Net Amount
              </p>
              <p className="mt-1 text-[clamp(2rem,4vw,3.8rem)] font-black leading-none text-primary">
                {totals.netAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </section>

        <section className="premium-card-solid overflow-hidden rounded-card p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse text-left text-[13px]">
              <thead className="bg-primary text-[11px] font-black uppercase tracking-wide text-white">
                <tr>
                  <th className="border-r border-white/20 px-3 py-3">S.No</th>

                  {mode === "MULTI_SUPPLIER" ? (
                    <th className="border-r border-white/20 px-3 py-3">
                      Supplier
                    </th>
                  ) : null}

                  <th className="border-r border-white/20 px-3 py-3">
                    Item Code
                  </th>
                  <th className="border-r border-white/20 px-3 py-3">
                    Product Name
                  </th>
                  <th className="border-r border-white/20 px-3 py-3">Batch</th>
                  <th className="border-r border-white/20 px-3 py-3">Qty</th>
                  <th className="border-r border-white/20 px-3 py-3">
                    Purchase Price
                  </th>
                  <th className="border-r border-white/20 px-3 py-3">
                    Discount (% / ₹)
                  </th>
                  <th className="border-r border-white/20 px-3 py-3">Tax</th>
                  <th className="border-r border-white/20 px-3 py-3">
                    Purchase After Tax
                  </th>
                  <th className="border-r border-white/20 px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  const calculated = calculateRow(row);

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-token bg-slate-50 align-top transition-colors hover:bg-slate-100"
                    >
                      <td className="border-r border-token px-3 py-2 text-sm font-semibold text-heading">
                        {index + 1}
                      </td>

                      {mode === "MULTI_SUPPLIER" ? (
                        <td className="border-r border-token px-3 py-2">
                          <select
                            value={row.supplierId}
                            onChange={(event) =>
                              updateRow(row.id, {
                                supplierId: event.target.value,
                              })
                            }
                            className="premium-select min-w-[180px]"
                          >
                            <option value="">Supplier</option>
                            {supplierOptions.map((vendor) => (
                              <option key={vendor._id} value={vendor._id}>
                                {getVendorName(vendor)}
                              </option>
                            ))}
                          </select>
                        </td>
                      ) : null}

                      <td className="border-r border-token px-3 py-2">
                        <input
                          value={row.itemCode}
                          onChange={(event) =>
                            updateRow(row.id, { itemCode: event.target.value })
                          }
                          placeholder="Item code"
                          className="premium-input min-w-[132px]"
                        />
                      </td>

                      <td className="border-r border-token px-3 py-2">
                        <select
                          value={row.shopProductId}
                          onChange={(event) =>
                            selectProduct(row.id, event.target.value)
                          }
                          className="premium-select min-w-[250px]"
                        >
                          <option value="">
                            {row.productName || "Type to search..."}
                          </option>
                          {row.shopProductId &&
                          !products.some(
                            (product) =>
                              String(product._id) === String(row.shopProductId),
                          ) ? (
                            <option value={row.shopProductId}>
                              {row.productName ||
                                row.itemCode ||
                                "Current product"}
                            </option>
                          ) : null}
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>
                              {getShopProductName(product)}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="border-r border-token px-3 py-2">
                        <input
                          value={row.batch}
                          onChange={(event) =>
                            updateRow(row.id, { batch: event.target.value })
                          }
                          placeholder="Batch"
                          className="premium-input min-w-[132px]"
                        />
                      </td>

                      <td className="border-r border-token px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          value={row.qty}
                          onChange={(event) =>
                            updateRowWithPercentDiscount(row.id, {
                              qty: event.target.value,
                            })
                          }
                          className="premium-input w-[88px]"
                        />
                      </td>

                      <td className="border-r border-token px-3 py-2">
                        <div className="purchase-affix-field purchase-affix-field--left min-w-[132px]">
                          <span className="purchase-affix-left">₹</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.purchasePrice}
                            onChange={(event) =>
                              updateRowWithPercentDiscount(row.id, {
                                purchasePrice: event.target.value,
                              })
                            }
                            className="premium-input min-w-[132px]"
                          />
                        </div>
                      </td>

                      <td className="border-r border-token px-3 py-2">
                        <div className="purchase-discount-grid">
                          <div className="purchase-affix-field purchase-affix-field--right">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.discountPercent}
                              onChange={(event) =>
                                updateRowDiscountPercent(
                                  row.id,
                                  event.target.value,
                                )
                              }
                              className="premium-input"
                            />
                            <span className="purchase-affix-right">%</span>
                          </div>

                          <div className="purchase-affix-field purchase-affix-field--left">
                            <span className="purchase-affix-left">₹</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.discountAmount}
                              onChange={(event) =>
                                updateRowDiscountAmount(
                                  row.id,
                                  event.target.value,
                                )
                              }
                              className="premium-input"
                            />
                          </div>
                        </div>
                      </td>

                      <td className="border-r border-token px-3 py-2">
                        <select
                          value={row.taxLabel}
                          onChange={(event) =>
                            selectTax(row.id, event.target.value)
                          }
                          className="premium-select min-w-[128px]"
                        >
                          {TAX_OPTIONS.map((tax) => (
                            <option key={tax.label} value={tax.label}>
                              {tax.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="border-r border-token px-3 py-2">
                        <div className="purchase-affix-field purchase-affix-field--left min-w-[142px]">
                          <span className="purchase-affix-left">₹</span>
                          <input
                            readOnly
                            value={calculated.purchaseAfterTax.toFixed(2)}
                            className="premium-input min-w-[142px] bg-slate-100 font-bold text-slate-700"
                          />
                        </div>
                      </td>

                      <td className="border-r border-token px-3 py-2 text-sm font-black text-heading">
                        <span className="whitespace-nowrap">
                          {money(calculated.amount)}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <button
          type="button"
          onClick={addRow}
          className="premium-btn h-11 gap-2 px-5"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="premium-card-solid rounded-card p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-secondary-text">
                  History
                </p>
                <h3 className="text-lg font-black text-heading">
                  Item History
                </h3>
              </div>

              <span className="rounded-full bg-soft-token px-3 py-1 text-xs font-semibold text-secondary-text">
                Supplier and product activity
              </span>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-token">
              <table className="w-full text-sm">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="px-3 py-2 text-left">Invoice No</th>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Bill Date</th>
                    <th className="px-3 py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-xs text-muted-text"
                    >
                      Select a supplier and product to see history
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="premium-card-solid rounded-card p-4 md:p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-secondary-text">
                Billing Summary
              </p>
              <h3 className="text-lg font-black text-heading">Order Totals</h3>
            </div>

            <label className="premium-label">Overall Discount ₹</label>
            <div className="purchase-affix-field purchase-affix-field--left mb-4">
              <span className="purchase-affix-left">₹</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={overallDiscount}
                onChange={(event) => setOverallDiscount(event.target.value)}
                className="premium-input"
              />
            </div>
            <div className="space-y-3 rounded-3xl bg-soft-token p-4 text-sm text-heading">
              <div className="flex items-center justify-between">
                <span className="text-secondary-text">Subtotal</span>
                <b>{totals.subtotal.toFixed(2)}</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-text">Tax</span>
                <b>{totals.tax.toFixed(2)}</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-text">Discount</span>
                <b>{totals.discount.toFixed(2)}</b>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-token bg-gradient-soft p-5 text-right">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-secondary-text">
                Net Amount
              </p>
              <p className="mt-2 text-3xl font-black text-primary">
                {totals.netAmount.toFixed(2)}
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="premium-btn mt-4 flex h-12 w-full items-center justify-center gap-2 text-base font-black"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              {saving
                ? isEditMode
                  ? "Updating Purchase..."
                  : "Saving Purchase..."
                : isEditMode
                  ? "Update Purchase"
                  : "Save Bill"}
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}
