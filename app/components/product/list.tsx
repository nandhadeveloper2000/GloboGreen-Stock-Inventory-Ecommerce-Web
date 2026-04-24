/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Boxes,
  CheckCircle2,
  Cpu,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Package2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type ApiImage = {
  url?: string;
  publicId?: string;
};

type RefItem =
  | string
  | {
      _id?: string;
      id?: string;
      name?: string;
    };

type ProductInformationSection = {
  title?: string;
  fields?: Array<{
    label?: string;
    value?: string;
  }>;
};

type VariantRow = {
  title?: string;
  description?: string;
  images?: ApiImage[];
  productInformation?: ProductInformationSection[];
  attributes?: Array<{
    label?: string;
    value?: string;
  }>;
};

type CompatibilityRow = {
  brandId?: RefItem;
  modelId?: RefItem[];
  notes?: string;
};

type ProductItem = {
  _id: string;
  configurationMode?:
    | "variant"
    | "variantCompatibility"
    | "productMediaInfoCompatibility"
    | "productMediaInfo";
  itemName: string;
  itemModelNumber?: string;
  itemKey?: string;
  searchKeys?: string[];
  brandId?: RefItem | RefItem[];
  modelId?: RefItem | RefItem[];
  images?: ApiImage[];
  compatible?: CompatibilityRow[];
  variant?: VariantRow[];
  productInformation?: ProductInformationSection[];
  approvalStatus?: string;
  isActive?: boolean;
  isActiveGlobal?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ProductListResponse = {
  success?: boolean;
  message?: string;
  data?: ProductItem[];
};

type ActionResponse = {
  success?: boolean;
  message?: string;
  data?: ProductItem;
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

function getErrorMessage(error: unknown, fallback: string) {
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
        ?.message || fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRefName(value?: RefItem | null) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.name || "").trim();
}

function getRefNames(value?: RefItem | RefItem[] | null) {
  if (!value) return [];

  return (Array.isArray(value) ? value : [value])
    .map((item) => getRefName(item))
    .filter(Boolean);
}

function getBrandName(item: ProductItem) {
  return getRefNames(item.brandId).join(", ") || "-";
}

function getModelName(item: ProductItem) {
  return getRefNames(item.modelId).join(", ") || "-";
}

function hasSharedMedia(item: ProductItem) {
  const hasTopLevelMedia =
    (item.images?.length ?? 0) > 0 || (item.productInformation?.length ?? 0) > 0;

  const hasVariantMedia = (item.variant || []).some(
    (variant) =>
      (variant.images?.length ?? 0) > 0 ||
      (variant.productInformation?.length ?? 0) > 0
  );

  return hasTopLevelMedia || hasVariantMedia;
}

function hasVariants(item: ProductItem) {
  return Boolean(item.variant?.length);
}

function hasCompatibility(item: ProductItem) {
  return Boolean(item.compatible?.length);
}

function getConfigurationLabel(item: ProductItem) {
  if (item.configurationMode === "variant") {
    return "Variant";
  }

  if (item.configurationMode === "variantCompatibility") {
    return "Variant & Compatible Brands & Models";
  }

  if (item.configurationMode === "productMediaInfoCompatibility") {
    return "Product Images & Product Information & Compatible Brands & Models";
  }

  if (item.configurationMode === "productMediaInfo") {
    return "Product Images & Product Information";
  }

  if (hasVariants(item) && hasCompatibility(item)) {
    return "Variant & Compatible Brands & Models";
  }

  if (hasVariants(item)) {
    return "Variant";
  }

  if (hasSharedMedia(item) && hasCompatibility(item)) {
    return "Product Images & Product Information & Compatible Brands & Models";
  }

  if (hasSharedMedia(item)) {
    return "Product Images & Product Information";
  }

  if (hasCompatibility(item)) {
    return "Compatible Brands & Models";
  }

  return "Basic";
}

function getPreviewImageUrl(item: ProductItem) {
  const primaryImage = item.images?.find((image) => image.url?.trim())?.url?.trim();
  if (primaryImage) return primaryImage;

  for (const variant of item.variant || []) {
    const variantImage = variant.images?.find((image) => image.url?.trim())?.url?.trim();
    if (variantImage) return variantImage;
  }

  return "";
}

function isProductActive(item: ProductItem) {
  if (typeof item.isActiveGlobal === "boolean") return item.isActiveGlobal;
  return Boolean(item.isActive);
}

function buildSearchText(item: ProductItem) {
  const compatibilityText = (item.compatible || [])
    .map((row) => {
      const brandName = getRefName(row.brandId);
      const modelNames = (row.modelId || [])
        .map((model) => getRefName(model))
        .filter(Boolean)
        .join(" ");

      return `${brandName} ${modelNames} ${row.notes || ""}`.trim();
    })
    .join(" ");

  const variantText = (item.variant || [])
    .map((variant) => {
      const attributeText = (variant.attributes || [])
        .map((attribute) => `${attribute.label || ""} ${attribute.value || ""}`.trim())
        .join(" ");

      const productInfoText = (variant.productInformation || [])
        .map((section) =>
          [
            section.title || "",
            ...(section.fields || []).map(
              (field) => `${field.label || ""} ${field.value || ""}`.trim()
            ),
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ");

      return [
        variant.title || "",
        variant.description || "",
        attributeText,
        productInfoText,
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join(" ");

  const topLevelProductInfoText = (item.productInformation || [])
    .map((section) =>
      [
        section.title || "",
        ...(section.fields || []).map(
          (field) => `${field.label || ""} ${field.value || ""}`.trim()
        ),
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");

  return [
    item.itemName,
    item.itemModelNumber,
    item.itemKey,
    ...(item.searchKeys || []),
    getBrandName(item),
    getModelName(item),
    getConfigurationLabel(item),
    compatibilityText,
    variantText,
    topLevelProductInfoText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getApprovalBadgeClass(status?: string) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "APPROVED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalized === "REJECTED") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-amber-50 text-amber-700";
}

function StatCard({
  title,
  value,
  icon,
  iconWrapClassName,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  iconWrapClassName: string;
}) {
  return (
    <div className="premium-card-solid rounded-3xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{title}</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </h3>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${iconWrapClassName}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="premium-card-solid animate-pulse rounded-3xl p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="h-7 w-12 rounded-full bg-slate-200" />
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-xl bg-slate-200" />
              <div className="h-8 w-8 rounded-xl bg-slate-200" />
              <div className="h-8 w-8 rounded-xl bg-slate-200" />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="h-14 w-14 rounded-[18px] bg-slate-200" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="rounded-[18px] border border-slate-100 bg-slate-50/70 p-3"
              >
                <div className="h-3 w-14 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-24 rounded bg-slate-100" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-7 w-20 rounded-full bg-slate-200" />
            <div className="h-7 w-20 rounded-full bg-slate-200" />
            <div className="h-7 w-20 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionIconButton({
  href,
  onClick,
  disabled = false,
  label,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  className: string;
  children: ReactNode;
}) {
  const sharedClassName = `inline-flex h-8 w-8 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        title={label}
        className={sharedClassName}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={sharedClassName}
    >
      {children}
    </button>
  );
}

function ProductCard({
  item,
  index,
  startIndex,
  basePath,
  deletingId,
  togglingId,
  onToggleStatus,
  onDelete,
}: {
  item: ProductItem;
  index: number;
  startIndex: number;
  basePath: string;
  deletingId: string | null;
  togglingId: string | null;
  onToggleStatus: (item: ProductItem) => void;
  onDelete: (id: string) => void;
}) {
  const previewImage = getPreviewImageUrl(item);
  const active = isProductActive(item);
  const isDeleting = deletingId === item._id;
  const isToggling = togglingId === item._id;
  const variantRows = item.variant?.length ?? 0;
  const compatibleRows = item.compatible?.length ?? 0;
  const sharedMedia = hasSharedMedia(item);

  return (
    <article className="premium-card-solid group relative overflow-hidden rounded-3xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-r from-sky-50/70 via-white to-violet-50/70" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 shadow-sm">
            <span>#{startIndex + index + 1}</span>
          </div>

          <div className="flex items-center gap-2">
            <ActionIconButton
              href={`${basePath}/product/edit/${item._id}`}
              label={`Edit ${item.itemName}`}
              className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </ActionIconButton>

            <ActionIconButton
              onClick={() => void onToggleStatus(item)}
              disabled={isToggling}
              label={
                active
                  ? `Deactivate ${item.itemName}`
                  : `Activate ${item.itemName}`
              }
              className={
                active
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }
            >
              {isToggling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
            </ActionIconButton>

            <ActionIconButton
              onClick={() => void onDelete(item._id)}
              disabled={isDeleting}
              label={`Delete ${item.itemName}`}
              className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </ActionIconButton>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 shadow-sm">
            {previewImage ? (
              <img
                src={previewImage}
                alt={item.itemName}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-5 w-5 text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  active
                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                    : "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                }
              >
                {active ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {active ? "Active" : "Inactive"}
              </span>

              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getApprovalBadgeClass(
                  item.approvalStatus
                )}`}
              >
                {String(item.approvalStatus || "PENDING").toUpperCase()}
              </span>
            </div>

            <h3 className="mt-2 line-clamp-1 text-base font-bold tracking-tight text-slate-900">
              {item.itemName}
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Model No: {item.itemModelNumber || "-"}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Key: {item.itemKey || "-"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[18px] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Brand
              </p>
              <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-slate-800">
                {getBrandName(item)}
              </p>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Model
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Cpu className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{getModelName(item)}</span>
              </p>
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-linear-to-br from-sky-50/70 via-white to-violet-50/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Configuration
            </p>
            <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-800">
              {getConfigurationLabel(item)}
            </p>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Updated
            </p>
            <p className="mt-1.5 text-xs font-semibold text-slate-800">
              {formatDate(item.updatedAt || item.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            <Layers3 className="h-3.5 w-3.5" />
            Variant {variantRows}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Compatible {compatibleRows}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            <ImageIcon className="h-3.5 w-3.5" />
            Media {sharedMedia ? "Yes" : "No"}
          </span>
        </div>
      </div>
    </article>
  );
}

function PaginationFooter({
  currentPage,
  totalPages,
  totalEntries,
  startIndex,
  itemsPerPage,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  startIndex: number;
  itemsPerPage: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo =
    totalEntries === 0 ? 0 : Math.min(startIndex + itemsPerPage, totalEntries);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-600">
        Showing <span className="font-bold text-slate-900">{showingFrom}</span> to{" "}
        <span className="font-bold text-slate-900">{showingTo}</span> of{" "}
        <span className="font-bold text-slate-900">{totalEntries}</span> entries
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 1 || totalEntries === 0}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <div className="inline-flex h-10 min-w-19 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
          {totalEntries === 0 ? 0 : currentPage} / {totalPages || 1}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={currentPage === totalPages || totalEntries === 0}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function ProductListPage() {
  const { role } = useAuth();
  const basePath = getRoleBasePath(role);

  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const itemsPerPage = 12;

  const fetchProducts = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await apiClient.get<ProductListResponse>(
        SummaryApi.product_list.url,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to load products");
      }

      setItems(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load products"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => buildSearchText(item).includes(query));
  }, [items, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalCount = items.length;
  const activeCount = items.filter((item) => isProductActive(item)).length;
  const variantCount = items.filter((item) => hasVariants(item)).length;
  const compatibilityCount = items.filter((item) => hasCompatibility(item)).length;

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await apiClient.delete<ActionResponse>(
        SummaryApi.product_delete.url(id)
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to delete product");
      }

      toast.success(response.data?.message || "Product deleted successfully");
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete product"));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(item: ProductItem) {
    try {
      setTogglingId(item._id);

      const nextStatus = !isProductActive(item);
      const response = await apiClient.put<ActionResponse>(
        SummaryApi.product_update.url(item._id),
        {
          isActive: nextStatus,
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update product");
      }

      toast.success(
        response.data?.message ||
          `Product ${nextStatus ? "activated" : "deactivated"} successfully`
      );

      await fetchProducts(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update product status"));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-5 py-6 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Product Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  Products
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
                  View, search, activate, deactivate, and delete product records
                  with configuration details, category mapping, and compatibility
                  context in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void fetchProducts(false)}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <Link
                href={`${basePath}/product/create`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create Product
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Products"
            value={totalCount}
            icon={<Package2 className="h-5 w-5 text-violet-700" />}
            iconWrapClassName="bg-violet-100"
          />
          <StatCard
            title="Active"
            value={activeCount}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
            iconWrapClassName="bg-emerald-100"
          />
          <StatCard
            title="With Variants"
            value={variantCount}
            icon={<Layers3 className="h-5 w-5 text-amber-700" />}
            iconWrapClassName="bg-amber-100"
          />
          <StatCard
            title="Compatibility Mapped"
            value={compatibilityCount}
            icon={<ShieldCheck className="h-5 w-5 text-sky-700" />}
            iconWrapClassName="bg-sky-100"
          />
        </section>

        <section className="premium-card-solid rounded-3xl p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-[#2e3192] to-[#9116a1] text-white shadow-lg">
                <Search className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
                  Product Directory
                </h2>
                <p className="text-sm text-slate-500">
                  Search by product name, model number, key, brand, or model.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="premium-input pl-11"
              />
            </div>
          </div>
        </section>

        <div>
          {loading ? (
            <CardGridSkeleton />
          ) : filteredItems.length === 0 ? (
            <div className="premium-card-solid rounded-3xl border-dashed border-slate-300 p-12 text-center shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Boxes className="h-10 w-10" />
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                No products found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {search.trim()
                  ? "Try adjusting your search keyword."
                  : "Start by creating your first product."}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                >
                  Clear Search
                </button>

                <Link
                  href={`${basePath}/product/create`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Create Product
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {paginatedItems.map((item, index) => (
                  <ProductCard
                    key={item._id}
                    item={item}
                    index={index}
                    startIndex={startIndex}
                    basePath={basePath}
                    deletingId={deletingId}
                    togglingId={togglingId}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              <PaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                totalEntries={totalEntries}
                startIndex={startIndex}
                itemsPerPage={itemsPerPage}
                onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                onNext={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
