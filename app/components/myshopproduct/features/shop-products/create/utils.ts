import type {
  ProductCatalogItem,
  ProductReference,
  ShopProductItem,
  VendorItem,
  VendorReference,
  PricingType,
} from "./types";

export function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

export function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

export function isProductEntryAllowedShop(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  return (
    normalized === "WAREHOUSE_RETAIL_SHOP" ||
    normalized === "WHOLESALE_SHOP"
  );
}

export function getProductEntryShopLabel(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  if (normalized === "WHOLESALE_SHOP") return "Wholesale Shop";
  if (normalized === "WAREHOUSE_RETAIL_SHOP") return "Warehouse Retail Shop";

  return "Warehouse Retail Shop / Wholesale Shop";
}

export function getAllowedPricingTypesByShopType(
  shopType?: string | null
): PricingType[] {
  const normalized = normalizeValue(shopType);

  if (normalized === "WHOLESALE_SHOP") {
    return ["SINGLE", "BULK"];
  }

  return ["SINGLE"];
}

export function normalizePricingTypeForShop(
  shopType: string,
  value?: string | null
): PricingType {
  const allowed = getAllowedPricingTypesByShopType(shopType);
  const requested = normalizeValue(value);

  if (requested === "BULK" && allowed.includes("BULK")) return "BULK";

  return "SINGLE";
}

export function isVariantProduct(product?: ProductCatalogItem | null) {
  const configurationMode = String(product?.configurationMode || "").trim();

  if (
    configurationMode === "variant" ||
    configurationMode === "variantCompatibility"
  ) {
    return true;
  }

  return Array.isArray(product?.variant) && product.variant.length > 0;
}

export function getProductId(item?: ShopProductItem | null) {
  const product = item?.productId;

  if (!product) return "";
  if (typeof product === "string") return product;

  return String(product._id || "");
}

export function getCatalogProductLabel(item?: {
  itemName?: string;
  itemModelNumber?: string;
  itemKey?: string;
} | null) {
  const itemName = String(item?.itemName || item?.itemKey || "Product").trim();
  const modelNumber = String(item?.itemModelNumber || "").trim();

  return modelNumber ? `${itemName} (${modelNumber})` : itemName;
}

export function getProductImage(
  product?: ProductCatalogItem | ProductReference | null
) {
  if (!product || typeof product === "string") return "";
  if (!Array.isArray(product.images)) return "";

  return (
    product.images.find((item) => String(item?.url || "").trim())?.url || ""
  );
}

export function getVariantProductImage(
  product: ProductCatalogItem | null,
  variantIndex: number
) {
  if (!product) return "";

  const variantImage =
    product.variant?.[variantIndex]?.images?.find((item) =>
      String(item?.url || "").trim()
    )?.url || "";

  return variantImage || getProductImage(product);
}

export function getVendorId(value?: VendorReference | null) {
  if (!value) return "";
  if (typeof value === "string") return value;

  return String(value._id || "");
}

export function getVendorName(vendor?: VendorItem | VendorReference | null) {
  if (!vendor) return "Vendor";
  if (typeof vendor === "string") return vendor;

  return String(
    vendor.vendorName || vendor.name || vendor.vendorKey || "Vendor"
  ).trim();
}

export function getErrorMessage(
  result: { message?: string } | null,
  fallback: string
) {
  const message = String(result?.message || fallback).trim() || fallback;

  if (
    message.includes("Cannot populate path") &&
    message.includes("productId.productTypeId")
  ) {
    return "Shop product details are temporarily unavailable because product metadata is out of sync. Please reload after updating the server.";
  }

  return message;
}

export function formatDateInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

export function hasTextValue(value?: string | null) {
  return Boolean(String(value || "").trim());
}