/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  FolderTree,
  Layers3,
  Loader2,
  Package2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";
import CreateCategoryPage from "./create";

type CategoryItem = {
  _id?: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  image?: {
    url?: string;
    publicId?: string;
  };
  masterCategoryId?: {
    _id?: string;
    name?: string;
    nameKey?: string;
    isActive?: boolean;
    image?: {
      url?: string;
      publicId?: string;
    };
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: CategoryItem[];
  categories?: CategoryItem[];
};

type DeleteResponse = {
  success?: boolean;
  message?: string;
};

type ToggleResponse = {
  success?: boolean;
  message?: string;
  data?: CategoryItem;
};

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  id: string;
};

const PAGE_SIZE = 10;

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

function getImageUrl(item: CategoryItem) {
  return item.image?.url?.trim() || "";
}

function getMasterCategoryName(item: CategoryItem) {
  return item.masterCategoryId?.name?.trim() || "Unassigned";
}

function getErrorMessage(error: unknown): string {
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-3 p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200" />
              <div className="flex-1">
                <div className="h-3.5 w-36 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-8 w-20 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoryListPage() {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);

  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    mode: "create",
    id: "",
  });

  const fetchCategories = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await apiClient.get<CategoryListResponse>(
        SummaryApi.category_list.url,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to fetch categories");
      }

      const list = result.data || result.categories || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Unable to load categories");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories(true);
  }, [fetchCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const nameKey = item.nameKey?.toLowerCase() || "";
      const masterCategoryName =
        item.masterCategoryId?.name?.toLowerCase() || "";

      return (
        name.includes(q) ||
        nameKey.includes(q) ||
        masterCategoryName.includes(q)
      );
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, startIndex]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.isActive).length,
      inactive: items.filter((item) => !item.isActive).length,
      withImage: items.filter((item) => Boolean(getImageUrl(item))).length,
    }),
    [items]
  );

  const startEntry = filteredItems.length === 0 ? 0 : startIndex + 1;
  const endEntry =
    filteredItems.length === 0
      ? 0
      : Math.min(startIndex + PAGE_SIZE, filteredItems.length);

  function openCreateModal() {
    setModalState({
      open: true,
      mode: "create",
      id: "",
    });
  }

  function openEditModal(id?: string) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid category id");
      return;
    }

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
    await fetchCategories(false);
  }

  async function handleDelete(id?: string) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid category id");
      return;
    }

    toast("Delete category?", {
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

  async function performDelete(id: string) {
    try {
      setDeletingId(id);

      const deleteUrl =
        typeof SummaryApi.category_delete.url === "function"
          ? SummaryApi.category_delete.url(id)
          : `${SummaryApi.category_delete.url}/${id}`;

      const response = await apiClient.delete<DeleteResponse>(deleteUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to delete category");
      }

      toast.success(result.message || "Category deleted successfully");
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(id?: string, currentStatus?: boolean) {
    if (!isValidMongoId(id)) {
      toast.error("Invalid category id");
      return;
    }

    try {
      setTogglingId(id);

      const toggleUrl =
        typeof SummaryApi.category_toggle_active.url === "function"
          ? SummaryApi.category_toggle_active.url(id)
          : `${SummaryApi.category_toggle_active.url}/${id}`;

      const response = await apiClient.put<ToggleResponse>(
        toggleUrl,
        {
          isActive: !currentStatus,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to update category status");
      }

      toast.success(
        result.message ||
          `Category ${
            !currentStatus ? "activated" : "deactivated"
          } successfully`
      );

      setItems((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                isActive: !currentStatus,
              }
            : item
        )
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Status update failed");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-3 sm:px-4 lg:px-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5 md:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00008b]/20 bg-[#00008b]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00008b]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catalog Management
                </div>

                <h2 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                  Categories
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  View, search, edit, activate, deactivate, and delete
                  categories.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchCategories(false)}
                disabled={refreshing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#000070] hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create Category
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Categories"
            value={stats.total}
            icon={<Layers3 className="h-5 w-5" />}
            iconWrapClassName="bg-[#00008b]/10 text-[#00008b]"
          />

          <StatCard
            title="Active"
            value={stats.active}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconWrapClassName="bg-emerald-100 text-emerald-700"
          />

          <StatCard
            title="Inactive"
            value={stats.inactive}
            icon={<XCircle className="h-5 w-5" />}
            iconWrapClassName="bg-rose-100 text-rose-700"
          />

          <StatCard
            title="With Image"
            value={stats.withImage}
            icon={<Package2 className="h-5 w-5" />}
            iconWrapClassName="bg-sky-100 text-sky-700"
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00008b] text-white shadow-sm">
                <FolderKanban className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  Category Directory
                </h3>
                <p className="text-sm text-slate-500">
                  Search by category name, key, or master category.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10"
              />
            </div>
          </div>
        </section>

        <div>
          {loading ? (
            <TableSkeleton />
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FolderTree className="h-8 w-8" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No categories found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search.trim()
                  ? "No records matched your search. Try another keyword."
                  : "No categories are available yet. Create your first category to get started."}
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#000070] hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Create Category
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          S.No
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Category
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Master Category
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Updated
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedItems.map((item, index) => {
                        const imageUrl = getImageUrl(item);
                        const itemId = item._id;
                        const isToggling = togglingId === itemId;
                        const isDeleting = deletingId === itemId;

                        return (
                          <tr
                            key={itemId || `row-${index}`}
                            className="transition-colors hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                              {startIndex + index + 1}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                  {imageUrl ? (
                                    <Image
                                      src={imageUrl}
                                      alt={item.name}
                                      fill
                                      sizes="44px"
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <FolderKanban className="h-5 w-5 text-slate-400" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {item.name}
                                  </p>
                                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                                    Key: {item.nameKey || "-"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="inline-flex items-center gap-2 rounded-full bg-[#00008b]/5 px-2.5 py-1 text-xs font-semibold text-[#00008b]">
                                <FolderTree className="h-3.5 w-3.5" />
                                {getMasterCategoryName(item)}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              {item.isActive ? (
                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm font-medium text-slate-600">
                              <div className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {formatDate(item.updatedAt || item.createdAt)}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleToggleStatus(
                                      itemId,
                                      item.isActive
                                    )
                                  }
                                  disabled={isToggling}
                                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    item.isActive
                                      ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                >
                                  {isToggling ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Power className="h-4 w-4" />
                                  )}
                                  {isToggling
                                    ? "Updating..."
                                    : item.isActive
                                      ? "Deactivate"
                                      : "Activate"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEditModal(itemId)}
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleDelete(itemId)}
                                  disabled={isDeleting}
                                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  {isDeleting ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:hidden">
                {paginatedItems.map((item, index) => {
                  const imageUrl = getImageUrl(item);
                  const itemId = item._id;
                  const isToggling = togglingId === itemId;
                  const isDeleting = deletingId === itemId;

                  return (
                    <div
                      key={itemId || `card-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={item.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <FolderKanban className="h-6 w-6 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-400">
                                  #{startIndex + index + 1}
                                </span>
                                <h3 className="truncate text-sm font-bold text-slate-900">
                                  {item.name}
                                </h3>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">
                                  Key: {item.nameKey || "-"}
                                </p>
                              </div>

                              {item.isActive ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                                  <XCircle className="h-3 w-3" />
                                  Inactive
                                </span>
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                  Master Category
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {getMasterCategoryName(item)}
                                </p>
                              </div>

                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                  Updated
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {formatDate(item.updatedAt || item.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleToggleStatus(
                                    itemId,
                                    item.isActive
                                  )
                                }
                                disabled={isToggling}
                                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  item.isActive
                                    ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {isToggling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                                {isToggling
                                  ? "Updating..."
                                  : item.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditModal(itemId)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(itemId)}
                                disabled={isDeleting}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                {isDeleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {startEntry}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900">
                    {endEntry}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {filteredItems.length}
                  </span>{" "}
                  entries
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalState.open ? (
        <div
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={closeCategoryModal}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeCategoryModal}
              className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <CreateCategoryPage
              key={`${modalState.mode}-${modalState.id || "new"}`}
              mode={modalState.mode}
              categoryId={modalState.id}
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