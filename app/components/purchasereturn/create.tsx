"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type EligiblePurchaseItem,
  type EligiblePurchaseOrder,
  type PurchaseReturnItem,
  type PurchaseReturnRecord,
  PRIMARY_COLOR,
  RETURN_REASON_OPTIONS,
  SUCCESS_COLOR,
  WARNING_COLOR,
  formatDate,
  formatDateInput,
  getPurchaseId,
  getPurchaseShopLabel,
  getStatusLabel,
  getSupplierName,
  isPurchaseAllowedShop,
  money,
  normalizeSearchText,
  readSelectedShop,
  round,
  todayInput,
  toNumber,
} from "./shared";

type PurchaseReturnCreatePageProps = {
  mode?: "create" | "edit";
  returnId?: string;
};

type ItemSelectionState = Record<
  string,
  {
    selected: boolean;
    returnQty: string;
  }
>;

const STEP_TITLES = [
  "Select Purchase Order",
  "Select Items to Return",
  "Confirm Return",
] as const;

function getOrderSupplierLabel(order?: EligiblePurchaseOrder | null) {
  if (!order) return "-";

  if (order.supplierId) {
    return getSupplierName(order.supplierId);
  }

  const names = Array.from(
    new Set(
      (order.items || [])
        .map((item) => getSupplierName(item.supplierId))
        .filter((name) => name && name !== "-")
    )
  );

  if (!names.length) return "Multiple suppliers";
  if (names.length === 1) return names[0];

  return "Multiple suppliers";
}

