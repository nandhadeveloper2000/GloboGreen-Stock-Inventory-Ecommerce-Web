/* eslint-disable @typescript-eslint/no-explicit-any */
// app/components/sales/create.tsx

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, CreditCard, Loader2, Plus, Search, Trash2, UserPlus, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type CustomerRecord,
  type SalesOrderRecord,
  type ShopProductRecord,
  type ShopRecord,
  GST_OPTIONS,
  PAYMENT_METHODS,
  getCustomerLabel,
  getCustomerName,
  getShopProductCode,
  getShopProductMrp,
  getShopProductName,
  getShopProductProductId,
  getShopProductSearchText,
  getShopProductSellingPrice,
  isSalesAllowedShop,
  money,
  normalizeSearchText,
  readSelectedShop,
  round,
  toNumber,
} from "./shared";

import {
  HoldBillNamePopup,
  HoldBillsPopup,
  SalesHistoryPopup,
  SplitPaymentPopup,
  type HoldBillRecord,
  type SplitPaymentRow,
} from "./popup";

type SaleRow = {
  id: string;
  shopProductId: string;
  productId: string;
  itemCode: string;
  productName: string;
  unit: string;
  batch: string;
  mrp: string;
  qty: string;
  price: string;
  discountPercent: string;
  discountAmount: string;
  taxPercent: string;
};

type NewCustomerForm = {
  name: string;
  email: string;
  mobile: string;
  address: string;
  gstNumber: string;
  state: string;
  openingBalance: string;
};

const EMPTY_CUSTOMER_FORM: NewCustomerForm = {
  name: "",
  email: "",
  mobile: "",
  address: "",
  gstNumber: "",
  state: "",
  openingBalance: "0",
};

const HOLD_BILL_KEY = "tiya_pos_hold_bills";

type PayMethod = (typeof PAYMENT_METHODS)[number];

function makeRow(): SaleRow {
  return {
    id: crypto.randomUUID(),
    shopProductId: "",
    productId: "",
    itemCode: "",
    productName: "",
    unit: "Pcs",
    batch: "",
    mrp: "0",
    qty: "1",
    price: "0",
    discountPercent: "0",
    discountAmount: "0",
    taxPercent: "0",
  };
}

function normalizePaymentMethod(value?: string | null): PayMethod {
  const method = String(value || "").trim().toUpperCase();
  return PAYMENT_METHODS.includes(method as PayMethod) ? (method as PayMethod) : "CASH";
}

function calculateDiscountAmountValue(qty: string, price: string, discountPercent: string) {
  const gross = Math.max(toNumber(qty, 1), 1) * toNumber(price, 0);
  return String(round((gross * Math.min(toNumber(discountPercent, 0), 100)) / 100));
}

function calculateDiscountPercentValue(qty: string, price: string, discountAmount: string) {
  const gross = Math.max(toNumber(qty, 1), 1) * toNumber(price, 0);
  if (gross <= 0) return "0";
  return String(round((Math.min(toNumber(discountAmount, 0), gross) / gross) * 100));
}

function calculateRow(row: SaleRow) {
  const qty = Math.max(toNumber(row.qty, 1), 1);
  const price = toNumber(row.price, 0);
  const gross = round(qty * price);
  const discountByPercent = round((gross * Math.min(toNumber(row.discountPercent, 0), 100)) / 100);
  const manualDiscount = toNumber(row.discountAmount, 0);
  const discount = Math.min(gross, manualDiscount > 0 ? manualDiscount : discountByPercent);
  const taxableValue = Math.max(gross - discount, 0);
  const taxAmount = round((taxableValue * Math.min(toNumber(row.taxPercent, 0), 100)) / 100);

  return { qty, gross, discount: round(discount), taxableValue: round(taxableValue), taxAmount, lineTotal: round(taxableValue + taxAmount) };
}

function readHoldBills(): HoldBillRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HOLD_BILL_KEY) || "[]") as HoldBillRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHoldBills(bills: HoldBillRecord[]) {
  window.localStorage.setItem(HOLD_BILL_KEY, JSON.stringify(bills));
}

