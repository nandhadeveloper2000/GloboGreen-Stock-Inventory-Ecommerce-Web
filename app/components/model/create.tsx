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
  ChevronDown,
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(145,22,161,0.08),transparent_24%),linear-gradient(to_bottom,#f8fafc,#eef2ff)] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#243b7a_0%,#6d28d9_55%,#c026d3_100%)] px-6 py-7 text-white shadow-[0_24px_70px_rgba(79,70,229,0.28)] md:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                Create Model
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
                Add the model name and assign it to a brand for a clean, premium
                catalog management experience.
              </p>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <BadgePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Basic Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the model name and select the related brand. Name key
                  will be auto-generated.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Model Name <span className="text-rose-500">*</span>
                </label>

                <div className="group flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
                  <Tag className="mr-3 h-4 w-4 text-slate-400 group-focus-within:text-violet-600" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter model name"
                    className="h-full w-full border-none bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Name Key Preview
                </label>

                <div className="flex h-12 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500">
                  {nameKeyPreview || "auto-generated-from-name"}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Brand <span className="text-rose-500">*</span>
                </label>

                <div className="relative" ref={brandDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (brandsLoading || brands.length === 0) return;
                      setBrandOpen((prev) => !prev);
                    }}
                    disabled={brandsLoading || brands.length === 0}
                    className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white pl-4 pr-4 text-left transition focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Shapes className="h-4 w-4 shrink-0 text-slate-400" />
                      <span
                        className={`truncate text-sm font-medium ${
                          selectedBrand?.name ? "text-slate-800" : "text-slate-400"
                        }`}
                      >
                        {brandsLoading
                          ? "Loading brands..."
                          : selectedBrand?.name || "Select brand"}
                      </span>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        brandOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {brandOpen && !brandsLoading && brands.length > 0 && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
                      <div className="border-b border-slate-100 p-3">
                        <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-violet-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-100">
                          <Search className="mr-2 h-4 w-4 text-slate-400" />
                          <input
                            ref={brandSearchInputRef}
                            type="text"
                            value={brandSearch}
                            onChange={(e) => setBrandSearch(e.target.value)}
                            placeholder="Search brand..."
                            className="h-full w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto py-2">
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
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition ${
                                  isSelected
                                    ? "bg-violet-50 text-violet-700"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span className="font-medium">{brand.name}</span>

                                {isSelected && (
                                  <Check className="h-4 w-4 text-violet-600" />
                                )}
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

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => router.push(`${basePath}/model/list`)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || brandsLoading || brands.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#6d28d9_0%,#c026d3_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(192,38,211,0.28)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
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
        </form>
      </div>
    </div>
  );
}