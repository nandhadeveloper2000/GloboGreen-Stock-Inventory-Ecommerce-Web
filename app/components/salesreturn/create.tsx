"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type CustomerRecord,
  type SalesReturnRecord,
  RETURN_REASON_OPTIONS,
  formatDate,
  getCustomerName,
  getSalesShopLabel,
  getStatusLabel,
  isSalesAllowedShop,
  money,
  normalizeSearchText,
  readSelectedShop,
  round,
  todayInput,
  toNumber,
} from "../sales/shared";

// ─── Local types ────────────────────────────────────────────────────────────

type EligibleOrderItem = {
  orderItemId: string;
  productId?: string | null;
  shopProductId?: string | null;
  productName?: string;
  itemCode?: string;
  batch?: string;
  unit?: string;
  soldQty?: number;
  previouslyReturnedQty?: number;
  availableQty?: number;
  unitPrice?: number;
};

type EligibleSalesOrder = {
  _id: string;
  orderNo?: string;
  invoiceNo?: string;
  orderDate?: string | null;
  createdAt?: string;
  customerId?: CustomerRecord | null;
  customerNameSnapshot?: string;
  status?: string;
  grandTotal?: number;
  items?: EligibleOrderItem[];
};

type ItemSelectionState = Record<
  string,
  {
    selected: boolean;
    returnQty: string;
  }
>;