export default function SalesCreatePage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [products, setProducts] = useState<ShopProductRecord[]>([]);
  const [recentSales, setRecentSales] = useState<SalesOrderRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [salesmanName, setSalesmanName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("CASH");
  const [orderDiscount, setOrderDiscount] = useState("0");
  const [saleNotes, setSaleNotes] = useState("");
  const [rows, setRows] = useState<SaleRow[]>([makeRow()]);
  const [openProductRowId, setOpenProductRowId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("0");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState<NewCustomerForm>(EMPTY_CUSTOMER_FORM);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [holdBills, setHoldBills] = useState<HoldBillRecord[]>([]);
  const [showHoldNamePopup, setShowHoldNamePopup] = useState(false);
  const [showHoldListPopup, setShowHoldListPopup] = useState(false);
  const [showSalesHistoryPopup, setShowSalesHistoryPopup] = useState(false);
  const [showSplitPopup, setShowSplitPopup] = useState(false);

  const salesAllowedShopSelected = useMemo(() => isSalesAllowedShop(selectedShopType), [selectedShopType]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer._id) === String(selectedCustomerId)) || null,
    [customers, selectedCustomerId]
  );

  const billDateText = useMemo(() => {
    const now = new Date();
    return `${now.toLocaleDateString("en-IN")} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  }, []);

  const totals = useMemo(() => {
    const activeRows = rows.filter((row) => row.productId && toNumber(row.qty, 0) > 0);
    const calculated = activeRows.map(calculateRow);
    const subtotal = round(calculated.reduce((sum, row) => sum + row.gross, 0));
    const tax = round(calculated.reduce((sum, row) => sum + row.taxAmount, 0));
    const lineDiscount = round(calculated.reduce((sum, row) => sum + row.discount, 0));
    const totalQty = calculated.reduce((sum, row) => sum + row.qty, 0);
    const netAmount = round(Math.max(calculated.reduce((sum, row) => sum + row.lineTotal, 0) - toNumber(orderDiscount, 0), 0));
    return { itemCount: activeRows.length, totalQty, subtotal, tax, lineDiscount, orderDiscount: toNumber(orderDiscount, 0), discount: round(lineDiscount + toNumber(orderDiscount, 0)), netAmount };
  }, [orderDiscount, rows]);

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
    setHoldBills(readHoldBills());
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-product-combobox='true']")) setOpenProductRowId("");
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const hotKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "");
      if (event.ctrlKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        setShowSalesHistoryPopup(true);
        return;
      }
      if (typing) return;
      if (event.code === "Space") {
        event.preventDefault();
        void finishDirectBill("CASH");
      } else if (event.key === "F2") {
        event.preventDefault();
        setShowSplitPopup(true);
      } else if (event.key === "F3") {
        event.preventDefault();
        void finishDirectBill("CARD");
      } else if (event.key === "F4") {
        event.preventDefault();
        void finishDirectBill("UPI");
      } else if (event.key === "F5") {
        event.preventDefault();
        void finishDirectBill("CREDIT");
      }
    };
    window.addEventListener("keydown", hotKeys);
    return () => window.removeEventListener("keydown", hotKeys);
  });

  useEffect(() => {
    if (!accessToken || !selectedShopId || !salesAllowedShopSelected) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        const [customerResponse, productResponse, salesResponse, shopResponse] = await Promise.all([
          fetch(`${baseURL}${SummaryApi.shop_customer_list.url({ limit: 200, includeWalkIn: "true", isActive: "true" })}`, { method: SummaryApi.shop_customer_list.method, headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, credentials: "include", cache: "no-store" }),
          fetch(`${baseURL}${SummaryApi.shop_product_list.url(selectedShopId)}`, { method: SummaryApi.shop_product_list.method, headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, credentials: "include", cache: "no-store" }),
          fetch(`${baseURL}${SummaryApi.sales_list.url({ shopId: selectedShopId, source: "DIRECT", limit: 50 })}`, { method: SummaryApi.sales_list.method, headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, credentials: "include", cache: "no-store" }),
          fetch(`${baseURL}${SummaryApi.shop_get.url(selectedShopId)}`, { method: SummaryApi.shop_get.method, headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, credentials: "include", cache: "no-store" }),
        ]);

        const customerResult = (await customerResponse.json().catch(() => ({}))) as ApiResponse<CustomerRecord[]>;
        const productResult = (await productResponse.json().catch(() => ({}))) as ApiResponse<ShopProductRecord[]>;
        const salesResult = (await salesResponse.json().catch(() => ({}))) as ApiResponse<SalesOrderRecord[]>;
        const shopResult = (await shopResponse.json().catch(() => ({}))) as ApiResponse<ShopRecord>;

        if (!customerResponse.ok || !customerResult.success) throw new Error(customerResult.message || "Failed to load customers");
        if (!productResponse.ok || !productResult.success) throw new Error(productResult.message || "Failed to load shop products");
        if (!salesResponse.ok || !salesResult.success) throw new Error(salesResult.message || "Failed to load recent sales");
        if (!shopResponse.ok || !shopResult.success) throw new Error(shopResult.message || "Failed to load shop details");

        const nextCustomers = Array.isArray(customerResult.data) ? customerResult.data.filter((customer) => customer.isActive !== false) : [];
        setCustomers(nextCustomers);
        setProducts(Array.isArray(productResult.data) ? productResult.data.filter((product) => toNumber(product.qty, 0) > 0) : []);
        setRecentSales(Array.isArray(salesResult.data) ? salesResult.data : []);

        const walkInCustomer = nextCustomers.find((customer) => customer.isWalkIn) || nextCustomers[0] || null;
        if (walkInCustomer) setSelectedCustomerId(String(walkInCustomer._id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load sales screen");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [accessToken, salesAllowedShopSelected, selectedShopId]);

  function updateRow(rowId: string, patch: Partial<SaleRow>) {
    setRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function updateRowWithPercentDiscount(rowId: string, patch: Partial<SaleRow>) {
    setRows((currentRows) => currentRows.map((row) => {
      if (row.id !== rowId) return row;
      const nextRow = { ...row, ...patch };
      return { ...nextRow, discountAmount: calculateDiscountAmountValue(nextRow.qty, nextRow.price, nextRow.discountPercent) };
    }));
  }

  function updateRowDiscountPercent(rowId: string, discountPercent: string) {
    setRows((currentRows) => currentRows.map((row) => row.id === rowId ? { ...row, discountPercent, discountAmount: calculateDiscountAmountValue(row.qty, row.price, discountPercent) } : row));
  }

  function updateRowDiscountAmount(rowId: string, discountAmount: string) {
    setRows((currentRows) => currentRows.map((row) => row.id === rowId ? { ...row, discountAmount, discountPercent: calculateDiscountPercentValue(row.qty, row.price, discountAmount) } : row));
  }

  function clearSale() {
    setRows([makeRow()]);
    setOrderDiscount("0");
    setSaleNotes("");
    setSalesmanName("");
    setPaymentMethod("CASH");
    setReceivedAmount("0");
    setPaymentNotes("");
  }

  function getFilteredProducts(row: SaleRow) {
    const query = normalizeSearchText(row.itemCode);
    if (!query) return products.slice(0, 16);
    return products.filter((product) => getShopProductSearchText(product).includes(query)).slice(0, 16);
  }

  function selectProduct(rowId: string, shopProductId: string) {
    const selectedProduct = products.find((product) => String(product._id) === String(shopProductId)) || null;
    if (!selectedProduct) return;
    updateRowWithPercentDiscount(rowId, {
      shopProductId: String(selectedProduct._id),
      productId: getShopProductProductId(selectedProduct),
      itemCode: getShopProductCode(selectedProduct),
      productName: getShopProductName(selectedProduct),
      unit: String(selectedProduct.mainUnit || "Pcs"),
      mrp: String(getShopProductMrp(selectedProduct)),
      price: String(getShopProductSellingPrice(selectedProduct)),
    });
    setOpenProductRowId("");
  }

  function buildSaleItemsPayload() {
    return rows.filter((row) => row.productId && toNumber(row.qty, 0) > 0).map((row) => {
      const calculated = calculateRow(row);
      return {
        productId: row.productId,
        shopProductId: row.shopProductId || null,
        name: row.productName || row.itemCode || "Product",
        sku: row.itemCode,
        itemCode: row.itemCode,
        batch: row.batch,
        unit: row.unit || "Pcs",
        mrp: toNumber(row.mrp, 0),
        qty: calculated.qty,
        price: toNumber(row.price, 0),
        discountPercent: toNumber(row.discountPercent, 0),
        discountAmount: calculated.discount,
        taxPercent: toNumber(row.taxPercent, 0),
        taxAmount: calculated.taxAmount,
        lineTotal: calculated.lineTotal,
      };
    });
  }

  async function createSale(method: PayMethod, extraPayment?: Record<string, unknown>) {
    if (!accessToken) throw new Error("Authentication token missing");
    const items = buildSaleItemsPayload();
    if (!items.length) throw new Error("Add at least one product to complete the sale");

    const customer = selectedCustomer;
    const response = await fetch(`${baseURL}${SummaryApi.sales_create.url}`, {
      method: SummaryApi.sales_create.method,
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        shopId: selectedShopId,
        customerId: customer?._id || undefined,
        customerMobile: customer?.mobile || undefined,
        customerName: customer?.name || undefined,
        customerEmail: customer?.email || undefined,
        customerGstNumber: customer?.gstNumber || undefined,
        customerState: customer?.state || undefined,
        customerAddress: customer?.address || undefined,
        address: { name: customer?.name || "", mobile: customer?.mobile || "", state: customer?.state || "", street: customer?.address || "" },
        items,
        discount: toNumber(orderDiscount, 0),
        notes: saleNotes,
        payment: { method, receivedAmount: method === "CREDIT" ? 0 : totals.netAmount, salesmanName, notes: paymentNotes || saleNotes, ...extraPayment },
      }),
    });

    const result = (await response.json().catch(() => ({}))) as ApiResponse<SalesOrderRecord>;
    if (!response.ok || !result.success || !result.data) throw new Error(result.message || "Failed to complete sale");
    return result.data;
  }

  async function finishDirectBill(method: PayMethod, extraPayment?: Record<string, unknown>) {
    if (saving) return;
    try {
      setSaving(true);
      setPaymentMethod(method);
      const sale = await createSale(method, extraPayment);
      toast.success("Bill generated successfully");
      clearSale();
      setRecentSales((current) => [sale, ...current]);
      window.open(`/shopowner/sales/view?id=${sale._id}&print=1`, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate bill");
    } finally {
      setSaving(false);
    }
  }

  async function handleSplitSave(splitRows: SplitPaymentRow[]) {
    const splitTotal = splitRows.reduce((sum, row) => sum + toNumber(row.amount, 0), 0);
    if (Math.abs(splitTotal - totals.netAmount) > 0.01) {
      toast.error("Split payment total must match bill amount");
      return;
    }
    setShowSplitPopup(false);
    await finishDirectBill("CASH", { splitPayments: splitRows, receivedAmount: splitTotal });
  }

  function handleHoldBillSave(name: string) {
    const items = buildSaleItemsPayload();
    if (!items.length) {
      toast.error("Add at least one product before holding bill");
      return;
    }
    const holdBill: HoldBillRecord = {
      id: crypto.randomUUID(),
      name,
      customerName: selectedCustomer ? getCustomerName(selectedCustomer) : "Walk-in Customer",
      itemCount: totals.itemCount,
      total: totals.netAmount,
      createdAt: new Date().toISOString(),
      payload: { rows, selectedCustomerId, salesmanName, paymentMethod, orderDiscount, saleNotes, receivedAmount, paymentNotes },
    };
    const nextBills = [holdBill, ...holdBills];
    setHoldBills(nextBills);
    writeHoldBills(nextBills);
    setShowHoldNamePopup(false);
    clearSale();
    toast.success("Bill held successfully");
  }

  function restoreHoldBill(bill: HoldBillRecord) {
    const payload = bill.payload as Partial<{ rows: SaleRow[]; selectedCustomerId: string; salesmanName: string; paymentMethod: PayMethod; orderDiscount: string; saleNotes: string; receivedAmount: string; paymentNotes: string }>;
    setRows(Array.isArray(payload.rows) && payload.rows.length ? payload.rows : [makeRow()]);
    setSelectedCustomerId(payload.selectedCustomerId || selectedCustomerId);
    setSalesmanName(payload.salesmanName || "");
    setPaymentMethod(payload.paymentMethod || "CASH");
    setOrderDiscount(payload.orderDiscount || "0");
    setSaleNotes(payload.saleNotes || "");
    setReceivedAmount(payload.receivedAmount || "0");
    setPaymentNotes(payload.paymentNotes || "");
    setShowHoldListPopup(false);
    toast.success("Hold bill restored");
  }

  function deleteHoldBill(id: string) {
    const nextBills = holdBills.filter((bill) => bill.id !== id);
    setHoldBills(nextBills);
    writeHoldBills(nextBills);
    toast.success("Hold bill deleted");
  }

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return toast.error("Authentication token missing");
    if (!newCustomerForm.name.trim() || !newCustomerForm.mobile.trim()) return toast.error("Customer name and phone are required");

    try {
      setSavingCustomer(true);
      const response = await fetch(`${baseURL}${SummaryApi.shop_customer_create.url}`, {
        method: SummaryApi.shop_customer_create.method,
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ ...newCustomerForm, openingBalance: toNumber(newCustomerForm.openingBalance, 0), dueBalance: toNumber(newCustomerForm.openingBalance, 0), isActive: true, isWalkIn: false }),
      });
      const result = (await response.json().catch(() => ({}))) as ApiResponse<CustomerRecord>;
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || "Failed to create customer");
      setCustomers((current) => [result.data as CustomerRecord, ...current]);
      setSelectedCustomerId(String(result.data._id));
      setShowCustomerModal(false);
      setNewCustomerForm(EMPTY_CUSTOMER_FORM);
      toast.success("Customer created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create customer");
    } finally {
      setSavingCustomer(false);
    }
  }

  if (!selectedShopId) {
    return <div className="page-shell"><div className="mx-auto max-w-5xl rounded-md border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm"><h1 className="text-2xl font-black text-slate-950">No shop selected</h1><p className="mt-2 text-sm text-slate-500">Select a shop first, then open Create Sale.</p></div></div>;
  }

  if (!salesAllowedShopSelected) {
    return <div className="page-shell"><div className="mx-auto max-w-5xl rounded-md border border-dashed border-amber-300 bg-amber-50 px-6 py-14 text-center shadow-sm"><h1 className="text-2xl font-black text-amber-900">Sales entry is available only for warehouse retail or wholesale shops</h1></div></div>;
  }

  if (loading) {
    return <div className="page-shell"><div className="mx-auto flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#00008b]" /></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-2 md:p-3">
      <div className="mx-auto w-full max-w-[1920px] space-y-2">
        <section className="overflow-hidden rounded-md border border-[#00008b]/20 bg-white shadow-sm">
          <div className="flex flex-col gap-3 bg-[#00008b] px-3 py-2 text-white xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">POS</h1>
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm font-bold">{selectedShopName || "Selected Shop"}</span>
              <button type="button" className="rounded-md border border-white/30 px-3 py-2 text-xs font-bold hover:bg-white/10">Quotation Bill</button>
              <button type="button" onClick={() => setShowHoldListPopup(true)} className="rounded-md border border-white/30 px-3 py-2 text-xs font-bold hover:bg-white/10">View Hold Bills</button>
              <button type="button" onClick={() => setShowHoldNamePopup(true)} className="rounded-md border border-white/30 px-3 py-2 text-xs font-bold hover:bg-white/10">Hold Bill</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span>Bill Date: {billDateText}</span>
              <button type="button" onClick={() => router.back()} className="rounded-md bg-white px-3 py-2 text-xs font-black text-[#00008b]">← Back</button>
              <button type="button" onClick={clearSale} className="rounded-md bg-white px-3 py-2 text-xs font-black text-rose-600">Clear</button>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.25fr_1fr_1fr_160px_160px_180px]">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2"><label className="text-xs font-bold text-slate-700">Customer</label><button type="button" onClick={() => setShowCustomerModal(true)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold text-[#00008b]"><UserPlus className="h-3.5 w-3.5" /> Add Customer</button></div>
              <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#00008b]">
                {customers.map((customer) => <option key={customer._id} value={customer._id}>{getCustomerLabel(customer)}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-bold text-slate-700">Salesman</label><input value={salesmanName} onChange={(event) => setSalesmanName(event.target.value)} placeholder="Optional salesman name" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]" /></div>
            <div><label className="mb-1 block text-xs font-bold text-slate-700">Payment Mode</label><select value={paymentMethod} onChange={(event) => setPaymentMethod(normalizePaymentMethod(event.target.value))} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-[#00008b]">{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method.replace(/_/g, " ")}</option>)}</select></div>
            <div className="flex items-center justify-center rounded-md border border-sky-200 bg-sky-50 px-3 text-sm font-black text-sky-700">Points: {selectedCustomer?.points || 0}</div>
            <div className="flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-700">Due: {money(selectedCustomer?.dueBalance || 0)}</div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Retail Total</p><p className="text-3xl font-black text-emerald-700">{totals.netAmount.toFixed(2)}</p></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] border-collapse text-left text-[13px]">
              <thead className="bg-[#00008b] text-[11px] font-black uppercase text-white"><tr>{["S.No", "Item Code", "Product Name", "Batch", "MRP", "Qty", "UOM", "Sale Rate", "GST (%)", "Discount (% / ₹)", "Amount", "Action"].map((head) => <th key={head} className="border-r border-white/20 px-2 py-3">{head}</th>)}</tr></thead>
              <tbody>
                {rows.map((row, index) => {
                  const calculated = calculateRow(row);
                  const filteredProducts = getFilteredProducts(row);
                  const isProductOpen = openProductRowId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-slate-200 bg-[#fff9d6] align-top">
                      <td className="border-r border-slate-200 px-2 py-2 text-sm font-bold text-slate-900">{index + 1}</td>
                      <td className="border-r border-slate-200 px-2 py-2"><div data-product-combobox="true" className="relative min-w-[170px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={row.itemCode} onFocus={() => setOpenProductRowId(row.id)} onChange={(event) => { updateRow(row.id, { itemCode: event.target.value, productName: "", productId: "", shopProductId: "" }); setOpenProductRowId(row.id); }} placeholder="scan or type..." className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-8 text-sm outline-none focus:border-[#00008b]" /><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div>{isProductOpen ? <div className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-[360px] max-w-[72vw] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"><div className="max-h-72 overflow-y-auto p-1.5">{filteredProducts.length ? filteredProducts.map((product) => <button key={product._id} type="button" onClick={() => selectProduct(row.id, product._id)} className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-50"><div className="min-w-0"><p className="truncate text-[13px] font-bold">{getShopProductName(product)}</p><p className="mt-0.5 text-[11px] text-slate-500">SKU: {getShopProductCode(product) || "-"} | Stock: {toNumber(product.qty, 0)} | Rate: {money(getShopProductSellingPrice(product))}</p></div>{String(row.shopProductId) === String(product._id) ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}</button>) : <p className="px-3 py-3 text-[13px] text-slate-500">No matching product found.</p>}</div></div> : null}</div></td>
                      <td className="border-r border-slate-200 px-2 py-2"><div className="flex h-9 min-w-[240px] items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">{row.productName || "-"}</div></td>
                      <td className="border-r border-slate-200 px-2 py-2"><input value={row.batch} onChange={(event) => updateRow(row.id, { batch: event.target.value })} placeholder="No batch" className="h-9 min-w-[130px] rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]" /></td>
                      <td className="border-r border-slate-200 px-2 py-2"><input readOnly value={Number(row.mrp || 0).toFixed(2)} className="h-9 w-[100px] rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-bold outline-none" /></td>
                      <td className="border-r border-slate-200 px-2 py-2"><input type="number" min={1} value={row.qty} onChange={(event) => updateRowWithPercentDiscount(row.id, { qty: event.target.value })} className="h-9 w-[80px] rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]" /></td>
                      <td className="border-r border-slate-200 px-2 py-2"><input readOnly value={row.unit || "Pcs"} className="h-9 w-[95px] rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-bold outline-none" /></td>
                      <td className="border-r border-slate-200 px-2 py-2"><input type="number" min={0} step="0.01" value={row.price} onChange={(event) => updateRowWithPercentDiscount(row.id, { price: event.target.value })} className="h-9 w-[110px] rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]" /></td>
                      <td className="border-r border-slate-200 px-2 py-2"><select value={row.taxPercent} onChange={(event) => updateRow(row.id, { taxPercent: event.target.value })} className="h-9 min-w-[115px] rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]">{GST_OPTIONS.map((option) => <option key={option.label} value={option.percent}>{option.label}</option>)}</select></td>
                      <td className="border-r border-slate-200 px-2 py-2"><div className="grid min-w-[170px] grid-cols-2 gap-2"><input type="number" min={0} step="0.01" value={row.discountPercent} onChange={(event) => updateRowDiscountPercent(row.id, event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]" /><input type="number" min={0} step="0.01" value={row.discountAmount} onChange={(event) => updateRowDiscountAmount(row.id, event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]" /></div></td>
                      <td className="border-r border-slate-200 px-2 py-2 text-sm font-black text-slate-900">{money(calculated.lineTotal)}</td>
                      <td className="px-2 py-2"><button type="button" onClick={() => setRows((currentRows) => currentRows.length === 1 ? [makeRow()] : currentRows.filter((item) => item.id !== row.id))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <button type="button" onClick={() => setRows((currentRows) => [...currentRows, makeRow()])} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#00008b] px-5 text-sm font-bold text-white hover:bg-[#000070]"><Plus className="h-4 w-4" /> Add Item</button>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00008b]">Recent Bills</p><h2 className="text-lg font-black text-slate-950">Recent Sales</h2></div><Link href="/shopowner/sales/list" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-3.5 w-3.5" /> View Sales List</Link></div>
            <div className="overflow-hidden rounded-md border border-slate-200"><table className="w-full text-sm"><thead className="bg-[#00008b] text-white"><tr><th className="px-3 py-2 text-left">Invoice No</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">Bill Date</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody>{recentSales.slice(0, 6).length ? recentSales.slice(0, 6).map((sale) => <tr key={sale._id} className="border-t border-slate-100"><td className="px-3 py-3 font-bold text-slate-900">{sale.invoiceNo || sale.invoiceId?.invoiceNo || sale.orderNo || "-"}</td><td className="px-3 py-3 text-slate-700">{sale.customerNameSnapshot || getCustomerName(sale.customerId || null)}</td><td className="px-3 py-3 text-slate-700">{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString("en-IN") : "-"}</td><td className="px-3 py-3 text-right font-bold text-slate-900">{money(sale.grandTotal)}</td></tr>) : <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-500">No recent sales yet</td></tr>}</tbody></table></div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#00008b]/10 text-[#00008b]"><Wallet className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00008b]">Billing Summary</p><h2 className="text-lg font-black text-slate-950">Checkout</h2></div></div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Overall Discount</label><input type="number" min={0} step="0.01" value={orderDiscount} onChange={(event) => setOrderDiscount(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]" />
            <label className="mb-1 mt-3 block text-xs font-bold text-slate-700">Notes</label><textarea value={saleNotes} onChange={(event) => setSaleNotes(event.target.value)} placeholder="Optional note for this bill" className="min-h-[82px] w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#00008b]" />
            <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 text-sm text-slate-900"><div className="flex items-center justify-between"><span className="text-slate-500">Subtotal</span><b>{money(totals.subtotal)}</b></div><div className="flex items-center justify-between"><span className="text-slate-500">Tax</span><b>{money(totals.tax)}</b></div><div className="flex items-center justify-between"><span className="text-slate-500">Discount</span><b>{money(totals.discount)}</b></div></div>
            <div className="mt-3 rounded-md border border-[#00008b]/20 bg-[#00008b]/5 p-4 text-right"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#00008b]">Net Amount</p><p className="mt-1 text-4xl font-black text-[#00008b]">{totals.netAmount.toFixed(2)}</p></div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5 xl:grid-cols-2">
              <button type="button" onClick={() => void finishDirectBill("CASH")} disabled={saving} className="h-10 rounded-md border border-[#00008b]/20 bg-[#00008b]/5 text-xs font-black text-[#00008b] disabled:opacity-60">[Space] Cash</button>
              <button type="button" onClick={() => setShowSplitPopup(true)} disabled={saving} className="h-10 rounded-md border border-amber-200 bg-amber-50 text-xs font-black text-amber-700 disabled:opacity-60">[F2] Split</button>
              <button type="button" onClick={() => void finishDirectBill("CARD")} disabled={saving} className="h-10 rounded-md border border-purple-200 bg-purple-50 text-xs font-black text-purple-700 disabled:opacity-60">[F3] Card</button>
              <button type="button" onClick={() => void finishDirectBill("UPI")} disabled={saving} className="h-10 rounded-md border border-rose-200 bg-rose-50 text-xs font-black text-rose-700 disabled:opacity-60">[F4] UPI</button>
              <button type="button" onClick={() => void finishDirectBill("CREDIT")} disabled={saving} className="h-10 rounded-md border border-cyan-200 bg-cyan-50 text-xs font-black text-cyan-700 disabled:opacity-60">[F5] Credit</button>
              <button type="button" onClick={() => setShowSalesHistoryPopup(true)} className="h-10 rounded-md border border-slate-300 bg-slate-50 text-xs font-black text-slate-700 xl:col-span-2">[Ctrl+V] View</button>
            </div>
            <button type="button" onClick={() => void finishDirectBill(paymentMethod)} disabled={saving} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#00008b] text-sm font-black text-white hover:bg-[#000070] disabled:opacity-60">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />} BILL / PRINT</button>
          </div>
        </section>
      </div>

      {showCustomerModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-md border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-950">Add New Customer</h2><p className="mt-1 text-sm text-slate-500">Create a customer without leaving billing.</p></div><button type="button" onClick={() => { setShowCustomerModal(false); setNewCustomerForm(EMPTY_CUSTOMER_FORM); }} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button></div>
            <form onSubmit={handleCreateCustomer} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[{ key: "name", label: "Name *" }, { key: "email", label: "Email" }, { key: "mobile", label: "Phone *" }, { key: "gstNumber", label: "GST Number" }, { key: "state", label: "State" }, { key: "openingBalance", label: "Opening Balance" }].map((field) => <div key={field.key} className={field.key === "name" ? "md:col-span-2" : ""}><label className="mb-2 block text-sm font-semibold text-slate-700">{field.label}</label><input type={field.key === "email" ? "email" : field.key === "openingBalance" ? "number" : "text"} value={String(newCustomerForm[field.key as keyof NewCustomerForm])} onChange={(event) => setNewCustomerForm((current) => ({ ...current, [field.key]: event.target.value }))} className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#00008b]" /></div>)}
              <div className="md:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Address</label><textarea value={newCustomerForm.address} onChange={(event) => setNewCustomerForm((current) => ({ ...current, address: event.target.value }))} className="min-h-[92px] w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#00008b]" /></div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={() => { setShowCustomerModal(false); setNewCustomerForm(EMPTY_CUSTOMER_FORM); }} className="h-11 rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={savingCustomer} className="h-11 rounded-md bg-[#00008b] px-5 text-sm font-semibold text-white hover:bg-[#000070] disabled:opacity-60">{savingCustomer ? "Saving..." : "Add Customer"}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {showHoldNamePopup ? <HoldBillNamePopup customerName={selectedCustomer ? getCustomerName(selectedCustomer) : "Walk-in Customer"} itemCount={totals.itemCount} onCancel={() => setShowHoldNamePopup(false)} onSave={handleHoldBillSave} /> : null}
      {showHoldListPopup ? <HoldBillsPopup bills={holdBills} onClose={() => setShowHoldListPopup(false)} onRestore={restoreHoldBill} onDelete={deleteHoldBill} /> : null}
      {showSalesHistoryPopup ? <SalesHistoryPopup sales={recentSales} onClose={() => setShowSalesHistoryPopup(false)} onPrint={(sale: { _id: any; }) => window.open(`/shopowner/sales/view?id=${sale._id}&print=1`, "_blank", "noopener,noreferrer")} onEdit={(sale: { _id: any; }) => router.push(`/shopowner/sales/edit?id=${sale._id}`)} /> : null}
      {showSplitPopup ? <SplitPaymentPopup totalAmount={totals.netAmount} onCancel={() => setShowSplitPopup(false)} onSave={(splitRows: SplitPaymentRow[]) => void handleSplitSave(splitRows)} /> : null}
    </div>
  );
}
