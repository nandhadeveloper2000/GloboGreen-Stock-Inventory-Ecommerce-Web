"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Pencil,
  Store,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type BrandData = {
  _id?: string;
  name?: string;
  nameKey?: string;
  image?: {
    url?: string;
    publicId?: string;
    public_id?: string;
  };
  isActive?: boolean;
};

type ModelData = {
  _id?: string;
  name?: string;
  nameKey?: string;
  isActive?: boolean;
  brandId?: string | BrandData;
};

type MapData = {
  _id: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  shopId?: {
    _id?: string;
    shopName?: string;
    name?: string;
    code?: string;
    shopType?: string;
  };
  modelId?: ModelData | string;
  createdBy?: {
    type?: string;
    id?: string;
    role?: string;
    ref?: string;
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as {
      response?: {
        data?: {
          message?: string;
        };
      };
      message?: string;
    };

    return axiosError.response?.data?.message || axiosError.message || fallback;
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getModel(data: MapData | null) {
  if (data?.modelId && typeof data.modelId === "object") {
    return data.modelId;
  }

  return null;
}

function getBrand(model: ModelData | null) {
  if (model?.brandId && typeof model.brandId === "object") {
    return model.brandId;
  }

  return null;
}

export default function MyModelViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id") || "";

  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setLoading(false);
        setData(null);
        return;
      }

      try {
        setLoading(true);

        const api = SummaryApi.shopModelMapById;

        const response = await apiClient.request<ApiResponse<MapData>>({
          method: api.method,
          url: api.url(id),
        });

        setData(response.data?.data || null);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to fetch model"));
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!id || !data) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
          Model mapping not found.
        </div>
      </div>
    );
  }

  const model = getModel(data);
  const brand = getBrand(model);
  const imageUrl = brand?.image?.url || "";
  const modelName = model?.name || "Model Details";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="relative overflow-hidden rounded-card bg-[linear-gradient(135deg,#2e3192,#ec0677)] p-5 text-white shadow-xl md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(650px_260px_at_10%_0%,rgba(255,255,255,0.22),transparent_65%)]" />

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                <Wrench className="h-3.5 w-3.5" />
                View My Model
              </div>

              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                {modelName}
              </h1>

              <p className="mt-1 text-sm text-white/80">
                Shop model mapping details.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/shopowner/models/list")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={() => router.push(`/shopowner/models/edit/${data._id}`)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <div className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={brand?.name || modelName}
                  className="h-72 w-full object-cover"
                />
              ) : (
                <div className="flex h-72 w-full items-center justify-center">
                  <Wrench className="h-14 w-14 text-slate-400" />
                </div>
              )}
            </div>

            <div className="mt-4">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                  data.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {data.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-violet-600" />

                <h2 className="text-lg font-black text-slate-900">
                  Model Information
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Info label="Model Name" value={model?.name || "-"} />
                <Info label="Model ID" value={model?._id || "-"} />
                <Info label="Model Key" value={model?.nameKey || "-"} />
                <Info
                  label="Model Status"
                  value={model?.isActive === false ? "Inactive" : "Active"}
                />
              </div>
            </div>

            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-violet-600" />

                <h2 className="text-lg font-black text-slate-900">
                  Brand Information
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Info label="Brand Name" value={brand?.name || "-"} />
                <Info label="Brand ID" value={brand?._id || "-"} />
                <Info label="Brand Key" value={brand?.nameKey || "-"} />
                <Info
                  label="Brand Status"
                  value={brand?.isActive === false ? "Inactive" : "Active"}
                />
              </div>
            </div>

            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Store className="h-5 w-5 text-violet-600" />

                <h2 className="text-lg font-black text-slate-900">
                  Shop Information
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Info
                  label="Shop Name"
                  value={data.shopId?.shopName || data.shopId?.name || "-"}
                />
                <Info label="Shop Code" value={data.shopId?.code || "-"} />
                <Info label="Shop Type" value={data.shopId?.shopType || "-"} />
                <Info label="Shop ID" value={data.shopId?._id || "-"} />
              </div>
            </div>

            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-violet-600" />

                <h2 className="text-lg font-black text-slate-900">
                  Record Details
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Info label="Created At" value={formatDate(data.createdAt)} />
                <Info label="Updated At" value={formatDate(data.updatedAt)} />
                <Info
                  label="Created By Type"
                  value={data.createdBy?.type || "-"}
                />
                <Info
                  label="Created By Role"
                  value={data.createdBy?.role || "-"}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 wrap-break-word text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
