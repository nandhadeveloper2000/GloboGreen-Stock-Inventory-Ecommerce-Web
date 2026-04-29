export type PricingType = "SINGLE" | "BULK";

export type MediaAsset = {
  url?: string;
  publicId?: string;
  public_id?: string;
};

export type VariantAttribute = {
  label?: string;
  value?: string;
};

export type ProductVariantDefinition = {
  title?: string;
  description?: string;
  attributes?: VariantAttribute[];
  images?: MediaAsset[];
  isActive?: boolean;
};

export type ProductCatalogItem = {
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

export type ProductReference =
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

export type VendorReference =
  | string
  | {
      _id?: string;
      code?: string;
      vendorName?: string;
      vendorKey?: string;
      name?: string;
      status?: string;
    };

export type VendorItem = {
  _id: string;
  code?: string;
  vendorName?: string;
  vendorKey?: string;
  name?: string;
  status?: string;
};

export type DiscountValue = {
  rangeDownPercent?: number;
  fromDate?: string | null;
  toDate?: string | null;
  ruleId?: string | null;
};

export type ShopProductPricingValue = {
  pricingType?: PricingType;
  minQty?: number;
  purchaseQty?: number;
  inputPrice?: number;
  mrpPrice?: number;
  baseRangeDownPercent?: number;
  rangeDownPercent?: number;
  marginAmount?: number;
  marginPrice?: number;
  unitSellingPrice?: number;
  totalPurchasePrice?: number;
  negotiationAmount?: number;
  minSellingPrice?: number;
  maxSellingPrice?: number;
  sellingPrice?: number;
  discount?: DiscountValue;
};

export type ShopProductVariantEntry = {
  variantIndex?: number;
  title?: string;
  attributes?: VariantAttribute[];
  pricingType?: PricingType;
  singlePricing?: ShopProductPricingValue | null;
  bulkPricing?: ShopProductPricingValue | null;
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
  unitSellingPrice?: number;
  totalPurchasePrice?: number;
  negotiationAmount?: number;
  minSellingPrice?: number;
  maxSellingPrice?: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  isActive?: boolean;
  discount?: DiscountValue;
};

export type ShopProductItem = {
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
  discount?: DiscountValue;
  singlePricing?: ShopProductPricingValue | null;
  bulkPricing?: ShopProductPricingValue | null;
};

export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export type SingleFormState = {
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
  bulkMinQty: string;
  bulkPurchaseQty: string;
  bulkInputPrice: string;
  bulkMrpPrice: string;
  bulkBaseRangeDownPercent: string;
  bulkRangeDownPercent: string;
  bulkDiscountFromDate: string;
  bulkDiscountToDate: string;
};

export type VariantEntryFormState = {
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
  bulkMinQty: string;
  bulkPurchaseQty: string;
  bulkInputPrice: string;
  bulkMrpPrice: string;
  bulkBaseRangeDownPercent: string;
  bulkRangeDownPercent: string;
  bulkDiscountFromDate: string;
  bulkDiscountToDate: string;
};

export type FormState = SingleFormState & {
  productId: string;
  variantEntries: VariantEntryFormState[];
};