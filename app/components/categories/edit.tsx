"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FolderTree,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type MapData = {
  _id: string;
  isActive: boolean;
  shopId?: {
    _id?: string;
    shopName?: string;
    name?: string;
    code?: string;
    shopType?: string;
  };
  masterCategoryId?: {
    _id?: string;
    name?: string;
  };
  categoryId?: {
    _id?: string;
    name?: string;
    image?: {
      url?: string;
      publicId?: string;
      public_id?: string;
    };
    isActive?: boolean;
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

export default function MyCategoryEditPage() {
  const router = useRouter();
  const params = useParams();

  const id = typeof params?.id === "string" ? params.id : "";

  const [data, setData] = useState<MapData | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setLoading(false);
        setData(null);
        return;
      }

      try {
        setLoading(true);

        const api = SummaryApi.shopCategoryMapById;

        const response = await apiClient.request<ApiResponse<MapData>>({
          method: api.method,
          url: api.url(id),
        });

        const row = response.data?.data || null;

        setData(row);
        setIsActive(Boolean(row?.isActive));
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to fetch category"));
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [id]);

  async function handleSubmit() {
    if (!id) {
      toast.error("Invalid category mapping id");
      return;
    }

    try {
      setSaving(true);

      const api = SummaryApi.shopCategoryMapUpdate;

      await apiClient.request({
        method: api.method,
        url: api.url(id),
        data: {
          isActive,
        },
      });

      toast.success("Category mapping updated successfully");
      router.push("/shopowner/categories/list");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update category"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
          Category mapping not found.
        </div>
      </div>
    );
  }

  const imageUrl = data.categoryId?.image?.url || "";
  const categoryName = data.categoryId?.name || "Category";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-card bg-gradient-primary p-5 text-white shadow-xl md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(650px_260px_at_10%_0%,rgba(255,255,255,0.22),transparent_65%)]" />

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                <FolderTree className="h-3.5 w-3.5" />
                Edit My Category
              </div>

              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                {categoryName}
              </h1>

              <p className="mt-1 text-sm text-white/80">
                Update shop category mapping status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/shopowner/categories/list")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </section>

        <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={categoryName}
                  className="h-56 w-full object-cover"
                />
              ) : (
                <div className="flex h-56 w-full items-center justify-center">
                  <FolderTree className="h-12 w-12 text-slate-400" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Info label="Category" value={data.categoryId?.name || "-"} />

                <Info
                  label="Master Category"
                  value={data.masterCategoryId?.name || "-"}
                />

                <Info
                  label="Shop"
                  value={
                    data.shopId?.shopName || data.shopId?.name || "Selected Shop"
                  }
                />

                <Info label="Shop Type" value={data.shopId?.shopType || "-"} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Category Status
                    </h3>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Inactive category will not be used for product filtering.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsActive((prev) => !prev)}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isActive ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}

                    {isActive ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/shopowner/categories/list")}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  Save Changes
                </button>
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
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 wrap-break-word text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
