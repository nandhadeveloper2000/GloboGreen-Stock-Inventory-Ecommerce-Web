"use client";

export const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
export const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

export type DiscountApplyOn = "ORDER" | "CATEGORY" | "SUBCATEGORY" | "PRODUCT";
export type DiscountType = "PERCENTAGE" | "FLAT";

export type SelectedShop = {
  id: string;
  name: string;
};

export type DiscountApplicableItem = {
  _id: string;
  name?: string;
  categoryName?: string;
};

export type DiscountItem = {
  _id: string;
  code?: string;
  description?: string;
  discountType?: DiscountType | string;
  value?: number;
  applyOn?: DiscountApplyOn | string;
  applicableIds?: Array<string | DiscountApplicableItem>;
  applicableItems?: DiscountApplicableItem[];
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ShopCategoryOption = {
  _id: string;
  name: string;
};

export type ShopSubCategoryOption = {
  _id: string;
  name: string;
  categoryId: string;
  categoryName: string;
};

function cleanStorageValue(value: string | null) {
  const text = String(value || "").trim();

  if (
    !text ||
    text === "undefined" ||
    text === "null" ||
    text === "[object Object]"
  ) {
    return "";
  }

  return text;
}

export function isValidObjectId(value: string) {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

export function readSelectedShop(): SelectedShop {
  if (typeof window === "undefined") {
    return { id: "", name: "" };
  }

  const rawShopId = cleanStorageValue(
    window.localStorage.getItem(SELECTED_SHOP_ID_KEY)
  );
  const rawShopName = cleanStorageValue(
    window.localStorage.getItem(SELECTED_SHOP_NAME_KEY)
  );

  if (rawShopId.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawShopId) as {
        _id?: string;
        id?: string;
        shopName?: string;
        name?: string;
      };

      const parsedId = cleanStorageValue(parsed?._id || parsed?.id || "");
      const parsedName = cleanStorageValue(
        parsed?.shopName || parsed?.name || rawShopName
      );

      return {
        id: isValidObjectId(parsedId) ? parsedId : "",
        name: parsedName,
      };
    } catch {
      return {
        id: isValidObjectId(rawShopId) ? rawShopId : "",
        name: rawShopName,
      };
    }
  }

  return {
    id: isValidObjectId(rawShopId) ? rawShopId : "",
    name: rawShopName,
  };
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDiscountTypeLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "PERCENTAGE") return "Percentage";
  if (normalized === "FLAT") return "Flat";

  return normalized || "-";
}

export function formatApplyOnLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "ORDER") return "Order Wise";
  if (normalized === "CATEGORY") return "Category Wise";
  if (normalized === "SUBCATEGORY") return "Subcategory Wise";
  if (normalized === "PRODUCT") return "Product Wise";

  return normalized || "-";
}

export function formatDiscountValue(item: Pick<DiscountItem, "discountType" | "value">) {
  const numericValue = Number(item.value || 0);

  if (String(item.discountType || "").toUpperCase() === "PERCENTAGE") {
    return `${numericValue}%`;
  }

  return `Rs. ${numericValue.toFixed(2)}`;
}

export function getDiscountStatus(item: Pick<DiscountItem, "isActive" | "validFrom" | "validTo">) {
  if (item.isActive === false) return "INACTIVE";

  const now = Date.now();
  const validFrom = item.validFrom ? new Date(item.validFrom).getTime() : null;
  const validTo = item.validTo ? new Date(item.validTo).getTime() : null;

  if (validFrom && validFrom > now) return "SCHEDULED";
  if (validTo && validTo < now) return "EXPIRED";

  return "ACTIVE";
}

export function getApplicableItemNames(item: Pick<DiscountItem, "applyOn" | "applicableIds" | "applicableItems">) {
  const populatedNames = Array.isArray(item.applicableItems)
    ? item.applicableItems
        .map((entry) => String(entry?.name || "").trim())
        .filter(Boolean)
    : [];

  if (populatedNames.length > 0) return populatedNames;

  if (!Array.isArray(item.applicableIds)) return [];

  return item.applicableIds
    .map((entry) => {
      if (typeof entry === "string") return "";
      return String(entry?.name || "").trim();
    })
    .filter(Boolean);
}

export function generateDiscountCode(applyOn: string) {
  const normalized = String(applyOn || "").trim().toUpperCase();
  const prefix =
    normalized === "CATEGORY"
      ? "CAT"
      : normalized === "SUBCATEGORY"
        ? "SUB"
      : normalized === "PRODUCT"
        ? "PRD"
        : "ORD";

  const stamp = new Date().toISOString().slice(5, 10).replace("-", "");
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);

  return `${prefix}-${stamp}-${random}`;
}
