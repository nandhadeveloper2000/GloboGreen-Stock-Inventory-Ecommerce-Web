"use client";

import {
  type FormEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePlus,
  Boxes,
  Check,
  ChevronDown,
  Loader2,
  Save,
  Search,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type PageMode = "create" | "edit";

type RefItem =
  | string
  | {
      _id?: string;
      name?: string;
      nameKey?: string;
      categoryId?:
        | string
        | {
            _id?: string;
            name?: string;
            nameKey?: string;
          };
    };

type ProductTypeItem = {
  _id?: string;
  subCategoryId?: RefItem;
  name?: string;
  nameKey?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SubCategoryItem = {
  _id: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
  categoryId?:
    | string
    | {
        _id?: string;
        name?: string;
        nameKey?: string;
      };
};

type ProductTypeResponse = {
  success?: boolean;
  message?: string;
  data?: ProductTypeItem;
};

type SubCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: SubCategoryItem[];
  subCategories?: SubCategoryItem[];
};

type SearchableSelectOption = {
  _id: string;
  name: string;
  subtitle?: string;
};

type CreateProductTypePageProps = {
  mode?: PageMode;
  productTypeId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const LIST_PATH = "/master/producttype/list";
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const message = (error as { response?: { data?: { message?: string } } })
      .response?.data?.message;

    if (message) return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isValidMongoId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
}

function resolveUrl(
  config: { url: string | ((id: string) => string) },
  id: string = ""
) {
  if (typeof config.url === "function") {
    return config.url(id);
  }

  return id ? `${config.url}/${id}` : config.url;
}

function getObjectId(value?: RefItem | null) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || "");
}

function getCategoryName(subCategory?: SubCategoryItem | null) {
  if (!subCategory?.categoryId || typeof subCategory.categoryId === "string") {
    return "";
  }

  return String(subCategory.categoryId.name || "").trim();
}

function normalizeSubCategories(response?: SubCategoryListResponse) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.subCategories)) return response.subCategories;
  return [];
}

function TopLabelInput({
  label,
  value,
  placeholder,
  required,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />

      <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
    </div>
  );
}

