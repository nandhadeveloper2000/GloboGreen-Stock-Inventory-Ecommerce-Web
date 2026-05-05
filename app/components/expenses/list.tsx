"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type ExpenseItem = {
  _id: string;
  referenceNo?: string;
  expenseCategory?: string;
  expenseDate?: string;
  amount?: number;
  description?: string;
  notes?: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  count?: number;
  data?: ExpenseItem[];
  summary?: {
    totalExpense?: number;
  };
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

const ALL_CATEGORY = "All Categories";

const EXPENSE_CATEGORIES = [
  ALL_CATEGORY,
  "Salary",
  "Rent",
  "Food Allowance",
  "Travel Allowance",
  "Utilities",
  "Supplies",
  "Maintenance",
  "Other",
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function isValidObjectId(value: string) {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

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

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "" };
  }

  const id = cleanStorageValue(window.localStorage.getItem(SELECTED_SHOP_ID_KEY));
  const name = cleanStorageValue(
    window.localStorage.getItem(SELECTED_SHOP_NAME_KEY)
  );

  return {
    id: isValidObjectId(id) ? id : "",
    name,
  };
}

function formatMoney(value?: number | null) {
  const amount = Number(value || 0);
  return `₹${amount.toFixed(2)}`;
}

function formatTableMoney(value?: number | null) {
  const amount = Number(value || 0);
  return amount.toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB").replace(/\//g, "-");
}

function csvEscape(value: string | number | undefined | null) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function ExpenseListPage() {
  const { accessToken } = useAuth();

  const initialShop = readSelectedShop();

  const [selectedShopId, setSelectedShopId] = useState(initialShop.id);
  const [selectedShopName, setSelectedShopName] = useState(initialShop.name);
  const [fromDate, setFromDate] = useState(todayInputValue());
  const [toDate, setToDate] = useState(todayInputValue());
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasValidShopId = useMemo(() => {
    return isValidObjectId(selectedShopId);
  }, [selectedShopId]);

  const syncSelectedShop = useCallback(() => {
    const shop = readSelectedShop();

    setSelectedShopId(shop.id);
    setSelectedShopName(shop.name);
  }, []);

  const totalExpense = useMemo(() => {
    return expenses.reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  const fetchExpenses = useCallback(
    async (isFilter = false) => {
      if (!accessToken) {
        setLoading(false);
        setFiltering(false);
        return;
      }

      if (!selectedShopId || !isValidObjectId(selectedShopId)) {
        setExpenses([]);
        setLoading(false);
        setFiltering(false);
        setErrorMessage("Please select a valid shop.");

        if (isFilter) {
          toast.error("Please select a valid shop.");
        }

        return;
      }

      try {
        if (isFilter) {
          setFiltering(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        const endpoint = SummaryApi.expense_list.url({
          shopId: selectedShopId,
          from: fromDate,
          to: toDate,
          category: category === ALL_CATEGORY ? "" : category,
        });

        const response = await fetch(`${baseURL}${endpoint}`, {
          method: SummaryApi.expense_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const result = (await response.json().catch(() => ({}))) as ApiResponse;

        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          throw new Error(result.message || "Unable to load expenses.");
        }

        setExpenses(result.data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load expenses.";

        setErrorMessage(message);
        setExpenses([]);
        toast.error(message);
      } finally {
        setLoading(false);
        setFiltering(false);
      }
    },
    [accessToken, selectedShopId, fromDate, toDate, category]
  );

  useEffect(() => {
    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void fetchExpenses(false);
  }, [fetchExpenses]);

  function handleExport() {
    if (expenses.length === 0) {
      toast.error("No expenses available to export.");
      return;
    }

    const header = ["Date", "Category", "Description", "Amount"];

    const body = expenses.map((expense) => [
      formatDate(expense.expenseDate),
      expense.expenseCategory || "-",
      expense.description || expense.notes || "-",
      formatTableMoney(expense.amount),
    ]);

    const csv = [header, ...body]
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `expenses-${fromDate}-to-${toDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-5 text-slate-900">
      <h1 className="mb-5 text-3xl font-medium tracking-wide text-slate-950">
        View Expenses
      </h1>

      <section className="grid gap-5 lg:grid-cols-[610px_1fr]">
        <div className="rounded-sm bg-[#00008B] p-4 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide">
            Total Expense
          </p>

          <p className="mt-1 text-2xl font-bold">{formatMoney(totalExpense)}</p>

          {selectedShopName ? (
            <p className="mt-2 text-xs text-white/85">{selectedShopName}</p>
          ) : (
            <p className="mt-2 text-xs text-white/85">No valid shop selected</p>
          )}
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                From
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-12 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#00008B]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                To
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-12 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#00008B]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Category
              </label>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-12 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#00008B]"
              >
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-7 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => void fetchExpenses(true)}
          disabled={filtering || loading || !hasValidShopId}
          className="inline-flex h-9 items-center justify-center rounded bg-[#00008B] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#000070] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {filtering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Apply Filter
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={expenses.length === 0}
          className="inline-flex h-9 items-center justify-center gap-2 rounded border border-[#00008B]/40 bg-[#f1f1ff] px-5 text-sm font-bold text-[#00008B] shadow-sm hover:bg-[#e7e7ff] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <section className="mt-4 overflow-x-auto rounded-sm border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[850px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#00008B] text-white">
              <th className="w-[18%] border-r border-white/20 px-4 py-3 text-center font-bold">
                Date
              </th>

              <th className="w-[26%] border-r border-white/20 px-4 py-3 text-center font-bold">
                Category
              </th>

              <th className="border-r border-white/20 px-4 py-3 text-center font-bold">
                Description
              </th>

              <th className="w-[24%] px-4 py-3 text-center font-bold">
                Amount
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading expenses...
                  </span>
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td colSpan={4} className="px-4 py-5 text-center text-red-600">
                  {errorMessage}
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-slate-900">
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense._id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-center">
                    {formatDate(expense.expenseDate)}
                  </td>

                  <td className="px-4 py-3">
                    {expense.expenseCategory || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {expense.description || expense.notes || "-"}
                  </td>

                  <td className="px-4 py-3 text-right font-bold">
                    {formatTableMoney(expense.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}