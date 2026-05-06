"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import CreateMasterCategoryPage from "./create";

type MasterCategoryItem = {
  _id: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  image?: {
    url?: string;
    publicId?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type MasterCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: MasterCategoryItem[];
  categories?: MasterCategoryItem[];
  masterCategories?: MasterCategoryItem[];
};

type DeleteResponse = {
  success?: boolean;
  message?: string;
};

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  id: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ROWS_PER_PAGE = 10;

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

function getImageUrl(item: MasterCategoryItem) {
  return item.image?.url?.trim() || "";
}

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
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

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
      <XCircle className="h-3.5 w-3.5" />
      Inactive
    </span>
  );
}

function CategoryImage({
  item,
  size = 52,
}: {
  item: MasterCategoryItem;
  size?: number;
}) {
  const imageUrl = getImageUrl(item);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner"
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={item.name || "Category image"}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-400">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
    </div>
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
  variant: "edit" | "delete";
  children: ReactNode;
}) {
  const className =
    variant === "edit"
      ? "border-[#00008b]/15 bg-[#00008b]/5 text-[#00008b] hover:border-[#00008b]/25 hover:bg-[#00008b]/10"
      : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100";

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

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-t border-slate-100">
          <td className="px-4 py-4">
            <div className="h-4 w-8 animate-pulse rounded bg-slate-200" />
          </td>

          <td className="px-4 py-4">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
          </td>

          <td className="px-4 py-4">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          </td>

          <td className="px-4 py-4">
            <div className="h-7 w-28 animate-pulse rounded-full bg-slate-200" />
          </td>

          <td className="px-4 py-4">
            <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
          </td>

          <td className="px-4 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </td>

          <td className="px-4 py-4">
            <div className="mx-auto h-9 w-24 animate-pulse rounded-xl bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function MasterCategoryListPage() {
  const [items, setItems] = useState<MasterCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    DEFAULT_ROWS_PER_PAGE
  );

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
    id: "",
  });

  const fetchMasterCategories = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await apiClient.get<MasterCategoryListResponse>(
        SummaryApi.master_category_list.url,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to fetch master categories");
      }

      const list =
        result.data || result.categories || result.masterCategories || [];

      setItems(Array.isArray(list) ? list : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Unable to load master categories"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMasterCategories(true);
  }, [fetchMasterCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rowsPerPage]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const nameKey = String(item.nameKey || "").toLowerCase();

      return name.includes(q) || nameKey.includes(q);
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * rowsPerPage;

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredItems, rowsPerPage, startIndex]);

  const startEntry = filteredItems.length === 0 ? 0 : startIndex + 1;

  const endEntry =
    filteredItems.length === 0
      ? 0
      : Math.min(startIndex + rowsPerPage, filteredItems.length);

  function handleCreate() {
    setModalState({
      open: true,
      mode: "create",
      id: "",
    });
  }

  function handleEdit(id: string) {
    setModalState({
      open: true,
      mode: "edit",
      id,
    });
  }

  function closeCategoryModal() {
    setModalState({
      open: false,
      mode: "create",
      id: "",
    });
  }

  async function handleCategorySaved() {
    closeCategoryModal();
    await fetchMasterCategories(false);
  }

  async function performDelete(id: string) {
    try {
      setDeletingId(id);

      const deleteUrl =
        typeof SummaryApi.master_category_delete.url === "function"
          ? SummaryApi.master_category_delete.url(id)
          : `${SummaryApi.master_category_delete.url}/${id}`;

      const response = await apiClient.delete<DeleteResponse>(deleteUrl);
      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to delete master category");
      }

      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success(result.message || "Master category deleted successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  }

  function handleDelete(id: string) {
    toast("Delete master category?", {
      description: "This action will permanently remove the selected record.",
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

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-9xl">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                    Product Master Categories
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    All Master Categories in your system are listed here. You can search, filter, edit, or delete any master category.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void fetchMasterCategories(false)}
                  disabled={refreshing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleCreate}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f]"
                >
                  <Plus className="h-4 w-4" />
                  Create Category
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  placeholder="Search by master category name or name key"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                />
              </div>

              <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-700">
                Total:
                <span className="ml-1 text-[#00008b]">
                  {filteredItems.length}
                </span>
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
                      Image
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Name Key
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Created
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {loading ? (
                    <TableSkeleton />
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Search className="h-7 w-7" />
                          </div>

                          <h3 className="mt-4 text-base font-black text-slate-950">
                            No master categories found
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {search.trim()
                              ? "Try another search keyword."
                              : "Start by creating your first master category."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => (
                      <tr
                        key={item._id}
                        className="border-t border-slate-100 transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4 text-sm font-black text-slate-700">
                          {startIndex + index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <CategoryImage item={item} size={52} />
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-slate-950">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            Updated: {formatDate(item.updatedAt)}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                            {item.nameKey || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge active={item.isActive} />
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                          {formatDate(item.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <ActionButton
                              label="Edit"
                              variant="edit"
                              onClick={() => handleEdit(item._id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </ActionButton>

                            <ActionButton
                              label="Delete"
                              variant="delete"
                              onClick={() => handleDelete(item._id)}
                              disabled={deletingId === item._id}
                            >
                              {deletingId === item._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))
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
                  <div className="flex gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-slate-200" />

                    <div className="flex-1">
                      <div className="h-4 w-32 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
                      <div className="mt-3 h-8 w-full rounded-xl bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400">
                  <Search className="h-7 w-7" />
                </div>

                <h3 className="mt-4 text-base font-black text-slate-950">
                  No master categories found
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {search.trim()
                    ? "Try another search keyword."
                    : "Start by creating your first master category."}
                </p>
              </div>
            ) : (
              paginatedItems.map((item, index) => (
                <div
                  key={item._id}
                  className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start gap-3">
                    <CategoryImage item={item} size={56} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            #{startIndex + index + 1}
                          </p>

                          <h4 className="mt-1 truncate text-sm font-black text-slate-950">
                            {item.name}
                          </h4>
                        </div>

                        <StatusBadge active={item.isActive} />
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Name Key
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-800">
                            {item.nameKey || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Created
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-800">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item._id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#00008b]/15 bg-[#00008b]/5 px-3 text-sm font-bold text-[#00008b] transition hover:bg-[#00008b]/10"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === item._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
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
                  <p className="min-w-21.5 text-right text-sm font-bold text-slate-800">
                    {startEntry}-{endEntry} of {filteredItems.length}
                  </p>

                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1 || filteredItems.length === 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &lt;
                  </button>

                  <button
                    type="button"
                    aria-label="Next page"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages)
                      )
                    }
                    disabled={
                      currentPage === totalPages || filteredItems.length === 0
                    }
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

      {modalState.open ? (
        <div
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={closeCategoryModal}
        >
          <div
            className="relative my-2 w-full max-w-5xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
              <div>
                <h2 className="text-base font-black text-slate-950">
                  {modalState.mode === "edit"
                    ? "Edit Master Category"
                    : "Create Master Category"}
                </h2>

                <p className="text-xs font-semibold text-slate-500">
                  Complete category details inside this popup.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCategoryModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <CreateMasterCategoryPage
              key={`${modalState.mode}-${modalState.id || "new"}`}
              mode={modalState.mode}
              masterCategoryId={modalState.id}
              isModal
              onClose={closeCategoryModal}
              onSuccess={handleCategorySaved}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}