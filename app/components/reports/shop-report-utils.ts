"use client";

import { useCallback, useEffect, useState } from "react";

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

export type SelectedShopContext = {
  id: string;
  name: string;
  type: string;
};

export function getInitialReportRange() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  return { today, firstOfMonth };
}

export function readSelectedShopContext(): SelectedShopContext {
  if (typeof window === "undefined") {
    return { id: "", name: "", type: "" };
  }

  return {
    id: String(window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "").trim(),
    name: String(window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "").trim(),
    type: String(window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "").trim(),
  };
}

export function useSelectedShopContext() {
  const [shop, setShop] = useState<SelectedShopContext>(() =>
    readSelectedShopContext()
  );

  const syncSelectedShop = useCallback(() => {
    setShop(readSelectedShopContext());
  }, []);

  useEffect(() => {
    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  return shop;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function hasInvalidDateRange(from: string, to: string) {
  return Boolean(from && to && from > to);
}

export function formatGroupedDateLabel(id: Record<string, number>) {
  if (id.day) {
    return `${id.year}-${String(id.month).padStart(2, "0")}-${String(id.day).padStart(2, "0")}`;
  }

  return `${id.year}-${String(id.month).padStart(2, "0")}`;
}

export function formatBalanceTypeLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "PAYABLE" || normalized === "CR") return "Payable";
  if (normalized === "NONE") return "None";
  if (normalized === "RECEIVABLE" || normalized === "DR") return "Receivable";

  return value || "Receivable";
}
