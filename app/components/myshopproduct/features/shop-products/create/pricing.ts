import type { PricingType } from "./types";

export function toNumber(value: string | number | undefined | null, fallback = 0) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return fallback;
  }

  return amount;
}

export function clampPercent(value: number, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0), 90);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function buildPricePreview({
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
  const unitSellingPrice = inputPrice + marginAmount;

  const totalPurchasePrice =
    pricingType === "BULK" ? purchaseQty * inputPrice : inputPrice;

  const sellingPrice =
    pricingType === "BULK" ? purchaseQty * unitSellingPrice : unitSellingPrice;

  const negotiationAmount = (sellingPrice * negotiationPercent) / 100;
  const minSellingPrice = Math.max(sellingPrice - negotiationAmount, 0);

  return {
    pricingType,
    purchaseQty: roundMoney(purchaseQty),
    inputPrice: roundMoney(inputPrice),
    mrpPrice: roundMoney(mrpPrice),
    marginAmount: roundMoney(marginAmount),
    marginPrice: roundMoney(unitSellingPrice),
    unitSellingPrice: roundMoney(unitSellingPrice),
    totalPurchasePrice: roundMoney(totalPurchasePrice),
    sellingPrice: roundMoney(sellingPrice),
    negotiationAmount: roundMoney(negotiationAmount),
    minSellingPrice: roundMoney(minSellingPrice),
    maxSellingPrice: roundMoney(sellingPrice),
  };
}

export function getPricingValidationMessage({
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