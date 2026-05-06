"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Search,
  Shapes,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type SubCategoryItem = {
  _id: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
};

type BrandItem = {
  _id: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
};

type ModelItem = {
  _id: string;
  name: string;
  nameKey?: string;
  brandId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  isActive?: boolean;
};

type SubCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: SubCategoryItem[];
  subCategories?: SubCategoryItem[];
};

type BrandListResponse = {
  success?: boolean;
  message?: string;
  data?: BrandItem[];
  brands?: BrandItem[];
};

type ModelListResponse = {
  success?: boolean;
  message?: string;
  data?: ModelItem[];
  models?: ModelItem[];
};

type CompatibilityEntry = {
  brandId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  modelId?: Array<
    | string
    | {
        _id?: string;
        name?: string;
      }
  >;
  notes?: string;
  isActive?: boolean;
  sortOrder?: number;
};

type ProductCompatibilityItem = {
  _id: string;
  subCategoryId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  productTypeId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  productBrandId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  compatible?: CompatibilityEntry[];
  isActive?: boolean;
};

type ProductCompatibilityResponse = {
  success?: boolean;
  message?: string;
  data?: ProductCompatibilityItem;
  productCompatibility?: ProductCompatibilityItem;
};

type CompatibilityRow = {
  rowId: string;
  brandId: string;
  enabled: boolean;
  modelId: string[];
  notes: string;
  isActive: boolean;
};

type SearchableSelectOption = {
  _id: string;
  name: string;
  subtitle?: string;
};

type SearchableSingleSelectProps = {
  label?: string;
  required?: boolean;
  placeholder: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type ModelCheckboxSelectorProps = {
  options: SearchableSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  emptyText: string;
  allLabel: string;
};

type ProductCompatibilityCreatePageProps = {
  mode?: "create" | "edit";
  compatibilityId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const ROWS_PER_PAGE = 5;

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object"
  ) {
    const response = error.response as {
      data?: {
        message?: string;
      };
    };

    if (response.data?.message) return response.data.message;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}

function normalizeRole(role?: string | null) {
  return String(role ?? "").trim().toUpperCase();
}

function getRoleBasePath(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "MASTER_ADMIN") return "/master";
  if (normalizedRole === "MANAGER") return "/manager";
  if (normalizedRole === "SUPERVISOR") return "/supervisor";
  if (normalizedRole === "STAFF") return "/staff";

  return "/master";
}

function normalizeSubCategories(
  response: SubCategoryListResponse
): SubCategoryItem[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.subCategories)) return response.subCategories;
  return [];
}

function normalizeBrands(response: BrandListResponse): BrandItem[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.brands)) return response.brands;
  return [];
}

function normalizeModels(response: ModelListResponse): ModelItem[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.models)) return response.models;
  return [];
}

function normalizeCompatibility(
  response: ProductCompatibilityResponse
): ProductCompatibilityItem | null {
  if (response?.data) return response.data;
  if (response?.productCompatibility) return response.productCompatibility;
  return null;
}

function getBrandIdFromModel(item: ModelItem) {
  if (!item.brandId) return "";
  if (typeof item.brandId === "string") return String(item.brandId);
  return String(item.brandId?._id || "");
}

function getObjectId(
  value?:
    | string
    | {
        _id?: string;
        name?: string;
      }
    | null
) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || "");
}

function getModelIds(
  values?: Array<
    | string
    | {
        _id?: string;
        name?: string;
      }
  >
) {
  if (!Array.isArray(values)) return [];

  return values
    .map((item) => {
      if (typeof item === "string") return item;
      return String(item?._id || "");
    })
    .filter(Boolean);
}

