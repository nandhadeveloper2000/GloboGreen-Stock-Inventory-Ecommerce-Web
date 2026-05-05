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
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import CreateProductPage from "./create";

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
  sku?: string;
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
  products?: ProductItem[];
};

type ActionResponse = {
  success?: boolean;
  message?: string;
  data?: ProductItem;
};

const ITEMS_PER_PAGE = 12;

function getErrorMessage(error: unknown, fallback: string) {
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

  if (error instanceof Error && error.message) return error.message;

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
    (item.images?.length ?? 0) > 0 ||
    (item.productInformation?.length ?? 0) > 0;

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
  if (item.configurationMode === "variant") return "Variant";

  if (item.configurationMode === "variantCompatibility") {
    return "Variant + Compatibility";
  }

  if (item.configurationMode === "productMediaInfoCompatibility") {
    return "Media + Info + Compatibility";
  }

  if (item.configurationMode === "productMediaInfo") {
    return "Media + Product Info";
  }

  if (hasVariants(item) && hasCompatibility(item)) {
    return "Variant + Compatibility";
  }

  if (hasVariants(item)) return "Variant";

  if (hasSharedMedia(item) && hasCompatibility(item)) {
    return "Media + Info + Compatibility";
  }

  if (hasSharedMedia(item)) return "Media + Product Info";

  if (hasCompatibility(item)) return "Compatibility";

  return "Basic";
}

