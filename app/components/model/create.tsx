"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePlus,
  Check,
  ChevronDown,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Shapes,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type PageMode = "create" | "edit";

type BrandItem = {
  _id: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
};

type BrandListResponse = {
  success?: boolean;
  message?: string;
  data?: BrandItem[];
  brands?: BrandItem[];
};

type ModelItem = {
  _id?: string;
  name?: string;
  nameKey?: string;
  brandId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ModelResponse = {
  success?: boolean;
  message?: string;
  data?: ModelItem;
};

type CreateModelPageProps = {
  mode?: PageMode;
  modelId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

function getErrorMessage(error: unknown): string {
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

  return "Something went wrong";
}

function isValidMongoId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
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

function getApiUrl(apiUrl: string | ((id: string) => string), id: string) {
  if (typeof apiUrl === "function") {
    return apiUrl(id);
  }

  return `${apiUrl}/${id}`;
}

function getBrandIdFromField(
  brandField?: string | { _id?: string; name?: string }
) {
  if (!brandField) return "";
  if (typeof brandField === "string") return brandField;
  return brandField._id?.trim() || "";
}

function CompactTextField({
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
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-2 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function CompactPreviewField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="mb-1 text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="truncate text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

export default function CreateModelPage({
  mode = "create",
  modelId = "",
  isModal = false,
  onClose,
  onSuccess,
}: CreateModelPageProps) {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);
  const listPath = `${basePath}/model/list`;
  const isEditMode = mode === "edit";

  const brandDropdownRef = useRef<HTMLDivElement | null>(null);
  const brandSearchInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState<BrandItem[]>([]);

  const [brandsLoading, setBrandsLoading] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");

  const initialData = useRef({
    name: "",
    brandId: "",
  });

  const pageTitle = isEditMode ? "Edit Model" : "Create Model";
  const pageDescription = isEditMode
    ? "Update model name and assigned brand."
    : "Create a new model and map it to a brand.";

  const nameKeyPreview = useMemo(() => {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }, [name]);

  const selectedBrand = useMemo(() => {
    return brands.find((brand) => brand._id === brandId) || null;
  }, [brands, brandId]);

  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();

    if (!query) return brands;

    return brands.filter((brand) =>
      brand.name.toLowerCase().includes(query)
    );
  }, [brands, brandSearch]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(event.target as Node)
      ) {
        setBrandOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!brandOpen) return;

    const timer = window.setTimeout(() => {
      brandSearchInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [brandOpen]);

  useEffect(() => {
    let active = true;

    async function fetchBrands() {
      try {
        setBrandsLoading(true);

        const response = await apiClient.get<BrandListResponse>(
          SummaryApi.brand_list.url,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = response.data;

        if (!result?.success) {
          throw new Error(result?.message || "Failed to load brands");
        }

        if (!active) return;

        const list = result.data || result.brands || [];
        setBrands(Array.isArray(list) ? list : []);
      } catch (error: unknown) {
        if (!active) return;

        toast.error(getErrorMessage(error) || "Unable to load brands");
        setBrands([]);
      } finally {
        if (active) {
          setBrandsLoading(false);
        }
      }
    }

    void fetchBrands();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setLoadingExisting(false);
      return;
    }

    if (!isValidMongoId(modelId)) {
      toast.error("Invalid model id");

      if (isModal) {
        onClose?.();
      } else {
        router.push(listPath);
      }

      setLoadingExisting(false);
      return;
    }

    let active = true;

    async function fetchModel() {
      try {
        setLoadingExisting(true);

        const getUrl = getApiUrl(SummaryApi.model_get.url, modelId);

        const response = await apiClient.get<ModelResponse>(getUrl, {
          headers: {
            Accept: "application/json",
          },
        });

        const result = response.data;

        if (!result?.success || !result?.data) {
          throw new Error(result?.message || "Failed to fetch model");
        }

        if (!active) return;

        const resolvedName = result.data.name || "";
        const resolvedBrandId = getBrandIdFromField(result.data.brandId);

        setName(resolvedName);
        setBrandId(resolvedBrandId);

        initialData.current = {
          name: resolvedName,
          brandId: resolvedBrandId,
        };
      } catch (error: unknown) {
        if (!active) return;

        toast.error(getErrorMessage(error) || "Unable to load model");

        if (isModal) {
          onClose?.();
        } else {
          router.push(listPath);
        }
      } finally {
        if (active) {
          setLoadingExisting(false);
        }
      }
    }

    void fetchModel();

    return () => {
      active = false;
    };
  }, [isEditMode, modelId, isModal, listPath, onClose, router]);

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

  function resetForm() {
    setBrandOpen(false);
    setBrandSearch("");

    if (isEditMode) {
      setName(initialData.current.name);
      setBrandId(initialData.current.brandId);
      return;
    }

    setName("");
    setBrandId("");
  }

  function validateForm() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Model name is required");
      return false;
    }

    if (trimmedName.length < 2) {
      toast.error("Model name must be at least 2 characters");
      return false;
    }

    if (!brandId.trim()) {
      toast.error("Please select a brand");
      return false;
    }

    return true;
  }

  function handleSelectBrand(selectedId: string) {
    setBrandId(selectedId);
    setBrandOpen(false);
    setBrandSearch("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    if (isEditMode && !isValidMongoId(modelId)) {
      toast.error("Invalid model id");
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode) {
        const updateUrl = getApiUrl(SummaryApi.model_update.url, modelId);

        const response = await apiClient.put<ModelResponse>(
          updateUrl,
          {
            name: name.trim(),
            brandId: brandId.trim(),
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
          throw new Error(result?.message || "Failed to update model");
        }

        toast.success(result?.message || "Model updated successfully");
        await handleSuccess();
        return;
      }

      const response = await apiClient.post<ModelResponse>(
        SummaryApi.model_create.url,
        {
          name: name.trim(),
          brandId: brandId.trim(),
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
        throw new Error(result?.message || "Failed to create model");
      }

      toast.success(result?.message || "Model created successfully");
      resetForm();
      await handleSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingExisting) {
    return (
      <div
        className={
          isModal
            ? "bg-slate-50 px-3 py-3"
            : "min-h-screen bg-slate-50 px-3 py-3 sm:px-4"
        }
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-semibold">
              Loading model details...
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
          ? "max-h-[90vh] overflow-y-auto bg-slate-50 px-3 py-3 sm:px-4"
          : "min-h-screen bg-slate-50 px-3 py-3 sm:px-4 lg:px-5"
      }
    >
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="mb-3 inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isModal ? "Close" : "Back to List"}
          </button>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
              {pageTitle}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{pageDescription}</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00008b]/10 text-[#00008b]">
                <BadgePlus className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950">
                  Basic Information
                </h2>
                <p className="text-xs leading-5 text-slate-500">
                  Enter model name and select brand.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <CompactTextField
                label="Model Name"
                value={name}
                onChange={setName}
                placeholder="Enter model name"
                disabled={submitting}
                required
              />

              <CompactPreviewField
                label="Name Key Preview"
                value={nameKeyPreview || "auto-generated-from-name"}
              />

              <div ref={brandDropdownRef} className="relative md:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                  Brand <span className="text-rose-500">*</span>
                </span>

                <button
                  type="button"
                  disabled={brandsLoading || brands.length === 0 || submitting}
                  onClick={() => {
                    if (brandsLoading || brands.length === 0 || submitting) {
                      return;
                    }

                    setBrandOpen((prev) => !prev);
                  }}
                  className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-800 outline-none transition hover:border-[#00008b] focus:border-[#00008b] focus:ring-2 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Shapes className="h-4 w-4 shrink-0 text-slate-400" />
                    <span
                      className={
                        selectedBrand?.name
                          ? "truncate text-slate-900"
                          : "truncate text-slate-400"
                      }
                    >
                      {brandsLoading
                        ? "Loading brands..."
                        : selectedBrand?.name || "Select brand"}
                    </span>
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                      brandOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {brandOpen && !brandsLoading && brands.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-200 p-3">
                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3">
                        <Search className="mr-2 h-4 w-4 text-slate-400" />
                        <input
                          ref={brandSearchInputRef}
                          type="text"
                          value={brandSearch}
                          onChange={(event) =>
                            setBrandSearch(event.target.value)
                          }
                          placeholder="Search brand"
                          className="h-full w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto p-2">
                      {filteredBrands.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-slate-400">
                          No brands found
                        </div>
                      ) : (
                        filteredBrands.map((brand) => {
                          const isSelected = brandId === brand._id;

                          return (
                            <button
                              key={brand._id}
                              type="button"
                              onClick={() => handleSelectBrand(brand._id)}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                isSelected
                                  ? "bg-[#00008b]/5 text-[#00008b]"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span className="truncate font-semibold">
                                {brand.name}
                              </span>

                              {isSelected ? (
                                <Check className="h-4 w-4 shrink-0" />
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    setBrandsLoading(true);

                    try {
                      const response = await apiClient.get<BrandListResponse>(
                        SummaryApi.brand_list.url,
                        {
                          headers: {
                            Accept: "application/json",
                          },
                        }
                      );

                      const result = response.data;

                      if (!result?.success) {
                        throw new Error(
                          result?.message || "Failed to refresh brands"
                        );
                      }

                      const list = result.data || result.brands || [];
                      setBrands(Array.isArray(list) ? list : []);
                      toast.success("Brands refreshed");
                    } catch (error: unknown) {
                      toast.error(getErrorMessage(error));
                    } finally {
                      setBrandsLoading(false);
                    }
                  })();
                }}
                disabled={brandsLoading || submitting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    brandsLoading ? "animate-spin" : ""
                  }`}
                />
                Refresh Brands
              </button>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || brandsLoading || brands.length === 0}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#000070] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {isEditMode ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      {isEditMode ? "Update Model" : "Save Model"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}