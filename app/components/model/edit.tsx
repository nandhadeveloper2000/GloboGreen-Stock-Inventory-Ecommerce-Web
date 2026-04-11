"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePlus,
  Box,
  ChevronDown,
  Loader2,
  RefreshCw,
  Save,
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

type ModelGetResponse = {
  success?: boolean;
  message?: string;
  data?: ModelItem;
};

type ModelUpdateResponse = {
  success?: boolean;
  message?: string;
  data?: ModelItem;
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

function getBrandIdFromField(
  brandField?: string | { _id?: string; name?: string }
) {
  if (!brandField) return "";
  if (typeof brandField === "string") return brandField;
  return brandField._id?.trim() || "";
}

export default function ModelEditPage() {
  const router = useRouter();
  const params = useParams();
  const { role } = useAuth();

  const id = String(params?.id ?? "");
  const basePath = getRoleBasePath(role);

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const nameKeyPreview = useMemo(() => {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }, [name]);

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
      setBrands(Array.isArray(list) ? list : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Unable to load brands");
      setBrands([]);
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchModel = async () => {
    try {
      if (!isValidMongoId(id)) {
        toast.error("Invalid model id");
        router.push(`${basePath}/model/list`);
        return;
      }

      const getUrl =
        typeof SummaryApi.model_get.url === "function"
          ? SummaryApi.model_get.url(id)
          : `${SummaryApi.model_get.url}/${id}`;

      const response = await apiClient.get<ModelGetResponse>(getUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      const result = response.data;

      if (!result?.success || !result?.data) {
        throw new Error(result?.message || "Failed to fetch model");
      }

      const model = result.data;

      setName(model.name || "");
      setBrandId(getBrandIdFromField(model.brandId));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Unable to load model");
      router.push(`${basePath}/model/list`);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchBrands(), fetchModel()]);
      } finally {
        setLoading(false);
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const handleUpdateModel = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!isValidMongoId(id)) {
      toast.error("Invalid model id");
      return;
    }

    try {
      setSubmitting(true);

      const updateUrl =
        typeof SummaryApi.model_update.url === "function"
          ? SummaryApi.model_update.url(id)
          : `${SummaryApi.model_update.url}/${id}`;

      const response = await apiClient.put<ModelUpdateResponse>(
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
      router.push(`${basePath}/model/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl">
          <div className="premium-card-solid rounded-[30px] p-10">
            <div className="flex min-h-80 flex-col items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  Loading model details
                </h2>
                <p className="text-sm text-slate-500">
                  Please wait while we fetch the model information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-5">
        <form onSubmit={handleUpdateModel} className="space-y-5">
          <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-6 py-7 md:px-8">
            <div className="premium-grid-bg premium-bg-animate opacity-40" />
            <div className="premium-bg-overlay" />

            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catalog Management
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Edit Model
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
                  Update the model name and assigned brand for a clean, premium
                  catalog management experience.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push(`${basePath}/model/list`)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </button>
            </div>
          </section>

          <section className="premium-card-solid rounded-[30px] p-5 md:p-6">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <BadgePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Basic Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the model name and select the related brand. Name key
                  will be auto-generated.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="premium-label">
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
                <label className="premium-label">Name Key Preview</label>

                <div className="flex h-12 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500">
                  {nameKeyPreview || "auto-generated-from-name"}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="premium-label">
                  Brand <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <Shapes className="h-4 w-4 text-slate-400" />
                  </div>

                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    disabled={brandsLoading || brands.length === 0 || submitting}
                    className="premium-select pl-11 pr-11 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {brandsLoading ? (
                      <option value="">Loading brands...</option>
                    ) : brands.length === 0 ? (
                      <option value="">No brands available</option>
                    ) : (
                      <>
                        <option value="">Select brand</option>
                        {brands.map((brand) => (
                          <option key={brand._id} value={brand._id}>
                            {brand.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="premium-card-solid rounded-[30px] p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                <Box className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Model Assignment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This model remains linked to the selected brand. Image upload
                  is not required for models.
                </p>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">
                Save the updated model name and brand assignment.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => fetchBrands()}
                  disabled={brandsLoading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${brandsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh Brands
                </button>

                <button
                  type="submit"
                  disabled={submitting || brandsLoading || brands.length === 0}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#082a5e] to-[#9116a1] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Model
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