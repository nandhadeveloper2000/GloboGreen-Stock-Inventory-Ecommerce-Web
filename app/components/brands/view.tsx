"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Pencil,
  Store,
  Tag,
  X,
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
  brandId?: BrandData | string;
  createdBy?: {
    type?: string;
    id?: string;
    role?: string;
    ref?: string;
  };
};

type MyBrandViewPageProps = {
  open?: boolean;
  mapId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onEdit?: () => void;
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

function getBrand(data: MapData | null) {
  if (data?.brandId && typeof data.brandId === "object") {
    return data.brandId;
  }

  return null;
}

function renderStateMessage({
  title,
  description,
  tone = "default",
}: {
  title: string;
  description: string;
  tone?: "default" | "danger";
}) {
  const classes =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`rounded-3xl border p-5 text-sm font-semibold ${classes}`}>
      <p className="text-base font-black">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}

export default function MyBrandViewPage({
  open = true,
  mapId,
  isModal = false,
  onClose,
  onEdit,
}: MyBrandViewPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = mapId || searchParams.get("id") || "";
  const showAsModal = isModal || typeof onClose === "function";
  const shouldRender = showAsModal ? open : true;

  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!showAsModal || !open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open, showAsModal]);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!shouldRender) return;

      if (!id) {
        if (!cancelled) {
          setLoading(false);
          setData(null);
        }
        return;
      }

      try {
        if (!cancelled) {
          setLoading(true);
        }

        const api = SummaryApi.shopBrandMapById;

        const response = await apiClient.request<ApiResponse<MapData>>({
          method: api.method,
          url: api.url(id),
        });

        if (!cancelled) {
          setData(response.data?.data || null);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Failed to fetch brand"));
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [id, shouldRender]);

  if (!shouldRender) return null;

  const handleBack = () => {
    if (showAsModal) {
      onClose?.();
      return;
    }

    router.push("/shopowner/brands/list");
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
      return;
    }

    const editId = data?._id || id;

    if (!editId) return;

    router.push(`/shopowner/brands/edit/${editId}`);
  };

  const brand = getBrand(data);
  const imageUrl = brand?.image?.url || "";
  const brandName = brand?.name || "Brand Details";
  const brandKey = brand?.nameKey || "-";
  const shopName = data?.shopId?.shopName || data?.shopId?.name || "-";

  const content = loading ? (
    <div
      className={
        showAsModal
          ? "px-6 py-12"
          : "rounded-card border border-slate-200 bg-white px-6 py-14 shadow-sm"
      }
    >
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-500">
          Loading brand details...
        </p>
      </div>
    </div>
  ) : !id || !data ? (
    <div className={showAsModal ? "px-6 py-6" : ""}>
      {renderStateMessage({
        title: "Brand mapping not found",
        description: "The selected shop brand record could not be loaded.",
        tone: "danger",
      })}
    </div>
  ) : (
    <div
      className={
        showAsModal
          ? "max-h-[calc(100vh-4rem)] overflow-y-auto"
          : "space-y-5"
      }
    >
      {showAsModal ? (
        <section className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={brandName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Tag className="h-8 w-8 text-slate-400" />
                )}
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
                  <Tag className="h-3.5 w-3.5" />
                  View My Brand
                </div>

                <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
                  {brandName}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Shop brand mapping details.
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                    Key: {brandKey}
                  </span>

                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                    Shop: {shopName}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${
                      data.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {data.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>

              <button
                type="button"
                onClick={handleBack}
                title="Close"
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-card bg-gradient-primary p-5 text-white shadow-xl md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(650px_260px_at_10%_0%,rgba(255,255,255,0.22),transparent_65%)]" />

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                <Tag className="h-3.5 w-3.5" />
                View My Brand
              </div>

              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                {brandName}
              </h1>

              <p className="mt-1 text-sm text-white/80">
                Shop brand mapping details.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>
          </div>
        </section>
      )}

      <div className={showAsModal ? "space-y-4 p-4 md:p-5" : ""}>
        <section
          className={
            showAsModal
              ? "grid grid-cols-1 gap-4 lg:grid-cols-[250px_1fr]"
              : "grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]"
          }
        >
          <div className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={brandName}
                  className={
                    showAsModal ? "h-56 w-full object-cover" : "h-72 w-full object-cover"
                  }
                />
              ) : (
                <div
                  className={`flex w-full items-center justify-center ${
                    showAsModal ? "h-56" : "h-72"
                  }`}
                >
                  <Tag className="h-14 w-14 text-slate-400" />
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

            {showAsModal && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Created By
                </p>

                <p className="mt-1 text-sm font-medium text-slate-900">
                  {data.createdBy?.type || "-"}
                </p>

                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Role: {data.createdBy?.role || "-"}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-violet-600" />

                <h2 className="text-lg font-black text-slate-900">
                  Brand Information
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Info label="Brand Name" value={brand?.name || "-"} />
                <Info label="Brand ID" value={brand?._id || "-"} />
                <Info label="Brand Key" value={brandKey} />
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
                <Info label="Shop Name" value={shopName} />
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

  if (showAsModal) {
    return (
      <div
        className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm"
        onMouseDown={onClose}
      >
        <div
          className="relative z-10 my-4 w-full max-w-4xl overflow-hidden rounded-card border border-slate-200 bg-white shadow-2xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">{content}</div>
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

