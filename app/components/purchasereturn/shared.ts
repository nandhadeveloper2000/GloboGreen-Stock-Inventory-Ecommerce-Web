export type ApiResponse<T> = {
  success?: boolean
  message?: string
  data?: T
}

export type Address = {
  state?: string
  district?: string
  taluk?: string
  area?: string
  street?: string
  pincode?: string
}

export type SupplierReference =
  | string
  | {
      _id?: string
      vendorName?: string
      name?: string
      code?: string
      mobile?: string
      email?: string
      gstNumber?: string
      address?: Address
    }
  | null

export type PurchaseReference =
  | string
  | {
      _id?: string
      purchaseNo?: string
      invoiceNo?: string
      purchaseDate?: string | null
      invoiceDate?: string | null
      payMode?: string
      mode?: string
      netAmount?: number
      status?: string
      supplierId?: SupplierReference
    }
  | null

export type EligiblePurchaseItem = {
  purchaseItemId: string
  supplierId?: SupplierReference
  shopProductId?: string | null
  productId?: string | null
  itemCode?: string
  productName?: string
  batch?: string
  orderedQty?: number
  previouslyReturnedQty?: number
  availableQty?: number
  unitPrice?: number
}

export type EligiblePurchaseOrder = {
  _id: string
  purchaseNo?: string
  invoiceNo?: string
  mode?: string
  purchaseDate?: string | null
  status?: string
  supplierId?: SupplierReference
  netAmount?: number
  itemCount?: number
  totalQty?: number
  totalAvailableQty?: number
  items?: EligiblePurchaseItem[]
}

export type PurchaseReturnItem = {
  _id?: string
  purchaseItemId?: string
  supplierId?: SupplierReference
  shopProductId?: string | null
  productId?: string | null
  itemCode?: string
  productName?: string
  batch?: string
  orderedQty?: number
  returnQty?: number
  unitPrice?: number
  returnTotal?: number
}

export type PurchaseReturnRecord = {
  _id: string
  returnNo?: string
  returnDate?: string | null
  purchaseId?: PurchaseReference
  purchaseNo?: string
  supplierId?: SupplierReference
  reason?: string
  notes?: string
  items?: PurchaseReturnItem[]
  itemCount?: number
  totalQty?: number
  totalReturnAmount?: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

export const PRIMARY_COLOR = "#00008b"
export const SUCCESS_COLOR = "#15803d"
export const WARNING_COLOR = "#d97706"

export const SELECTED_SHOP_ID_KEY = "selected_shop_id_web"
export const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web"
export const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web"

export const RETURN_REASON_OPTIONS = [
  "Defective Product",
  "Wrong Item Received",
  "Excess Quantity",
  "Item No Longer Needed",
  "Late Delivery",
  "Other",
] as const

export function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

export function normalizeSearchText(value: unknown) {
  return String(value || "").trim().toLowerCase()
}

export function isPurchaseAllowedShop(shopType?: string | null) {
  const normalized = normalizeValue(shopType)

  return (
    normalized === "WAREHOUSE_RETAIL_SHOP" ||
    normalized === "WHOLESALE_SHOP"
  )
}

export function getPurchaseShopLabel(shopType?: string | null) {
  const normalized = normalizeValue(shopType)

  if (normalized === "WHOLESALE_SHOP") return "Wholesale Shop"
  if (normalized === "WAREHOUSE_RETAIL_SHOP") return "Warehouse Retail Shop"

  return "Warehouse Retail Shop / Wholesale Shop"
}

export function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "", type: "" }
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
    type: window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "",
  }
}

export function formatDate(value?: string | null, variant: "short" | "long" = "short") {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString(
    "en-IN",
    variant === "long"
      ? {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
  )
}

export function formatDateInput(value?: string | null) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  return date.toISOString().slice(0, 10)
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

export function money(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function toNumber(value: unknown, fallback = 0) {
  const number = Number(value)

  if (!Number.isFinite(number)) return fallback

  return number
}

export function getReferenceId(
  value?: SupplierReference | PurchaseReference | { _id?: string } | null
) {
  if (!value) return ""
  if (typeof value === "string") return value
  return String(value._id || "")
}

export function getSupplierName(supplier?: SupplierReference) {
  if (!supplier) return "-"
  if (typeof supplier === "string") return supplier

  return String(
    supplier.vendorName || supplier.name || supplier.code || "Supplier"
  ).trim()
}

export function getStatusLabel(status?: string | null) {
  const normalized = normalizeValue(status)

  if (!normalized) return "Open"

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase())
}

export function getPurchaseId(value?: PurchaseReference) {
  if (!value) return ""
  if (typeof value === "string") return value
  return String(value._id || "")
}

export function getPurchaseNumber(
  purchase?: PurchaseReference,
  fallback?: string | null
) {
  if (purchase && typeof purchase !== "string") {
    return String(purchase.purchaseNo || fallback || "-")
  }

  return String(fallback || purchase || "-")
}

export function getPurchaseSupplier(purchase?: PurchaseReference) {
  if (purchase && typeof purchase !== "string") {
    return purchase.supplierId || null
  }

  return null
}
