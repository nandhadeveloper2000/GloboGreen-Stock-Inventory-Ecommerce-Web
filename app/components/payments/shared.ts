"use client";

export const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
export const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

export const PAYMENT_FOR_OPTIONS = [
  "SALE",
  "PURCHASE",
  "EXPENSE",
  "ADVANCE",
  "REFUND",
  "OTHER",
] as const;

export const PAYMENT_MODE_OPTIONS = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "CREDIT",
  "SPLIT",
] as const;

export const PAYMENT_STATUS_OPTIONS = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
] as const;

export const PARTY_TYPE_OPTIONS = ["CUSTOMER", "VENDOR", "OTHER"] as const;

export type SelectedShop = {
  id: string;
  name: string;
};

export type PaymentFor = (typeof PAYMENT_FOR_OPTIONS)[number];
export type PaymentMode = (typeof PAYMENT_MODE_OPTIONS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS_OPTIONS)[number];
export type PartyType = (typeof PARTY_TYPE_OPTIONS)[number];

export type PaymentItem = {
  _id: string;
  paymentFor?: PaymentFor | string;
  partyType?: PartyType | string;
  partyName?: string;
  amount?: number;
  mode?: PaymentMode | string;
  status?: PaymentStatus | string;
  referenceNo?: string;
  paymentDate?: string;
  notes?: string;
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

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function formatMoney(value?: number | null) {
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

export function formatPaymentForLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "SALE") return "Sale";
  if (normalized === "PURCHASE") return "Purchase";
  if (normalized === "EXPENSE") return "Expense";
  if (normalized === "ADVANCE") return "Advance";
  if (normalized === "REFUND") return "Refund";
  if (normalized === "OTHER") return "Other";

  return normalized || "-";
}

export function formatPaymentModeLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "BANK_TRANSFER") return "Bank Transfer";
  if (normalized === "CASH") return "Cash";
  if (normalized === "UPI") return "UPI";
  if (normalized === "CARD") return "Card";
  if (normalized === "CHEQUE") return "Cheque";
  if (normalized === "CREDIT") return "Credit";
  if (normalized === "SPLIT") return "Split";

  return normalized || "-";
}

export function formatPaymentStatusLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "COMPLETED") return "Completed";
  if (normalized === "PENDING") return "Pending";
  if (normalized === "FAILED") return "Failed";
  if (normalized === "REFUNDED") return "Refunded";

  return normalized || "-";
}

export function formatPartyTypeLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "CUSTOMER") return "Customer";
  if (normalized === "VENDOR") return "Vendor";
  if (normalized === "OTHER") return "Other";

  return normalized || "-";
}
