"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Check,
  ChevronDown,
  Cpu,
  FolderTree,
  Info,
  Layers3,
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Search,
  Shapes,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type OptionItem = {
  _id: string;
  id?: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
};

type ModelItem = {
  _id: string;
  id?: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
  brandId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
};

type VariantItem = {
  label: string;
  value: string;
};

type ProductInformationField = {
  label: string;
  value: string;
};

type ProductInformationSection = {
  title: string;
  fields: ProductInformationField[];
};

type CompatibilityTableRow = {
  rowId: string;
  brandId: string;
  enabled: boolean;
  modelId: string[];
  notes: string;
  isActive: boolean;
};

type ProductPayload = {
  itemName: string;
  itemModelNumber: string;
  itemKey: string;
  searchKeys: string[];
  masterCategoryId: string;
  categoryId: string;
  subcategoryId: string;
  productTypeId: string;
  brandId: string;
  modelId: string;
  images: [];
  compatible: Array<{
    brandId: string;
    modelId: string[];
    notes: string;
    isActive: boolean;
  }>;
  variant: Array<{
    label: string;
    value: string;
  }>;
  productInformation: Array<{
    title: string;
    fields: Array<{
      label: string;
      value: string;
    }>;
  }>;
  isActive: boolean;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  categories?: T;
  masterCategories?: T;
  productTypes?: T;
  brands?: T;
  models?: T;
};

type DropdownConfig = {
  key:
    | "masterCategoryId"
    | "categoryId"
    | "subcategoryId"
    | "productTypeId"
    | "brandId"
    | "modelId";
  label: string;
  placeholder: string;
  icon: ComponentType<{ className?: string }>;
  options: OptionItem[];
  value: string;
  search: string;
  open: boolean;
  loading: boolean;
  disabled?: boolean;
};

type SearchableSelectOption = {
  _id: string;
  name: string;
  subtitle?: string;
};

type ModelCheckboxSelectorProps = {
  options: SearchableSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  emptyText: string;
  allLabel: string;
};

const ROWS_PER_PAGE = 5;

const initialVariant: VariantItem = {
  label: "",
  value: "",
};

const initialProductInfoSection: ProductInformationSection = {
  title: "",
  fields: [{ label: "", value: "" }],
};

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

function keyOf(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "-");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;

    return response?.data?.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function toOptionArray(value: unknown): OptionItem[] {
  return Array.isArray(value) ? (value as OptionItem[]) : [];
}

function toModelArray(value: unknown): ModelItem[] {
  return Array.isArray(value) ? (value as ModelItem[]) : [];
}

function filterActive<T extends { isActive?: boolean }>(items: T[]) {
  return items.filter((item) => item.isActive !== false);
}

function isFilledVariant(item: VariantItem) {
  return item.label.trim() && item.value.trim();
}

function isFilledInfoField(field: ProductInformationField) {
  return field.label.trim() && field.value.trim();
}

function getBrandIdFromModel(item: ModelItem): string {
  if (!item.brandId) return "";
  if (typeof item.brandId === "string") return String(item.brandId);
  return String(item.brandId?._id || "");
}

