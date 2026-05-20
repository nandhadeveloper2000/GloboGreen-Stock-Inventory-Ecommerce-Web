"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  FolderTree,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Store,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL, withQuery } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  TopLabelInput,
  TopLabelNativeSelect,
} from "@/components/ui/top-label-fields";
import {
  type ShopCategoryOption,
  type ShopSubCategoryOption,
  formatApplyOnLabel,
  generateDiscountCode,
  isValidObjectId,
  readSelectedShop,
  todayInputValue,
} from "./shared";

type DiscountCreateResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

type ShopCategoryMapRow = {
  _id?: string;
  isActive?: boolean;
  categoryId?:
    | string
    | {
        _id?: string;
        name?: string;
        isActive?: boolean;
      };
};

type ShopSubCategoryMapRow = {
  _id?: string;
  isActive?: boolean;
  subCategoryId?:
    | string
    | {
        _id?: string;
        name?: string;
        isActive?: boolean;
        categoryId?:
          | string
          | {
              _id?: string;
              name?: string;
            };
      };
};

type ShopCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: ShopCategoryMapRow[];
};

type ShopSubCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: ShopSubCategoryMapRow[];
};

type DiscountFormState = {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FLAT";
  value: string;
  applyOn: "ORDER" | "CATEGORY" | "SUBCATEGORY";
  minOrderAmount: string;
  maxDiscountAmount: string;
  validFrom: string;
  validTo: string;
};

function nextMonthInputValue() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function buildInitialForm(): DiscountFormState {
  return {
    code: generateDiscountCode("ORDER"),
    description: "",
    discountType: "PERCENTAGE",
    value: "",
    applyOn: "ORDER",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    validFrom: todayInputValue(),
    validTo: nextMonthInputValue(),
  };
}

function mapShopCategoryRows(rows: ShopCategoryMapRow[]) {
  const seen = new Set<string>();

  return rows
    .map((row) => {
      if (row.isActive === false) return null;
      if (!row.categoryId || typeof row.categoryId === "string") return null;
      if (!isValidObjectId(String(row.categoryId._id || ""))) return null;
      if (row.categoryId.isActive === false) return null;

      const option: ShopCategoryOption = {
        _id: String(row.categoryId._id),
        name: row.categoryId.name || "Unnamed Category",
      };

      if (seen.has(option._id)) return null;
      seen.add(option._id);
      return option;
    })
    .filter(Boolean) as ShopCategoryOption[];
}

function mapShopSubCategoryRows(rows: ShopSubCategoryMapRow[]) {
  const seen = new Set<string>();

  return rows
    .map((row) => {
      if (row.isActive === false) return null;
      if (!row.subCategoryId || typeof row.subCategoryId === "string") {
        return null;
      }
      if (!isValidObjectId(String(row.subCategoryId._id || ""))) return null;
      if (row.subCategoryId.isActive === false) return null;
      if (
        !row.subCategoryId.categoryId ||
        typeof row.subCategoryId.categoryId === "string"
      ) {
        return null;
      }

      const categoryId = String(row.subCategoryId.categoryId._id || "");
      if (!isValidObjectId(categoryId)) return null;

      const option: ShopSubCategoryOption = {
        _id: String(row.subCategoryId._id),
        name: row.subCategoryId.name || "Unnamed Subcategory",
        categoryId,
        categoryName:
          row.subCategoryId.categoryId.name || "Unnamed Category",
      };

      if (seen.has(option._id)) return null;
      seen.add(option._id);
      return option;
    })
    .filter(Boolean) as ShopSubCategoryOption[];
}