function SearchableSingleSelect({
  label,
  required = false,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 240,
  });

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((item) => item._id === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return options;

    return options.filter((item) => {
      const name = item.name.toLowerCase();
      const subtitle = String(item.subtitle || "").toLowerCase();

      return name.includes(query) || subtitle.includes(query);
    });
  }, [options, search]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;

      if (
        wrapperRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      if (!wrapperRef.current?.contains(target)) {
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

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(rect.width, viewportWidth - 32);
      const left = Math.min(Math.max(16, rect.left), viewportWidth - width - 16);
      const estimatedOptionsHeight = filtered.length
        ? Math.min(filtered.length * 54, 252)
        : 120;
      const estimatedPanelHeight = Math.min(360, estimatedOptionsHeight + 92);
      const spaceBelow = viewportHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      const openUpward =
        spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow;
      const top = openUpward
        ? Math.max(16, rect.top - estimatedPanelHeight - 12)
        : Math.min(rect.bottom + 12, viewportHeight - estimatedPanelHeight - 16);
      const availablePanelHeight = openUpward
        ? rect.top - top - 24
        : viewportHeight - top - 16;
      const maxHeight = Math.max(
        140,
        Math.min(252, availablePanelHeight - 76)
      );

      setDropdownStyle({
        left,
        top,
        width,
        maxHeight,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [filtered.length, open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
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
          "relative flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 pb-2 pt-5 text-left text-sm font-semibold outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          open
            ? "border-[#00008b] ring-4 ring-[#00008b]/10"
            : "border-slate-200 hover:border-[#00008b]",
        ].join(" ")}
      >
        <span className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          {label}
          {required ? <span className="text-rose-500"> *</span> : null}
        </span>

        <span className="flex min-w-0 items-center gap-2.5">
          <Boxes className="h-4 w-4 shrink-0 text-slate-400" />

          <span className="min-w-0">
            <span
              className={
                selected ? "block truncate text-slate-900" : "block truncate text-slate-400"
              }
            >
              {selected ? selected.name : placeholder}
            </span>

            {selected?.subtitle ? (
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
                {selected.subtitle}
              </span>
            ) : null}
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{
                left: dropdownStyle.left,
                top: dropdownStyle.top,
                width: dropdownStyle.width,
              }}
              className="fixed z-[1000] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
            >
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
                    placeholder={searchPlaceholder || `Search ${label.toLowerCase()}...`}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:bg-white focus:ring-4 focus:ring-[#00008b]/10"
                  />
                </div>
              </div>

              <div
                className="overflow-y-auto p-2"
                role="listbox"
                style={{ maxHeight: dropdownStyle.maxHeight }}
              >
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
                    {emptyText || "No results found"}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default function CreateProductTypePage({
  mode = "create",
  productTypeId = "",
  isModal = false,
  onClose,
  onSuccess,
}: CreateProductTypePageProps) {
  const router = useRouter();

  const isEditMode = mode === "edit";

  const [name, setName] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [subCategories, setSubCategories] = useState<SubCategoryItem[]>([]);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  const initialData = useRef({
    name: "",
    nameKey: "",
    subCategoryId: "",
  });

  const trimmedName = name.trim();

  const selectedSubCategory = useMemo(() => {
    return subCategories.find((item) => item._id === subCategoryId) || null;
  }, [subCategories, subCategoryId]);

  const selectedCategoryName = useMemo(() => {
    return getCategoryName(selectedSubCategory);
  }, [selectedSubCategory]);

  const subCategoryOptions = useMemo<SearchableSelectOption[]>(
    () =>
      subCategories.map((item) => {
        const categoryName = getCategoryName(item);

        return {
          _id: item._id,
          name: item.name,
          subtitle: categoryName ? `Category: ${categoryName}` : item.nameKey,
        };
      }),
    [subCategories]
  );

  useEffect(() => {
    let active = true;

    async function loadSubCategories() {
      try {
        setSubCategoriesLoading(true);

        const response = await apiClient.get<SubCategoryListResponse>(
          SummaryApi.sub_category_list.url,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = response.data;

        if (!result?.success) {
          throw new Error(result?.message || "Failed to load sub categories");
        }

        if (!active) return;

        const resolved = normalizeSubCategories(result);
        setSubCategories(
          [...resolved].sort((first, second) =>
            String(first.name || "").localeCompare(String(second.name || ""), "en", {
              sensitivity: "base",
            })
          )
        );
      } catch (error: unknown) {
        if (!active) return;

        toast.error(getErrorMessage(error, "Unable to load sub categories"));
        setSubCategories([]);
      } finally {
        if (active) setSubCategoriesLoading(false);
      }
    }

    void loadSubCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setLoadingExisting(false);
      return;
    }

    if (!isValidMongoId(productTypeId)) {
      toast.error("Invalid product type id");

      if (isModal) {
        onClose?.();
      } else {
        router.push(LIST_PATH);
      }

      setLoadingExisting(false);
      return;
    }

    let active = true;

    async function loadProductType() {
      try {
        setLoadingExisting(true);

        const response = await apiClient.get<ProductTypeResponse>(
          resolveUrl(SummaryApi.product_type_get, productTypeId),
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = response.data;

        if (!result?.success || !result.data) {
          throw new Error(result?.message || "Failed to load product type");
        }

        if (!active) return;

        const resolvedName = String(result.data.name || "");
        const resolvedNameKey = String(result.data.nameKey || "");
        const resolvedSubCategoryId = getObjectId(result.data.subCategoryId);

        setName(resolvedName);
        setSubCategoryId(resolvedSubCategoryId);
        initialData.current = {
          name: resolvedName,
          nameKey: resolvedNameKey,
          subCategoryId: resolvedSubCategoryId,
        };
      } catch (error: unknown) {
        if (!active) return;

        toast.error(getErrorMessage(error, "Unable to load product type"));

        if (isModal) {
          onClose?.();
        } else {
          router.push(LIST_PATH);
        }
      } finally {
        if (active) setLoadingExisting(false);
      }
    }

    void loadProductType();

    return () => {
      active = false;
    };
  }, [isEditMode, isModal, onClose, productTypeId, router]);

  function closePage() {
    if (isModal && onClose) {
      onClose();
      return;
    }

    router.push(LIST_PATH);
  }

  async function handleSuccess() {
    if (isModal && onSuccess) {
      await onSuccess();
      return;
    }

    router.push(LIST_PATH);
  }

  function resetForm() {
    if (isEditMode) {
      setName(initialData.current.name);
      setSubCategoryId(initialData.current.subCategoryId);
      return;
    }

    setName("");
    setSubCategoryId("");
  }

  function validateForm() {
    if (!subCategoryId.trim()) {
      toast.error("Please select a sub category");
      return false;
    }

    if (!trimmedName) {
      toast.error("Product Type name is required");
      return false;
    }

    if (trimmedName.length < MIN_NAME_LENGTH) {
      toast.error(
        `Product Type name must be at least ${MIN_NAME_LENGTH} characters`
      );
      return false;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      toast.error(
        `Product Type name must be ${MAX_NAME_LENGTH} characters or less`
      );
      return false;
    }

    if (
      isEditMode &&
      trimmedName === initialData.current.name.trim() &&
      subCategoryId === initialData.current.subCategoryId
    ) {
      toast.error("No changes to save");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    if (isEditMode && !isValidMongoId(productTypeId)) {
      toast.error("Invalid product type id");
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode) {
        const response = await apiClient.put<ProductTypeResponse>(
          resolveUrl(SummaryApi.product_type_update, productTypeId),
          {
            subCategoryId: subCategoryId.trim(),
            name: trimmedName,
          },
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        const result = response.data;

        if (!result?.success) {
          throw new Error(result?.message || "Failed to update product type");
        }

        toast.success(result.message || "Product Type updated successfully");
        await handleSuccess();
        return;
      }

      const response = await apiClient.post<ProductTypeResponse>(
        SummaryApi.product_type_create.url,
        {
          subCategoryId: subCategoryId.trim(),
          name: trimmedName,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to create product type");
      }

      toast.success(result.message || "Product Type created successfully");
      resetForm();
      await handleSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || loadingExisting;
  const pageTitle = isEditMode ? "Edit Product Type" : "Create Product Type";
  const pageDescription = isEditMode
    ? "Update sub category and product type name."
    : "Add a product type under a sub category.";

  if (loadingExisting) {
    return (
      <div
        className={
          isModal
            ? "flex w-full items-center justify-center bg-white px-4 py-8"
            : "min-h-screen bg-slate-50 px-3 py-4 sm:px-4 lg:px-6"
        }
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-[26px] border border-slate-200 bg-white py-14 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-black">
              Loading product type details...
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
          ? "w-full bg-white"
          : "min-h-screen bg-slate-50 px-3 py-4 sm:px-4 lg:px-6"
      }
    >
      <div
        className={
          isModal ? "mx-auto w-full max-w-[820px]" : "mx-auto w-full max-w-4xl"
        }
      >
        <form
          onSubmit={handleSubmit}
          className={
            isModal
              ? "flex flex-col bg-white"
              : "flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]"
          }
        >
          {isModal ? (
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full border border-[#00008b]/10 bg-[#00008b]/5 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#00008b]">
                  Master Catalog
                </span>

                <h2 className="mt-3 truncate text-xl font-black text-slate-950">
                  {pageTitle}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Select sub category and enter product type name.
                </p>
              </div>

              <button
                type="button"
                onClick={closePage}
                disabled={disabled}
                title="Close"
                aria-label="Close"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={closePage}
                    disabled={disabled}
                    className="mb-4 inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to List
                  </button>

                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                      {pageTitle}
                    </h1>

                    <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                      {pageDescription}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closePage}
                  disabled={disabled}
                  title="Close"
                  aria-label="Close"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div
            className={
              isModal
                ? "bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fafc_42%,#ffffff_100%)]"
                : "flex-1 overflow-y-auto bg-slate-50"
            }
          >
            <div className="p-4 sm:p-5">
              <section className="mx-auto w-full max-w-[680px] rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_24px_55px_rgba(15,23,42,0.08)] md:p-6">
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#00008b_0%,#243cfd_100%)] text-white shadow-[0_14px_28px_rgba(0,0,139,0.18)]">
                      <BadgePlus className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-slate-950">
                        Product Type Details
                      </h2>

                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Choose sub category and enter product type name.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] p-4 md:p-5">
                    <SearchableSingleSelect
                      label="Sub Category"
                      required
                      placeholder={
                        subCategoriesLoading
                          ? "Loading sub categories..."
                          : "Search and select sub category"
                      }
                      searchPlaceholder="Search sub category..."
                      emptyText="No sub category found"
                      options={subCategoryOptions}
                      value={subCategoryId}
                      onChange={setSubCategoryId}
                      disabled={disabled || subCategoriesLoading}
                    />

                    {selectedSubCategory ? (
                      <div className="rounded-2xl border border-[#00008b]/10 bg-white px-4 py-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-[#00008b]/6 px-3 py-1 text-xs font-black text-[#00008b]">
                            {selectedSubCategory.name}
                          </span>

                          {selectedCategoryName ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                              {selectedCategoryName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <TopLabelInput
                      label="Product Type Name"
                      value={name}
                      onChange={setName}
                      placeholder="Enter product type name"
                      disabled={disabled}
                      required
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={closePage}
                disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || subCategoriesLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#00008b_0%,#1d33db_100%)] px-5 text-sm font-black text-white shadow-[0_16px_32px_rgba(0,0,139,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? "Update Product Type" : "Save Product Type"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
