import type { SingleFormState, FormState } from "./types";

export const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
export const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
export const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

export const PRODUCT_UNITS = ["Pcs", "Nos", "Box", "g", "Kg"] as const;

export const INITIAL_SINGLE_STATE: SingleFormState = {
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
  bulkMinQty: "0",
  bulkPurchaseQty: "0",
  bulkInputPrice: "",
  bulkMrpPrice: "",
  bulkBaseRangeDownPercent: "10",
  bulkRangeDownPercent: "0",
  bulkDiscountFromDate: "",
  bulkDiscountToDate: "",
};

export const INITIAL_FORM: FormState = {
  productId: "",
  variantEntries: [],
  ...INITIAL_SINGLE_STATE,
};