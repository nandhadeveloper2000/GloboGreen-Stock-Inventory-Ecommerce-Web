import { INITIAL_SINGLE_STATE } from "./constants";
import type {
  FormState,
  ProductCatalogItem,
  ShopProductVariantEntry,
  VariantEntryFormState,
} from "./types";
import { formatDateInput, hasTextValue } from "./utils";

export function getActiveVariantDefinitions(product?: ProductCatalogItem | null) {
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

export function hasExistingConfiguredVariantEntry(
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

export function createVariantEntryState(
  definition: {
    variantIndex: number;
    title: string;
    attributes: Array<{ label: string; value: string }>;
  },
  existing?: ShopProductVariantEntry | null
): VariantEntryFormState {
  const singlePricing = existing?.singlePricing || null;
  const bulkPricing = existing?.bulkPricing || null;

  return {
    variantIndex: definition.variantIndex,
    isSelected:
      existing?.isActive !== false && hasExistingConfiguredVariantEntry(existing),
    title: definition.title,
    attributes: definition.attributes,
    pricingType: "SINGLE",
    mainUnit: String(existing?.mainUnit || "Pcs"),
    qty: String(existing?.qty ?? 0),
    lowStockQty: String(existing?.lowStockQty ?? 0),
    minQty: String(singlePricing?.minQty ?? existing?.minQty ?? 0),
    purchaseQty: String(
      singlePricing?.purchaseQty ??
        existing?.purchaseQty ??
        singlePricing?.minQty ??
        existing?.minQty ??
        0
    ),
    inputPrice: String(singlePricing?.inputPrice ?? existing?.inputPrice ?? ""),
    mrpPrice: String(
      singlePricing?.mrpPrice ??
        existing?.mrpPrice ??
        singlePricing?.maxSellingPrice ??
        existing?.maxSellingPrice ??
        singlePricing?.inputPrice ??
        existing?.inputPrice ??
        ""
    ),
    baseRangeDownPercent: String(
      singlePricing?.baseRangeDownPercent ??
        existing?.baseRangeDownPercent ??
        10
    ),
    rangeDownPercent: String(
      singlePricing?.discount?.rangeDownPercent ??
        existing?.discount?.rangeDownPercent ??
        singlePricing?.rangeDownPercent ??
        existing?.rangeDownPercent ??
        0
    ),
    warrantyMonths: String(existing?.warrantyMonths ?? 0),
    purchaseDate: formatDateInput(existing?.purchaseDate),
    expiryDate: formatDateInput(existing?.expiryDate),
    discountFromDate: formatDateInput(
      singlePricing?.discount?.fromDate ?? existing?.discount?.fromDate
    ),
    discountToDate: formatDateInput(
      singlePricing?.discount?.toDate ?? existing?.discount?.toDate
    ),
    bulkMinQty: String(bulkPricing?.minQty ?? 0),
    bulkPurchaseQty: String(
      bulkPricing?.purchaseQty ?? bulkPricing?.minQty ?? 0
    ),
    bulkInputPrice: String(bulkPricing?.inputPrice ?? ""),
    bulkMrpPrice: String(
      bulkPricing?.mrpPrice ??
        bulkPricing?.maxSellingPrice ??
        bulkPricing?.inputPrice ??
        ""
    ),
    bulkBaseRangeDownPercent: String(bulkPricing?.baseRangeDownPercent ?? 10),
    bulkRangeDownPercent: String(
      bulkPricing?.discount?.rangeDownPercent ??
        bulkPricing?.rangeDownPercent ??
        0
    ),
    bulkDiscountFromDate: formatDateInput(bulkPricing?.discount?.fromDate),
    bulkDiscountToDate: formatDateInput(bulkPricing?.discount?.toDate),
  };
}

export function mergeVariantEntryState(
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

export function buildCreateFormState(
  product?: ProductCatalogItem | null
): FormState {
  return {
    productId: product?._id || "",
    variantEntries: product ? mergeVariantEntryState(product, [], []) : [],
    ...INITIAL_SINGLE_STATE,
    pricingType: "SINGLE",
  };
}