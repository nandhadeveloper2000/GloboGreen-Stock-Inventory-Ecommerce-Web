"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import {
  countProductTypeFieldGroups,
  countProductTypeFields,
  flattenBuilderFieldText,
  getProductTypeFieldRefId,
  getProductTypeFieldRefName,
  sortProductTypeFieldSections,
} from "@/lib/product-type-fields";
import type {
  ProductTypeFieldBuilderDocument,
  ProductTypeFieldListResponse,
  ProductTypeFieldMutationResponse,
  ProductTypeFieldRef,
} from "@/types/product-type-fields";
import ProductTypeFieldFormModal from "./form-modal";
import ProductTypeFieldViewModal from "./view-modal";

type LookupOption = {
  _id: string;
  name: string;
  isActive?: boolean;
  categoryId?: ProductTypeFieldRef;
  subCategoryId?: ProductTypeFieldRef;
  subcategoryId?: ProductTypeFieldRef;
};

type GenericListResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T[];
  categories?: T[];
  subCategories?: T[];
  productTypes?: T[];
};

type ModalState =
  | {
      open: false;
      mode: "create" | "edit" | "view";
      item: null;
    }
  | {
      open: true;
      mode: "create" | "edit" | "view";
      item: ProductTypeFieldBuilderDocument | null;
    };

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isValidMongoId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
}

function getCategoryName(item: ProductTypeFieldBuilderDocument) {
  const nestedCategoryId =
    typeof item.subcategoryId === "object" && item.subcategoryId
      ? item.subcategoryId.categoryId
      : null;

  return (
    getProductTypeFieldRefName(item.categoryId) ||
    getProductTypeFieldRefName(nestedCategoryId) ||
    "-"
  );
}

function getSubCategoryName(item: ProductTypeFieldBuilderDocument) {
  return getProductTypeFieldRefName(item.subcategoryId) || "-";
}

function getProductTypeName(item: ProductTypeFieldBuilderDocument) {
  return getProductTypeFieldRefName(item.productTypeId) || "-";
}

function getSectionCount(item: ProductTypeFieldBuilderDocument) {
  return sortProductTypeFieldSections(item.sectionHeadings || []).filter(
    (section) => section.isActive !== false || section.groups.length > 0
  ).length;
}