function SearchableSingleSelect({
  label,
  required = false,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
}: SearchableSingleSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => options.find((item) => item._id === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return options;

    return options.filter((item) => {
      const name = item.name.toLowerCase();
      const subtitle = (item.subtitle || "").toLowerCase();

      return name.includes(q) || subtitle.includes(q);
    });
  }, [options, search]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return;

          setOpen((prev) => {
            if (prev) setSearch("");
            return !prev;
          });
        }}
        className={[
          "relative flex h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 pb-1.5 pt-5 text-left text-sm font-semibold outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          open
            ? "border-[#00008b] ring-4 ring-[#00008b]/10"
            : "border-slate-200 hover:border-[#00008b]",
        ].join(" ")}
      >
        {label ? (
          <span className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            {label}
            {required ? <span className="text-rose-500"> *</span> : null}
          </span>
        ) : null}

        <span
          className={
            selected ? "truncate text-slate-900" : "truncate text-slate-400"
          }
        >
          {selected ? selected.name : placeholder}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-9999 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                ref={inputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpen(false);
                    setSearch("");
                  }
                }}
                placeholder={`Search ${label?.toLowerCase() || "option"}...`}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:bg-white focus:ring-4 focus:ring-[#00008b]/10"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2" role="listbox">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const active = item._id === value;

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => {
                      onChange(item._id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition",
                      active
                        ? "bg-[#00008b]/5 text-[#00008b]"
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{item.name}</div>

                      {item.subtitle ? (
                        <div className="truncate text-xs font-semibold text-slate-400">
                          {item.subtitle}
                        </div>
                      ) : null}
                    </div>

                    {active ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00008b] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-400">
                No results found
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModelCheckboxSelector({
  options,
  values,
  onChange,
  disabled = false,
  emptyText,
  allLabel,
}: ModelCheckboxSelectorProps) {
  const optionIds = options.map((item) => item._id);

  const allSelected =
    optionIds.length > 0 && optionIds.every((id) => values.includes(id));

  function toggleOne(id: string) {
    if (disabled) return;

    if (values.includes(id)) {
      onChange(values.filter((item) => item !== id));
      return;
    }

    onChange([...values, id]);
  }

  function toggleAll() {
    if (disabled || !optionIds.length) return;

    if (allSelected) {
      onChange(values.filter((id) => !optionIds.includes(id)));
      return;
    }

    onChange(Array.from(new Set([...values, ...optionIds])));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      {disabled ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-400">
          {emptyText}
        </div>
      ) : options.length > 0 ? (
        <div className="space-y-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
            />
            {allLabel}
          </label>

          <div className="flex flex-wrap gap-2">
            {options.map((item) => {
              const checked = values.includes(item._id);

              return (
                <label
                  key={item._id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
                    checked
                      ? "border-[#00008b] bg-[#00008b] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(item._id)}
                    className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                  />
                  <span>{item.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-400">
          No models found
        </div>
      )}
    </div>
  );
}

export default function ProductCompatibilityCreatePage({
  mode = "create",
  compatibilityId = "",
  isModal = false,
  onClose,
  onSuccess,
}: ProductCompatibilityCreatePageProps) {
  const router = useRouter();
  const { role } = useAuth();

  const isEditMode = mode === "edit";
  const basePath = getRoleBasePath(role);
  const listPath = `${basePath}/compatibility/list`;

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const [subCategories, setSubCategories] = useState<SubCategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);

  const [subCategoryId, setSubCategoryId] = useState("");
  const [productBrandId, setProductBrandId] = useState("");

  const [rows, setRows] = useState<CompatibilityRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [brandSearch, setBrandSearch] = useState("");

  function handleClose() {
    if (isModal && onClose) {
      onClose();
      return;
    }

    router.push(listPath);
  }

  async function handleSuccess() {
    if (isModal && onSuccess) {
      await onSuccess();
      return;
    }

    router.push(listPath);
  }

  const fetchInitialData = useCallback(async () => {
    if (isEditMode && !compatibilityId) {
      toast.error("Compatibility ID is missing");
      handleClose();
      return;
    }

    try {
      setBootLoading(true);

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        "";

      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          }
        : {
            Accept: "application/json",
          };

      const baseResponses = await Promise.all([
        apiClient.get<SubCategoryListResponse>(SummaryApi.sub_category_list.url, {
          headers,
        }),
        apiClient.get<BrandListResponse>(SummaryApi.brand_list.url, {
          headers,
        }),
        apiClient.get<ModelListResponse>(SummaryApi.model_list.url, {
          headers,
        }),
      ]);

      const subCategoryList = normalizeSubCategories(
        baseResponses[0].data
      ).filter((item) => item.isActive !== false);

      const brandList = normalizeBrands(baseResponses[1].data).filter(
        (item) => item.isActive !== false
      );

      const modelList = normalizeModels(baseResponses[2].data).filter(
        (item) => item.isActive !== false
      );

      setSubCategories(subCategoryList);
      setBrands(brandList);
      setModels(modelList);

      if (isEditMode && compatibilityId) {
        const compatibilityResponse =
          await apiClient.get<ProductCompatibilityResponse>(
            SummaryApi.product_compatibility_get.url(compatibilityId),
            { headers }
          );

        const compatibility = normalizeCompatibility(
          compatibilityResponse.data
        );

        if (!compatibility?._id) {
          throw new Error("Compatibility details not found");
        }

        setSubCategoryId(
          getObjectId(compatibility.subCategoryId || compatibility.productTypeId)
        );

        setProductBrandId(getObjectId(compatibility.productBrandId));

        const compatibleMap = new Map<
          string,
          {
            modelId: string[];
            notes: string;
            isActive: boolean;
          }
        >();

        (compatibility.compatible || []).forEach((item) => {
          const resolvedBrandId = getObjectId(item.brandId);
          if (!resolvedBrandId) return;

          compatibleMap.set(resolvedBrandId, {
            modelId: getModelIds(item.modelId),
            notes: item.notes || "",
            isActive: item.isActive !== false,
          });
        });

        setRows(
          brandList.map((brand) => {
            const existing = compatibleMap.get(brand._id);

            return {
              rowId: brand._id,
              brandId: brand._id,
              enabled: Boolean(existing),
              modelId: existing?.modelId || [],
              notes: existing?.notes || "",
              isActive: existing?.isActive ?? true,
            };
          })
        );

        return;
      }

      setSubCategoryId("");
      setProductBrandId("");

      setRows(
        brandList.map((brand) => ({
          rowId: brand._id,
          brandId: brand._id,
          enabled: false,
          modelId: [],
          notes: "",
          isActive: true,
        }))
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          isEditMode
            ? "Failed to load compatibility"
            : "Failed to load form data"
        )
      );

      setSubCategories([]);
      setBrands([]);
      setModels([]);
      setRows([]);
    } finally {
      setBootLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, compatibilityId]);

  useEffect(() => {
    void fetchInitialData();
  }, [fetchInitialData]);

  const subCategoryOptions = useMemo<SearchableSelectOption[]>(
    () =>
      subCategories.map((item) => ({
        _id: item._id,
        name: item.name,
        subtitle: item.nameKey || "",
      })),
    [subCategories]
  );

  const brandOptions = useMemo<SearchableSelectOption[]>(
    () =>
      brands.map((item) => ({
        _id: item._id,
        name: item.name,
        subtitle: item.nameKey || "",
      })),
    [brands]
  );

  const brandMap = useMemo(() => {
    const map = new Map<string, BrandItem>();

    brands.forEach((item) => map.set(item._id, item));

    return map;
  }, [brands]);

  const modelMap = useMemo(() => {
    const map = new Map<string, ModelItem>();

    models.forEach((item) => map.set(item._id, item));

    return map;
  }, [models]);

  const modelMapByBrand = useMemo(() => {
    const map = new Map<string, ModelItem[]>();

    models.forEach((item) => {
      const resolvedBrandId = getBrandIdFromModel(item);
      if (!resolvedBrandId) return;

      const existing = map.get(resolvedBrandId) || [];
      existing.push(item);
      map.set(resolvedBrandId, existing);
    });

    return map;
  }, [models]);

  const filteredRows = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((row) => {
      const brandName = brandMap.get(row.brandId)?.name || "";
      return brandName.toLowerCase().includes(q);
    });
  }, [rows, brandSearch, brandMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [brandSearch]);

  const selectedSummary = useMemo(() => {
    return rows
      .filter((row) => row.enabled)
      .map((row) => {
        const brandName = brandMap.get(row.brandId)?.name || "-";

        const selectedModels = row.modelId
          .map((id) => modelMap.get(id)?.name)
          .filter(Boolean) as string[];

        return {
          brandId: row.brandId,
          brandName,
          models: selectedModels,
          notes: row.notes.trim(),
        };
      });
  }, [rows, brandMap, modelMap]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ROWS_PER_PAGE;

  const paginatedRows = filteredRows.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE
  );

  const showingFrom = totalRows === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + ROWS_PER_PAGE, totalRows);

  function updateRow(rowId: string, patch: Partial<CompatibilityRow>) {
    setRows((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;

        const next: CompatibilityRow = {
          ...item,
          ...patch,
        };

        if (patch.enabled === false) {
          next.modelId = [];
          next.notes = "";
        }

        return next;
      })
    );
  }

  function validateForm() {
    if (!subCategoryId) {
      toast.error("Please select sub category");
      return false;
    }

    if (!productBrandId) {
      toast.error("Please select product brand");
      return false;
    }

    const validRows = rows.filter((item) => item.enabled);

    if (!validRows.length) {
      toast.error("Please select at least one compatible brand");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    if (isEditMode && !compatibilityId) {
      toast.error("Compatibility ID is missing");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        subCategoryId,
        productBrandId,
        compatible: rows
          .filter((item) => item.enabled)
          .map((item, index) => ({
            brandId: item.brandId,
            modelId: item.modelId,
            notes: item.notes.trim(),
            sortOrder: index,
            isActive: item.isActive,
          })),
      };

      const response =
        isEditMode && compatibilityId
          ? await apiClient.put(
              SummaryApi.product_compatibility_update.url(compatibilityId),
              payload
            )
          : await apiClient.post(
              SummaryApi.product_compatibility_create.url,
              payload
            );

      if (!response?.data?.success) {
        throw new Error(
          response?.data?.message ||
            (isEditMode ? "Update failed" : "Create failed")
        );
      }

      toast.success(
        response?.data?.message ||
          (isEditMode
            ? "Product compatibility updated successfully"
            : "Product compatibility created successfully")
      );

      await handleSuccess();
    } catch (error) {
      toast.error(
        getErrorMessage(error, isEditMode ? "Update failed" : "Create failed")
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    if (isEditMode) {
      void fetchInitialData();
      return;
    }

    setSubCategoryId("");
    setProductBrandId("");
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        enabled: false,
        modelId: [],
        notes: "",
        isActive: true,
      }))
    );
    setBrandSearch("");
    setCurrentPage(1);
  }

  if (bootLoading) {
    return (
      <div
        className={
          isModal
            ? "bg-slate-50 px-3 py-4 sm:px-4"
            : "min-h-screen bg-[radial-gradient(circle_at_top_left,#e8ecff_0,#f7f8fc_34%,#f8fafc_100%)] px-3 py-4 sm:px-4 lg:px-6"
        }
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center rounded-[26px] border border-slate-200 bg-white py-14 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-black">
              {isEditMode
                ? "Loading compatibility details..."
                : "Loading compatibility form..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isModal
          ? "max-h-[90vh] overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4 lg:px-5"
          : "min-h-screen bg-[radial-gradient(circle_at_top_left,#e8ecff_0,#f7f8fc_34%,#f8fafc_100%)] px-3 py-4 sm:px-4 lg:px-6"
      }
    >
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <section className="relative overflow-hidden rounded-card border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-5">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#00008b]/10 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-[#ec0677]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isModal ? (
                <X className="h-4 w-4" />
              ) : (
                <ArrowLeft className="h-4 w-4" />
              )}
              {isModal ? "Close" : "Back to List"}
            </button>

            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#00008b]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Compatibility Management
              </span>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {isEditMode
                  ? "Edit Product Compatibility"
                  : "Create Product Compatibility"}
              </h1>

              <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Map one sub category and product brand with compatible brands
                and selected models.
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] md:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
                  <Shapes className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Basic Details
                  </h2>
                  <p className="text-sm font-semibold leading-6 text-slate-500">
                    Select sub category and product brand before mapping
                    compatibility.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SearchableSingleSelect
                  label="Sub Category"
                  required
                  placeholder="Select sub category"
                  options={subCategoryOptions}
                  value={subCategoryId}
                  onChange={setSubCategoryId}
                  disabled={loading}
                />

                <SearchableSingleSelect
                  label="Product Brand"
                  required
                  placeholder="Select product brand"
                  options={brandOptions}
                  value={productBrandId}
                  onChange={setProductBrandId}
                  disabled={loading}
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] md:p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-950">
                      Compatible Brands & Models
                    </h2>
                    <p className="text-sm font-semibold leading-6 text-slate-500">
                      Enable compatible brands, select models, and add optional
                      notes.
                    </p>
                  </div>
                </div>

                <div className="relative w-full lg:max-w-xs">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(event) => setBrandSearch(event.target.value)}
                    placeholder="Search compatible brand..."
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:bg-white focus:ring-4 focus:ring-[#00008b]/10"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row) => {
                    const brand = brandMap.get(row.brandId);
                    const brandName = brand?.name || "-";

                    const brandModels = (
                      modelMapByBrand.get(row.brandId) || []
                    ).map((item) => ({
                      _id: item._id,
                      name: item.name,
                      subtitle: item.nameKey || "",
                    }));

                    return (
                      <div
                        key={row.rowId}
                        className="rounded-[22px] border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="inline-flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(event) =>
                                  updateRow(row.rowId, {
                                    enabled: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                                disabled={loading}
                              />

                              <span className="text-sm font-black text-slate-900">
                                {brandName}
                              </span>
                            </label>

                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${
                                  row.enabled
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {row.enabled ? "Enabled" : "Disabled"}
                              </span>

                              {row.enabled ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateRow(row.rowId, {
                                      modelId: [],
                                      notes: "",
                                      enabled: false,
                                    })
                                  }
                                  className="inline-flex h-8 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Clear
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <ModelCheckboxSelector
                            options={brandModels}
                            values={row.modelId}
                            onChange={(values) =>
                              updateRow(row.rowId, { modelId: values })
                            }
                            disabled={!row.enabled || loading}
                            emptyText={
                              row.enabled
                                ? "No models available for this brand"
                                : "Enable this brand to select models"
                            }
                            allLabel="Select all models"
                          />

                          <div>
                            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                              Notes
                            </label>

                            <textarea
                              rows={3}
                              value={row.notes}
                              onChange={(event) =>
                                updateRow(row.rowId, {
                                  notes: event.target.value,
                                })
                              }
                              disabled={!row.enabled || loading}
                              placeholder="Optional notes for this compatible brand"
                              className="min-h-20 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-2 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-500">
                      No compatible brands found
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  Showing{" "}
                  <span className="font-black text-slate-950">
                    {showingFrom}
                  </span>{" "}
                  to{" "}
                  <span className="font-black text-slate-950">{showingTo}</span>{" "}
                  of{" "}
                  <span className="font-black text-slate-950">{totalRows}</span>{" "}
                  brands
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={safeCurrentPage === 1 || totalRows === 0}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>

                  <span className="inline-flex h-10 min-w-20 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700">
                    {totalRows === 0 ? 0 : safeCurrentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(totalPages, prev + 1)
                      )
                    }
                    disabled={
                      safeCurrentPage === totalPages || totalRows === 0
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-4">
            <section className="sticky top-4 rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] md:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Selected Summary
                  </h2>
                  <p className="text-sm font-semibold leading-6 text-slate-500">
                    Review selected mapping before saving.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Sub Category
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-900">
                    {subCategoryOptions.find(
                      (item) => item._id === subCategoryId
                    )?.name || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Product Brand
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-900">
                    {brandOptions.find((item) => item._id === productBrandId)
                      ?.name || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Compatible Brands
                  </p>

                  {selectedSummary.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {selectedSummary.map((item) => (
                        <div
                          key={item.brandId}
                          className="rounded-2xl border border-slate-200 bg-white p-3"
                        >
                          <p className="text-sm font-black text-slate-900">
                            {item.brandName}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Models:{" "}
                            {item.models.length
                              ? item.models.join(", ")
                              : "No specific models selected"}
                          </p>

                          {item.notes ? (
                            <p className="mt-1 text-xs font-semibold text-slate-600">
                              Notes: {item.notes}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      No compatible brands selected yet.
                    </p>
                  )}
                </div>

                <div className="sticky bottom-3 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xl">
                  <div className="flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,139,0.22)] transition hover:bg-[#000070] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {isEditMode
                            ? "Update Compatibility"
                            : "Create Compatibility"}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={loading}
                      className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={loading}
                      className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}