function normalizeSearchKeys(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function ProductDropdown({
  config,
  onToggle,
  onSearchChange,
  onSelect,
  dropdownRef,
  searchInputRef,
}: {
  config: DropdownConfig;
  onToggle: (key: DropdownConfig["key"]) => void;
  onSearchChange: (key: DropdownConfig["key"], value: string) => void;
  onSelect: (key: DropdownConfig["key"], value: string) => void;
  dropdownRef?: RefObject<HTMLDivElement | null>;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const Icon = config.icon;
  const query = config.search.trim().toLowerCase();

  const filteredOptions = query
    ? config.options.filter((item) =>
        item.name.toLowerCase().includes(query)
      )
    : config.options;

  const selectedItem =
    config.options.find((item) => item._id === config.value) || null;

  return (
    <div>
      <label className="premium-label">
        {config.label} <span className="text-rose-500">*</span>
      </label>

      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => onToggle(config.key)}
          disabled={config.loading || config.disabled}
          className="premium-select flex items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">
              {config.loading
                ? "Loading..."
                : selectedItem?.name || config.placeholder}
            </span>
          </div>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              config.open ? "rotate-180" : ""
            }`}
          />
        </button>

        {config.open && !config.loading ? (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-200 p-3">
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={config.search}
                  onChange={(e) => onSearchChange(config.key, e.target.value)}
                  placeholder={`Search ${config.label.toLowerCase()}`}
                  className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((item) => {
                  const isSelected = config.value === item._id;

                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => onSelect(config.key, item._id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        isSelected
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-sm text-slate-400">
                  No {config.label.toLowerCase()} found
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
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      {disabled ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
          {emptyText}
        </div>
      ) : options.length ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              {allLabel}
            </label>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {values.length ? `${values.length} selected` : "No models selected"}
            </span>
          </div>

          <div className="max-h-28 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              {options.map((item) => {
                const checked = values.includes(item._id);

                return (
                  <label
                    key={item._id}
                    className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
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
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
          No models found
        </div>
      )}
    </div>
  );
}

export default function CreateProductPage() {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);

  const [submitting, setSubmitting] = useState(false);

  const [itemName, setItemName] = useState("");
  const [itemModelNumber, setItemModelNumber] = useState("");
  const [itemKey, setItemKey] = useState("");
  const [searchKeysInput, setSearchKeysInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [masterCategories, setMasterCategories] = useState<OptionItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [subcategories, setSubcategories] = useState<OptionItem[]>([]);
  const [productTypes, setProductTypes] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);

  const [masterCategoryId, setMasterCategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");

  const [loadingMasterCategories, setLoadingMasterCategories] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingProductTypes, setLoadingProductTypes] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);

  const [openDropdown, setOpenDropdown] =
    useState<DropdownConfig["key"] | null>(null);
  const [searchMap, setSearchMap] = useState<
    Record<DropdownConfig["key"], string>
  >({
    masterCategoryId: "",
    categoryId: "",
    subcategoryId: "",
    productTypeId: "",
    brandId: "",
    modelId: "",
  });

  const [variant, setVariant] = useState<VariantItem[]>([{ ...initialVariant }]);
  const [productInformation, setProductInformation] = useState<
    ProductInformationSection[]
  >([{ ...initialProductInfoSection }]);

  const [compatibilityRows, setCompatibilityRows] = useState<
    CompatibilityTableRow[]
  >([]);
  const [compatibilityBrandSearch, setCompatibilityBrandSearch] = useState("");
  const [compatibilityCurrentPage, setCompatibilityCurrentPage] = useState(1);

  const dropdownRefs = {
    masterCategoryId: useRef<HTMLDivElement | null>(null),
    categoryId: useRef<HTMLDivElement | null>(null),
    subcategoryId: useRef<HTMLDivElement | null>(null),
    productTypeId: useRef<HTMLDivElement | null>(null),
    brandId: useRef<HTMLDivElement | null>(null),
    modelId: useRef<HTMLDivElement | null>(null),
  };

  const searchInputRefs = {
    masterCategoryId: useRef<HTMLInputElement | null>(null),
    categoryId: useRef<HTMLInputElement | null>(null),
    subcategoryId: useRef<HTMLInputElement | null>(null),
    productTypeId: useRef<HTMLInputElement | null>(null),
    brandId: useRef<HTMLInputElement | null>(null),
    modelId: useRef<HTMLInputElement | null>(null),
  };

  const autoItemKey = useMemo(() => {
    const combined = [itemName, itemModelNumber].filter(Boolean).join(" ");
    return keyOf(combined);
  }, [itemName, itemModelNumber]);

  const itemKeyPreview = itemKey.trim() ? keyOf(itemKey) : autoItemKey;

  const selectedProductBrandName = useMemo(() => {
    return brands.find((item) => item._id === brandId)?.name || "";
  }, [brands, brandId]);

  const filteredPrimaryModelOptions = useMemo(() => {
    if (!brandId) return [];
    return models.filter((item) => getBrandIdFromModel(item) === brandId);
  }, [models, brandId]);

  const brandMap = useMemo(() => {
    const map = new Map<string, OptionItem>();
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
      const currentBrandId = getBrandIdFromModel(item);
      if (!currentBrandId) return;

      const existing = map.get(currentBrandId) || [];
      existing.push(item);
      map.set(currentBrandId, existing);
    });

    return map;
  }, [models]);

  const filteredCompatibilityRows = useMemo(() => {
    const q = compatibilityBrandSearch.trim().toLowerCase();
    if (!q) return compatibilityRows;

    return compatibilityRows.filter((row) => {
      const brandName = brandMap.get(row.brandId)?.name || "";
      return brandName.toLowerCase().includes(q);
    });
  }, [compatibilityRows, compatibilityBrandSearch, brandMap]);

  const selectedCompatibilitySummary = useMemo(() => {
    return compatibilityRows
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
          isActive: row.isActive,
        };
      });
  }, [compatibilityRows, brandMap, modelMap]);

  const totalCompatibilityRows = filteredCompatibilityRows.length;
  const totalCompatibilityPages = Math.max(
    1,
    Math.ceil(totalCompatibilityRows / ROWS_PER_PAGE)
  );
  const safeCompatibilityPage = Math.min(
    compatibilityCurrentPage,
    totalCompatibilityPages
  );
  const compatibilityStartIndex =
    (safeCompatibilityPage - 1) * ROWS_PER_PAGE;
  const paginatedCompatibilityRows = filteredCompatibilityRows.slice(
    compatibilityStartIndex,
    compatibilityStartIndex + ROWS_PER_PAGE
  );
  const showingFrom =
    totalCompatibilityRows === 0 ? 0 : compatibilityStartIndex + 1;
  const showingTo = Math.min(
    compatibilityStartIndex + ROWS_PER_PAGE,
    totalCompatibilityRows
  );

  useEffect(() => {
    void fetchInitialOptions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInside = Object.values(dropdownRefs).some((ref) =>
        ref.current?.contains(target)
      );

      if (!clickedInside) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!openDropdown) return;

    const inputRef = searchInputRefs[openDropdown];
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [openDropdown]);

  useEffect(() => {
    if (!masterCategoryId) {
      setCategories([]);
      setCategoryId("");
      return;
    }

    void fetchCategories(masterCategoryId);
  }, [masterCategoryId]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId("");
      return;
    }

    void fetchSubcategories(categoryId);
  }, [categoryId]);

  useEffect(() => {
    if (!subcategoryId) {
      setProductTypes([]);
      setProductTypeId("");
      return;
    }

    void fetchProductTypes(subcategoryId);
  }, [subcategoryId]);

  useEffect(() => {
    setCompatibilityCurrentPage(1);
  }, [compatibilityBrandSearch]);

  useEffect(() => {
    if (!brandId) {
      setModelId("");
      return;
    }

    const stillValid = filteredPrimaryModelOptions.some(
      (item) => item._id === modelId
    );

    if (!stillValid) {
      setModelId("");
    }
  }, [brandId, filteredPrimaryModelOptions, modelId]);

  async function fetchInitialOptions() {
    await Promise.all([
      fetchMasterCategories(),
      fetchBrandsAndSeedCompatibility(),
      fetchModels(),
    ]);
  }

  async function fetchMasterCategories() {
    try {
      setLoadingMasterCategories(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.master_category_list.url
      );

      const rows = filterActive(
        toOptionArray(
          res.data?.data || res.data?.categories || res.data?.masterCategories
        )
      );

      setMasterCategories(rows);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load master categories"));
      setMasterCategories([]);
    } finally {
      setLoadingMasterCategories(false);
    }
  }

  async function fetchCategories(selectedMasterCategoryId: string) {
    try {
      setLoadingCategories(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.category_list.url
      );

      const rows = filterActive(toOptionArray(res.data?.data)).filter(
        (item: OptionItem & { masterCategoryId?: string | { _id?: string } }) => {
          const value = item.masterCategoryId;
          if (typeof value === "string") return value === selectedMasterCategoryId;
          return value?._id === selectedMasterCategoryId;
        }
      );

      setCategories(rows);
      setCategoryId("");
      setSubcategoryId("");
      setProductTypeId("");
      setSubcategories([]);
      setProductTypes([]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load categories"));
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function fetchSubcategories(selectedCategoryId: string) {
    try {
      setLoadingSubcategories(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.sub_category_list.url
      );

      const rows = filterActive(toOptionArray(res.data?.data)).filter(
        (item: OptionItem & { categoryId?: string | { _id?: string } }) => {
          const value = item.categoryId;
          if (typeof value === "string") return value === selectedCategoryId;
          return value?._id === selectedCategoryId;
        }
      );

      setSubcategories(rows);
      setSubcategoryId("");
      setProductTypeId("");
      setProductTypes([]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load sub categories"));
      setSubcategories([]);
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function fetchProductTypes(selectedSubcategoryId: string) {
    try {
      setLoadingProductTypes(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.product_type_list.url
      );

      const rows = filterActive(
        toOptionArray(res.data?.data || res.data?.productTypes)
      ).filter(
        (item: OptionItem & { subCategoryId?: string | { _id?: string } }) => {
          const value = item.subCategoryId;
          if (typeof value === "string") return value === selectedSubcategoryId;
          return value?._id === selectedSubcategoryId;
        }
      );

      setProductTypes(rows);
      setProductTypeId("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load product types"));
      setProductTypes([]);
    } finally {
      setLoadingProductTypes(false);
    }
  }

  async function fetchBrandsAndSeedCompatibility() {
    try {
      setLoadingBrands(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.brand_list.url
      );

      const activeBrands = filterActive(
        toOptionArray(res.data?.data || res.data?.brands)
      );

      setBrands(activeBrands);
      setCompatibilityRows(
        activeBrands.map((brand) => ({
          rowId: brand._id,
          brandId: brand._id,
          enabled: false,
          modelId: [],
          notes: "",
          isActive: true,
        }))
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load brands"));
      setBrands([]);
      setCompatibilityRows([]);
    } finally {
      setLoadingBrands(false);
    }
  }

  async function fetchModels() {
    try {
      setLoadingModels(true);

      const res = await apiClient.get<ApiResponse<ModelItem[]>>(
        SummaryApi.model_list.url
      );

      setModels(filterActive(toModelArray(res.data?.data || res.data?.models)));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load models"));
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  function handleToggleDropdown(key: DropdownConfig["key"]) {
    setOpenDropdown((prev) => (prev === key ? null : key));
  }

  function handleSearchChange(key: DropdownConfig["key"], value: string) {
    setSearchMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSelectDropdownValue(
    key: DropdownConfig["key"],
    value: string
  ) {
    if (key === "masterCategoryId") setMasterCategoryId(value);
    if (key === "categoryId") setCategoryId(value);
    if (key === "subcategoryId") setSubcategoryId(value);
    if (key === "productTypeId") setProductTypeId(value);
    if (key === "brandId") setBrandId(value);
    if (key === "modelId") setModelId(value);

    setSearchMap((prev) => ({
      ...prev,
      [key]: "",
    }));

    setOpenDropdown(null);
  }

  function updateVariant(index: number, key: keyof VariantItem, value: string) {
    setVariant((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  }

  function addVariantRow() {
    setVariant((prev) => [...prev, { ...initialVariant }]);
  }

  function removeVariantRow(index: number) {
    setVariant((prev) => {
      if (prev.length === 1) return [{ ...initialVariant }];
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function addProductInfoSection() {
    setProductInformation((prev) => [
      ...prev,
      {
        title: "",
        fields: [{ label: "", value: "" }],
      },
    ]);
  }

  function removeProductInfoSection(index: number) {
    setProductInformation((prev) => {
      if (prev.length === 1) return [{ ...initialProductInfoSection }];
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function updateProductInfoSectionTitle(index: number, value: string) {
    setProductInformation((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, title: value } : item
      )
    );
  }

  function addProductInfoField(sectionIndex: number) {
    setProductInformation((prev) =>
      prev.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              fields: [...section.fields, { label: "", value: "" }],
            }
          : section
      )
    );
  }

  function removeProductInfoField(sectionIndex: number, fieldIndex: number) {
    setProductInformation((prev) =>
      prev.map((section, index) => {
        if (index !== sectionIndex) return section;

        if (section.fields.length === 1) {
          return {
            ...section,
            fields: [{ label: "", value: "" }],
          };
        }

        return {
          ...section,
          fields: section.fields.filter((_, idx) => idx !== fieldIndex),
        };
      })
    );
  }

  function updateProductInfoField(
    sectionIndex: number,
    fieldIndex: number,
    key: keyof ProductInformationField,
    value: string
  ) {
    setProductInformation((prev) =>
      prev.map((section, index) => {
        if (index !== sectionIndex) return section;

        return {
          ...section,
          fields: section.fields.map((field, idx) =>
            idx === fieldIndex ? { ...field, [key]: value } : field
          ),
        };
      })
    );
  }

  function updateCompatibilityRow(
    rowId: string,
    patch: Partial<CompatibilityTableRow>
  ) {
    setCompatibilityRows((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;

        const next: CompatibilityTableRow = {
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
    if (!itemName.trim()) {
      toast.error("Please enter product name");
      return false;
    }

    if (!itemModelNumber.trim()) {
      toast.error("Please enter model number");
      return false;
    }

    if (!masterCategoryId) {
      toast.error("Please select a master category");
      return false;
    }

    if (!categoryId) {
      toast.error("Please select a category");
      return false;
    }

    if (!subcategoryId) {
      toast.error("Please select a sub category");
      return false;
    }

    if (!productTypeId) {
      toast.error("Please select a product type");
      return false;
    }

    if (!brandId) {
      toast.error("Please select a brand");
      return false;
    }

    if (!modelId) {
      toast.error("Please select a model");
      return false;
    }

    const invalidVariant = variant.some(
      (item) =>
        Boolean(item.label.trim() || item.value.trim()) && !isFilledVariant(item)
    );

    if (invalidVariant) {
      toast.error("Each variant row must contain both label and value");
      return false;
    }

    const invalidProductInfo = productInformation.some((section) => {
      const hasPartialSection =
        section.title.trim() ||
        section.fields.some((field) => field.label.trim() || field.value.trim());

      if (!hasPartialSection) return false;
      if (!section.title.trim()) return true;

      return section.fields.some(
        (field) =>
          Boolean(field.label.trim() || field.value.trim()) &&
          !isFilledInfoField(field)
      );
    });

    if (invalidProductInfo) {
      toast.error(
        "Each product information section must have a title and complete fields"
      );
      return false;
    }

    const invalidCompatibility = compatibilityRows.some(
      (row) => row.enabled && row.modelId.length === 0
    );

    if (invalidCompatibility) {
      toast.error("Each selected compatible brand must have at least one model");
      return false;
    }

    return true;
  }

  function buildPayload(): ProductPayload {
    return {
      itemName: itemName.trim(),
      itemModelNumber: itemModelNumber.trim(),
      itemKey: itemKeyPreview,
      searchKeys: normalizeSearchKeys(searchKeysInput),
      masterCategoryId,
      categoryId,
      subcategoryId,
      productTypeId,
      brandId,
      modelId,
      images: [],
      compatible: compatibilityRows
        .filter((row) => row.enabled)
        .map((row) => ({
          brandId: row.brandId,
          modelId: row.modelId,
          notes: row.notes.trim(),
          isActive: row.isActive,
        })),
      variant: variant
        .filter((item) => item.label.trim() || item.value.trim())
        .map((item) => ({
          label: item.label.trim(),
          value: item.value.trim(),
        })),
      productInformation: productInformation
        .filter(
          (section) =>
            section.title.trim() ||
            section.fields.some(
              (field) => field.label.trim() || field.value.trim()
            )
        )
        .map((section) => ({
          title: section.title.trim(),
          fields: section.fields
            .filter((field) => field.label.trim() || field.value.trim())
            .map((field) => ({
              label: field.label.trim(),
              value: field.value.trim(),
            })),
        })),
      isActive,
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = buildPayload();

      const response = await apiClient.post<ApiResponse<unknown>>(
        SummaryApi.product_create.url,
        payload
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to create product");
      }

      toast.success(response.data?.message || "Product created successfully");
      router.push(`${basePath}/product/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create product"));
    } finally {
      setSubmitting(false);
    }
  }

  const dropdowns: DropdownConfig[] = [
    {
      key: "masterCategoryId",
      label: "Master Category",
      placeholder: "Select master category",
      icon: Layers3,
      options: masterCategories,
      value: masterCategoryId,
      search: searchMap.masterCategoryId,
      open: openDropdown === "masterCategoryId",
      loading: loadingMasterCategories,
    },
    {
      key: "categoryId",
      label: "Category",
      placeholder: "Select category",
      icon: Shapes,
      options: categories,
      value: categoryId,
      search: searchMap.categoryId,
      open: openDropdown === "categoryId",
      loading: loadingCategories,
      disabled: !masterCategoryId,
    },
    {
      key: "subcategoryId",
      label: "Sub Category",
      placeholder: "Select sub category",
      icon: FolderTree,
      options: subcategories,
      value: subcategoryId,
      search: searchMap.subcategoryId,
      open: openDropdown === "subcategoryId",
      loading: loadingSubcategories,
      disabled: !categoryId,
    },
    {
      key: "productTypeId",
      label: "Product Type",
      placeholder: "Select product type",
      icon: Boxes,
      options: productTypes,
      value: productTypeId,
      search: searchMap.productTypeId,
      open: openDropdown === "productTypeId",
      loading: loadingProductTypes,
      disabled: !subcategoryId,
    },
    {
      key: "brandId",
      label: "Brand",
      placeholder: "Select brand",
      icon: Tags,
      options: brands,
      value: brandId,
      search: searchMap.brandId,
      open: openDropdown === "brandId",
      loading: loadingBrands,
    },
    {
      key: "modelId",
      label: "Model",
      placeholder: brandId
        ? "Select model"
        : "Select brand first to choose model",
      icon: Cpu,
      options: filteredPrimaryModelOptions.map((item) => ({
        _id: item._id,
        name: item.name,
        isActive: item.isActive,
      })),
      value: modelId,
      search: searchMap.modelId,
      open: openDropdown === "modelId",
      loading: loadingModels,
      disabled: !brandId,
    },
  ];

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Product Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  Create Product
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  Create a product with category mapping, brand/model assignment,
                  search keys, variants, product information, and compatible
                  brands and models.
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <PackagePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Product Basics
                </h2>
                <p className="text-sm text-slate-500">
                  Enter the main product name, model number, item key, and
                  status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="premium-label">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Enter product name"
                  className="premium-input"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="premium-label">
                  Model Number <span className="text-rose-500">*</span>
                </label>
                <input
                  value={itemModelNumber}
                  onChange={(e) => setItemModelNumber(e.target.value)}
                  placeholder="Enter item model number"
                  className="premium-input"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="premium-label">Item Key Preview</label>
                <input
                  value={itemKeyPreview}
                  onChange={(e) => setItemKey(e.target.value)}
                  placeholder="auto-generated-item-key"
                  className="premium-input"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Product Status
                </p>
                <p className="text-xs text-slate-500">
                  New products are active by default and available in listings.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                {isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </section>

          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                <Layers3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Catalog Mapping
                </h2>
                <p className="text-sm text-slate-500">
                  Map the product across the category hierarchy and assign the
                  main brand and model.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {dropdowns.map((config) => (
                <ProductDropdown
                  key={config.key}
                  config={config}
                  onToggle={handleToggleDropdown}
                  onSearchChange={handleSearchChange}
                  onSelect={handleSelectDropdownValue}
                  dropdownRef={dropdownRefs[config.key]}
                  searchInputRef={searchInputRefs[config.key]}
                />
              ))}
            </div>

            {brandId ? (
              <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  Selected Primary Brand
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedProductBrandName || "-"}
                </p>
              </div>
            ) : null}
          </section>

          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <Search className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Search Keys
                </h2>
                <p className="text-sm text-slate-500">
                  Add optional comma-separated search keys for better product
                  lookup.
                </p>
              </div>
            </div>

            <div>
              <label className="premium-label">Search Keys</label>
              <input
                value={searchKeysInput}
                onChange={(e) => setSearchKeysInput(e.target.value)}
                placeholder="tempered glass, samsung a20, screen protector"
                className="premium-input"
                disabled={submitting}
              />
              <p className="mt-2 text-xs text-slate-500">
                Separate each key with a comma.
              </p>
            </div>

            {normalizeSearchKeys(searchKeysInput).length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {normalizeSearchKeys(searchKeysInput).map((key) => (
                  <span
                    key={key}
                    className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {key}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <Boxes className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">Variants</h2>
                  <p className="text-sm text-slate-500">
                    Add optional label and value pairs like size, color, or
                    capacity.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addVariantRow}
                className="premium-btn-secondary h-11 gap-2 px-4"
                disabled={submitting}
              >
                <Plus className="h-4 w-4" />
                Add Variant
              </button>
            </div>

            <div className="space-y-4">
              {variant.map((item, index) => (
                <div
                  key={`variant-${index}`}
                  className="grid grid-cols-1 gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <div>
                    <label className="premium-label">Variant Label</label>
                    <input
                      value={item.label}
                      onChange={(e) =>
                        updateVariant(index, "label", e.target.value)
                      }
                      placeholder="e.g. Color"
                      className="premium-input"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="premium-label">Variant Value</label>
                    <input
                      value={item.value}
                      onChange={(e) =>
                        updateVariant(index, "value", e.target.value)
                      }
                      placeholder="e.g. Black"
                      className="premium-input"
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeVariantRow(index)}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-rose-600 transition hover:bg-rose-100"
                      disabled={submitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-600">
                  <Info className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Product Information
                  </h2>
                  <p className="text-sm text-slate-500">
                    Add grouped sections for features, specifications, and other
                    details.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addProductInfoSection}
                className="premium-btn-secondary h-11 gap-2 px-4"
                disabled={submitting}
              >
                <Plus className="h-4 w-4" />
                Add Section
              </button>
            </div>

            <div className="space-y-5">
              {productInformation.map((section, sectionIndex) => (
                <div
                  key={`info-section-${sectionIndex}`}
                  className="rounded-[26px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex-1">
                      <label className="premium-label">Section Title</label>
                      <input
                        value={section.title}
                        onChange={(e) =>
                          updateProductInfoSectionTitle(
                            sectionIndex,
                            e.target.value
                          )
                        }
                        placeholder="e.g. Features & Specs"
                        className="premium-input"
                        disabled={submitting}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => addProductInfoField(sectionIndex)}
                        className="premium-btn-secondary h-11 gap-2 px-4"
                        disabled={submitting}
                      >
                        <Plus className="h-4 w-4" />
                        Add Field
                      </button>

                      <button
                        type="button"
                        onClick={() => removeProductInfoSection(sectionIndex)}
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-rose-600 transition hover:bg-rose-100"
                        disabled={submitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {section.fields.map((field, fieldIndex) => (
                      <div
                        key={`field-${sectionIndex}-${fieldIndex}`}
                        className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
                      >
                        <div>
                          <label className="premium-label">Field Label</label>
                          <input
                            value={field.label}
                            onChange={(e) =>
                              updateProductInfoField(
                                sectionIndex,
                                fieldIndex,
                                "label",
                                e.target.value
                              )
                            }
                            placeholder="e.g. Display Size"
                            className="premium-input"
                            disabled={submitting}
                          />
                        </div>

                        <div>
                          <label className="premium-label">Field Value</label>
                          <input
                            value={field.value}
                            onChange={(e) =>
                              updateProductInfoField(
                                sectionIndex,
                                fieldIndex,
                                "value",
                                e.target.value
                              )
                            }
                            placeholder="e.g. 6.7 inch"
                            className="premium-input"
                            disabled={submitting}
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              removeProductInfoField(sectionIndex, fieldIndex)
                            }
                            className="inline-flex h-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-rose-600 transition hover:bg-rose-100"
                            disabled={submitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Compatible Brands & Models
                  </h2>
                  <p className="text-sm text-slate-500">
                    Search compatible brand name, enable brand rows, then select
                    models.
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={compatibilityBrandSearch}
                    onChange={(e) => setCompatibilityBrandSearch(e.target.value)}
                    placeholder="Search compatible brand name..."
                    className="premium-input pl-11 pr-11"
                    disabled={submitting || loadingBrands}
                  />
                  {compatibilityBrandSearch ? (
                    <button
                      type="button"
                      onClick={() => setCompatibilityBrandSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              {loadingBrands || loadingModels ? (
                <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50">
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading compatibility data...
                  </div>
                </div>
              ) : (
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
                            Compatible Models *
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {paginatedCompatibilityRows.length ? (
                          paginatedCompatibilityRows.map((row, index) => {
                            const currentBrand = brandMap.get(row.brandId);

                            const modelOptions = (
                              modelMapByBrand.get(row.brandId) || []
                            ).map((item) => ({
                              _id: item._id,
                              name: item.name,
                              subtitle: item.nameKey || "",
                            }));

                            return (
                              <tr key={row.rowId} className="align-top">
                                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                                  {compatibilityStartIndex + index + 1}
                                </td>

                                <td className="px-4 py-4">
                                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={row.enabled}
                                      onChange={(e) =>
                                        updateCompatibilityRow(row.rowId, {
                                          enabled: e.target.checked,
                                        })
                                      }
                                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                      disabled={submitting}
                                    />
                                    <span>{currentBrand?.name || "-"}</span>
                                  </label>
                                </td>

                                <td className="px-4 py-4 min-w-[320px]">
                                  <ModelCheckboxSelector
                                    options={modelOptions}
                                    values={row.modelId}
                                    onChange={(values) =>
                                      updateCompatibilityRow(row.rowId, {
                                        modelId: values,
                                      })
                                    }
                                    disabled={!row.enabled || submitting}
                                    emptyText="Select compatible brand first"
                                    allLabel="All models"
                                  />
                                </td>

                                <td className="px-4 py-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCompatibilityRow(row.rowId, {
                                        isActive: !row.isActive,
                                      })
                                    }
                                    disabled={!row.enabled || submitting}
                                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                                      row.isActive
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-slate-200 text-slate-700"
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                  >
                                    {row.isActive ? "Active" : "Inactive"}
                                  </button>
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
                              No compatible brands found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                    <p>
                      Showing {showingFrom} to {showingTo} of{" "}
                      {totalCompatibilityRows} brands
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCompatibilityCurrentPage((prev) =>
                            Math.max(1, prev - 1)
                          )
                        }
                        disabled={safeCompatibilityPage === 1}
                        className="rounded-2xl border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>

                      <span className="rounded-2xl bg-slate-100 px-4 py-2 font-semibold text-slate-700">
                        {safeCompatibilityPage} / {totalCompatibilityPages}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setCompatibilityCurrentPage((prev) =>
                            Math.min(totalCompatibilityPages, prev + 1)
                          )
                        }
                        disabled={safeCompatibilityPage === totalCompatibilityPages}
                        className="rounded-2xl border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <aside className="premium-card-solid h-fit self-start rounded-[28px] p-4 md:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Check className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Selected Summary
                  </h3>
                  <p className="text-sm text-slate-500">
                    Enabled compatible brands and selected models.
                  </p>
                </div>
              </div>

              {selectedCompatibilitySummary.length ? (
                <div className="space-y-3">
                  {selectedCompatibilitySummary.map((item) => (
                    <div
                      key={item.brandId}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {item.brandName}
                        </h4>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Models
                        </p>
                        {item.models.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.models.map((modelName) => (
                              <span
                                key={`${item.brandId}-${modelName}`}
                                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                              >
                                {modelName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">
                            No models selected
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  No compatibility selected yet.
                </div>
              )}
            </aside>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="premium-btn-primary inline-flex h-12 items-center gap-2 rounded-2xl px-5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitting ? "Saving..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
