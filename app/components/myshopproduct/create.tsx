"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  IndianRupee,
  Loader2,
  PackagePlus,
  Save,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type PricingType = "SINGLE" | "BULK";

type MediaAsset = {
  url?: string;
  publicId?: string;
  public_id?: string;
};

type VariantAttribute = {
  label?: string;
  value?: string;
};

type ProductVariantDefinition = {
  title?: string;
  description?: string;
  attributes?: VariantAttribute[];
  isActive?: boolean;
};

type ProductCatalogItem = {
  _id: string;
  itemName?: string;
  itemModelNumber?: string;
  itemKey?: string;
  configurationMode?: string;
  approvalStatus?: string;
  isActive?: boolean;
  isActiveGlobal?: boolean;
  images?: MediaAsset[];
  variant?: ProductVariantDefinition[];
};

type ProductReference =
  | string
  | {
      _id?: string;
      itemName?: string;
      itemModelNumber?: string;
      itemKey?: string;
      approvalStatus?: string;
      isActive?: boolean;
      isActiveGlobal?: boolean;
      images?: MediaAsset[];
    };

type VendorReference =
  | string
  | {
      _id?: string;
      code?: string;
      vendorName?: string;
      vendorKey?: string;
      name?: string;
      status?: string;
    };

type VendorItem = {
  _id: string;
  code?: string;
  vendorName?: string;
  vendorKey?: string;
  name?: string;
  status?: string;
};

type ShopProductVariantEntry = {
  variantIndex?: number;
  title?: string;
  attributes?: VariantAttribute[];
  pricingType?: PricingType;
  mainUnit?: string;
  qty?: number;
  lowStockQty?: number;
  minQty?: number;
  purchaseQty?: number;
  inputPrice?: number;
  mrpPrice?: number;
  baseRangeDownPercent?: number;
  rangeDownPercent?: number;
  marginAmount?: number;
  marginPrice?: number;
  negotiationAmount?: number;
  minSellingPrice?: number;
  maxSellingPrice?: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  isActive?: boolean;
  discount?: {
    rangeDownPercent?: number;
    fromDate?: string | null;
    toDate?: string | null;
    ruleId?: string | null;
  };
};

type ShopProductItem = {
  _id: string;
  pricingType?: PricingType;
  mainUnit?: string;
  qty?: number;
  lowStockQty?: number;
  minQty?: number;
  purchaseQty?: number;
  vendorId?: VendorReference | null;
  inputPrice?: number;
  mrpPrice?: number;
  baseRangeDownPercent?: number;
  rangeDownPercent?: number;
  marginAmount?: number;
  marginPrice?: number;
  negotiationAmount?: number;
  minSellingPrice?: number;
  maxSellingPrice?: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  productId?: ProductReference;
  images?: MediaAsset[];
  variantEntries?: ShopProductVariantEntry[];
  discount?: {
    rangeDownPercent?: number;
    fromDate?: string | null;
    toDate?: string | null;
    ruleId?: string | null;
  };
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type SingleFormState = {
  vendorId: string;
  pricingType: PricingType;
  mainUnit: string;
  qty: string;
  lowStockQty: string;
  minQty: string;
  purchaseQty: string;
  inputPrice: string;
  mrpPrice: string;
  baseRangeDownPercent: string;
  rangeDownPercent: string;
  warrantyMonths: string;
  purchaseDate: string;
  expiryDate: string;
  discountFromDate: string;
  discountToDate: string;
};

type VariantEntryFormState = {
  variantIndex: number;
  isSelected: boolean;
  title: string;
  attributes: Array<{ label: string; value: string }>;
  pricingType: PricingType;
  mainUnit: string;
  qty: string;
  lowStockQty: string;
  minQty: string;
  purchaseQty: string;
  inputPrice: string;
  mrpPrice: string;
  baseRangeDownPercent: string;
  rangeDownPercent: string;
  warrantyMonths: string;
  purchaseDate: string;
  expiryDate: string;
  discountFromDate: string;
  discountToDate: string;
};

type FormState = SingleFormState & {
  productId: string;
  variantEntries: VariantEntryFormState[];
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

const PRODUCT_UNITS = ["Pcs", "Nos", "Box", "g", "Kg"] as const;

const INITIAL_SINGLE_STATE: SingleFormState = {
  vendorId: "",
  pricingType: "SINGLE",
  mainUnit: "Pcs",
  qty: "0",
  lowStockQty: "0",
  minQty: "0",
  purchaseQty: "0",
  inputPrice: "",
  mrpPrice: "",
  baseRangeDownPercent: "10",
  rangeDownPercent: "0",
  warrantyMonths: "0",
  purchaseDate: "",
  expiryDate: "",
  discountFromDate: "",
  discountToDate: "",
};

const INITIAL_FORM: FormState = {
  productId: "",
  variantEntries: [],
  ...INITIAL_SINGLE_STATE,
};

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function isProductEntryAllowedShop(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  return (
    normalized === "WAREHOUSE_RETAIL_SHOP" ||
    normalized === "WHOLESALE_SHOP"
  );
}

function getProductEntryShopLabel(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  if (normalized === "WHOLESALE_SHOP") return "Wholesale Shop";
  if (normalized === "WAREHOUSE_RETAIL_SHOP") return "Warehouse Retail Shop";

  return "Warehouse Retail Shop / Wholesale Shop";
}

function getAllowedPricingTypesByShopType(
  shopType?: string | null
): PricingType[] {
  const normalized = normalizeValue(shopType);

  if (normalized === "WHOLESALE_SHOP") {
    return ["SINGLE", "BULK"];
  }

  return ["SINGLE"];
}

function normalizePricingTypeForShop(
  shopType: string,
  value?: string | null
): PricingType {
  const allowed = getAllowedPricingTypesByShopType(shopType);
  const requested = normalizeValue(value);

  if (requested === "BULK" && allowed.includes("BULK")) return "BULK";

  return "SINGLE";
}

function isVariantProduct(product?: ProductCatalogItem | null) {
  const configurationMode = String(product?.configurationMode || "").trim();

  if (
    configurationMode === "variant" ||
    configurationMode === "variantCompatibility"
  ) {
    return true;
  }

  return Array.isArray(product?.variant) && product.variant.length > 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function toNumber(value: string | number | undefined | null, fallback = 0) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return fallback;
  }

  return amount;
}

function clampPercent(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0), 90);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getProductId(item?: ShopProductItem | null) {
  const product = item?.productId;

  if (!product) return "";
  if (typeof product === "string") return product;

  return String(product._id || "");
}

