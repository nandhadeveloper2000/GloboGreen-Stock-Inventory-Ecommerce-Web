"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  Loader2,
  Pencil,
  Store,
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

type CategoryData = {
  _id?: string;
  name?: string;
  image?: {
    url?: string;
    publicId?: string;
    public_id?: string;
  };
  isActive?: boolean;
};

type SubCategoryData = {
  _id?: string;
  name?: string;
  image?: {
    url?: string;
    publicId?: string;
    public_id?: string;
  };
  categoryId?: string | CategoryData;
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
  subCategoryId?: SubCategoryData | string;
  createdBy?: {
    type?: string;
    id?: string;
    role?: string;
    ref?: string;
  };
};

type MySubCategoryViewPageProps = {
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

function getSubCategory(data: MapData | null) {
  if (data?.subCategoryId && typeof data.subCategoryId === "object") {
    return data.subCategoryId;
  }

  return null;
}

function getCategory(subCategory: SubCategoryData | null) {
  if (subCategory?.categoryId && typeof subCategory.categoryId === "object") {
    return subCategory.categoryId;
  }

  return null;
}

export default function MySubCategoryViewPage({
  open = true,
  mapId,
  isModal = false,
  onClose,
  onEdit,
}: MySubCategoryViewPageProps = {}) {
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
        if (!cancelled) setLoading(true);

        const api = SummaryApi.shopSubCategoryMapById;

        const response = await apiClient.request<ApiResponse<MapData>>({
          method: api.method,
          url: api.url(id),
        });

        if (!cancelled) {
          setData(response.data?.data || null);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Failed to fetch subcategory"));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
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

    router.push("/shopowner/subcategories/list");
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
      return;
    }

    const editId = data?._id || id;

    if (!editId) return;

    router.push(`/shopowner/subcategories/edit/${editId}`);
  };

  const subCategory = getSubCategory(data);
  const category = getCategory(subCategory);
  const imageUrl = subCategory?.image?.url || "";
  const subCategoryName = subCategory?.name || "Subcategory Details";
  const shopName = data?.shopId?.shopName || data?.shopId?.name || "-";
  const categoryName = category?.name || "-";

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
          Loading subcategory details...
        </p>
      </div>
    </div>
  ) : !id || !data ? (
    <div className={showAsModal ? "px-6 py-6" : ""}>
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        <p className="text-base font-black">Subcategory mapping not found</p>

        <p className="mt-1">
          The selected shop subcategory record could not be loaded.
        </p>
      </div>
    </div>
  ) : (
    <div
      className={
        showAsModal ? "max-h-[calc(100vh-4rem)] overflow-y-auto" : "space-y-4"
      }
    >
      <section
        className={
          showAsModal
            ? "sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-5"
            : "rounded-card border border-slate-200 bg-white p-5 shadow-sm md:p-6"
        }
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={subCategoryName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Boxes className="h-8 w-8 text-slate-400" />
              )}
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
                <Boxes className="h-3.5 w-3.5" />
                View My Subcategory
              </div>

              <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
                {subCategoryName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Shop subcategory mapping details.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                  Category: {categoryName}
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
              title={showAsModal ? "Close" : "Back"}
              aria-label={showAsModal ? "Close" : "Back"}
              className={
                showAsModal
                  ? "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  : "inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              }
            >
              {showAsModal ? (
                <X className="h-4 w-4" />
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <div className={showAsModal ? "space-y-4 p-4 md:p-5" : "space-y-4"}>
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[250px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={subCategoryName}
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="flex h-52 w-full items-center justify-center">
                  <Boxes className="h-12 w-12 text-slate-400" />
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2.5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Status
                </p>

                <p
                  className={`mt-1.5 text-sm font-medium ${
                    data.isActive ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {data.isActive ? "Active" : "Inactive"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Boxes className="h-4.5 w-4.5 text-slate-700" />

                <h2 className="text-base font-black text-slate-900">
                  Subcategory Information
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <Info label="Subcategory Name" value={subCategory?.name || "-"} />
                <Info label="Subcategory ID" value={subCategory?._id || "-"} />
                <Info label="Category" value={categoryName} />
                <Info label="Category ID" value={category?._id || "-"} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Store className="h-4.5 w-4.5 text-slate-700" />

                <h2 className="text-base font-black text-slate-900">
                  Shop Information
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <Info label="Shop Name" value={shopName} />
                <Info label="Shop Code" value={data.shopId?.code || "-"} />
                <Info label="Shop Type" value={data.shopId?.shopType || "-"} />
                <Info label="Shop ID" value={data.shopId?._id || "-"} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4.5 w-4.5 text-slate-700" />

                <h2 className="text-base font-black text-slate-900">
                  Record Details
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <Info label="Created At" value={formatDate(data.createdAt)} />
                <Info label="Updated At" value={formatDate(data.updatedAt)} />
                <Info label="Created By Type" value={data.createdBy?.type || "-"} />
                <Info label="Created By Role" value={data.createdBy?.role || "-"} />
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 wrap-break-word text-[13px] font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}
