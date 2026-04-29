"use client";

import React, {
  FormEvent,
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
  Loader2,
  Save,
  Search,
  Shapes,
  Sparkles,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  TopLabelInput,
  TopLabelPanel,
  TopLabelSelectButton,
} from "@/components/ui/top-label-fields";

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

type CreateModelResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id: string;
    name: string;
    nameKey: string;
    brandId?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
};

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message
  ) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message || "Something went wrong"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
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

export default function CreateModelPage() {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");

  const brandDropdownRef = useRef<HTMLDivElement | null>(null);
  const brandSearchInputRef = useRef<HTMLInputElement | null>(null);

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
    const fetchBrands = async () => {
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

        const list = result.data || result.brands || [];
        const finalBrands = Array.isArray(list) ? list : [];

        setBrands(finalBrands);
        setBrandId("");
      } catch (error: unknown) {
        toast.error(getErrorMessage(error) || "Unable to load brands");
        setBrands([]);
        setBrandId("");
      } finally {
        setBrandsLoading(false);
      }
    };

    void fetchBrands();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(event.target as Node)
      ) {
        setBrandOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (brandOpen) {
      const timer = window.setTimeout(() => {
        brandSearchInputRef.current?.focus();
      }, 50);

      return () => window.clearTimeout(timer);
    }
  }, [brandOpen]);

  const validateForm = () => {
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
  };

  const handleSelectBrand = (selectedId: string) => {
    setBrandId(selectedId);
    setBrandOpen(false);
    setBrandSearch("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const response = await apiClient.post<CreateModelResponse>(
        SummaryApi.model_create.url,
        {
          name: name.trim(),
          brandId,
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
      router.push(`${basePath}/model/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
            <div className="mx-auto w-full max-w-7xl space-y-5">


        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Create Model
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create a new model and map it to a brand.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`${basePath}/model/list`)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </button>
        </div>

        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
              <Sparkles className="h-3.5 w-3.5" />
              Catalog Management
            </span>

            <div className="mt-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Create Model
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Add the model name and assign it to a brand for a clean,
                premium catalog management experience.
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="premium-card-solid rounded-card p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <BadgePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="text-sm text-slate-500">
                  Enter the model name and select the related brand. Name key
                  will be auto-generated.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TopLabelInput
                label="Model Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter model name"
                icon={Tag}
                disabled={submitting}
                required
              />

              <TopLabelPanel
                label="Name Key Preview"
                className="border-dashed border-slate-200 bg-slate-50"
                contentClassName="text-sm font-medium text-slate-500"
              >
                <span>{nameKeyPreview || "auto-generated-from-name"}</span>
              </TopLabelPanel>

              <div className="md:col-span-2">
                <div className="relative" ref={brandDropdownRef}>
                  <TopLabelSelectButton
                    label="Brand"
                    text={
                      brandsLoading
                        ? "Loading brands..."
                        : selectedBrand?.name || "Select brand"
                    }
                    muted={!brandsLoading && !selectedBrand?.name}
                    icon={Shapes}
                    open={brandOpen}
                    disabled={brandsLoading || brands.length === 0 || submitting}
                    required
                    onClick={() => {
                      if (brandsLoading || brands.length === 0 || submitting) return;
                      setBrandOpen((prev) => !prev);
                    }}
                  />

                  {brandOpen && !brandsLoading && brands.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                      <div className="border-b border-slate-200 p-3">
                        <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3">
                          <Search className="mr-2 h-4 w-4 text-slate-400" />
                          <input
                            ref={brandSearchInputRef}
                            type="text"
                            value={brandSearch}
                            onChange={(e) => setBrandSearch(e.target.value)}
                            placeholder="Search brand"
                            className="h-full w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-2">
                        {filteredBrands.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-500">
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
                                    ? "bg-violet-50 text-violet-700"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span className="truncate font-medium">
                                  {brand.name}
                                </span>

                                {isSelected ? (
                                  <Check className="h-4 w-4 shrink-0 text-violet-600" />
                                ) : null}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-card border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => router.push(`${basePath}/model/list`)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || brandsLoading || brands.length === 0}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Model
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