function getCatalogProductName(item?: ProductCatalogItem | null) {
  if (!item) return "Product";
  return String(item.itemName || item.itemKey || "Product").trim() || "Product";
}

function getCatalogProductLabel(item?: {
  itemName?: string;
  itemModelNumber?: string;
  itemKey?: string;
} | null) {
  const itemName = String(item?.itemName || item?.itemKey || "Product").trim();
  const modelNumber = String(item?.itemModelNumber || "").trim();

  return modelNumber ? `${itemName} (${modelNumber})` : itemName;
}

function getProductImage(product?: ProductCatalogItem | ProductReference | null) {
  if (!product || typeof product === "string") return "";

  if (!Array.isArray(product.images)) return "";

  return (
    product.images.find((item) => String(item?.url || "").trim())?.url || ""
  );
}

function getVendorId(value?: VendorReference | null) {
  if (!value) return "";
  if (typeof value === "string") return value;

  return String(value._id || "");
}

function getVendorName(vendor?: VendorItem | VendorReference | null) {
  if (!vendor) return "Vendor";

  if (typeof vendor === "string") return vendor;

  return String(vendor.vendorName || vendor.name || vendor.vendorKey || "Vendor").trim();
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

function formatDateInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
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

function buildPricePreview({
  pricingType,
  purchaseQtyValue,
  mrpPriceValue,
  inputPriceValue,
  marginValue,
  negotiationValue,
}: {
  pricingType: PricingType;
  purchaseQtyValue: string;
  mrpPriceValue: string;
  inputPriceValue: string;
  marginValue: string;
  negotiationValue: string;
}) {
  const purchaseQty = toNumber(purchaseQtyValue, 0);
  const inputPrice = toNumber(inputPriceValue, 0);
  const mrpPrice = toNumber(mrpPriceValue, 0);
  const marginPercent = clampPercent(toNumber(marginValue, 0), 0);
  const negotiationPercent = clampPercent(toNumber(negotiationValue, 0), 0);

  const marginAmount = (inputPrice * marginPercent) / 100;
  const marginPrice = inputPrice + marginAmount;

  const sellingPrice =
    pricingType === "BULK" ? purchaseQty * marginPrice : marginPrice;

  const negotiationAmount = (sellingPrice * negotiationPercent) / 100;
  const minSellingPrice = Math.max(sellingPrice - negotiationAmount, 0);

  return {
    pricingType,
    purchaseQty: roundMoney(purchaseQty),
    inputPrice: roundMoney(inputPrice),
    mrpPrice: roundMoney(mrpPrice),
    marginAmount: roundMoney(marginAmount),
    marginPrice: roundMoney(marginPrice),
    sellingPrice: roundMoney(sellingPrice),
    negotiationAmount: roundMoney(negotiationAmount),
    minSellingPrice: roundMoney(minSellingPrice),
    maxSellingPrice: roundMoney(sellingPrice),
  };
}

function getPricingValidationMessage({
  label,
  pricingType,
  purchaseQtyValue,
  inputPriceValue,
  mrpPriceValue,
  marginValue,
  negotiationValue,
}: {
  label: string;
  pricingType: PricingType;
  purchaseQtyValue: string;
  inputPriceValue: string;
  mrpPriceValue: string;
  marginValue: string;
  negotiationValue: string;
}) {
  const inputPrice = toNumber(inputPriceValue, 0);
  const mrpPrice = toNumber(mrpPriceValue, 0);

  const preview = buildPricePreview({
    pricingType,
    purchaseQtyValue,
    inputPriceValue,
    mrpPriceValue,
    marginValue,
    negotiationValue,
  });

  if (inputPrice <= 0) return `Input price is required for ${label}.`;
  if (mrpPrice <= 0) return `MRP price is required for ${label}.`;

  if (inputPrice >= mrpPrice) {
    return `Input price must be less than MRP for ${label}.`;
  }

  if (pricingType === "SINGLE" && preview.sellingPrice > mrpPrice) {
    return `Single selling price must be less than or equal to MRP for ${label}.`;
  }

  if (pricingType === "BULK" && preview.marginPrice > mrpPrice) {
    return `Bulk unit margin price must be less than or equal to MRP for ${label}.`;
  }

  if (preview.minSellingPrice > preview.sellingPrice) {
    return `Negotiation price cannot be greater than selling price for ${label}.`;
  }

  return "";
}

function getActiveVariantDefinitions(product?: ProductCatalogItem | null) {
  if (!Array.isArray(product?.variant)) return [];

  return product.variant
    .map((variant, index) => ({
      variantIndex: index,
      title: String(variant?.title || "").trim(),
      attributes: Array.isArray(variant?.attributes)
        ? variant.attributes
            .map((attribute) => ({
              label: String(attribute?.label || "").trim(),
              value: String(attribute?.value || "").trim(),
            }))
            .filter((attribute) => attribute.label || attribute.value)
        : [],
      isActive: variant?.isActive !== false,
    }))
    .filter((variant) => variant.isActive !== false);
}

function hasTextValue(value?: string | null) {
  return Boolean(String(value || "").trim());
}

function hasExistingConfiguredVariantEntry(
  entry?: ShopProductVariantEntry | null
) {
  return Boolean(
    Number(entry?.qty || 0) > 0 ||
      Number(entry?.lowStockQty || 0) > 0 ||
      Number(entry?.minQty || 0) > 0 ||
      Number(entry?.purchaseQty || 0) > 0 ||
      Number(entry?.inputPrice || 0) > 0 ||
      Number(entry?.mrpPrice || 0) > 0 ||
      Number(entry?.baseRangeDownPercent || 0) > 0 ||
      Number(entry?.rangeDownPercent || 0) > 0 ||
      Number(entry?.warrantyMonths || 0) > 0 ||
      hasTextValue(entry?.purchaseDate) ||
      hasTextValue(entry?.expiryDate) ||
      hasTextValue(entry?.discount?.fromDate) ||
      hasTextValue(entry?.discount?.toDate)
  );
}

function createVariantEntryState(
  definition: {
    variantIndex: number;
    title: string;
    attributes: Array<{ label: string; value: string }>;
  },
  existing?: ShopProductVariantEntry | null
): VariantEntryFormState {
  return {
    variantIndex: definition.variantIndex,
    isSelected:
      existing?.isActive !== false && hasExistingConfiguredVariantEntry(existing),
    title: definition.title,
    attributes: definition.attributes,
    pricingType: existing?.pricingType || "SINGLE",
    mainUnit: String(existing?.mainUnit || "Pcs"),
    qty: String(existing?.qty ?? 0),
    lowStockQty: String(existing?.lowStockQty ?? 0),
    minQty: String(existing?.minQty ?? 0),
    purchaseQty: String(existing?.purchaseQty ?? existing?.minQty ?? 0),
    inputPrice: String(existing?.inputPrice ?? ""),
    mrpPrice: String(
      existing?.mrpPrice ??
        existing?.maxSellingPrice ??
        existing?.inputPrice ??
        ""
    ),
    baseRangeDownPercent: String(existing?.baseRangeDownPercent ?? 10),
    rangeDownPercent: String(
      existing?.discount?.rangeDownPercent ?? existing?.rangeDownPercent ?? 0
    ),
    warrantyMonths: String(existing?.warrantyMonths ?? 0),
    purchaseDate: formatDateInput(existing?.purchaseDate),
    expiryDate: formatDateInput(existing?.expiryDate),
    discountFromDate: formatDateInput(existing?.discount?.fromDate),
    discountToDate: formatDateInput(existing?.discount?.toDate),
  };
}

function mergeVariantEntryState(
  product: ProductCatalogItem | null,
  existingEntries: ShopProductVariantEntry[] = [],
  currentEntries: VariantEntryFormState[] = []
) {
  const definitions = getActiveVariantDefinitions(product);
  const existingMap = new Map(
    existingEntries.map((entry) => [Number(entry.variantIndex || 0), entry])
  );
  const currentMap = new Map(
    currentEntries.map((entry) => [Number(entry.variantIndex || 0), entry])
  );

  return definitions.map((definition) => {
    const currentEntry = currentMap.get(definition.variantIndex);

    if (currentEntry) {
      return {
        ...currentEntry,
        title: definition.title,
        attributes: definition.attributes,
      };
    }

    return createVariantEntryState(
      definition,
      existingMap.get(definition.variantIndex) || null
    );
  });
}

function buildCreateFormState(product?: ProductCatalogItem | null): FormState {
  return {
    productId: product?._id || "",
    variantEntries: product ? mergeVariantEntryState(product, [], []) : [],
    ...INITIAL_SINGLE_STATE,
    pricingType: "SINGLE",
  };
}

function FieldLabel({
  htmlFor,
  label,
  helper,
}: {
  htmlFor: string;
  label: string;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function FieldInput({
  id,
  value,
  onChange,
  type = "text",
  min,
  step,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      min={min}
      step={step}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="premium-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    />
  );
}

function MainUnitSelect({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value || "Pcs"}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="premium-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    >
      {PRODUCT_UNITS.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}

function ReadOnlyMoneyInput({
  id,
  value,
  disabled = false,
}: {
  id: string;
  value: number;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      readOnly
      disabled={disabled}
      value={formatCurrency(value)}
      className="premium-input cursor-not-allowed bg-white font-bold text-slate-950 disabled:bg-slate-100 disabled:text-slate-400"
    />
  );
}

function PricePreviewCard({
  title,
  preview,
}: {
  title: string;
  preview: ReturnType<typeof buildPricePreview>;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700">
          <IndianRupee className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">
            {preview.pricingType === "BULK"
              ? "Bulk price = purchase quantity × unit margin price."
              : "Single price = input price + margin."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">MRP Price</p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {formatCurrency(preview.mrpPrice)}
          </p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">Margin Amount</p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {formatCurrency(preview.marginAmount)}
          </p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Unit Margin Price
          </p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {formatCurrency(preview.marginPrice)}
          </p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">
            Negotiation Price
          </p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {formatCurrency(preview.minSellingPrice)}
          </p>
        </div>

        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700">
            Final Selling Price
          </p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">
            {formatCurrency(preview.sellingPrice)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreateMyShopProductPage({
  mode = "create",
  productId = "",
}: {
  mode?: "create" | "edit";
  productId?: string;
}) {
  const router = useRouter();
  const { accessToken, role } = useAuth();

  const currentRole = useMemo(() => normalizeRole(role), [role]);

  const canManage = useMemo(
    () =>
      currentRole === "SHOP_OWNER" ||
      currentRole === "SHOP_MANAGER" ||
      currentRole === "SHOP_SUPERVISOR",
    [currentRole]
  );

  const isEditMode = mode === "edit";

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");

  const [catalogItems, setCatalogItems] = useState<ProductCatalogItem[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProductItem[]>([]);
  const [existingItem, setExistingItem] = useState<ShopProductItem | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [globalVendors, setGlobalVendors] = useState<VendorItem[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const productEntryShopSelected = useMemo(
    () => isProductEntryAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const selectedShopTypeLabel = useMemo(
    () => getProductEntryShopLabel(selectedShopType),
    [selectedShopType]
  );

  const vendorCreateHref = useMemo(() => {
    if (currentRole === "SHOP_MANAGER") return "/shopmanager/vendors/create";
    if (currentRole === "SHOP_SUPERVISOR") return "/shopsupervisor/vendors/create";
    return "/shopowner/vendors/create";
  }, [currentRole]);

  const syncSelectedShop = useCallback(() => {
    const selectedShop = readSelectedShop();

    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const selectedCatalogProduct = useMemo(
    () =>
      catalogItems.find((item) => String(item._id) === String(form.productId)) ||
      null,
    [catalogItems, form.productId]
  );

  const selectedProductUsesVariants = useMemo(
    () =>
      isVariantProduct(selectedCatalogProduct) ||
      Boolean(existingItem?.variantEntries?.length),
    [existingItem?.variantEntries?.length, selectedCatalogProduct]
  );

  const vendorOptions = useMemo(() => {
    return [...globalVendors]
      .filter((vendor) => String(vendor.status || "ACTIVE").toUpperCase() === "ACTIVE")
      .sort((a, b) => getVendorName(a).localeCompare(getVendorName(b)));
  }, [globalVendors]);

  const selectedVendor = useMemo(() => {
    return (
      vendorOptions.find(
        (vendor) => String(vendor._id) === String(form.vendorId)
      ) || null
    );
  }, [form.vendorId, vendorOptions]);

  const filteredVendorOptions = useMemo(() => {
    const search = vendorSearch.trim().toLowerCase();

    if (!search) return vendorOptions;

    return vendorOptions.filter((vendor) =>
      [vendor.vendorName, vendor.vendorKey, vendor.name, vendor.code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [vendorOptions, vendorSearch]);

  const currentPricingType = useMemo(
    () => normalizePricingTypeForShop(selectedShopType, form.pricingType),
    [form.pricingType, selectedShopType]
  );

  const singlePreview = useMemo(
    () =>
      buildPricePreview({
        pricingType: currentPricingType,
        purchaseQtyValue: form.purchaseQty || form.minQty,
        mrpPriceValue: form.mrpPrice,
        inputPriceValue: form.inputPrice,
        marginValue: form.baseRangeDownPercent,
        negotiationValue: form.rangeDownPercent,
      }),
    [
      currentPricingType,
      form.baseRangeDownPercent,
      form.inputPrice,
      form.minQty,
      form.mrpPrice,
      form.purchaseQty,
      form.rangeDownPercent,
    ]
  );

  const selectedVariantCount = useMemo(
    () => form.variantEntries.filter((entry) => entry.isSelected).length,
    [form.variantEntries]
  );

  const loadVendors = useCallback(
    async (q = "") => {
      if (!accessToken || !selectedShopId) {
        setGlobalVendors([]);
        return;
      }

      try {
        setVendorLoading(true);

        const endpoint = SummaryApi.vendors.listByShop(selectedShopId);
        const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";

        const response = await fetch(`${baseURL}${endpoint.url}${query}`, {
          method: endpoint.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const result = (await response
          .json()
          .catch(() => ({}))) as ApiResponse<VendorItem[]>;

        if (!response.ok || !result?.success) {
          throw new Error(getErrorMessage(result, "Failed to load vendors"));
        }

        setGlobalVendors(Array.isArray(result?.data) ? result.data : []);
      } catch (error) {
        setGlobalVendors([]);
        toast.error(
          error instanceof Error ? error.message : "Failed to load vendors"
        );
      } finally {
        setVendorLoading(false);
      }
    },
    [accessToken, selectedShopId]
  );

  const loadPageData = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setCatalogItems([]);
      setShopProducts([]);
      return;
    }

    if (!selectedShopId || !productEntryShopSelected) {
      setLoading(false);
      setCatalogItems([]);
      setShopProducts([]);
      setExistingItem(null);
      setErrorMessage("");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const [catalogResponse, shopProductsResponse] = await Promise.all([
        fetch(
          `${baseURL}${SummaryApi.shop_product_available_list.url(
            selectedShopId,
            isEditMode && productId ? { includeProductId: productId } : undefined
          )}`,
          {
            method: SummaryApi.shop_product_available_list.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        ),

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

      const catalogResult = (await catalogResponse
        .json()
        .catch(() => ({}))) as ApiResponse<ProductCatalogItem[]>;

      const shopProductsResult = (await shopProductsResponse
        .json()
        .catch(() => ({}))) as ApiResponse<ShopProductItem[]>;

      if (!catalogResponse.ok || !catalogResult?.success) {
        throw new Error(
          getErrorMessage(catalogResult, "Failed to load available products")
        );
      }

      if (!shopProductsResponse.ok || !shopProductsResult?.success) {
        throw new Error(
          getErrorMessage(shopProductsResult, "Failed to load shop products")
        );
      }

      const eligibleProducts = Array.isArray(catalogResult?.data)
        ? catalogResult.data
        : [];

      const mappedProducts = Array.isArray(shopProductsResult?.data)
        ? shopProductsResult.data
        : [];

      setCatalogItems(eligibleProducts);
      setShopProducts(mappedProducts);

      if (isEditMode) {
        const matchedItem =
          mappedProducts.find(
            (item) =>
              String(getProductId(item)) === String(productId) ||
              String(item._id) === String(productId)
          ) || null;

        if (!matchedItem) {
          setExistingItem(null);
          setErrorMessage("Selected shop product was not found.");
          return;
        }

        const matchedProduct =
          eligibleProducts.find(
            (item) => String(item._id) === String(getProductId(matchedItem))
          ) || null;

        const nextVariantEntries = isVariantProduct(matchedProduct)
          ? mergeVariantEntryState(
              matchedProduct,
              matchedItem.variantEntries || [],
              []
            )
          : [];

        setExistingItem(matchedItem);

        setForm({
          productId: getProductId(matchedItem),
          vendorId: getVendorId(matchedItem.vendorId),
          pricingType: matchedItem.pricingType || "SINGLE",
          mainUnit: String(matchedItem.mainUnit || "Pcs"),
          qty: String(matchedItem.qty ?? 0),
          lowStockQty: String(matchedItem.lowStockQty ?? 0),
          minQty: String(matchedItem.minQty ?? 0),
          purchaseQty: String(matchedItem.purchaseQty ?? matchedItem.minQty ?? 0),
          inputPrice: String(matchedItem.inputPrice ?? 0),
          mrpPrice: String(
            matchedItem.mrpPrice ??
              matchedItem.maxSellingPrice ??
              matchedItem.inputPrice ??
              ""
          ),
          baseRangeDownPercent: String(matchedItem.baseRangeDownPercent ?? 10),
          rangeDownPercent: String(
            matchedItem.discount?.rangeDownPercent ??
              matchedItem.rangeDownPercent ??
              0
          ),
          warrantyMonths: String(matchedItem.warrantyMonths ?? 0),
          purchaseDate: formatDateInput(matchedItem.purchaseDate),
          expiryDate: formatDateInput(matchedItem.expiryDate),
          discountFromDate: formatDateInput(matchedItem.discount?.fromDate),
          discountToDate: formatDateInput(matchedItem.discount?.toDate),
          variantEntries: nextVariantEntries,
        });

        if (matchedItem.vendorId && typeof matchedItem.vendorId !== "string") {
          setVendorSearch(getVendorName(matchedItem.vendorId));
        } else {
          setVendorSearch("");
        }
      } else {
        const mappedProductIds = new Set(
          mappedProducts.map((item) => getProductId(item)).filter(Boolean)
        );

        const nextAvailableProduct =
          eligibleProducts.find((item) => !mappedProductIds.has(item._id)) ||
          null;

        setExistingItem(null);
        setForm(buildCreateFormState(nextAvailableProduct));
        setVendorSearch("");
      }
    } catch (error) {
      setCatalogItems([]);
      setShopProducts([]);
      setExistingItem(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load page data"
      );
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    isEditMode,
    productId,
    selectedShopId,
    productEntryShopSelected,
  ]);

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
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    if (!selectedShopId || !productEntryShopSelected) return;

    const timer = window.setTimeout(() => {
      void loadVendors(vendorSearch);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [loadVendors, selectedShopId, vendorSearch, productEntryShopSelected]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (!target?.closest("[data-vendor-combobox='true']")) {
        setVendorDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;
    if (vendorSearch.trim()) return;

    setVendorSearch(getVendorName(selectedVendor));
  }, [selectedVendor, vendorSearch]);

  const availableProducts = useMemo(() => {
    const mappedProductIds = new Set(
      shopProducts.map((item) => getProductId(item)).filter(Boolean)
    );

    return catalogItems.filter((item) => {
      if (isEditMode && item._id === form.productId) {
        return true;
      }

      return !mappedProductIds.has(item._id);
    });
  }, [catalogItems, form.productId, isEditMode, shopProducts]);

  function updateSingleField(key: keyof SingleFormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: key === "pricingType"
        ? normalizePricingTypeForShop(selectedShopType, value)
        : value,
    }));
  }

  function updateVariantEntry(
    variantIndex: number,
    patch: Partial<VariantEntryFormState>
  ) {
    const shouldAutoSelect =
      !("isSelected" in patch) &&
      Object.keys(patch).some(
        (key) =>
          key !== "title" && key !== "attributes" && key !== "variantIndex"
      );

    setForm((prev) => ({
      ...prev,
      variantEntries: prev.variantEntries.map((entry) =>
        entry.variantIndex === variantIndex
          ? {
              ...entry,
              ...patch,
              ...(patch.pricingType
                ? {
                    pricingType: normalizePricingTypeForShop(
                      selectedShopType,
                      patch.pricingType
                    ),
                  }
                : {}),
              ...(shouldAutoSelect ? { isSelected: true } : {}),
            }
          : entry
      ),
    }));
  }

  function handleProductSelection(nextProductId: string) {
    const selectedProduct =
      catalogItems.find((item) => String(item._id) === String(nextProductId)) ||
      null;

    setForm((prev) => ({
      ...buildCreateFormState(selectedProduct),
      vendorId: prev.vendorId,
      pricingType: normalizePricingTypeForShop(selectedShopType, prev.pricingType),
    }));
  }

  async function handleSelectVendor(vendorId: string) {
    setForm((prev) => ({
      ...prev,
      vendorId,
    }));

    const vendor = vendorOptions.find(
      (item) => String(item._id) === String(vendorId)
    );

    setVendorSearch(vendor ? getVendorName(vendor) : "");
    setVendorDropdownOpen(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    if (!selectedShopId) {
      toast.error("Select a shop first");
      return;
    }

    if (!productEntryShopSelected) {
      toast.error(
        "Only Warehouse Retail Shop or Wholesale Shop can add or edit shop products"
      );
      return;
    }

    if (!canManage) {
      toast.error("You do not have permission to manage shop products");
      return;
    }

    if (!form.productId) {
      toast.error("Select a product");
      return;
    }

    if (!form.vendorId) {
      toast.error("Select vendor first");
      return;
    }

    const targetProductId = isEditMode ? getProductId(existingItem) : form.productId;

    if (!targetProductId) {
      toast.error("Unable to resolve product id");
      return;
    }

    const currentPricingType = normalizePricingTypeForShop(
      selectedShopType,
      form.pricingType
    );

    const selectedVariantEntries = selectedProductUsesVariants
      ? form.variantEntries.filter((entry) => entry.isSelected)
      : [];

    if (selectedProductUsesVariants && selectedVariantEntries.length === 0) {
      toast.error("Select at least one variant");
      return;
    }

    if (selectedProductUsesVariants) {
      const invalidVariant = selectedVariantEntries.find((entry) =>
        Boolean(
          getPricingValidationMessage({
            label: entry.title || `variant ${entry.variantIndex + 1}`,
            pricingType: normalizePricingTypeForShop(
              selectedShopType,
              entry.pricingType || currentPricingType
            ),
            purchaseQtyValue: entry.purchaseQty || entry.minQty,
            inputPriceValue: entry.inputPrice,
            mrpPriceValue: entry.mrpPrice,
            marginValue: entry.baseRangeDownPercent,
            negotiationValue: entry.rangeDownPercent,
          })
        )
      );

      if (invalidVariant) {
        toast.error(
          getPricingValidationMessage({
            label:
              invalidVariant.title ||
              `variant ${invalidVariant.variantIndex + 1}`,
            pricingType: normalizePricingTypeForShop(
              selectedShopType,
              invalidVariant.pricingType || currentPricingType
            ),
            purchaseQtyValue: invalidVariant.purchaseQty || invalidVariant.minQty,
            inputPriceValue: invalidVariant.inputPrice,
            mrpPriceValue: invalidVariant.mrpPrice,
            marginValue: invalidVariant.baseRangeDownPercent,
            negotiationValue: invalidVariant.rangeDownPercent,
          })
        );
        return;
      }
    } else {
      const pricingMessage = getPricingValidationMessage({
        label: "this product",
        pricingType: currentPricingType,
        purchaseQtyValue: form.purchaseQty || form.minQty,
        inputPriceValue: form.inputPrice,
        mrpPriceValue: form.mrpPrice,
        marginValue: form.baseRangeDownPercent,
        negotiationValue: form.rangeDownPercent,
      });

      if (pricingMessage) {
        toast.error(pricingMessage);
        return;
      }
    }

    const payload = selectedProductUsesVariants
      ? {
          ...(isEditMode ? {} : { productId: form.productId }),
          vendorId: form.vendorId,
          pricingType: currentPricingType,
          images: selectedCatalogProduct?.images || [],
          variantEntries: selectedVariantEntries.map((entry) => {
            const entryPricingType = normalizePricingTypeForShop(
              selectedShopType,
              entry.pricingType || currentPricingType
            );

            const preview = buildPricePreview({
              pricingType: entryPricingType,
              purchaseQtyValue: entry.purchaseQty || entry.minQty,
              mrpPriceValue: entry.mrpPrice,
              inputPriceValue: entry.inputPrice,
              marginValue: entry.baseRangeDownPercent,
              negotiationValue: entry.rangeDownPercent,
            });

            return {
              variantIndex: entry.variantIndex,
              title: entry.title,
              attributes: entry.attributes,

              pricingType: entryPricingType,
              mainUnit: entry.mainUnit || "Pcs",

              qty: toNumber(entry.qty, 0),
              lowStockQty: toNumber(entry.lowStockQty, 0),
              minQty: toNumber(entry.minQty, 0),
              purchaseQty: toNumber(entry.purchaseQty || entry.minQty, 0),

              inputPrice: toNumber(entry.inputPrice, 0),
              mrpPrice: toNumber(entry.mrpPrice, 0),
              baseRangeDownPercent: clampPercent(
                toNumber(entry.baseRangeDownPercent, 10),
                10
              ),
              rangeDownPercent: clampPercent(
                toNumber(entry.rangeDownPercent, 0),
                0
              ),

              marginAmount: preview.marginAmount,
              marginPrice: preview.marginPrice,
              negotiationAmount: preview.negotiationAmount,
              minSellingPrice: preview.minSellingPrice,
              maxSellingPrice: preview.maxSellingPrice,
              sellingPrice: preview.sellingPrice,

              warrantyMonths: toNumber(entry.warrantyMonths, 0),
              purchaseDate: entry.purchaseDate || null,
              expiryDate: entry.expiryDate || null,

              isActive: true,

              discount: {
                rangeDownPercent: clampPercent(
                  toNumber(entry.rangeDownPercent, 0),
                  0
                ),
                fromDate: entry.discountFromDate || null,
                toDate: entry.discountToDate || null,
              },
            };
          }),
        }
      : {
          ...(isEditMode ? {} : { productId: form.productId }),
          vendorId: form.vendorId,
          pricingType: currentPricingType,
          images: selectedCatalogProduct?.images || [],

          mainUnit: form.mainUnit || "Pcs",

          qty: toNumber(form.qty, 0),
          lowStockQty: toNumber(form.lowStockQty, 0),
          minQty: toNumber(form.minQty, 0),
          purchaseQty: toNumber(form.purchaseQty || form.minQty, 0),

          inputPrice: toNumber(form.inputPrice, 0),
          mrpPrice: toNumber(form.mrpPrice, 0),
          baseRangeDownPercent: clampPercent(
            toNumber(form.baseRangeDownPercent, 10),
            10
          ),
          rangeDownPercent: clampPercent(toNumber(form.rangeDownPercent, 0), 0),

          warrantyMonths: toNumber(form.warrantyMonths, 0),
          purchaseDate: form.purchaseDate || null,
          expiryDate: form.expiryDate || null,

          discount: {
            rangeDownPercent: clampPercent(
              toNumber(form.rangeDownPercent, 0),
              0
            ),
            fromDate: form.discountFromDate || null,
            toDate: form.discountToDate || null,
          },
        };

    try {
      setSubmitting(true);

      const endpoint = isEditMode
        ? SummaryApi.shop_product_update.url(selectedShopId, targetProductId)
        : SummaryApi.shop_product_create.url(selectedShopId);

      const method = isEditMode
        ? SummaryApi.shop_product_update.method
        : SummaryApi.shop_product_create.method;

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
        .catch(() => ({}))) as ApiResponse<ShopProductItem>;

      if (!response.ok || !result?.success) {
        throw new Error(
          getErrorMessage(
            result,
            isEditMode
              ? "Failed to update shop product"
              : "Failed to add shop product"
          )
        );
      }

      toast.success(
        isEditMode
          ? "Shop product updated successfully"
          : "Shop product added successfully"
      );

      router.push("/shopowner/my-shop-products/list");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save shop product"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const disabledForm =
    loading || submitting || !canManage || !productEntryShopSelected;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          <span className="text-sm font-semibold text-slate-700">
            Loading shop product form...
          </span>
        </div>
      </div>
    );
  }

  if (!productEntryShopSelected) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-amber-700" />
          <div>
            <h2 className="text-lg font-bold text-amber-950">
              Product entry not available
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Only Warehouse Retail Shop or Wholesale Shop can add shop
              products.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedProductImage = getProductImage(selectedCatalogProduct);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative overflow-hidden rounded-[32px] bg-[var(--gradient-hero)] p-6 text-white shadow-[0_24px_70px_rgba(46,49,146,0.28)]">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" />
              My Shop Product
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight md:text-4xl">
              {isEditMode ? "Edit Shop Product" : "Add Shop Product"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              {selectedShopName || "Selected shop"} · {selectedShopTypeLabel}
            </p>
          </div>

          <Link
            href="/shopowner/my-shop-products/list"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <PackagePlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Product Selection
            </h2>
            <p className="text-sm text-slate-500">
              Select global product and vendor for this shop.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <FieldLabel htmlFor="productId" label="Product Name" />
            <select
              id="productId"
              value={form.productId}
              disabled={disabledForm || isEditMode}
              onChange={(event) => handleProductSelection(event.target.value)}
              className="premium-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">Select product</option>
              {availableProducts.map((item) => (
                <option key={item._id} value={item._id}>
                  {getCatalogProductLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div data-vendor-combobox="true" className="relative">
            <FieldLabel htmlFor="vendorSearch" label="Vendor" />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="vendorSearch"
                value={vendorSearch}
                disabled={disabledForm}
                onFocus={() => setVendorDropdownOpen(true)}
                onChange={(event) => {
                  setVendorSearch(event.target.value);
                  setVendorDropdownOpen(true);
                }}
                placeholder="Search vendor..."
                className="premium-input pl-10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {vendorDropdownOpen ? (
              <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {vendorLoading ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading vendors...
                  </div>
                ) : filteredVendorOptions.length ? (
                  filteredVendorOptions.map((vendor) => (
                    <button
                      key={vendor._id}
                      type="button"
                      onClick={() => void handleSelectVendor(vendor._id)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span>{getVendorName(vendor)}</span>
                      {form.vendorId === vendor._id ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-slate-500">
                    No vendor found.{" "}
                    <Link
                      href={vendorCreateHref}
                      className="font-bold text-violet-700"
                    >
                      Create vendor
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {selectedCatalogProduct ? (
          <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {selectedProductImage ? (
                  <img
                    src={selectedProductImage}
                    alt={getCatalogProductLabel(selectedCatalogProduct)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PackagePlus className="h-8 w-8 text-slate-400" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Selected Product
                </p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-950">
                  {getCatalogProductLabel(selectedCatalogProduct)}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Product image loads from global product and saves into shop
                  product images.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {!selectedProductUsesVariants ? (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Stock & Pricing
                </h2>
                <p className="text-sm text-slate-500">
                  Common stock fields with Single/Bulk purchase pricing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <FieldLabel htmlFor="pricingType" label="Pricing Type" />
                <select
                  id="pricingType"
                  value={currentPricingType}
                  disabled={disabledForm}
                  onChange={(event) =>
                    updateSingleField("pricingType", event.target.value)
                  }
                  className="premium-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {getAllowedPricingTypesByShopType(selectedShopType).map((type) => (
                    <option key={type} value={type}>
                      {type === "BULK"
                        ? "Bulk Product Purchase"
                        : "Single Product Purchase"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="mainUnit" label="Main Unit" />
                <MainUnitSelect
                  id="mainUnit"
                  value={form.mainUnit}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("mainUnit", value)}
                />
              </div>

              <div>
                <FieldLabel
                  htmlFor="qty"
                  label="Available Stock Quantity"
                />
                <FieldInput
                  id="qty"
                  type="number"
                  min={0}
                  value={form.qty}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("qty", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="lowStockQty" label="Low Stock Quantity" />
                <FieldInput
                  id="lowStockQty"
                  type="number"
                  min={0}
                  value={form.lowStockQty}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("lowStockQty", value)}
                />
              </div>

              <div>
                <FieldLabel
                  htmlFor="purchaseQty"
                  label={
                    currentPricingType === "BULK"
                      ? "Bulk Purchase Quantity"
                      : "Purchase Quantity"
                  }
                />
                <FieldInput
                  id="purchaseQty"
                  type="number"
                  min={0}
                  value={form.purchaseQty}
                  disabled={disabledForm}
                  onChange={(value) => {
                    updateSingleField("purchaseQty", value);
                    updateSingleField("minQty", value);
                  }}
                />
              </div>

              <div>
                <FieldLabel htmlFor="mrpPrice" label="MRP Price" />
                <FieldInput
                  id="mrpPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.mrpPrice}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("mrpPrice", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="inputPrice" label="Input Price" />
                <FieldInput
                  id="inputPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.inputPrice}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("inputPrice", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="baseRangeDownPercent" label="Margin Percent" />
                <FieldInput
                  id="baseRangeDownPercent"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.baseRangeDownPercent}
                  disabled={disabledForm}
                  onChange={(value) =>
                    updateSingleField("baseRangeDownPercent", value)
                  }
                />
              </div>

              <div>
                <FieldLabel htmlFor="marginPrice" label="Margin Price" />
                <ReadOnlyMoneyInput
                  id="marginPrice"
                  value={singlePreview.marginPrice}
                  disabled={disabledForm}
                />
              </div>

              <div>
                <FieldLabel htmlFor="sellingPrice" label="Selling Price" />
                <ReadOnlyMoneyInput
                  id="sellingPrice"
                  value={singlePreview.sellingPrice}
                  disabled={disabledForm}
                />
              </div>

              <div>
                <FieldLabel
                  htmlFor="rangeDownPercent"
                  label="Price Negotiation Percent"
                />
                <FieldInput
                  id="rangeDownPercent"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.rangeDownPercent}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("rangeDownPercent", value)}
                />
              </div>

              <div>
                <FieldLabel
                  htmlFor="minSellingPrice"
                  label="Negotiation Price / Minimum Selling Price"
                />
                <ReadOnlyMoneyInput
                  id="minSellingPrice"
                  value={singlePreview.minSellingPrice}
                  disabled={disabledForm}
                />
              </div>

              <div>
                <FieldLabel htmlFor="warrantyMonths" label="Warranty Months" />
                <FieldInput
                  id="warrantyMonths"
                  type="number"
                  min={0}
                  value={form.warrantyMonths}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("warrantyMonths", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="purchaseDate" label="Purchase Date" />
                <FieldInput
                  id="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("purchaseDate", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="expiryDate" label="Expiry Date" />
                <FieldInput
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("expiryDate", value)}
                />
              </div>
            </div>
          </div>

          <PricePreviewCard title="Pricing Preview" preview={singlePreview} />
        </section>
      ) : (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-950">
              Variant Stock & Pricing
            </h2>
            <p className="text-sm text-slate-500">
              Selected variants: {selectedVariantCount}
            </p>
          </div>

          <div className="space-y-5">
            {form.variantEntries.map((entry) => {
              const entryPricingType = normalizePricingTypeForShop(
                selectedShopType,
                entry.pricingType || currentPricingType
              );

              const preview = buildPricePreview({
                pricingType: entryPricingType,
                purchaseQtyValue: entry.purchaseQty || entry.minQty,
                mrpPriceValue: entry.mrpPrice,
                inputPriceValue: entry.inputPrice,
                marginValue: entry.baseRangeDownPercent,
                negotiationValue: entry.rangeDownPercent,
              });

              return (
                <div
                  key={entry.variantIndex}
                  className="rounded-[26px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        {entry.title || `Variant ${entry.variantIndex + 1}`}
                      </h3>
                      {entry.attributes.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.attributes.map((attr, index) => (
                            <span
                              key={`${attr.label}-${attr.value}-${index}`}
                              className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                            >
                              {attr.label}: {attr.value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={entry.isSelected}
                        disabled={disabledForm}
                        onChange={(event) =>
                          updateVariantEntry(entry.variantIndex, {
                            isSelected: event.target.checked,
                          })
                        }
                      />
                      Select
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    <div>
                      <FieldLabel
                        htmlFor={`variant-${entry.variantIndex}-pricingType`}
                        label="Pricing Type"
                      />
                      <select
                        id={`variant-${entry.variantIndex}-pricingType`}
                        value={entryPricingType}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(event) =>
                          updateVariantEntry(entry.variantIndex, {
                            pricingType: event.target.value as PricingType,
                          })
                        }
                        className="premium-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {getAllowedPricingTypesByShopType(selectedShopType).map((type) => (
                          <option key={type} value={type}>
                            {type === "BULK"
                              ? "Bulk Product Purchase"
                              : "Single Product Purchase"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-mainUnit`} label="Main Unit" />
                      <MainUnitSelect
                        id={`variant-${entry.variantIndex}-mainUnit`}
                        value={entry.mainUnit}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            mainUnit: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-qty`} label="Available Stock Quantity" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-qty`}
                        type="number"
                        min={0}
                        value={entry.qty}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, { qty: value })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-lowStockQty`} label="Low Stock Quantity" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-lowStockQty`}
                        type="number"
                        min={0}
                        value={entry.lowStockQty}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            lowStockQty: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-purchaseQty`} label={entryPricingType === "BULK" ? "Bulk Purchase Quantity" : "Purchase Quantity"} />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-purchaseQty`}
                        type="number"
                        min={0}
                        value={entry.purchaseQty}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            purchaseQty: value,
                            minQty: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-mrpPrice`} label="MRP Price" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-mrpPrice`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={entry.mrpPrice}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            mrpPrice: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-inputPrice`} label="Input Price" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-inputPrice`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={entry.inputPrice}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            inputPrice: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-margin`} label="Margin Percent" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-margin`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={entry.baseRangeDownPercent}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            baseRangeDownPercent: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-marginPrice`} label="Margin Price" />
                      <ReadOnlyMoneyInput
                        id={`variant-${entry.variantIndex}-marginPrice`}
                        value={preview.marginPrice}
                        disabled={disabledForm || !entry.isSelected}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-sellingPrice`} label="Selling Price" />
                      <ReadOnlyMoneyInput
                        id={`variant-${entry.variantIndex}-sellingPrice`}
                        value={preview.sellingPrice}
                        disabled={disabledForm || !entry.isSelected}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-negotiation`} label="Price Negotiation Percent" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-negotiation`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={entry.rangeDownPercent}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            rangeDownPercent: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-minSelling`} label="Negotiation Price / Minimum Selling Price" />
                      <ReadOnlyMoneyInput
                        id={`variant-${entry.variantIndex}-minSelling`}
                        value={preview.minSellingPrice}
                        disabled={disabledForm || !entry.isSelected}
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-warranty`} label="Warranty Months" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-warranty`}
                        type="number"
                        min={0}
                        value={entry.warrantyMonths}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            warrantyMonths: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-purchaseDate`} label="Purchase Date" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-purchaseDate`}
                        type="date"
                        value={entry.purchaseDate}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            purchaseDate: value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor={`variant-${entry.variantIndex}-expiryDate`} label="Expiry Date" />
                      <FieldInput
                        id={`variant-${entry.variantIndex}-expiryDate`}
                        type="date"
                        value={entry.expiryDate}
                        disabled={disabledForm || !entry.isSelected}
                        onChange={(value) =>
                          updateVariantEntry(entry.variantIndex, {
                            expiryDate: value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="sticky bottom-4 z-20 rounded-[20px] border border-white/70 bg-white/90 p-3 shadow-[0_14px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500">
            <Store className="h-4 w-4 text-violet-600" />
            Save product stock and pricing for the selected shop.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/shopowner/my-shop-products/list")}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={disabledForm}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-[13px] font-bold text-white shadow-lg shadow-violet-500/20 transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEditMode ? "Update Product" : "Save Product"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
