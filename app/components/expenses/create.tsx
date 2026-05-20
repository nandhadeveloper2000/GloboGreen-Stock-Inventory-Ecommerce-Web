"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

const PRIMARY_COLOR = "#00008B";

const EXPENSE_CATEGORIES = [
  "Salary",
  "Rent",
  "Food Allowance",
  "Travel Allowance",
  "Utilities",
  "Supplies",
  "Maintenance",
  "Other",
];

type ExpenseRow = {
  id: string;
  expenseCategory: string;
  description: string;
  amount: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "" };
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
  };
}

function createEmptyRow(): ExpenseRow {
  return {
    id: createId(),
    expenseCategory: "Other",
    description: "",
    amount: "",
  };
}

function toMoney(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export default function CreateExpensePage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayInputValue());
  const [rows, setRows] = useState<ExpenseRow[]>([createEmptyRow()]);
  const [submitting, setSubmitting] = useState(false);

  const syncSelectedShop = useCallback(() => {
    const shop = readSelectedShop();
    setSelectedShopId(shop.id);
    setSelectedShopName(shop.name);
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

  const netAmount = useMemo(() => {
    return rows.reduce((total, row) => {
      const amount = Number(row.amount || 0);
      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [rows]);

  function updateRow(rowId: string, patch: Partial<ExpenseRow>) {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(rowId: string) {
    setRows((prev) => {
      if (prev.length === 1) {
        return [createEmptyRow()];
      }

      return prev.filter((row) => row.id !== rowId);
    });
  }

  function handleClear() {
    setExpenseDate(todayInputValue());
    setRows([createEmptyRow()]);
  }

  async function handleSubmit() {
    if (!accessToken) {
      toast.error("Login token missing. Please login again.");
      return;
    }

    if (!selectedShopId) {
      toast.error("Please select a shop before saving expense.");
      return;
    }

    const validRows = rows
      .map((row) => ({
        expenseCategory: row.expenseCategory.trim(),
        description: row.description.trim(),
        amount: Number(row.amount || 0),
      }))
      .filter((row) => row.expenseCategory && row.amount > 0);

    if (validRows.length === 0) {
      toast.error("Enter at least one valid expense amount.");
      return;
    }

    setSubmitting(true);

    try {
      const payload =
        validRows.length === 1
          ? {
              shopId: selectedShopId,
              expenseDate,
              expenseCategory: validRows[0].expenseCategory,
              description: validRows[0].description,
              amount: validRows[0].amount,
            }
          : {
              shopId: selectedShopId,
              expenseDate,
              items: validRows,
            };

      const response = await fetch(`${baseURL}${SummaryApi.expense_create.url}`, {
        method: SummaryApi.expense_create.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save expense.");
      }

      toast.success(result.message || "Expense saved successfully.");
      router.push("/shopowner/expenses/list");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save expense."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900">
      <header className="flex min-h-[42px] items-center justify-between bg-[#00008B] px-3 py-1.5 text-white">
        <h1 className="text-xl font-bold uppercase tracking-wide text-white md:text-2xl">
          Expense Entry
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 rounded bg-white px-3 py-1.5 text-xs font-semibold text-[#00008B] shadow-sm hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 shadow-sm hover:bg-red-50 disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </header>

      <main className="p-1.5">
        <section className="rounded-sm border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 px-3 py-4 md:grid-cols-[360px_1fr] md:items-start">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Date
              </label>

              <input
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#00008B] md:w-[320px]"
              />

              {selectedShopName ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Shop: {selectedShopName}
                </p>
              ) : (
                <p className="mt-2 text-xs font-medium text-red-500">
                  No shop selected
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-4xl font-extrabold tracking-[0.08em] text-red-500 md:text-5xl">
                {toMoney(netAmount)}
              </p>

              <p className="mt-2 text-xs font-bold uppercase text-slate-500">
                Net Amount
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#00008B] text-white">
                  <th className="w-[56px] border-r border-white/30 px-2 py-2 text-center font-bold">
                    S.No
                  </th>

                  <th className="w-[190px] border-r border-white/30 px-2 py-2 text-center font-bold">
                    Category
                  </th>

                  <th className="border-r border-white/30 px-2 py-2 text-center font-bold">
                    Description
                  </th>

                  <th className="w-[180px] border-r border-white/30 px-2 py-2 text-center font-bold">
                    Amount
                  </th>

                  <th className="w-[64px] px-2 py-2 text-center font-bold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="bg-[#fffde8]">
                    <td className="border border-slate-200 px-2 py-2 text-center font-semibold">
                      {index + 1}
                    </td>

                    <td className="border border-slate-200 px-2 py-2">
                      <select
                        value={row.expenseCategory}
                        onChange={(event) =>
                          updateRow(row.id, {
                            expenseCategory: event.target.value,
                          })
                        }
                        className="h-8 w-full border-0 bg-[#f4f2d9] px-2 text-sm text-slate-800 outline-none"
                      >
                        {EXPENSE_CATEGORIES.map((expenseCategory) => (
                          <option
                            key={expenseCategory}
                            value={expenseCategory}
                          >
                            {expenseCategory}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="border border-slate-200 px-2 py-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(event) =>
                          updateRow(row.id, {
                            description: event.target.value,
                          })
                        }
                        placeholder="Reason / description"
                        className="h-8 w-full border-0 bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </td>

                    <td className="border border-slate-200 px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.amount}
                        onChange={(event) =>
                          updateRow(row.id, {
                            amount: event.target.value,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addRow();
                          }
                        }}
                        placeholder="0.00"
                        className="h-8 w-full border-0 bg-transparent px-2 text-right text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </td>

                    <td className="border border-slate-200 px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-red-500 hover:bg-red-50"
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="min-h-[58vh] border-t border-slate-100 bg-white" />

          <div className="sticky bottom-0 flex justify-end border-t border-slate-200 bg-white p-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedShopId}
              className="inline-flex h-14 w-full items-center justify-center gap-3 rounded bg-[#00008B] text-base font-bold text-white shadow-sm hover:bg-[#000070] disabled:cursor-not-allowed disabled:bg-slate-300 md:w-[460px]"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Save Entry
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}