function getPreviewImageUrl(item: ProductItem) {
  const primaryImage = item.images
    ?.find((image) => image.url?.trim())
    ?.url?.trim();

  if (primaryImage) return primaryImage;

  for (const variant of item.variant || []) {
    const variantImage = variant.images
      ?.find((image) => image.url?.trim())
      ?.url?.trim();

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
        .map((attribute) => `${attribute.label || ""} ${attribute.value || ""}`)
        .join(" ");

      const productInfoText = (variant.productInformation || [])
        .map((section) =>
          [
            section.title || "",
            ...(section.fields || []).map(
              (field) => `${field.label || ""} ${field.value || ""}`
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
          (field) => `${field.label || ""} ${field.value || ""}`
        ),
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");

  return [
    item.itemName,
    item.sku,
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

  if (normalized === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (normalized === "REJECTED") return "bg-rose-50 text-rose-700";

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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconWrapClassName}`}
        >
          {icon}
        </div>
      </div>
    </section>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
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
            <div className="h-14 w-14 rounded-xl bg-slate-200" />
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
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="h-3 w-14 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-24 rounded bg-slate-100" />
              </div>
            ))}
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
      <Link href={href} aria-label={label} title={label} className={sharedClassName}>
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
  deletingId,
  togglingId,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  item: ProductItem;
  index: number;
  startIndex: number;
  deletingId: string | null;
  togglingId: string | null;
  onEdit: (item: ProductItem) => void;
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
          #{startIndex + index + 1}
        </div>

        <div className="flex items-center gap-2">
          <ActionIconButton
            onClick={() => onEdit(item)}
            label={`Edit ${item.itemName}`}
            className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </ActionIconButton>

          <ActionIconButton
            onClick={() => onToggleStatus(item)}
            disabled={isToggling}
            label={active ? `Deactivate ${item.itemName}` : `Activate ${item.itemName}`}
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
            onClick={() => onDelete(item._id)}
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
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {previewImage ? (
            <img src={previewImage} alt={item.itemName} className="h-full w-full object-cover" />
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
              {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
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
            SKU No: {item.sku || "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Brand
            </p>
            <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-slate-800">
              {getBrandName(item)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Model
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{getModelName(item)}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Configuration
          </p>
          <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-800">
            {getConfigurationLabel(item)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
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
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-600">
        Showing <span className="font-bold text-slate-900">{showingFrom}</span>{" "}
        to <span className="font-bold text-slate-900">{showingTo}</span> of{" "}
        <span className="font-bold text-slate-900">{totalEntries}</span> entries
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 1 || totalEntries === 0}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <div className="inline-flex h-9 min-w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
          {totalEntries === 0 ? 0 : currentPage} / {totalPages || 1}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={currentPage === totalPages || totalEntries === 0}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ProductFormModal({
  open,
  mode,
  productId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  productId: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className="my-4 w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {mode === "edit" ? "Edit Product" : "Create Product"}
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Complete product details inside this popup.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Close product form"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <CreateProductPage
          key={`${mode}-${productId || "new"}`}
          mode={mode}
          productId={productId}
          isModal
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}

export default function ProductListPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [productModal, setProductModal] = useState<{
    mode: "create" | "edit";
    productId: string;
  } | null>(null);

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

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load products");
      }

      const list = result.data || result.products || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load products"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const closeProductModal = useCallback(() => {
    setProductModal(null);
  }, []);

  const handleProductSaved = useCallback(async () => {
    setProductModal(null);
    await fetchProducts(false);
  }, [fetchProducts]);

  useEffect(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    if (!productModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [productModal]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => buildSearchText(item).includes(q));
  }, [items, search]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => isProductActive(item)).length,
      variants: items.filter((item) => hasVariants(item)).length,
      media: items.filter((item) => hasSharedMedia(item)).length,
    }),
    [items]
  );

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, startIndex]);

  function handleDelete(id: string) {
    if (!id) {
      toast.error("Invalid product id");
      return;
    }

    toast("Delete product?", {
      description: "This action will permanently remove the selected product.",
      action: {
        label: deletingId === id ? "Deleting..." : "Delete",
        onClick: () => {
          void performDelete(id);
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => undefined,
      },
      duration: 5000,
    });
  }

  async function performDelete(id: string) {
    try {
      setDeletingId(id);

      const deleteUrl =
        typeof SummaryApi.product_delete.url === "function"
          ? SummaryApi.product_delete.url(id)
          : `${SummaryApi.product_delete.url}/${id}`;

      const response = await apiClient.delete<ActionResponse>(deleteUrl);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to delete product");
      }

      toast.success(response.data.message || "Product deleted successfully");
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
          isActiveGlobal: nextStatus,
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update product");
      }

      toast.success(
        response.data.message ||
          `Product ${nextStatus ? "activated" : "deactivated"} successfully`
      );

      setItems((prev) =>
        prev.map((row) =>
          row._id === item._id
            ? {
                ...row,
                isActive: nextStatus,
                isActiveGlobal: nextStatus,
              }
            : row
        )
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update product status"));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-3 py-3 sm:px-4 lg:px-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5 md:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#00008b]/20 bg-[#00008b]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00008b]">
                <Sparkles className="h-3.5 w-3.5" />
                Product Management
              </span>

              <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                Products
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                View, search, activate, deactivate, and delete product records.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchProducts(false)}
                disabled={refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => setProductModal({ mode: "create", productId: "" })}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#000070] hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create Product
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Products"
            value={stats.total}
            icon={<Package2 className="h-5 w-5" />}
            iconWrapClassName="bg-[#00008b]/10 text-[#00008b]"
          />

          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconWrapClassName="bg-emerald-100 text-emerald-700"
          />

          <StatCard
            title="With Variants"
            value={stats.variants}
            icon={<Boxes className="h-5 w-5" />}
            iconWrapClassName="bg-indigo-100 text-indigo-700"
          />

          <StatCard
            title="With Media"
            value={stats.media}
            icon={<ImageIcon className="h-5 w-5" />}
            iconWrapClassName="bg-sky-100 text-sky-700"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00008b] text-white shadow-sm">
                <Package2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Product Directory
                </h2>
                <p className="text-sm text-slate-500">
                  Search by product, SKU, brand, model, configuration, variant, or product info.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10"
              />
            </div>
          </div>
        </section>

        <section>
          {loading ? (
            <CardGridSkeleton />
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Search className="h-8 w-8" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No products found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search.trim()
                  ? "Try adjusting your search keyword."
                  : "Start by creating your first product."}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {search.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b]"
                  >
                    Clear Search
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setProductModal({ mode: "create", productId: "" })}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-semibold text-white transition hover:bg-[#000070]"
                >
                  <Plus className="h-4 w-4" />
                  Create Product
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {paginatedItems.map((item, index) => (
                  <ProductCard
                    key={item._id}
                    item={item}
                    index={index}
                    startIndex={startIndex}
                    deletingId={deletingId}
                    togglingId={togglingId}
                    onEdit={(product) =>
                      setProductModal({ mode: "edit", productId: product._id })
                    }
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
                itemsPerPage={ITEMS_PER_PAGE}
                onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              />
            </>
          )}
        </section>
      </div>
      </div>

      <ProductFormModal
        open={Boolean(productModal)}
        mode={productModal?.mode || "create"}
        productId={productModal?.productId || ""}
        onClose={closeProductModal}
        onSuccess={handleProductSaved}
      />
    </>
  );
}