function getBuilderKey(item: ProductTypeFieldBuilderDocument) {
  return (
    getProductTypeFieldRefId(item.productTypeId) ||
    String(item._id || "") ||
    `${getProductTypeName(item)}-${item.updatedAt || item.createdAt || ""}`
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
      <XCircle className="h-3.5 w-3.5" />
      Inactive
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "view" | "edit" | "delete" | "toggleActive" | "toggleInactive" | "download" | "upload";
  children: ReactNode;
}) {
  const className =
    variant === "view"
      ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
      : variant === "edit"
        ? "border-[#00008b]/15 bg-[#00008b]/5 text-[#00008b] hover:bg-[#00008b]/10"
        : variant === "delete"
          ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
          : variant === "toggleActive"
            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : variant === "toggleInactive"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : variant === "download"
                ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export default function ProductTypeFieldListPage() {
  const [items, setItems] = useState<ProductTypeFieldBuilderDocument[]>([]);
  const [categories, setCategories] = useState<LookupOption[]>([]);
  const [subcategories, setSubcategories] = useState<LookupOption[]>([]);
  const [productTypes, setProductTypes] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const workbookInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetRef = useRef<ProductTypeFieldBuilderDocument | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
    item: null,
  });

  const fetchLookups = useCallback(async () => {
    try {
      const [categoryResponse, subcategoryResponse, productTypeResponse] =
        await Promise.all([
          apiClient.get<GenericListResponse<LookupOption>>(
            SummaryApi.category_list.url
          ),
          apiClient.get<GenericListResponse<LookupOption>>(
            SummaryApi.sub_category_list.url
          ),
          apiClient.get<GenericListResponse<LookupOption>>(
            SummaryApi.product_type_list.url
          ),
        ]);

      setCategories(
        (
          categoryResponse.data?.data ||
          categoryResponse.data?.categories ||
          []
        ).filter((item) => item.isActive !== false)
      );
      setSubcategories(
        (
          subcategoryResponse.data?.data ||
          subcategoryResponse.data?.subCategories ||
          []
        ).filter((item) => item.isActive !== false)
      );
      setProductTypes(
        (
          productTypeResponse.data?.data ||
          productTypeResponse.data?.productTypes ||
          []
        ).filter((item) => item.isActive !== false)
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load lookup options"));
      setCategories([]);
      setSubcategories([]);
      setProductTypes([]);
    }
  }, []);

  const fetchItems = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      const response = await apiClient.get<ProductTypeFieldListResponse>(
        SummaryApi.product_type_fields_list.url
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to load Product Type Field Builders"
        );
      }

      setItems(response.data?.data || []);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Unable to load Product Type Field Builders")
      );
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetchLookups(), fetchItems(true)]);
  }, [fetchItems, fetchLookups]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, search]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [
        getProductTypeName(item),
        getCategoryName(item),
        getSubCategoryName(item),
        flattenBuilderFieldText(item),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [items, search]);

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + rowsPerPage);
  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry =
    totalEntries === 0 ? 0 : Math.min(startIndex + rowsPerPage, totalEntries);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function openCreateModal() {
    setModalState({
      open: true,
      mode: "create",
      item: null,
    });
  }

  function openEditModal(item: ProductTypeFieldBuilderDocument) {
    setModalState({
      open: true,
      mode: "edit",
      item,
    });
  }

  function openViewModal(item: ProductTypeFieldBuilderDocument) {
    setModalState({
      open: true,
      mode: "view",
      item,
    });
  }

  function closeModal() {
    setModalState({
      open: false,
      mode: "create",
      item: null,
    });
  }

  async function handleSaved() {
    closeModal();
    await fetchItems(false);
  }

  async function handleToggleStatus(item: ProductTypeFieldBuilderDocument) {
    const productTypeId = getProductTypeFieldRefId(item.productTypeId);

    if (!isValidMongoId(productTypeId)) {
      toast.error("Invalid Product Type id");
      return;
    }

    try {
      setTogglingId(productTypeId);

      const nextStatus = item.isActive !== false ? false : true;
      const response = await apiClient.patch<ProductTypeFieldMutationResponse>(
        SummaryApi.product_type_fields_status.url(productTypeId),
        {
          isActive: nextStatus,
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Failed to update Product Type Field Builder status"
        );
      }

      toast.success(
        response.data?.message ||
          `Product Type Field Builder ${
            nextStatus ? "activated" : "deactivated"
          } successfully`
      );

      setItems((prev) =>
        prev.map((current) =>
          getProductTypeFieldRefId(current.productTypeId) === productTypeId
            ? {
                ...current,
                isActive: nextStatus,
              }
            : current
        )
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to update status"));
    } finally {
      setTogglingId(null);
    }
  }

  function handleDelete(item: ProductTypeFieldBuilderDocument) {
    const productTypeId = getProductTypeFieldRefId(item.productTypeId);

    if (!isValidMongoId(productTypeId)) {
      toast.error("Invalid Product Type id");
      return;
    }

    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            "Delete this Product Type Field Builder?\n\nThis keeps the builder document in the database but marks it inactive."
          );

    if (!confirmed) {
      return;
    }

    void performDelete(productTypeId);
  }

  async function performDelete(productTypeId: string) {
    try {
      setDeletingId(productTypeId);

      const response = await apiClient.delete<ProductTypeFieldMutationResponse>(
        SummaryApi.product_type_fields_delete.url(productTypeId)
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Failed to deactivate Product Type Field Builder"
        );
      }

      toast.success(
        response.data?.message ||
          "Product Type Field Builder deactivated successfully"
      );

      setItems((prev) =>
        prev.map((item) =>
          getProductTypeFieldRefId(item.productTypeId) === productTypeId
            ? {
                ...item,
                isActive: false,
              }
            : item
        )
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownloadWorkbookTemplate(
    item: ProductTypeFieldBuilderDocument
  ) {
    const productTypeId = getProductTypeFieldRefId(item.productTypeId);

    if (!isValidMongoId(productTypeId)) {
      toast.error("Invalid Product Type id");
      return;
    }

    try {
      setDownloadingId(productTypeId);

      const {
        buildProductTypeFieldWorkbookExport,
        buildFieldWorkbookExportFileName,
      } = await import("./form-modal-utils");

      const workbookData = await buildProductTypeFieldWorkbookExport(item);
      const fileName = buildFieldWorkbookExportFileName({
        productTypeName: getProductTypeName(item),
      });
      const blob = new Blob([workbookData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      toast.success("Workbook downloaded with all field data.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to download workbook"));
    } finally {
      setDownloadingId(null);
    }
  }

  function handleUploadWorkbookClick(item: ProductTypeFieldBuilderDocument) {
    uploadTargetRef.current = item;
    workbookInputRef.current?.click();
  }

  async function handleWorkbookFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    const item = uploadTargetRef.current;

    uploadTargetRef.current = null;

    if (!file || !item) {
      return;
    }

    const productTypeId = getProductTypeFieldRefId(item.productTypeId);

    if (!isValidMongoId(productTypeId)) {
      toast.error("Invalid Product Type id");
      return;
    }

    try {
      setUploadingId(productTypeId);

      const {
        parseProductTypeFieldWorkbook,
        importProductTypeFieldCsvRows,
        hasDuplicateFieldKeys,
        cleanBuilderForSave,
        withLocalIds,
      } = await import("./form-modal-utils");

      const rows = await parseProductTypeFieldWorkbook(file);

      if (!rows.length) {
        toast.error("The workbook is empty or has no valid field rows");
        return;
      }

      const imported = importProductTypeFieldCsvRows({
        builder: withLocalIds(item),
        rows,
      });

      const duplicateKey = hasDuplicateFieldKeys(imported.builder);

      if (duplicateKey) {
        toast.error(
          `Duplicate field key "${duplicateKey}" found in the workbook import inside the same group`
        );
        return;
      }

      if (!imported.importedFieldCount) {
        toast.error("No field rows were imported from the workbook");
        return;
      }

      const response = await apiClient.put<ProductTypeFieldMutationResponse>(
        SummaryApi.product_type_fields_update.url(productTypeId),
        cleanBuilderForSave(imported.builder)
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to save imported fields"
        );
      }

      toast.success(
        `Imported ${imported.importedFieldCount} field${
          imported.importedFieldCount === 1 ? "" : "s"
        } and saved successfully`
      );

      await fetchItems(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to import workbook fields"));
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-430">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                  Product Type Field Builders
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  One builder document per product type, with section headings,
                  groups, and dynamic fields saved together.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void fetchItems(false)}
                  disabled={refreshing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f]"
                >
                  <Plus className="h-4 w-4" />
                  Create Product Type Fields
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by product type, category path, section heading, group, or field"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                />
              </div>

              <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-700">
                Total:
                <span className="ml-1 text-[#00008b]">{totalEntries}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      S.No
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Product Type
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Section Headings
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Groups
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Fields
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="px-4 py-4">
                          <div className="h-4 w-8 animate-pulse rounded bg-slate-200" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-4 w-30 animate-pulse rounded bg-slate-200" />
                          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="ml-auto h-9 w-64 animate-pulse rounded-xl bg-slate-200" />
                        </td>
                      </tr>
                    ))
                  ) : totalEntries === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Search className="h-7 w-7" />
                          </div>
                          <h3 className="mt-4 text-base font-black text-slate-950">
                            No Product Type Field Builders found
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {search.trim()
                              ? "Try a different keyword."
                              : "Create your first builder document to get started."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const productTypeId = getProductTypeFieldRefId(item.productTypeId);
                      const isActive = item.isActive !== false;
                      const isToggling = togglingId === productTypeId;
                      const isDeleting = deletingId === productTypeId;
                      const isDownloading = downloadingId === productTypeId;
                      const isUploading = uploadingId === productTypeId;
                      const sectionCount = getSectionCount(item);
                      const groupCount = countProductTypeFieldGroups(item);
                      const fieldCount = countProductTypeFields(item);

                      return (
                        <tr
                          key={getBuilderKey(item) || `${getProductTypeName(item)}-${index}`}
                          className="border-t border-slate-100 transition hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-4 text-sm font-black text-slate-700">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-black text-slate-950">
                              {getProductTypeName(item)}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              {getCategoryName(item)} / {getSubCategoryName(item)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                              {sectionCount}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full border border-[#00008b]/10 bg-[#00008b]/5 px-2.5 py-1 text-xs font-black text-[#00008b]">
                              {groupCount}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                              {fieldCount}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge active={isActive} />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <ActionButton
                                label="View"
                                variant="view"
                                onClick={() => openViewModal(item)}
                              >
                                <Eye className="h-4 w-4" />
                              </ActionButton>

                              <ActionButton
                                label="Edit"
                                variant="edit"
                                onClick={() => openEditModal(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </ActionButton>

                              <ActionButton
                                label="Download Workbook Template"
                                variant="download"
                                disabled={isDownloading || isUploading}
                                onClick={() => void handleDownloadWorkbookTemplate(item)}
                              >
                                {isDownloading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </ActionButton>

                              <ActionButton
                                label="Upload Workbook"
                                variant="upload"
                                disabled={isUploading || isDownloading}
                                onClick={() => handleUploadWorkbookClick(item)}
                              >
                                {isUploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </ActionButton>

                              <ActionButton
                                label={isActive ? "Deactivate" : "Activate"}
                                variant={isActive ? "toggleActive" : "toggleInactive"}
                                disabled={isToggling}
                                onClick={() => void handleToggleStatus(item)}
                              >
                                {isToggling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </ActionButton>

                              <ActionButton
                                label="Delete"
                                variant="delete"
                                disabled={isDeleting}
                                onClick={() => handleDelete(item)}
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                  <div className="mt-3 h-8 w-full rounded-xl bg-slate-100" />
                </div>
              ))
            ) : totalEntries === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-950">
                  No Product Type Field Builders found
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {search.trim()
                    ? "Try a different keyword."
                    : "Create your first builder document to get started."}
                </p>
              </div>
            ) : (
              paginatedItems.map((item, index) => {
                const productTypeId = getProductTypeFieldRefId(item.productTypeId);
                const isActive = item.isActive !== false;
                const isToggling = togglingId === productTypeId;
                const isDeleting = deletingId === productTypeId;
                const isDownloading = downloadingId === productTypeId;
                const isUploading = uploadingId === productTypeId;

                return (
                  <div
                    key={getBuilderKey(item) || `${getProductTypeName(item)}-${index}`}
                    className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                          #{startIndex + index + 1}
                        </p>
                        <h4 className="mt-1 text-sm font-black text-slate-950">
                          {getProductTypeName(item)}
                        </h4>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {getCategoryName(item)} / {getSubCategoryName(item)}
                        </p>
                      </div>

                      <StatusBadge active={isActive} />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <CountCard label="Sections" value={getSectionCount(item)} />
                      <CountCard
                        label="Groups"
                        value={countProductTypeFieldGroups(item)}
                      />
                      <CountCard
                        label="Fields"
                        value={countProductTypeFields(item)}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => openViewModal(item)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-[#00008b]/15 bg-[#00008b]/5 text-[#00008b] transition hover:bg-[#00008b]/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDownloadWorkbookTemplate(item)}
                        disabled={isDownloading || isUploading}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUploadWorkbookClick(item)}
                        disabled={isUploading || isDownloading}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(item)}
                        disabled={isToggling}
                        className={`inline-flex h-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isActive
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={isDeleting}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading ? (
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <label className="inline-flex items-center justify-end gap-2 text-sm font-semibold text-slate-700">
                  Rows per page:
                  <select
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-end gap-3">
                  <p className="min-w-24 text-right text-sm font-bold text-slate-800">
                    {startEntry}-{endEntry} of {totalEntries}
                  </p>

                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safePage === 1 || totalEntries === 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &lt;
                  </button>

                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={safePage === totalPages || totalEntries === 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <input
        ref={workbookInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => void handleWorkbookFileSelected(event)}
        className="hidden"
      />

      {modalState.open ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={closeModal}
        >
          <div
            className="relative w-full max-w-10xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] 2xl:max-w-[104rem]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {modalState.mode === "view" && modalState.item ? (
              <ProductTypeFieldViewModal item={modalState.item} onClose={closeModal} />
            ) : (
              <ProductTypeFieldFormModal
                mode={modalState.mode === "edit" ? "edit" : "create"}
                item={modalState.item}
                categories={categories}
                subcategories={subcategories}
                productTypes={productTypes}
                onClose={closeModal}
                onSuccess={handleSaved}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CountCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}
