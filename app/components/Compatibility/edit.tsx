"use client";

import React, {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  Shapes,
  ShieldCheck,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type ProductTypeItem = {
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

type ProductTypeListResponse = {
  success?: boolean;
  message?: string;
  data?: ProductTypeItem[];
  productTypes?: ProductTypeItem[];
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

function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong"
): string {
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

function normalizeProductTypes(
  response: ProductTypeListResponse
): ProductTypeItem[] {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.productTypes)) return response.productTypes;
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

function getBrandIdFromModel(item: ModelItem): string {
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
): string {
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
): string[] {
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

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target)) {
        setOpen(false);
        setSearch("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };

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
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      <div className={`relative ${open ? "z-9999" : "z-10"}`}>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
            if (open) setSearch("");
          }}
          className="flex h-14 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 pb-2 pt-6 text-left text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <span className={selected ? "text-slate-900" : "text-slate-400"}>
            {selected ? selected.name : placeholder}
          </span>
          <span className="text-slate-400">{open ? "▲" : "▼"}</span>
        </button>

        {label ? (
          <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500">
            {label} {required ? <span className="text-rose-500">*</span> : null}
          </label>
        ) : null}

        {open ? (
          <div className="absolute left-0 right-0 top-full z-9999 mt-2 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-200 p-3">
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setSearch("");
                  }
                }}
                placeholder={`Search ${label?.toLowerCase() || "option"}`}
                className="premium-input h-11"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-2" role="listbox">
              {filtered.length ? (
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
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.name}</div>
                        {item.subtitle ? (
                          <div className="truncate text-xs text-slate-400">
                            {item.subtitle}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  No results found
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
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

  const toggleOne = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter((item) => item !== id));
      return;
    }

    onChange([...values, id]);
  };

  const toggleAll = () => {
    if (!optionIds.length) return;

    if (allSelected) {
      onChange(values.filter((id) => !optionIds.includes(id)));
      return;
    }

    onChange(Array.from(new Set([...values, ...optionIds])));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {disabled ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center text-sm text-slate-400">
          {emptyText}
        </div>
      ) : options.length ? (
        <div className="space-y-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            {allLabel}
          </label>

          <div className="flex flex-wrap gap-3">
            {options.map((item) => {
              const checked = values.includes(item._id);

              return (
                <label
                  key={item._id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    checked
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-sky-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(item._id)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>{item.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center text-sm text-slate-400">
          No models found
        </div>
      )}
    </div>
  );
}

const ROWS_PER_PAGE = 5;

export default function ProductCompatibilityEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);
  const compatibilityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const [productTypes, setProductTypes] = useState<ProductTypeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);

  const [productTypeId, setProductTypeId] = useState("");
  const [productBrandId, setProductBrandId] = useState("");

  const [rows, setRows] = useState<CompatibilityRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [brandSearch, setBrandSearch] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!compatibilityId) {
        toast.error("Compatibility ID is missing");
        router.push(`${basePath}/compatibility/list`);
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

        const [productTypeRes, brandRes, modelRes, compatibilityRes] =
          await Promise.all([
            apiClient.get<ProductTypeListResponse>(
              SummaryApi.product_type_list.url,
              { headers }
            ),
            apiClient.get<BrandListResponse>(SummaryApi.brand_list.url, {
              headers,
            }),
            apiClient.get<ModelListResponse>(SummaryApi.model_list.url, {
              headers,
            }),
            apiClient.get<ProductCompatibilityResponse>(
              SummaryApi.product_compatibility_get.url(compatibilityId),
              { headers }
            ),
          ]);

        const productTypeList = normalizeProductTypes(productTypeRes.data).filter(
          (item) => item.isActive !== false
        );
        const brandList = normalizeBrands(brandRes.data).filter(
          (item) => item.isActive !== false
        );
        const modelList = normalizeModels(modelRes.data).filter(
          (item) => item.isActive !== false
        );

        const compatibility = normalizeCompatibility(compatibilityRes.data);

        if (!compatibility?._id) {
          throw new Error("Compatibility details not found");
        }

        setProductTypes(productTypeList);
        setBrands(brandList);
        setModels(modelList);

        setProductTypeId(getObjectId(compatibility.productTypeId));
        setProductBrandId(getObjectId(compatibility.productBrandId));

        const compatibleMap = new Map<
          string,
          {
            brandId: string;
            modelId: string[];
            notes: string;
            isActive: boolean;
          }
        >();

        (compatibility.compatible || []).forEach((item) => {
          const brandId = getObjectId(item.brandId);
          if (!brandId) return;

          compatibleMap.set(brandId, {
            brandId,
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
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to load compatibility"));
        setProductTypes([]);
        setBrands([]);
        setModels([]);
        setRows([]);
      } finally {
        setBootLoading(false);
      }
    };

    void fetchInitialData();
  }, [compatibilityId, router, basePath]);

  const productTypeOptions = useMemo<SearchableSelectOption[]>(
    () =>
      productTypes.map((item) => ({
        _id: item._id,
        name: item.name,
        subtitle: item.nameKey || "",
      })),
    [productTypes]
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
      const brandId = getBrandIdFromModel(item);
      if (!brandId) return;

      const existing = map.get(brandId) || [];
      existing.push(item);
      map.set(brandId, existing);
    });

    return map;
  }, [models]);

  const updateRow = (rowId: string, patch: Partial<CompatibilityRow>) => {
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
  };

  const validateForm = () => {
    if (!productTypeId) {
      toast.error("Please select product type");
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
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!compatibilityId) {
      toast.error("Compatibility ID is missing");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        productTypeId,
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

      const response = await apiClient.put(
        SummaryApi.product_compatibility_update.url(compatibilityId),
        payload
      );

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Update failed");
      }

      toast.success(
        response?.data?.message || "Product compatibility updated successfully"
      );
      router.push(`${basePath}/compatibility/list`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Update failed"));
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="page-shell">
            <div className="mx-auto w-full max-w-7xl space-y-5">


        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
              <ShieldCheck className="h-3.5 w-3.5" />
              Compatibility Management
            </span>

            <div className="mt-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Edit Product Compatibility
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Update one product type and one product brand to compatible
                brands and models.
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="relative z-30 premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Shapes className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="text-sm text-slate-500">
                  Select the main product type and main product brand.
                </p>
              </div>
            </div>

            {bootLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading form data.
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                <SearchableSingleSelect
                  label="Product Type"
                  required
                  placeholder="Select product type"
                  options={productTypeOptions}
                  value={productTypeId}
                  onChange={setProductTypeId}
                />

                <SearchableSingleSelect
                  label="Product Brand"
                  required
                  placeholder="Select product brand"
                  options={brandOptions}
                  value={productBrandId}
                  onChange={setProductBrandId}
                />
              </div>
            )}
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="relative z-20 premium-card-solid rounded-[28px] p-4 md:p-5">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Compatible Brands & Models
                  </h2>
                  <p className="text-sm text-slate-500">
                    Search brand name, then select model list.
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Search compatible brand name"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pb-2 pl-11 pr-11 pt-6 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                />
                <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500">
                  Compatibility Search
                </label>
                {brandSearch ? (
                    <button
                      type="button"
                      onClick={() => setBrandSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                          S.No
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                          Compatible Brand *
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                          Compatible Models
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                          Notes
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedRows.length ? (
                        paginatedRows.map((row, index) => {
                          const brand = brandMap.get(row.brandId);
                          const modelOptions = (modelMapByBrand.get(row.brandId) || []).map(
                            (item) => ({
                              _id: item._id,
                              name: item.name,
                              subtitle: item.nameKey || "",
                            })
                          );

                          return (
                            <tr key={row.rowId} className="align-top">
                              <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                                {startIndex + index + 1}
                              </td>

                              <td className="px-4 py-4">
                                <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={row.enabled}
                                    onChange={(e) =>
                                      updateRow(row.rowId, {
                                        enabled: e.target.checked,
                                      })
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                  />
                                  <span>{brand?.name || "-"}</span>
                                </label>
                              </td>

                              <td className="px-4 py-4">
                                <ModelCheckboxSelector
                                  options={modelOptions}
                                  values={row.modelId}
                                  onChange={(values) =>
                                    updateRow(row.rowId, { modelId: values })
                                  }
                                  disabled={!row.enabled}
                                  emptyText="Select compatible brand first"
                                  allLabel="All models"
                                />
                              </td>

                              <td className="px-4 py-4">
                                <textarea
                                  value={row.notes}
                                  onChange={(e) =>
                                    updateRow(row.rowId, {
                                      notes: e.target.value,
                                    })
                                  }
                                  disabled={!row.enabled}
                                  rows={4}
                                  placeholder="Enter notes"
                                  className="premium-input min-h-30 resize-y disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-10 text-center text-sm text-slate-400"
                          >
                            No compatible brands found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {showingFrom} to {showingTo} of {totalRows} brands
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={safeCurrentPage === 1}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>

                    <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                      {safeCurrentPage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={safeCurrentPage === totalPages}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <aside className="premium-card-solid rounded-[28px] p-4 md:p-5">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                  <Save className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Selected Summary
                  </h2>
                  <p className="text-sm text-slate-500">
                    Preview selected compatible brands and models.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedSummary.length ? (
                  selectedSummary.map((item) => (
                    <div
                      key={item.brandId}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <h3 className="text-sm font-bold text-slate-900">
                        {item.brandName}
                      </h3>

                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Models
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.models.length ? item.models.join(", ") : "All / None selected"}
                      </p>

                      {item.notes ? (
                        <>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Notes
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{item.notes}</p>
                        </>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                    No compatible brands selected yet
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading || bootLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Compatibility
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`${basePath}/compatibility/list`)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
                </button>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
