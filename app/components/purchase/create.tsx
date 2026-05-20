"use client";

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
  Check,
  Loader2,
  PackagePlus,
  RotateCcw,
  Save,
  Search,
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
      sku?: string;
    };

type ShopProductItem = {
  _id: string;
  productId?: ProductReference;
  itemName?: string;
  itemKey?: string;
  itemCode?: string;
  sku?: string;
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
  profitPercent: string;
  sellingPrice: string;
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

const TAX_OPTIONS = [
  { label: "No Tax", percent: 0 },
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
    taxLabel: "No Tax",
    taxPercent: "0",
    profitPercent: "",
    sellingPrice: "",
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
  if (!item) return "";

  const nestedProduct =
    item.productId && typeof item.productId !== "string" ? item.productId : null;

  return String(
    item.itemCode ||
      item.sku ||
      nestedProduct?.sku ||
      item.itemModelNumber ||
      item.itemKey ||
      "",
  );
}

function normalizeSearchText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getShopProductSearchText(item?: ShopProductItem | null) {
  if (!item) return "";

  const nestedProduct =
    item.productId && typeof item.productId !== "string" ? item.productId : null;

  return normalizeSearchText(
    [
      getShopProductCode(item),
      getShopProductName(item),
      item.itemName,
      item.itemModelNumber,
      item.itemKey,
      item.sku,
      nestedProduct?.itemName,
      nestedProduct?.itemModelNumber,
      nestedProduct?.itemKey,
      nestedProduct?.sku,
    ]
      .filter(Boolean)
      .join(" "),
  );
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

  if (mode !== "MULTI_SUPPLIER") return items;

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

  const profitPercent = Math.min(n(row.profitPercent, 0), 1000);
  const autoSellingPrice =
    purchaseAfterTax + (purchaseAfterTax * profitPercent) / 100;
  const sellingPrice = row.sellingPrice
    ? n(row.sellingPrice, 0)
    : autoSellingPrice;

  return {
    qty,
    gross: round(gross),
    discount: round(discount),
    taxAmount: round(taxAmount),
    purchaseAfterTax: round(purchaseAfterTax),
    sellingPrice: round(sellingPrice),
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
  const [openItemCodeRowId, setOpenItemCodeRowId] = useState("");

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

  const fieldClass =
    "h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-1 focus:ring-[#00008b]";
  const selectClass =
    "h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-1 focus:ring-[#00008b]";
  const labelClass = "mb-1 block text-xs font-bold text-slate-700";
  const headerButtonClass =
    "inline-flex h-8 items-center justify-center gap-1.5 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b]";

  const resetForm = useCallback(() => {
    setMode("SINGLE_SUPPLIER");
    setSupplierId("");
    setPurchaseDate(todayInput());
    setInvoiceNo("");
    setInvoiceDate("");
    setPayMode("CASH");
    setOverallDiscount("0");
    setRows([makeRow()]);
    setOpenItemCodeRowId("");
  }, []);

  const applyPurchaseToForm = useCallback((purchase: PurchaseOrder) => {
    const nextMode = normalizePurchaseMode(purchase.mode);
    const mappedRows =
      Array.isArray(purchase.items) && purchase.items.length
        ? purchase.items.map((item) => {
            const taxLabel = String(item.tax?.label || "No Tax");
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
              profitPercent: "",
              sellingPrice: "",
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
    setOpenItemCodeRowId("");
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

      setVendors(Array.isArray(vendorsResult.data) ? vendorsResult.data : []);
      setProducts(Array.isArray(productsResult.data) ? productsResult.data : []);

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
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (!target?.closest("[data-item-code-combobox='true']")) {
        setOpenItemCodeRowId("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function updateRow(rowId: string, patch: Partial<PurchaseRow>) {
    setRows((previous) =>
      previous.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
  }

  function updateRowItemCodeSearch(rowId: string, value: string) {
    setRows((previous) =>
      previous.map((row) => {
        if (row.id !== rowId) return row;

        return {
          ...row,
          itemCode: value,
          shopProductId: "",
          productId: "",
          productName: "",
          purchasePrice: "",
          sellingPrice: "",
          profitPercent: "",
        };
      }),
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
      profitPercent: "",
      sellingPrice: "",
    });
    setOpenItemCodeRowId("");
  }

  const getFilteredProducts = useCallback(
    (row: PurchaseRow) => {
      const query = normalizeSearchText(row.itemCode);

      if (!query) {
        return [...products].sort((left, right) =>
          getShopProductName(left).localeCompare(getShopProductName(right)),
        );
      }

      return [...products]
        .filter((product) => getShopProductSearchText(product).includes(query))
        .sort((left, right) => {
          const leftCode = normalizeSearchText(getShopProductCode(left));
          const rightCode = normalizeSearchText(getShopProductCode(right));
          const leftName = normalizeSearchText(getShopProductName(left));
          const rightName = normalizeSearchText(getShopProductName(right));

          const getRank = (code: string, name: string) => {
            if (code === query) return 0;
            if (name === query) return 1;
            if (code.startsWith(query)) return 2;
            if (name.startsWith(query)) return 3;
            if (code.includes(query)) return 4;
            return 5;
          };

          const rankDiff =
            getRank(leftCode, leftName) - getRank(rightCode, rightName);

          if (rankDiff !== 0) return rankDiff;

          return getShopProductName(left).localeCompare(
            getShopProductName(right),
          );
        });
    },
    [products],
  );

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
    if (openItemCodeRowId === rowId) {
      setOpenItemCodeRowId("");
    }

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
      <div className="min-h-screen bg-white">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
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
      className="min-h-screen bg-white text-slate-900"
    >
      <div className="sticky top-0 z-30 border-b border-[#00006f] bg-[#00008b]">
        <div className="flex min-h-10 flex-col gap-2 px-2 py-1.5 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-[22px] font-black uppercase leading-none tracking-[0.06em] text-white">
            PURCHASE-ORDER
          </h1>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="text-sm font-black text-white md:text-base">
              Purchase Date: {displayDate(new Date(purchaseDate))}
            </span>

            <button
              type="button"
              onClick={() => router.back()}
              className={headerButtonClass}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <button
              type="button"
              onClick={clearForm}
              className={`${headerButtonClass} border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-2 py-2">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-end">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_170px_170px_170px_190px] xl:items-end">
            {mode === "SINGLE_SUPPLIER" ? (
              <div>
                <label className={labelClass}>Supplier</label>
                <select
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                  className={selectClass}
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
                <label className={labelClass}>Supplier</label>
                <div className="flex h-10 items-center rounded border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
                  Row wise supplier
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Inv No</label>
              <input
                value={invoiceNo}
                onChange={(event) => setInvoiceNo(event.target.value)}
                placeholder="Inv No"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Pay Mode</label>
              <select
                value={payMode}
                onChange={(event) => setPayMode(event.target.value as PayMode)}
                className={selectClass}
              >
                {PAY_MODES.map((item) => (
                  <option key={item} value={item}>
                    {item.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2">
            <span className="inline-flex h-10 items-center justify-center rounded-xl border border-[#00008b]/20 bg-[#00008b]/5 px-4 text-sm font-black text-[#00008b]">
              Items: {totals.itemCount}
            </span>

            <span className="inline-flex h-10 items-center justify-center rounded-xl border border-[#00008b]/20 bg-[#00008b]/5 px-4 text-sm font-black text-[#00008b]">
              Qty: {totals.totalQty}
            </span>

            {mode === "MULTI_SUPPLIER" ? (
              <span className="inline-flex h-10 items-center justify-center rounded-xl border border-[#00008b]/20 bg-[#00008b]/5 px-4 text-sm font-black text-[#00008b]">
                Suppliers: {distinctSupplierCount}
              </span>
            ) : null}

            <div className="col-span-full text-right">
              <p className="text-[clamp(2.6rem,5vw,4.6rem)] font-black leading-none tracking-[0.04em] text-[#00008b]">
                {totals.netAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isEditMode && purchaseId ? (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          Editing Purchase ID: {purchaseId}
        </div>
      ) : null}

      <div className="overflow-x-auto border-b border-slate-200">
        <div className="min-h-107.5">
          <table className="w-full min-w-415 border-collapse text-left text-sm">
            <thead className="bg-[#00008b] text-white">
              <tr>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  S.No
                </th>

                {mode === "MULTI_SUPPLIER" ? (
                  <th className="border-r border-white/25 px-3 py-2.5 font-black">
                    Supplier
                  </th>
                ) : null}

                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Item Code
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Product Name
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Batch
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Qty
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Purchase Price
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Discount (% / ₹)
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Tax
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Purchase After Tax
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Profit %
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Selling Price
                </th>
                <th className="border-r border-white/25 px-3 py-2.5 text-center font-black">
                  Amount
                </th>
                <th className="px-3 py-2.5 text-center font-black">Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const calculated = calculateRow(row);
                const filteredProducts = getFilteredProducts(row);
                const isItemCodeOpen = openItemCodeRowId === row.id;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-300 bg-[#dcecfb] align-top"
                  >
                    <td className="border-r border-slate-300 px-3 py-2 text-center text-sm font-semibold">
                      {index + 1}
                    </td>

                    {mode === "MULTI_SUPPLIER" ? (
                      <td className="border-r border-slate-300 px-3 py-2">
                        <select
                          value={row.supplierId}
                          onChange={(event) =>
                            updateRow(row.id, {
                              supplierId: event.target.value,
                            })
                          }
                          className={`${selectClass} min-w-45`}
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

                    <td className="border-r border-slate-300 px-3 py-2">
                      <div
                        data-item-code-combobox="true"
                        className="relative min-w-39"
                      >
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          value={row.itemCode}
                          onFocus={() => setOpenItemCodeRowId(row.id)}
                          onChange={(event) => {
                            updateRowItemCodeSearch(row.id, event.target.value);
                            setOpenItemCodeRowId(row.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setOpenItemCodeRowId("");
                            }

                            if (
                              event.key === "Enter" &&
                              filteredProducts.length === 1
                            ) {
                              event.preventDefault();
                              selectProduct(row.id, filteredProducts[0]._id);
                            }
                          }}
                          placeholder="Type to search..."
                          className={`${fieldClass} pl-9`}
                        />

                        {isItemCodeOpen ? (
                          <div className="absolute left-0 top-[calc(100%+0.35rem)] z-40 w-82.5 max-w-[78vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                            <div className="max-h-72 overflow-y-auto p-1.5">
                              {filteredProducts.length ? (
                                filteredProducts.map((product) => {
                                  const itemCode = getShopProductCode(product);
                                  const productName =
                                    getShopProductName(product);
                                  const isSelected =
                                    String(row.shopProductId) ===
                                    String(product._id);

                                  return (
                                    <button
                                      key={product._id}
                                      type="button"
                                      onClick={() =>
                                        selectProduct(row.id, product._id)
                                      }
                                      className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                                        isSelected
                                          ? "bg-[#00008b]/5 text-[#00008b]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-[13px] font-bold">
                                          {productName}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                          SKU: {itemCode || "-"} | Stock:{" "}
                                          {n(product.qty, 0)} | Price:{" "}
                                          {money(n(product.inputPrice, 0))}
                                        </p>
                                      </div>

                                      {isSelected ? (
                                        <Check className="mt-0.5 h-4 w-4 shrink-0" />
                                      ) : null}
                                    </button>
                                  );
                                })
                              ) : (
                                <p className="px-3 py-3 text-[13px] text-slate-500">
                                  No matching product found.
                                </p>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
                      <div className="flex h-10 min-w-47.5 items-center rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
                        {row.productName || "-"}
                      </div>
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
                      <input
                        value={row.batch}
                        onChange={(event) =>
                          updateRow(row.id, { batch: event.target.value })
                        }
                        placeholder="Batch"
                        className={`${fieldClass} min-w-33`}
                      />
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(event) =>
                          updateRowWithPercentDiscount(row.id, {
                            qty: event.target.value,
                          })
                        }
                        className={`${fieldClass} w-22`}
                      />
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
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
                        className={`${fieldClass} min-w-30`}
                      />
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
                      <div className="grid min-w-42.5 grid-cols-2 gap-2">
                        <div className="relative">
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
                            className={`${fieldClass} pr-8`}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                            %
                          </span>
                        </div>

                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                            ₹
                          </span>
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
                            className={`${fieldClass} pl-8`}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
                      <select
                        value={row.taxLabel}
                        onChange={(event) =>
                          selectTax(row.id, event.target.value)
                        }
                        className={`${selectClass} min-w-32.5`}
                      >
                        {TAX_OPTIONS.map((tax) => (
                          <option key={tax.label} value={tax.label}>
                            {tax.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
                      <input
                        readOnly
                        value={calculated.purchaseAfterTax.toFixed(2)}
                        className={`${fieldClass} min-w-32.5 bg-slate-100 font-bold`}
                      />
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
                      <div className="relative min-w-23.75">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.profitPercent}
                          onChange={(event) =>
                            updateRow(row.id, {
                              profitPercent: event.target.value,
                              sellingPrice: "",
                            })
                          }
                          className={`${fieldClass} pr-8`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                          %
                        </span>
                      </div>
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.sellingPrice}
                        onChange={(event) =>
                          updateRow(row.id, {
                            sellingPrice: event.target.value,
                          })
                        }
                        placeholder={
                          calculated.sellingPrice
                            ? String(calculated.sellingPrice)
                            : ""
                        }
                        className={`${fieldClass} min-w-28.75`}
                      />
                    </td>

                    <td className="border-r border-slate-300 px-3 py-2 text-right text-sm font-black">
                      <span className="whitespace-nowrap">
                        {money(calculated.amount)}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        title="Delete item"
                        className="inline-flex h-10 w-10 items-center justify-center rounded border border-[#00008b]/20 bg-white text-[#00008b] transition hover:bg-[#00008b] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
      </div>

      <div className="border-b border-slate-200 bg-white px-2 py-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-9 items-center justify-center gap-2 rounded bg-[#00008b] px-4 text-sm font-black text-white transition hover:bg-[#00006f]"
        >
          <PackagePlus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 gap-0 border-t border-slate-200 bg-white xl:grid-cols-[minmax(0,0.72fr)_minmax(560px,1fr)]">
        <div className="border-b border-slate-200 p-2 xl:border-b-0 xl:border-r">
          <h3 className="mb-1 text-sm font-black text-slate-900">
            Item History
          </h3>

          <div className="overflow-hidden border border-slate-300 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#00008b] text-white">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-black">
                    Invoice No
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-black">
                    Product
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-black">
                    Bill Date
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-black">
                    Price
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-xs font-medium text-slate-400"
                  >
                    Select a supplier and product to see history
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-2">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(220px,1fr)_360px] lg:items-end">
            <div>
              <label className={labelClass}>Overall Discount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={overallDiscount}
                  onChange={(event) => setOverallDiscount(event.target.value)}
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>

            <div className="space-y-2 text-base">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-slate-900">Subtotal:</span>
                <b>{totals.subtotal.toFixed(2)}</b>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-slate-900">Tax:</span>
                <b>{totals.tax.toFixed(2)}</b>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-slate-900">Discount:</span>
                <b>{totals.discount.toFixed(2)}</b>
              </div>
            </div>

            <div className="bg-[#dcecfb] px-5 py-4 text-right">
              <p className="text-xs font-black text-[#00008b]">Net Amount</p>
              <p className="mt-1 text-3xl font-black text-[#00008b]">
                {totals.netAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded bg-[#29a957] text-base font-black text-white shadow-sm transition hover:bg-[#228f49] disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </form>
  );
}