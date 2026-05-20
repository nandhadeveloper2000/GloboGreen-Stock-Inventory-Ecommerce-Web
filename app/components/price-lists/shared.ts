"use client";

export const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
export const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

export const PRICE_LIST_TYPES = [
  "RETAIL",
  "WHOLESALE",
  "DEALER",
  "CUSTOM",
] as const;

export type SelectedShop = {
  id: string;
  name: string;
};

export type ShopProductOption = {
  _id: string;
  name: string;
  basePrice?: number;
};

export type PriceListItemRow = {
  shopProductId: string;
  productName: string;
  price: string;
};

export type PriceListItem = {
  shopProductId?: string;
  productName?: string;
  price?: number;
};

export type PriceListRecord = {
  _id: string;
  name?: string;
  listType?: string;
  description?: string;
  items?: PriceListItem[];
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
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

export function formatPriceListTypeLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "RETAIL") return "Retail";
  if (normalized === "WHOLESALE") return "Wholesale";
  if (normalized === "DEALER") return "Dealer";
  if (normalized === "CUSTOM") return "Custom";

  return normalized || "-";
}

export function formatMoney(value?: number | string | null) {
  const amount = Number(value || 0);
  return `Rs. ${amount.toFixed(2)}`;
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