function buildOrderSearchText(order: EligiblePurchaseOrder) {
  return normalizeSearchText(
    [
      order.purchaseNo,
      order.invoiceNo,
      getOrderSupplierLabel(order),
      getStatusLabel(order.status),
      ...(order.items || []).flatMap((item) => [item.productName, item.itemCode]),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildDefaultItemSelection(order?: EligiblePurchaseOrder | null) {
  const next: ItemSelectionState = {};

  for (const item of order?.items || []) {
    const availableQty = Math.max(toNumber(item.availableQty, 0), 0);

    next[item.purchaseItemId] = {
      selected: false,
      returnQty: availableQty > 0 ? "1" : "0",
    };
  }

  return next;
}

function buildPrefilledSelection(
  order: EligiblePurchaseOrder | null,
  existingItems: PurchaseReturnItem[] = []
) {
  const existingLookup = new Map(
    existingItems
      .filter((item) => item.purchaseItemId)
      .map((item) => [String(item.purchaseItemId), item])
  );

  const next = buildDefaultItemSelection(order);

  for (const item of order?.items || []) {
    const current = existingLookup.get(item.purchaseItemId);

    if (!current) continue;

    const availableQty = Math.max(toNumber(item.availableQty, 0), 0);
    const currentQty = Math.max(toNumber(current.returnQty, 1), 1);

    next[item.purchaseItemId] = {
      selected: true,
      returnQty: String(Math.min(currentQty, Math.max(availableQty, 1))),
    };
  }

  return next;
}

function clampReturnQty(value: unknown, maxQty: number) {
  const parsed = Math.floor(Math.max(toNumber(value, 1), 1));
  return Math.min(parsed, Math.max(Math.floor(maxQty), 1));
}

function getSelectedReturnItems(
  order: EligiblePurchaseOrder | null,
  selection: ItemSelectionState
) {
  return (order?.items || [])
    .map((item) => {
      const current = selection[item.purchaseItemId];
      const availableQty = Math.max(toNumber(item.availableQty, 0), 0);
      const returnQty = clampReturnQty(current?.returnQty, availableQty || 1);

      return {
        ...item,
        isSelected: Boolean(current?.selected),
        returnQty,
        returnTotal: round(returnQty * Math.max(toNumber(item.unitPrice, 0), 0)),
      };
    })
    .filter((item) => item.isSelected && item.returnQty > 0);
}

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
        className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold"
        style={{
          backgroundColor: complete ? SUCCESS_COLOR : active ? PRIMARY_COLOR : "#e5e7eb",
          borderColor: complete ? SUCCESS_COLOR : active ? PRIMARY_COLOR : "#d1d5db",
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

function OrderMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function PurchaseReturnCreatePage({
  mode = "create",
  returnId = "",
}: PurchaseReturnCreatePageProps) {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [orders, setOrders] = useState<EligiblePurchaseOrder[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [itemSelection, setItemSelection] = useState<ItemSelectionState>({});
  const [returnDate, setReturnDate] = useState(todayInput());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const purchaseAllowedShopSelected = useMemo(
    () => isPurchaseAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const selectedShopTypeLabel = useMemo(
    () => getPurchaseShopLabel(selectedShopType),
    [selectedShopType]
  );

  const selectedPurchase = useMemo(
    () => orders.find((order) => order._id === selectedPurchaseId) || null,
    [orders, selectedPurchaseId]
  );

  const filteredOrders = useMemo(() => {
    const query = normalizeSearchText(search);

    if (!query) return orders;

    return orders.filter((order) => buildOrderSearchText(order).includes(query));
  }, [orders, search]);

  const selectedReturnItems = useMemo(
    () => getSelectedReturnItems(selectedPurchase, itemSelection),
    [itemSelection, selectedPurchase]
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

  const canMoveToStepTwo = Boolean(selectedPurchase);
  const canMoveToStepThree =
    Boolean(reason.trim()) && selectedReturnItems.length > 0;

  const syncSelectedShop = useCallback(() => {
    const selectedShop = readSelectedShop();

    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const fetchEligibleOrders = useCallback(
    async (options?: { includePurchaseId?: string; excludeReturnId?: string }) => {
      if (!accessToken || !selectedShopId) {
        return [] as EligiblePurchaseOrder[];
      }

      const params: Record<string, string | number> = { days: 15 };

      if (options?.includePurchaseId) {
        params.includePurchaseId = options.includePurchaseId;
      }

      if (options?.excludeReturnId) {
        params.excludeReturnId = options.excludeReturnId;
      }

      const response = await fetch(
        `${baseURL}${SummaryApi.purchase_return_eligible.url(selectedShopId, params)}`,
        {
          method: SummaryApi.purchase_return_eligible.method,
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
        .catch(() => ({}))) as ApiResponse<EligiblePurchaseOrder[]>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load eligible purchase orders");
      }

      return Array.isArray(result.data) ? result.data : [];
    },
    [accessToken, selectedShopId]
  );

  const fetchPurchaseReturn = useCallback(async () => {
    if (!accessToken || !selectedShopId || !returnId) {
      return null;
    }

    const response = await fetch(
      `${baseURL}${SummaryApi.purchase_return_detail.url(selectedShopId, returnId)}`,
      {
        method: SummaryApi.purchase_return_detail.method,
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
      .catch(() => ({}))) as ApiResponse<PurchaseReturnRecord>;

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "Failed to load purchase return");
    }

    return result.data;
  }, [accessToken, returnId, selectedShopId]);

  const applySelectedOrder = useCallback(
    (
      order: EligiblePurchaseOrder,
      options?: {
        existingItems?: PurchaseReturnItem[];
        keepStep?: boolean;
      }
    ) => {
      setSelectedPurchaseId(order._id);
      setItemSelection(
        options?.existingItems
          ? buildPrefilledSelection(order, options.existingItems)
          : buildDefaultItemSelection(order)
      );

      if (!options?.keepStep) {
        setStep(1);
      }
    },
    []
  );

  const loadPageData = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId || !purchaseAllowedShopSelected) {
        setOrders([]);
        setSelectedPurchaseId("");
        setItemSelection({});
        setErrorMessage("");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        if (mode === "edit") {
          if (!returnId) {
            throw new Error("Invalid purchase return id");
          }

          const existing = await fetchPurchaseReturn();
          const purchaseId = getPurchaseId(existing?.purchaseId);

          const nextOrders = await fetchEligibleOrders({
            includePurchaseId: purchaseId,
            excludeReturnId: returnId,
          });

          setOrders(nextOrders);
          setReason(String(existing?.reason || ""));
          setNotes(String(existing?.notes || ""));
          setReturnDate(formatDateInput(existing?.returnDate) || todayInput());

          const matchingOrder =
            nextOrders.find((order) => order._id === purchaseId) || null;

          if (!matchingOrder) {
            throw new Error("Linked purchase order is no longer available for editing");
          }

          setSelectedPurchaseId(matchingOrder._id);
          setItemSelection(
            buildPrefilledSelection(matchingOrder, existing?.items || [])
          );
          setStep(2);
        } else {
          const nextOrders = await fetchEligibleOrders();
          setOrders(nextOrders);
          setSelectedPurchaseId("");
          setItemSelection({});
          setStep(1);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load purchase return";

        setOrders([]);
        setSelectedPurchaseId("");
        setItemSelection({});
        setErrorMessage(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      accessToken,
      fetchEligibleOrders,
      fetchPurchaseReturn,
      mode,
      purchaseAllowedShopSelected,
      returnId,
      selectedShopId,
    ]
  );

  useEffect(() => {
    syncSelectedShop();

    function handleShopChange() {
      syncSelectedShop();
    }

    window.addEventListener("shop-selection-changed", handleShopChange);
    window.addEventListener("storage", handleShopChange);

    return () => {
      window.removeEventListener("shop-selection-changed", handleShopChange);
      window.removeEventListener("storage", handleShopChange);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  const handleToggleItem = useCallback(
    (item: EligiblePurchaseItem, selected: boolean) => {
      setItemSelection((current) => ({
        ...current,
        [item.purchaseItemId]: {
          selected,
          returnQty:
            current[item.purchaseItemId]?.returnQty ||
            (Math.max(toNumber(item.availableQty, 0), 0) > 0 ? "1" : "0"),
        },
      }));
    },
    []
  );

  const handleQtyChange = useCallback(
    (item: EligiblePurchaseItem, value: string) => {
      const numeric = value.replace(/[^\d]/g, "");

      setItemSelection((current) => ({
        ...current,
        [item.purchaseItemId]: {
          selected: current[item.purchaseItemId]?.selected ?? true,
          returnQty: numeric,
        },
      }));
    },
    []
  );

  const normalizeQty = useCallback((item: EligiblePurchaseItem) => {
    setItemSelection((current) => ({
      ...current,
      [item.purchaseItemId]: {
        selected: current[item.purchaseItemId]?.selected ?? true,
        returnQty: String(
          clampReturnQty(
            current[item.purchaseItemId]?.returnQty || 1,
            Math.max(toNumber(item.availableQty, 0), 1)
          )
        ),
      },
    }));
  }, []);

  const handleQtyStep = useCallback((item: EligiblePurchaseItem, delta: number) => {
    setItemSelection((current) => {
      const nextQty = clampReturnQty(
        toNumber(current[item.purchaseItemId]?.returnQty, 1) + delta,
        Math.max(toNumber(item.availableQty, 0), 1)
      );

      return {
        ...current,
        [item.purchaseItemId]: {
          selected: current[item.purchaseItemId]?.selected ?? true,
          returnQty: String(nextQty),
        },
      };
    });
  }, []);

  async function handleSubmit() {
    if (!selectedPurchase) {
      toast.error("Select a purchase order first");
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
        purchaseId: selectedPurchase._id,
        returnDate,
        reason: reason.trim(),
        notes: notes.trim(),
        items: selectedReturnItems.map((item) => ({
          purchaseItemId: item.purchaseItemId,
          returnQty: item.returnQty,
        })),
      };

      const endpoint =
        mode === "edit"
          ? SummaryApi.purchase_return_update.url(selectedShopId, returnId)
          : SummaryApi.purchase_return_create.url(selectedShopId);

      const method =
        mode === "edit"
          ? SummaryApi.purchase_return_update.method
          : SummaryApi.purchase_return_create.method;

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
        .catch(() => ({}))) as ApiResponse<PurchaseReturnRecord>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save purchase return");
      }

      toast.success(
        result.message ||
          (mode === "edit"
            ? "Purchase return updated successfully"
            : "Purchase return processed successfully")
      );

      if (mode === "edit") {
        const nextId = String(result.data?._id || returnId);
        router.push(`/shopowner/purchasereturn/view?id=${nextId}`);
        return;
      }

      setReason("");
      setNotes("");
      setReturnDate(todayInput());
      setSelectedPurchaseId("");
      setItemSelection({});
      setStep(1);
      setSearch("");
      await loadPageData(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save purchase return";

      toast.error(message);
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
    setSelectedPurchaseId("");
    setItemSelection({});
    setStep(1);
    setSearch("");
  }

  if (!selectedShopId) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Purchase Return</h1>
        <p className="mt-3 text-sm text-slate-600">
          Select a shop first to process purchase returns.
        </p>
      </div>
    );
  }

  if (!purchaseAllowedShopSelected) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Purchase Return</h1>
            <p className="mt-2 text-sm text-slate-700">
              Purchase returns are available only for {selectedShopTypeLabel}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="overflow-hidden rounded-[2rem] text-white shadow-[0_24px_70px_rgba(0,0,139,0.22)]"
        style={{
          background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #0b2cbf 58%, #1d4ed8 100%)`,
        }}
      >
        <div className="flex flex-col gap-5 px-6 py-7 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-white/70">
              {mode === "edit" ? "Update Purchase Return" : "Process Purchase Return"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {mode === "edit" ? "Edit Purchase Return" : "Create Purchase Return"}
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
            <Link
              href="/shopowner/purchasereturn/list"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {mode === "edit" ? "Reload" : "Clear"}
            </button>
          </div>
        </div>
      </section>

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

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading purchase return data...
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
                Purchase return data could not be loaded
              </h2>
              <p className="mt-2 text-sm text-slate-700">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadPageData(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          {step === 1 ? (
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
                    Select a Purchase Order to Return
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Showing eligible purchase orders from the last 15 days.
                  </p>
                </div>

                <label className="relative block w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by order no, supplier, item code or product"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              {filteredOrders.length ? (
                <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead style={{ backgroundColor: PRIMARY_COLOR }}>
                        <tr className="text-left text-white">
                          <th className="px-5 py-4 font-semibold">Order Number</th>
                          <th className="px-5 py-4 font-semibold">Date</th>
                          <th className="px-5 py-4 font-semibold">Supplier</th>
                          <th className="px-5 py-4 font-semibold">Status</th>
                          <th className="px-5 py-4 font-semibold">Available Qty</th>
                          <th className="px-5 py-4 font-semibold">Total</th>
                          <th className="px-5 py-4 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          const isSelected = selectedPurchaseId === order._id;

                          return (
                            <tr
                              key={order._id}
                              className={`border-t border-slate-200 transition ${
                                isSelected ? "bg-blue-50/80" : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">
                                  {order.purchaseNo || "-"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {order.invoiceNo ? `Inv: ${order.invoiceNo}` : "No invoice"}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {formatDate(order.purchaseDate)}
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {getOrderSupplierLabel(order)}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                                  style={{
                                    backgroundColor: "#dcfce7",
                                    color: SUCCESS_COLOR,
                                  }}
                                >
                                  {getStatusLabel(order.status)}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                {Math.max(toNumber(order.totalAvailableQty, 0), 0)}
                              </td>
                              <td className="px-5 py-4 font-semibold text-slate-900">
                                {money(order.netAmount)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => applySelectedOrder(order)}
                                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                                  style={{
                                    backgroundColor: isSelected ? SUCCESS_COLOR : PRIMARY_COLOR,
                                  }}
                                >
                                  {isSelected ? "Selected" : "Select"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50/70 px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                    <AlertTriangle className="h-7 w-7" style={{ color: WARNING_COLOR }} />
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-slate-900">
                    No orders found that are eligible for return
                  </h3>
                  <p className="mt-3 text-sm text-slate-600">
                    Only recent, non-cancelled purchase orders with available return
                    quantity are shown here.
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!canMoveToStepTwo) {
                      toast.error("Select a purchase order to continue");
                      return;
                    }

                    setStep(2);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
                  style={{ backgroundColor: canMoveToStepTwo ? PRIMARY_COLOR : "#cbd5e1" }}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          ) : null}

          {step === 2 && selectedPurchase ? (
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.32em]"
                      style={{ color: PRIMARY_COLOR }}
                    >
                      Step 2
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">
                      Select Items to Return
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Choose the purchase rows to send back and set the exact return
                      quantity for each one.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Change Order
                  </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-4">
                  <OrderMeta
                    label="Purchase Order"
                    value={selectedPurchase.purchaseNo || "-"}
                  />
                  <OrderMeta
                    label="Supplier"
                    value={getOrderSupplierLabel(selectedPurchase)}
                  />
                  <OrderMeta
                    label="Order Date"
                    value={formatDate(selectedPurchase.purchaseDate)}
                  />
                  <OrderMeta
                    label="Order Total"
                    value={money(selectedPurchase.netAmount)}
                  />
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1120px] text-sm">
                      <thead style={{ backgroundColor: PRIMARY_COLOR }}>
                        <tr className="text-left text-white">
                          <th className="w-14 px-4 py-4 font-semibold">Pick</th>
                          <th className="px-4 py-4 font-semibold">Item Code</th>
                          <th className="px-4 py-4 font-semibold">Product</th>
                          <th className="px-4 py-4 font-semibold">Batch</th>
                          <th className="px-4 py-4 font-semibold">Ordered Qty</th>
                          <th className="px-4 py-4 font-semibold">Previously Returned</th>
                          <th className="px-4 py-4 font-semibold">Available</th>
                          <th className="px-4 py-4 font-semibold">Return Qty</th>
                          <th className="px-4 py-4 font-semibold">Unit Price</th>
                          <th className="px-4 py-4 font-semibold">Return Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedPurchase.items || []).map((item) => {
                          const current = itemSelection[item.purchaseItemId];
                          const availableQty = Math.max(toNumber(item.availableQty, 0), 0);
                          const selected = Boolean(current?.selected);
                          const returnQty = clampReturnQty(
                            current?.returnQty || 1,
                            Math.max(availableQty, 1)
                          );
                          const returnTotal = round(
                            returnQty * Math.max(toNumber(item.unitPrice, 0), 0)
                          );

                          return (
                            <tr
                              key={item.purchaseItemId}
                              className={`border-t border-slate-200 transition ${
                                selected ? "bg-blue-50/70" : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(event) =>
                                    handleToggleItem(item, event.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-200"
                                />
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-900">
                                {item.itemCode || "-"}
                              </td>
                              <td className="px-4 py-4 text-slate-700">
                                {item.productName || "-"}
                              </td>
                              <td className="px-4 py-4 text-slate-700">
                                {item.batch || "-"}
                              </td>
                              <td className="px-4 py-4 text-slate-700">
                                {Math.max(toNumber(item.orderedQty, 0), 0)}
                              </td>
                              <td className="px-4 py-4 text-slate-700">
                                {Math.max(toNumber(item.previouslyReturnedQty, 0), 0)}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                                  style={{
                                    backgroundColor: "#dcfce7",
                                    color: SUCCESS_COLOR,
                                  }}
                                >
                                  {availableQty}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex w-fit items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => handleQtyStep(item, -1)}
                                    className="h-11 w-11 text-lg font-semibold text-slate-600 transition hover:bg-slate-50"
                                    disabled={!selected}
                                  >
                                    -
                                  </button>
                                  <input
                                    value={current?.returnQty || ""}
                                    onChange={(event) =>
                                      handleQtyChange(item, event.target.value)
                                    }
                                    onBlur={() => normalizeQty(item)}
                                    disabled={!selected}
                                    className="h-11 w-20 border-x border-slate-200 text-center text-sm font-semibold text-slate-900 outline-none disabled:bg-slate-100"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQtyStep(item, 1)}
                                    className="h-11 w-11 text-lg font-semibold text-slate-600 transition hover:bg-slate-50"
                                    disabled={!selected}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-900">
                                {money(item.unitPrice)}
                              </td>
                              <td className="px-4 py-4 font-semibold text-slate-900">
                                {selected ? money(returnTotal) : money(0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-5">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">
                          Return Reason
                        </span>
                        <select
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">Select return reason</option>
                          {RETURN_REASON_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">
                          Return Date
                        </span>
                        <input
                          type="date"
                          value={returnDate}
                          onChange={(event) => setReturnDate(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        Additional Notes
                      </span>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={5}
                        placeholder="Add any supplier communication, package notes, or quality remarks..."
                        className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.32em]"
                      style={{ color: PRIMARY_COLOR }}
                    >
                      Current Summary
                    </p>
                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                        <span className="text-slate-500">Selected Items</span>
                        <span className="font-semibold text-slate-900">
                          {selectedReturnItems.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                        <span className="text-slate-500">Total Return Qty</span>
                        <span className="font-semibold text-slate-900">
                          {totalReturnQty}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                        <span className="text-slate-500">Estimated Return Amount</span>
                        <span
                          className="text-lg font-black"
                          style={{ color: PRIMARY_COLOR }}
                        >
                          {money(totalReturnAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-slate-700">
                      Stock will be reduced only when you confirm the return in the next
                      step.
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canMoveToStepThree) {
                        toast.error("Select items and a return reason to continue");
                        return;
                      }

                      setStep(3);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {step === 3 && selectedPurchase ? (
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.32em]"
                      style={{ color: PRIMARY_COLOR }}
                    >
                      Step 3
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">
                      Confirm Return
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Review the return before updating inventory and saving the record.
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Total Return Amount
                    </p>
                    <p
                      className="mt-2 text-3xl font-black"
                      style={{ color: PRIMARY_COLOR }}
                    >
                      {money(totalReturnAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-4">
                  <OrderMeta
                    label="Purchase Order"
                    value={selectedPurchase.purchaseNo || "-"}
                  />
                  <OrderMeta
                    label="Supplier"
                    value={getOrderSupplierLabel(selectedPurchase)}
                  />
                  <OrderMeta label="Return Reason" value={reason || "-"} />
                  <OrderMeta label="Return Date" value={formatDate(returnDate)} />
                </div>

                <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead style={{ backgroundColor: PRIMARY_COLOR }}>
                        <tr className="text-left text-white">
                          <th className="px-5 py-4 font-semibold">Item Code</th>
                          <th className="px-5 py-4 font-semibold">Product</th>
                          <th className="px-5 py-4 font-semibold">Batch</th>
                          <th className="px-5 py-4 font-semibold">Return Qty</th>
                          <th className="px-5 py-4 font-semibold">Unit Price</th>
                          <th className="px-5 py-4 font-semibold">Return Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReturnItems.map((item) => (
                          <tr key={item.purchaseItemId} className="border-t border-slate-200">
                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {item.itemCode || "-"}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {item.productName || "-"}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {item.batch || "-"}
                            </td>
                            <td className="px-5 py-4 text-slate-700">{item.returnQty}</td>
                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {money(item.unitPrice)}
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-900">
                              {money(item.returnTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {notes ? (
                  <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {notes}
                    </p>
                  </div>
                ) : null}

                <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <p>
                      Confirming this return will reduce the returned quantity from shop
                      inventory and save the transaction as <strong>Processed</strong>.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
                    style={{ backgroundColor: submitting ? "#94a3b8" : PRIMARY_COLOR }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <ClipboardList className="h-4 w-4" />
                        {mode === "edit" ? "Save Changes" : "Process Return"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