type SalesReturnCreatePageProps = {
  mode?: "create" | "edit";
  returnId?: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const PRIMARY_COLOR = "#00008b";
const SUCCESS_COLOR = "#16a34a";

const STEP_TITLES = [
  "Select Sales Order",
  "Select Items & Details",
  "Confirm Return",
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function clampReturnQty(value: unknown, maxQty: number) {
  const parsed = Math.floor(Math.max(toNumber(value, 1), 1));
  return Math.min(parsed, Math.max(Math.floor(maxQty), 1));
}

function buildDefaultItemSelection(order?: EligibleSalesOrder | null) {
  const next: ItemSelectionState = {};
  for (const item of order?.items || []) {
    const available = Math.max(toNumber(item.availableQty, 0), 0);
    next[item.orderItemId] = {
      selected: false,
      returnQty: available > 0 ? "1" : "0",
    };
  }
  return next;
}

function buildPrefilledSelection(
  order: EligibleSalesOrder | null,
  existingItems: SalesReturnRecord["items"] = []
) {
  const lookup = new Map(
    (existingItems || [])
      .filter((i) => i.orderItemId)
      .map((i) => [String(i.orderItemId), i])
  );

  const next = buildDefaultItemSelection(order);

  for (const item of order?.items || []) {
    const current = lookup.get(item.orderItemId);
    if (!current) continue;
    const available = Math.max(toNumber(item.availableQty, 0), 0);
    const qty = Math.max(toNumber(current.returnQty, 1), 1);
    next[item.orderItemId] = {
      selected: true,
      returnQty: String(Math.min(qty, Math.max(available, 1))),
    };
  }
  return next;
}

function getSelectedReturnItems(
  order: EligibleSalesOrder | null,
  selection: ItemSelectionState
) {
  return (order?.items || [])
    .map((item) => {
      const current = selection[item.orderItemId];
      const available = Math.max(toNumber(item.availableQty, 0), 0);
      const returnQty = clampReturnQty(current?.returnQty, available || 1);
      return {
        ...item,
        isSelected: Boolean(current?.selected),
        returnQty,
        returnTotal: round(
          returnQty * Math.max(toNumber(item.unitPrice, 0), 0)
        ),
      };
    })
    .filter((item) => item.isSelected && item.returnQty > 0);
}

function buildOrderSearchText(order: EligibleSalesOrder) {
  return normalizeSearchText(
    [
      order.orderNo,
      order.invoiceNo,
      getCustomerName(order.customerId),
      order.customerNameSnapshot,
      getStatusLabel(order.status),
      ...(order.items || []).flatMap((item) => [item.productName, item.itemCode]),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getOrderCustomerLabel(order: EligibleSalesOrder) {
  if (order.customerId) return getCustomerName(order.customerId);
  return order.customerNameSnapshot || "Walk-in Customer";
}

function getOrderDate(order: EligibleSalesOrder) {
  return order.orderDate || order.createdAt || null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepBadge({
  index,
  title,
  active,
  complete,
}: {
  index: number;
  title: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
        style={{
          backgroundColor: complete
            ? SUCCESS_COLOR
            : active
              ? PRIMARY_COLOR
              : "#e5e7eb",
          borderColor: complete
            ? SUCCESS_COLOR
            : active
              ? PRIMARY_COLOR
              : "#d1d5db",
          color: complete || active ? "#ffffff" : "#475569",
        }}
      >
        {complete ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
      </div>
      <div className="min-w-0">
        <p
          className="text-xs font-semibold uppercase tracking-[0.32em]"
          style={{ color: active || complete ? PRIMARY_COLOR : "#64748b" }}
        >
          Step {index + 1}
        </p>
        <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
      </div>
    </div>
  );
}

function OrderMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function SalesReturnCreatePage({
  mode = "create",
  returnId = "",
}: SalesReturnCreatePageProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [orders, setOrders] = useState<EligibleSalesOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [itemSelection, setItemSelection] = useState<ItemSelectionState>({});
  const [returnDate, setReturnDate] = useState(todayInput());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

  const salesAllowed = useMemo(
    () => isSalesAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const shopTypeLabel = useMemo(
    () => getSalesShopLabel(selectedShopType),
    [selectedShopType]
  );

  const selectedOrder = useMemo(
    () => orders.find((o) => o._id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const filteredOrders = useMemo(() => {
    const q = normalizeSearchText(search);
    if (!q) return orders;
    return orders.filter((o) => buildOrderSearchText(o).includes(q));
  }, [orders, search]);

  const selectedReturnItems = useMemo(
    () => getSelectedReturnItems(selectedOrder, itemSelection),
    [itemSelection, selectedOrder]
  );

  const totalReturnQty = useMemo(
    () =>
      selectedReturnItems.reduce(
        (sum, item) => sum + Math.max(toNumber(item.returnQty, 0), 0),
        0
      ),
    [selectedReturnItems]
  );

  const totalReturnAmount = useMemo(
    () =>
      round(
        selectedReturnItems.reduce(
          (sum, item) => sum + Math.max(toNumber(item.returnTotal, 0), 0),
          0
        )
      ),
    [selectedReturnItems]
  );

  const canMoveToStepTwo = Boolean(selectedOrder);
  const canMoveToStepThree =
    Boolean(reason.trim()) && selectedReturnItems.length > 0;

  // ─── Shop sync ──────────────────────────────────────────────────────────

  const syncSelectedShop = useCallback(() => {
    const shop = readSelectedShop();
    setSelectedShopId(shop.id);
    setSelectedShopName(shop.name);
    setSelectedShopType(shop.type);
  }, []);

  useEffect(() => {
    syncSelectedShop();
    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);
    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchEligibleOrders = useCallback(
    async (params?: Record<string, string | number>) => {
      if (!accessToken || !selectedShopId) return [] as EligibleSalesOrder[];

      const response = await fetch(
        `${baseURL}${SummaryApi.sales_return_eligible.url(selectedShopId, { days: 30, ...params })}`,
        {
          method: SummaryApi.sales_return_eligible.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<EligibleSalesOrder[]>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load eligible orders");
      }

      return Array.isArray(result.data) ? result.data : [];
    },
    [accessToken, selectedShopId]
  );

  const fetchReturnDetail = useCallback(async () => {
    if (!accessToken || !selectedShopId || !returnId) return null;

    const response = await fetch(
      `${baseURL}${SummaryApi.sales_return_detail.url(selectedShopId, returnId)}`,
      {
        method: SummaryApi.sales_return_detail.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        credentials: "include",
        cache: "no-store",
      }
    );

    const result = (await response
      .json()
      .catch(() => ({}))) as ApiResponse<SalesReturnRecord>;

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "Failed to load sales return");
    }

    return result.data;
  }, [accessToken, returnId, selectedShopId]);

  const loadPageData = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId || !salesAllowed) {
        setOrders([]);
        setSelectedOrderId("");
        setItemSelection({});
        setErrorMessage("");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setErrorMessage("");

        if (mode === "edit") {
          if (!returnId) throw new Error("Invalid sales return id");

          const existing = await fetchReturnDetail();
          const orderId = String(
            (existing?.orderId as { _id?: string } | null | undefined)?._id ||
              existing?.orderId ||
              ""
          );

          const nextOrders = await fetchEligibleOrders(
            orderId ? { includeOrderId: orderId, excludeReturnId: returnId } : {}
          );

          setOrders(nextOrders);
          setReason(String(existing?.reason || ""));
          setNotes(String(existing?.notes || ""));

          const match = nextOrders.find((o) => o._id === orderId) ?? null;
          if (!match) {
            throw new Error(
              "Linked sales order is no longer available for editing"
            );
          }

          setSelectedOrderId(match._id);
          setItemSelection(buildPrefilledSelection(match, existing?.items || []));
          setStep(2);
        } else {
          const nextOrders = await fetchEligibleOrders();
          setOrders(nextOrders);
          setSelectedOrderId("");
          setItemSelection({});
          setStep(1);
        }
      } catch (error) {
        setOrders([]);
        setSelectedOrderId("");
        setItemSelection({});
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load sales return data"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      accessToken,
      fetchEligibleOrders,
      fetchReturnDetail,
      mode,
      returnId,
      salesAllowed,
      selectedShopId,
    ]
  );

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  // ─── Image handling ─────────────────────────────────────────────────────

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreviewUrl("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  // ─── Item controls ───────────────────────────────────────────────────────

  const handleToggleItem = useCallback(
    (item: EligibleOrderItem, selected: boolean) => {
      setItemSelection((prev) => ({
        ...prev,
        [item.orderItemId]: {
          selected,
          returnQty:
            prev[item.orderItemId]?.returnQty ||
            (Math.max(toNumber(item.availableQty, 0), 0) > 0 ? "1" : "0"),
        },
      }));
    },
    []
  );

  const handleQtyChange = useCallback(
    (item: EligibleOrderItem, value: string) => {
      setItemSelection((prev) => ({
        ...prev,
        [item.orderItemId]: {
          selected: prev[item.orderItemId]?.selected ?? true,
          returnQty: value.replace(/[^\d]/g, ""),
        },
      }));
    },
    []
  );

  const normalizeQty = useCallback((item: EligibleOrderItem) => {
    setItemSelection((prev) => ({
      ...prev,
      [item.orderItemId]: {
        selected: prev[item.orderItemId]?.selected ?? true,
        returnQty: String(
          clampReturnQty(
            prev[item.orderItemId]?.returnQty || 1,
            Math.max(toNumber(item.availableQty, 0), 1)
          )
        ),
      },
    }));
  }, []);

  const handleQtyStep = useCallback(
    (item: EligibleOrderItem, delta: number) => {
      setItemSelection((prev) => ({
        ...prev,
        [item.orderItemId]: {
          selected: prev[item.orderItemId]?.selected ?? true,
          returnQty: String(
            clampReturnQty(
              toNumber(prev[item.orderItemId]?.returnQty, 1) + delta,
              Math.max(toNumber(item.availableQty, 0), 1)
            )
          ),
        },
      }));
    },
    []
  );

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedOrder) {
      toast.error("Select a sales order first");
      return;
    }
    if (!reason.trim()) {
      toast.error("Return reason is required");
      return;
    }
    if (!selectedReturnItems.length) {
      toast.error("Select at least one item to return");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        orderId: selectedOrder._id,
        returnDate,
        reason: reason.trim(),
        notes: notes.trim(),
        items: selectedReturnItems.map((item) => ({
          orderItemId: item.orderItemId,
          returnQty: item.returnQty,
        })),
      };

      const endpoint =
        mode === "edit"
          ? SummaryApi.sales_return_update.url(selectedShopId, returnId)
          : SummaryApi.sales_return_create.url(selectedShopId);

      const method =
        mode === "edit"
          ? SummaryApi.sales_return_update.method
          : SummaryApi.sales_return_create.method;

      const response = await fetch(`${baseURL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<SalesReturnRecord>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save sales return");
      }

      toast.success(
        result.message ||
          (mode === "edit"
            ? "Sales return updated successfully"
            : "Sales return processed successfully")
      );

      if (mode === "edit") {
        const nextId = String(result.data?._id || returnId);
        router.push(`/shopowner/salesreturn/view?id=${nextId}`);
        return;
      }

      setReason("");
      setNotes("");
      setReturnDate(todayInput());
      setSelectedOrderId("");
      setItemSelection({});
      setStep(1);
      setSearch("");
      setImageFile(null);
      setImagePreviewUrl("");
      if (imageInputRef.current) imageInputRef.current.value = "";
      await loadPageData(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save sales return"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (mode === "edit") {
      void loadPageData(true);
      return;
    }
    setReason("");
    setNotes("");
    setReturnDate(todayInput());
    setSelectedOrderId("");
    setItemSelection({});
    setStep(1);
    setSearch("");
    setImageFile(null);
    setImagePreviewUrl("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  // ─── Guard states ────────────────────────────────────────────────────────

  if (!selectedShopId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Sales Return</h1>
        <p className="mt-3 text-sm text-slate-600">
          Select a shop first to process sales returns.
        </p>
      </div>
    );
  }

  if (!salesAllowed) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Sales Return</h1>
            <p className="mt-2 text-sm text-slate-700">
              Sales returns are available only for {shopTypeLabel}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <section
        className="overflow-hidden rounded-[2rem] text-white shadow-[0_24px_70px_rgba(0,0,139,0.22)]"
        style={{
          background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #0b2cbf 58%, #1d4ed8 100%)`,
        }}
      >
        <div className="flex flex-col gap-5 px-6 py-7 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-white/70">
              {mode === "edit" ? "Update Sales Return" : "Process Sales Return"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              {mode === "edit" ? "Edit Sales Return" : "Create Sales Return"}
            </h1>
            <p className="mt-2 text-sm text-blue-100">
              {selectedShopName || "Selected shop"} · Inventory-safe return flow
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur">
              Items: {selectedReturnItems.length}
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur">
              Qty: {totalReturnQty}
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur">
              {money(totalReturnAmount)}
            </div>
            <button
              type="button"
              onClick={() => router.push("/shopowner/salesreturn/list")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {mode === "edit" ? "Reload" : "Clear"}
            </button>
          </div>
        </div>
      </section>

      {/* Step progress */}
      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-3 lg:p-6">
        {STEP_TITLES.map((title, index) => (
          <StepBadge
            key={title}
            index={index}
            title={title}
            active={step === index + 1}
            complete={step > index + 1}
          />
        ))}
      </section>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-90 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading sales return data…
          </div>
        </div>
      ) : errorMessage ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-600">
                Unable to continue
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Sales return data could not be loaded
              </h2>
              <p className="mt-2 text-sm text-slate-700">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadPageData(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── STEP 1: Select Order ─────────────────────────────────────── */}
          {step === 1 && (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.32em]"
                    style={{ color: PRIMARY_COLOR }}
                  >
                    Step 1
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    Select a Sales Order to Return
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Showing eligible sales orders from the last 30 days.
                  </p>
                </div>

                <label className="relative block w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by order no, customer, invoice, item…"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-3 py-12 text-slate-500">
                  <ShieldCheck className="h-10 w-10 opacity-30" />
                  <p className="text-sm font-semibold">
                    {search
                      ? "No orders match your search"
                      : "No eligible orders found for the last 30 days"}
                  </p>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead style={{ backgroundColor: PRIMARY_COLOR }}>
                        <tr className="text-left text-white">
                          <th className="px-5 py-4 font-semibold">Order #</th>
                          <th className="px-5 py-4 font-semibold">Customer</th>
                          <th className="px-5 py-4 font-semibold">Date</th>
                          <th className="px-5 py-4 font-semibold">Status</th>
                          <th className="px-5 py-4 text-right font-semibold">
                            Total
                          </th>
                          <th className="px-5 py-4 text-right font-semibold">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          const isSelected = selectedOrderId === order._id;
                          return (
                            <tr
                              key={order._id}
                              className={`border-t border-slate-200 transition ${
                                isSelected
                                  ? "bg-blue-50/80"
                                  : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">
                                  {order.orderNo || "-"}
                                </p>
                                {order.invoiceNo && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Inv: {order.invoiceNo}
                                  </p>
                                )}
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {getOrderCustomerLabel(order)}
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {formatDate(getOrderDate(order))}
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  {getStatusLabel(order.status)}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right font-semibold text-slate-900">
                                {money(order.grandTotal)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Selected
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrderId(order._id);
                                      setItemSelection(
                                        buildDefaultItemSelection(order)
                                      );
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                                    style={{ backgroundColor: PRIMARY_COLOR }}
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                    Select
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={!canMoveToStepTwo}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  Next: Select Items
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {/* ── STEP 2: Select Items & Details ───────────────────────────── */}
          {step === 2 && selectedOrder && (
            <div className="space-y-5">
              {/* Order meta */}
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.32em]"
                  style={{ color: PRIMARY_COLOR }}
                >
                  Step 2 · Selected Order
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Select Items to Return
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <OrderMeta label="Order #" value={selectedOrder.orderNo || "-"} />
                  <OrderMeta
                    label="Customer"
                    value={getOrderCustomerLabel(selectedOrder)}
                  />
                  <OrderMeta
                    label="Date"
                    value={formatDate(getOrderDate(selectedOrder))}
                  />
                  <OrderMeta label="Total" value={money(selectedOrder.grandTotal)} />
                </div>
              </section>

              {/* Items table */}
              <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr
                        className="text-left text-white"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      >
                        <th className="px-5 py-4 font-semibold">Select</th>
                        <th className="px-5 py-4 font-semibold">Product</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Unit Price
                        </th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Ordered Qty
                        </th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Prev. Returned
                        </th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Available
                        </th>
                        <th className="px-5 py-4 font-semibold">Return Qty</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Return Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((item) => {
                        const sel = itemSelection[item.orderItemId];
                        const isChecked = Boolean(sel?.selected);
                        const available = Math.max(
                          toNumber(item.availableQty, 0),
                          0
                        );
                        const returnQty = clampReturnQty(
                          sel?.returnQty || 1,
                          available || 1
                        );
                        const lineTotal = round(
                          returnQty *
                            Math.max(toNumber(item.unitPrice, 0), 0)
                        );
                        const canReturn = available > 0;

                        return (
                          <tr
                            key={item.orderItemId}
                            className={`border-t border-slate-100 transition ${
                              isChecked ? "bg-blue-50/60" : "bg-white"
                            } ${!canReturn ? "opacity-50" : ""}`}
                          >
                            <td className="px-5 py-4">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!canReturn}
                                onChange={(e) =>
                                  handleToggleItem(item, e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300 accent-blue-700"
                              />
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {item.productName || "Product"}
                              </p>
                              {item.itemCode && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {item.itemCode}
                                </p>
                              )}
                              {item.batch && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                  Batch: {item.batch}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right text-slate-700">
                              {money(item.unitPrice)}
                            </td>
                            <td className="px-5 py-4 text-right text-slate-700">
                              {toNumber(item.soldQty, 0)}{" "}
                              {item.unit && (
                                <span className="text-xs text-slate-500">
                                  {item.unit}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right text-slate-700">
                              {toNumber(item.previouslyReturnedQty, 0)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span
                                className={`font-semibold ${
                                  available > 0
                                    ? "text-emerald-700"
                                    : "text-rose-500"
                                }`}
                              >
                                {available}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {canReturn ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={!isChecked}
                                    onClick={() => handleQtyStep(item, -1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={sel?.returnQty ?? "1"}
                                    disabled={!isChecked}
                                    onChange={(e) =>
                                      handleQtyChange(item, e.target.value)
                                    }
                                    onBlur={() => normalizeQty(item)}
                                    className="h-7 w-12 rounded-lg border border-slate-200 text-center text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:opacity-40"
                                  />
                                  <button
                                    type="button"
                                    disabled={!isChecked}
                                    onClick={() => handleQtyStep(item, 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-slate-900">
                              {isChecked ? money(lineTotal) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Details & Summary row */}
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Details (reason, notes, image) */}
                <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">
                    Return Details
                  </h3>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Return Date
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Reason for Return{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select reason…</option>
                      {RETURN_REASON_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Additional Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Optional notes about this return…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none resize-none focus:border-slate-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Image upload */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Supporting Image (optional)
                    </label>
                    {imagePreviewUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreviewUrl}
                          alt="Return image preview"
                          className="max-h-48 w-full object-contain bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white"
                          title="Remove image"
                        >
                          <X className="h-4 w-4 text-rose-500" />
                        </button>
                        <p className="bg-slate-50 px-3 py-2 text-xs text-slate-500 truncate">
                          {imageFile?.name}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm font-semibold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <ImagePlus className="h-5 w-5" />
                        Click to upload image
                      </button>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Accepted: JPG, PNG, WEBP · Max 5 MB
                    </p>
                  </div>

                  {/* Remove / trash selected items */}
                  <button
                    type="button"
                    onClick={() => {
                      const next: ItemSelectionState = {};
                      for (const key of Object.keys(itemSelection)) {
                        next[key] = { ...itemSelection[key], selected: false };
                      }
                      setItemSelection(next);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear selections
                  </button>
                </section>

                {/* Return summary */}
                <section className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">
                    Return Summary
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Items to Return</span>
                      <span className="font-semibold text-slate-900">
                        {selectedReturnItems.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Total Quantities</span>
                      <span className="font-semibold text-slate-900">
                        {totalReturnQty}
                      </span>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">
                        {money(totalReturnAmount)}
                      </span>
                    </div>
                    <hr className="border-slate-100" />
                    <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white">
                      <span className="text-sm font-semibold">
                        Return Total
                      </span>
                      <span className="text-xl font-black">
                        {money(totalReturnAmount)}
                      </span>
                    </div>
                  </div>

                  {selectedReturnItems.length > 0 && (
                    <ul className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3">
                      {selectedReturnItems.map((item) => (
                        <li
                          key={item.orderItemId}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="truncate text-slate-700 max-w-[60%]">
                            {item.productName || "Product"}{" "}
                            <span className="text-slate-500">
                              ×{item.returnQty}
                            </span>
                          </span>
                          <span className="font-semibold text-slate-900">
                            {money(item.returnTotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canMoveToStepThree}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  Review & Confirm
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirm Return ───────────────────────────────────── */}
          {step === 3 && selectedOrder && (
            <div className="space-y-5">
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                  >
                    <ShieldCheck
                      className="h-6 w-6"
                      style={{ color: PRIMARY_COLOR }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.32em]"
                      style={{ color: PRIMARY_COLOR }}
                    >
                      Step 3
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">
                      Confirm Return Details
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Review and confirm before processing.
                    </p>
                  </div>
                </div>

                {/* Order info */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <OrderMeta label="Order #" value={selectedOrder.orderNo || "-"} />
                  <OrderMeta
                    label="Customer"
                    value={getOrderCustomerLabel(selectedOrder)}
                  />
                  <OrderMeta
                    label="Return Date"
                    value={formatDate(returnDate)}
                  />
                  <OrderMeta label="Return Reason" value={reason} />
                </div>

                {notes.trim() && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{notes}</p>
                  </div>
                )}

                {imagePreviewUrl && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Supporting Image
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="Return evidence"
                      className="max-h-40 rounded-xl border border-slate-200 object-contain"
                    />
                  </div>
                )}
              </section>

              {/* Items confirmation table */}
              <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead style={{ backgroundColor: PRIMARY_COLOR }}>
                      <tr className="text-left text-white">
                        <th className="px-5 py-4 font-semibold">Product</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Unit Price
                        </th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Return Qty
                        </th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Return Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturnItems.map((item, idx) => (
                        <tr
                          key={item.orderItemId}
                          className={`border-t border-slate-100 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {item.productName || "Product"}
                            </p>
                            {item.itemCode && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {item.itemCode}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-700">
                            {money(item.unitPrice)}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {item.returnQty}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {money(item.returnTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td
                          colSpan={3}
                          className="px-5 py-4 text-right text-sm font-black text-slate-900"
                        >
                          Return Total
                        </td>
                        <td className="px-5 py-4 text-right text-lg font-black text-slate-900">
                          {money(totalReturnAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  By confirming this return, the selected items will be credited
                  back to inventory and a credit note will be issued against the
                  original sales order. This action cannot be undone.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {submitting ? "Processing…" : "Process Return"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