export default function CreateDiscountPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [selectedShop, setSelectedShop] = useState(readSelectedShop());
  const [form, setForm] = useState<DiscountFormState>(buildInitialForm);
  const [isAutoCode, setIsAutoCode] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<ShopCategoryOption[]>(
    []
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [parentCategorySearch, setParentCategorySearch] = useState("");
  const [selectedParentCategoryId, setSelectedParentCategoryId] =
    useState("");
  const [subCategoryOptions, setSubCategoryOptions] = useState<
    ShopSubCategoryOption[]
  >([]);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<
    string[]
  >([]);
  const [subCategorySearch, setSubCategorySearch] = useState("");
  const [subCategoryLoading, setSubCategoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const syncSelectedShop = useCallback(() => {
    setSelectedShop(readSelectedShop());
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

  const fetchShopCategories = useCallback(async () => {
    if (!accessToken || !selectedShop.id) {
      setCategoryOptions([]);
      setSelectedCategoryIds([]);
      setSelectedParentCategoryId("");
      setCategoryLoading(false);
      return;
    }

    try {
      setCategoryLoading(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.shopCategoriesByShop.url(selectedShop.id)}`,
        {
          method: SummaryApi.shopCategoriesByShop.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const result =
        (await response.json().catch(() => ({}))) as ShopCategoryListResponse;

      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || "Failed to load shop categories");
      }

      const options = mapShopCategoryRows(result.data);
      setCategoryOptions(options);
      setSelectedCategoryIds((prev) =>
        prev.filter((id) => options.some((option) => option._id === id))
      );
      setSelectedParentCategoryId((prev) =>
        options.some((option) => option._id === prev) ? prev : ""
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load shop categories";

      setCategoryOptions([]);
      setSelectedCategoryIds([]);
      setSelectedParentCategoryId("");
      toast.error(message);
    } finally {
      setCategoryLoading(false);
    }
  }, [accessToken, selectedShop.id]);

  const fetchShopSubCategories = useCallback(
    async (categoryId: string) => {
      if (!accessToken || !selectedShop.id || !categoryId) {
        setSubCategoryOptions([]);
        setSelectedSubCategoryIds([]);
        setSubCategoryLoading(false);
        return;
      }

      try {
        setSubCategoryLoading(true);

        const url = withQuery(
          SummaryApi.shopSubCategoriesByShop.url(selectedShop.id),
          { categoryId }
        );

        const response = await fetch(`${baseURL}${url}`, {
          method: SummaryApi.shopSubCategoriesByShop.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const result =
          (await response.json().catch(() => ({}))) as ShopSubCategoryListResponse;

        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          throw new Error(result.message || "Failed to load shop subcategories");
        }

        const options = mapShopSubCategoryRows(result.data);
        setSubCategoryOptions(options);
        setSelectedSubCategoryIds((prev) =>
          prev.filter((id) => options.some((option) => option._id === id))
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load shop subcategories";

        setSubCategoryOptions([]);
        setSelectedSubCategoryIds([]);
        toast.error(message);
      } finally {
        setSubCategoryLoading(false);
      }
    },
    [accessToken, selectedShop.id]
  );

  useEffect(() => {
    void fetchShopCategories();
  }, [fetchShopCategories]);

  useEffect(() => {
    if (form.applyOn !== "SUBCATEGORY" || !selectedParentCategoryId) {
      setSubCategoryOptions([]);
      setSelectedSubCategoryIds([]);
      setSubCategoryLoading(false);
      return;
    }

    void fetchShopSubCategories(selectedParentCategoryId);
  }, [fetchShopSubCategories, form.applyOn, selectedParentCategoryId]);

  const filteredCategoryOptions = useMemo(() => {
    const keyword = categorySearch.trim().toLowerCase();

    if (!keyword) return categoryOptions;

    return categoryOptions.filter((option) =>
      `${option.name}`.toLowerCase().includes(keyword)
    );
  }, [categoryOptions, categorySearch]);

  const filteredParentCategoryOptions = useMemo(() => {
    const keyword = parentCategorySearch.trim().toLowerCase();

    if (!keyword) return categoryOptions;

    return categoryOptions.filter((option) =>
      `${option.name}`.toLowerCase().includes(keyword)
    );
  }, [categoryOptions, parentCategorySearch]);

  const filteredSubCategoryOptions = useMemo(() => {
    const keyword = subCategorySearch.trim().toLowerCase();

    if (!keyword) return subCategoryOptions;

    return subCategoryOptions.filter((option) =>
      `${option.name} ${option.categoryName}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [subCategoryOptions, subCategorySearch]);

  const selectedCategoryNames = useMemo(() => {
    const selectedSet = new Set(selectedCategoryIds);

    return categoryOptions
      .filter((option) => selectedSet.has(option._id))
      .map((option) => option.name);
  }, [categoryOptions, selectedCategoryIds]);

  const selectedParentCategory = useMemo(
    () =>
      categoryOptions.find((option) => option._id === selectedParentCategoryId) ||
      null,
    [categoryOptions, selectedParentCategoryId]
  );

  const selectedSubCategoryNames = useMemo(() => {
    const selectedSet = new Set(selectedSubCategoryIds);

    return subCategoryOptions
      .filter((option) => selectedSet.has(option._id))
      .map((option) => option.name);
  }, [selectedSubCategoryIds, subCategoryOptions]);

  function updateForm<K extends keyof DiscountFormState>(
    key: K,
    value: DiscountFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCodeChange(value: string) {
    setIsAutoCode(false);
    updateForm("code", value.toUpperCase());
  }

  function handleRegenerateCode() {
    setIsAutoCode(true);
    updateForm("code", generateDiscountCode(form.applyOn));
  }

  function handleApplyOnChange(value: DiscountFormState["applyOn"]) {
    setForm((prev) => ({
      ...prev,
      applyOn: value,
      code: isAutoCode ? generateDiscountCode(value) : prev.code,
    }));

    if (value !== "CATEGORY") {
      setSelectedCategoryIds([]);
      setCategorySearch("");
    }

    if (value !== "SUBCATEGORY") {
      setSelectedParentCategoryId("");
      setParentCategorySearch("");
      setSubCategoryOptions([]);
      setSelectedSubCategoryIds([]);
      setSubCategorySearch("");
      setSubCategoryLoading(false);
    }
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  function selectAllVisibleCategories() {
    setSelectedCategoryIds((prev) => {
      const selected = new Set(prev);
      filteredCategoryOptions.forEach((option) => selected.add(option._id));
      return Array.from(selected);
    });
  }

  function clearCategorySelection() {
    setSelectedCategoryIds([]);
  }

  function handleParentCategorySelect(categoryId: string) {
    setSelectedParentCategoryId((prev) => (prev === categoryId ? "" : categoryId));
    setSelectedSubCategoryIds([]);
    setSubCategorySearch("");
  }

  function toggleSubCategory(subCategoryId: string) {
    setSelectedSubCategoryIds((prev) =>
      prev.includes(subCategoryId)
        ? prev.filter((id) => id !== subCategoryId)
        : [...prev, subCategoryId]
    );
  }

  function selectAllVisibleSubCategories() {
    setSelectedSubCategoryIds((prev) => {
      const selected = new Set(prev);
      filteredSubCategoryOptions.forEach((option) => selected.add(option._id));
      return Array.from(selected);
    });
  }

  function clearSubCategorySelection() {
    setSelectedSubCategoryIds([]);
  }

  function handleReset() {
    setForm(buildInitialForm());
    setIsAutoCode(true);
    setSelectedCategoryIds([]);
    setCategorySearch("");
    setSelectedParentCategoryId("");
    setParentCategorySearch("");
    setSubCategoryOptions([]);
    setSelectedSubCategoryIds([]);
    setSubCategorySearch("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    if (!selectedShop.id) {
      toast.error("Please select a valid shop first");
      return;
    }

    const code = form.code.trim().toUpperCase();
    const value = Number(form.value || 0);
    const minOrderAmount = Number(form.minOrderAmount || 0);
    const maxDiscountAmount =
      form.maxDiscountAmount.trim() === ""
        ? null
        : Number(form.maxDiscountAmount || 0);

    if (!code) {
      toast.error("Discount code is required");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    if (form.discountType === "PERCENTAGE" && value > 100) {
      toast.error("Percentage discount cannot exceed 100");
      return;
    }

    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      toast.error("Minimum order amount must be a non-negative value");
      return;
    }

    if (
      maxDiscountAmount !== null &&
      (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0)
    ) {
      toast.error("Maximum discount amount must be a non-negative value");
      return;
    }

    if (!form.validFrom || !form.validTo) {
      toast.error("Please select the valid from and valid to dates");
      return;
    }

    if (new Date(form.validFrom).getTime() > new Date(form.validTo).getTime()) {
      toast.error("Valid to date must be greater than or equal to valid from");
      return;
    }

    if (form.applyOn === "CATEGORY" && selectedCategoryIds.length === 0) {
      toast.error("Please select at least one category");
      return;
    }

    if (form.applyOn === "SUBCATEGORY" && !selectedParentCategoryId) {
      toast.error("Please choose a category before selecting subcategories");
      return;
    }

    if (form.applyOn === "SUBCATEGORY" && selectedSubCategoryIds.length === 0) {
      toast.error("Please select at least one subcategory");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        shopId: selectedShop.id,
        code,
        description: form.description.trim(),
        discountType: form.discountType,
        value,
        applyOn: form.applyOn,
        applicableIds:
          form.applyOn === "CATEGORY"
            ? selectedCategoryIds
            : form.applyOn === "SUBCATEGORY"
              ? selectedSubCategoryIds
              : [],
        minOrderAmount,
        maxDiscountAmount,
        validFrom: form.validFrom,
        validTo: form.validTo,
      };

      const response = await fetch(`${baseURL}${SummaryApi.discount_create.url}`, {
        method: SummaryApi.discount_create.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result =
        (await response.json().catch(() => ({}))) as DiscountCreateResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create discount");
      }

      toast.success(result.message || "Discount created successfully");
      router.push("/shopowner/discounts/list");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create discount"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const scopeNote =
    form.applyOn === "CATEGORY"
      ? "This discount will only apply to the selected categories."
      : form.applyOn === "SUBCATEGORY"
        ? "Choose a category first, then select the subcategories that should receive this discount."
        : "This discount will apply to the full order when the rules match.";

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <section className="rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/10 bg-[#00008b]/5 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#00008b]">
                <Tag className="h-3.5 w-3.5" />
                Discount Setup
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                Create Discount
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Create clean order, category, or subcategory offers with an
                auto-generated code and a clear category tree selection flow.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => router.push("/shopowner/discounts/list")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </button>

              <button
                type="button"
                onClick={handleRegenerateCode}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#00008b]/20 bg-[#00008b]/5 px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:bg-[#00008b]/10"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate Code
              </button>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:px-6">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Selected Shop
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
                  <Store className="h-4 w-4 text-[#00008b]" />
                  {selectedShop.name || "No shop selected"}
                </div>
                {!selectedShop.id ? (
                  <p className="mt-2 text-sm font-semibold text-rose-600">
                    Please select a shop before creating a discount.
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Scope Summary
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatApplyOnLabel(form.applyOn)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {scopeNote}
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-extrabold text-slate-950">
                  Offer Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define the discount code, value, and whether this offer is
                  order-wise, category-wise, or subcategory-wise.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="relative">
                    <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.code}
                      onChange={(event) => handleCodeChange(event.target.value)}
                      placeholder="Discount code"
                      maxLength={32}
                      className="h-14 w-full rounded-2xl border border-slate-200 bg-white pb-2 pl-11 pr-28 pt-6 text-sm font-semibold uppercase text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/50 focus:ring-4 focus:ring-[#00008b]/10"
                    />
                    <label className="pointer-events-none absolute left-11 top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500">
                      Discount Code <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="absolute right-3 top-1/2 inline-flex h-8 -translate-y-1/2 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Auto
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">
                    Auto-generated by default. You can edit it or regenerate a
                    fresh code.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      placeholder="Short description for the offer"
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-7 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/50 focus:ring-4 focus:ring-[#00008b]/10"
                    />
                    <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500">
                      Description
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TopLabelNativeSelect
                    label="Discount Type"
                    value={form.discountType}
                    onChange={(event) =>
                      updateForm(
                        "discountType",
                        event.target.value as DiscountFormState["discountType"]
                      )
                    }
                    required
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FLAT">Flat Amount</option>
                  </TopLabelNativeSelect>

                  <TopLabelInput
                    label={
                      form.discountType === "PERCENTAGE"
                        ? "Discount Value (%)"
                        : "Discount Value (Rs.)"
                    }
                    value={form.value}
                    onChange={(event) => updateForm("value", event.target.value)}
                    placeholder={
                      form.discountType === "PERCENTAGE"
                        ? "Enter percentage"
                        : "Enter amount"
                    }
                    required
                    type="number"
                  />
                </div>

                <TopLabelNativeSelect
                  label="Apply On"
                  value={form.applyOn}
                  onChange={(event) =>
                    handleApplyOnChange(
                      event.target.value as DiscountFormState["applyOn"]
                    )
                  }
                  required
                >
                  <option value="ORDER">Order Wise</option>
                  <option value="CATEGORY">Category Wise</option>
                  <option value="SUBCATEGORY">Subcategory Wise</option>
                </TopLabelNativeSelect>
              </div>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-extrabold text-slate-950">
                  Rules and Validity
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure order threshold, max discount cap, and the active
                  date range.
                </p>
              </div>

              <div className="space-y-4">
                <TopLabelInput
                  label="Min Order Amount"
                  value={form.minOrderAmount}
                  onChange={(event) =>
                    updateForm("minOrderAmount", event.target.value)
                  }
                  placeholder="0"
                  type="number"
                />

                <TopLabelInput
                  label="Max Discount Amount"
                  value={form.maxDiscountAmount}
                  onChange={(event) =>
                    updateForm("maxDiscountAmount", event.target.value)
                  }
                  placeholder="Leave blank for no cap"
                  type="number"
                />

                <div className="grid gap-4">
                  <TopLabelInput
                    label="Valid From"
                    value={form.validFrom}
                    onChange={(event) =>
                      updateForm("validFrom", event.target.value)
                    }
                    placeholder="Select start date"
                    type="date"
                    icon={CalendarDays}
                    required
                  />

                  <TopLabelInput
                    label="Valid To"
                    value={form.validTo}
                    onChange={(event) => updateForm("validTo", event.target.value)}
                    placeholder="Select end date"
                    type="date"
                    icon={CalendarDays}
                    required
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Quick Notes
                  </p>
                  <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-600">
                    <li>- Usage limit has been removed from this discount flow.</li>
                    <li>- Category-wise discounts require at least one category.</li>
                    <li>
                      - Subcategory-wise discounts require one parent category
                      and at least one subcategory.
                    </li>
                    <li>- Percentage discounts must stay between 0 and 100.</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  Applicable Categories and Subcategories
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {form.applyOn === "CATEGORY"
                    ? "Choose the category names that should receive this discount."
                    : form.applyOn === "SUBCATEGORY"
                      ? "Pick a category first, then choose the subcategories inside it."
                      : "Switch Apply On to Category Wise or Subcategory Wise to target the category tree."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                Scope: {formatApplyOnLabel(form.applyOn)}
              </div>
            </div>

            {form.applyOn === "CATEGORY" ? (
              <>
                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      placeholder="Search category"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllVisibleCategories}
                      disabled={filteredCategoryOptions.length === 0}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select Visible
                    </button>

                    <button
                      type="button"
                      onClick={clearCategorySelection}
                      disabled={selectedCategoryIds.length === 0}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-xs font-black text-[#00008b]">
                      <FolderTree className="h-3.5 w-3.5" />
                      {selectedCategoryIds.length} selected
                    </span>

                    {selectedCategoryNames.slice(0, 4).map((name) => (
                      <span
                        key={name}
                        className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700"
                      >
                        {name}
                      </span>
                    ))}

                    {selectedCategoryNames.length > 4 ? (
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                        +{selectedCategoryNames.length - 4} more
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  {categoryLoading ? (
                    <div className="flex min-h-56 items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50">
                      <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading categories...
                      </div>
                    </div>
                  ) : filteredCategoryOptions.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <FolderTree className="mx-auto h-10 w-10 text-slate-300" />
                      <h3 className="mt-4 text-base font-extrabold text-slate-900">
                        No categories available
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        No mapped active categories were found for the selected
                        shop.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {filteredCategoryOptions.map((option) => {
                        const selected = selectedCategoryIds.includes(option._id);

                        return (
                          <button
                            key={option._id}
                            type="button"
                            onClick={() => toggleCategory(option._id)}
                            className={`rounded-[22px] border p-4 text-left transition ${
                              selected
                                ? "border-[#00008b]/30 bg-[#00008b]/5 shadow-[0_12px_25px_rgba(0,0,139,0.10)]"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-slate-950">
                                  {option.name}
                                </p>
                              </div>

                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${
                                  selected
                                    ? "border-[#00008b]/20 bg-white text-[#00008b]"
                                    : "border-slate-200 bg-slate-50 text-slate-500"
                                }`}
                              >
                                {selected ? "Selected" : "Select"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : form.applyOn === "SUBCATEGORY" ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <section className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Step 1
                      </p>
                      <h3 className="mt-1 text-base font-extrabold text-slate-950">
                        Choose Category
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Select the parent category to load its subcategory list.
                      </p>
                    </div>

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={parentCategorySearch}
                        onChange={(event) =>
                          setParentCategorySearch(event.target.value)
                        }
                        placeholder="Search category"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-xs font-black text-[#00008b]">
                          <FolderTree className="h-3.5 w-3.5" />
                          {selectedParentCategory ? "1 selected" : "0 selected"}
                        </span>

                        {selectedParentCategory ? (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                            {selectedParentCategory.name}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {categoryLoading ? (
                      <div className="flex min-h-56 items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-white">
                        <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading categories...
                        </div>
                      </div>
                    ) : filteredParentCategoryOptions.length === 0 ? (
                      <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                        <FolderTree className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-4 text-base font-extrabold text-slate-900">
                          No categories available
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          No mapped active categories were found for the selected
                          shop.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {filteredParentCategoryOptions.map((option) => {
                          const selected =
                            option._id === selectedParentCategoryId;

                          return (
                            <button
                              key={option._id}
                              type="button"
                              onClick={() => handleParentCategorySelect(option._id)}
                              className={`rounded-[20px] border p-4 text-left transition ${
                                selected
                                  ? "border-[#00008b]/30 bg-[#00008b]/5 shadow-[0_12px_25px_rgba(0,0,139,0.10)]"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold text-slate-950">
                                    {option.name}
                                  </p>
                                </div>

                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${
                                    selected
                                      ? "border-[#00008b]/20 bg-white text-[#00008b]"
                                      : "border-slate-200 bg-slate-50 text-slate-500"
                                  }`}
                                >
                                  {selected ? "Selected" : "Select"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Step 2
                      </p>
                      <h3 className="mt-1 text-base font-extrabold text-slate-950">
                        Choose Subcategories
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedParentCategory
                          ? `Showing subcategories under ${selectedParentCategory.name}.`
                          : "Choose a category first to load the related subcategories."}
                      </p>
                    </div>

                    {!selectedParentCategory ? (
                      <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                        <Boxes className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-4 text-base font-extrabold text-slate-900">
                          Select a category first
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          The subcategory list will appear here after you choose
                          a parent category.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="relative w-full lg:max-w-md">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              value={subCategorySearch}
                              onChange={(event) =>
                                setSubCategorySearch(event.target.value)
                              }
                              placeholder="Search subcategory"
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={selectAllVisibleSubCategories}
                              disabled={filteredSubCategoryOptions.length === 0}
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Select Visible
                            </button>

                            <button
                              type="button"
                              onClick={clearSubCategorySelection}
                              disabled={selectedSubCategoryIds.length === 0}
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-xs font-black text-[#00008b]">
                              <Boxes className="h-3.5 w-3.5" />
                              {selectedSubCategoryIds.length} selected
                            </span>

                            {selectedSubCategoryNames.slice(0, 4).map((name) => (
                              <span
                                key={name}
                                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700"
                              >
                                {name}
                              </span>
                            ))}

                            {selectedSubCategoryNames.length > 4 ? (
                              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                                +{selectedSubCategoryNames.length - 4} more
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {subCategoryLoading ? (
                          <div className="flex min-h-56 items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50">
                            <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading subcategories...
                            </div>
                          </div>
                        ) : filteredSubCategoryOptions.length === 0 ? (
                          <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                            <Boxes className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-4 text-base font-extrabold text-slate-900">
                              No subcategories available
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              No mapped active subcategories were found for the
                              selected category.
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            {filteredSubCategoryOptions.map((option) => {
                              const selected =
                                selectedSubCategoryIds.includes(option._id);

                              return (
                                <button
                                  key={option._id}
                                  type="button"
                                  onClick={() => toggleSubCategory(option._id)}
                                  className={`rounded-[20px] border p-4 text-left transition ${
                                    selected
                                      ? "border-[#00008b]/30 bg-[#00008b]/5 shadow-[0_12px_25px_rgba(0,0,139,0.10)]"
                                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-extrabold text-slate-950">
                                        {option.name}
                                      </p>
                                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                        {option.categoryName}
                                      </p>
                                      <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                                        {option.categoryName}
                                      </p>
                                    </div>

                                    <span
                                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${
                                        selected
                                          ? "border-[#00008b]/20 bg-white text-[#00008b]"
                                          : "border-slate-200 bg-slate-50 text-slate-500"
                                      }`}
                                    >
                                      {selected ? "Selected" : "Select"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="mt-5 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <Store className="mx-auto h-9 w-9 text-slate-300" />
                <h3 className="mt-4 text-base font-extrabold text-slate-900">
                  Order-level discount selected
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  This discount will apply to the order total, so category and
                  subcategory selection are not required.
                </p>
              </div>
            )}
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => router.push("/shopowner/discounts/list")}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || !selectedShop.id}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-5 text-sm font-extrabold text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitting ? "Saving..." : "Save Discount"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
