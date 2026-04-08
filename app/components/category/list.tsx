"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FolderKanban,
  Layers3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  FolderTree,
  CalendarDays,
  Package2,
  Power,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

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

function StatCard({
  title,
  value,
  icon,
  iconWrapClassName,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconWrapClassName: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconWrapClassName}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-1 gap-4 p-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-28 rounded bg-slate-100" />
              </div>
              <div className="h-9 w-24 rounded-full bg-slate-200" />
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

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const nameKey = item.nameKey?.toLowerCase() || "";
      const masterCategoryName = item.masterCategoryId?.name?.toLowerCase() || "";

      return (
        name.includes(q) ||
        nameKey.includes(q) ||
        masterCategoryName.includes(q)
      );
    });
  }, [items, search]);

  const totalCount = items.length;
  const activeCount = items.filter((item) => item.isActive).length;
  const inactiveCount = items.filter((item) => !item.isActive).length;
  const withImageCount = items.filter((item) => Boolean(getImageUrl(item))).length;

  const handleDelete = async (id?: string) => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid category id");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );
    if (!confirmed) return;

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

      toast.success(result?.message || "Category deleted successfully");
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (id?: string, currentStatus?: boolean) => {
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
        result?.message ||
          `Category ${!currentStatus ? "activated" : "deactivated"} successfully`
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
  };

  const handleEdit = (id?: string) => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid category id");
      return;
    }

    router.push(`${basePath}/category/edit/${id}`);
  };

  const handleCreate = () => {
    router.push(`${basePath}/category/create`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(145,22,161,0.08),_transparent_24%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Category List
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage category records, monitor status, and navigate to edit screens
            from one premium dashboard.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-r from-[#082a5e] via-[#5b21b6] to-[#9116a1] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:p-8">
          <div className="absolute inset-0 bg-white/5" />
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
                Categories
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                View, search, edit, activate, deactivate, and delete categories
                with a clean professional admin experience.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchCategories(false)}
                disabled={refreshing}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition duration-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#082a5e] shadow-[0_12px_30px_rgba(255,255,255,0.18)] transition duration-200 hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                Create Category
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Categories"
            value={totalCount}
            icon={<Layers3 className="h-6 w-6 text-violet-700" />}
            iconWrapClassName="bg-violet-100"
          />
          <StatCard
            title="Active"
            value={activeCount}
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-700" />}
            iconWrapClassName="bg-emerald-100"
          />
          <StatCard
            title="Inactive"
            value={inactiveCount}
            icon={<XCircle className="h-6 w-6 text-rose-700" />}
            iconWrapClassName="bg-rose-100"
          />
          <StatCard
            title="With Image"
            value={withImageCount}
            icon={<Package2 className="h-6 w-6 text-sky-700" />}
            iconWrapClassName="bg-sky-100"
          />
        </div>

        <div className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)] md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#082a5e] to-[#9116a1] text-white shadow-lg">
                <FolderKanban className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  Category Directory
                </h3>
                <p className="text-sm text-slate-500">
                  Search by category name, key, or master category.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <TableSkeleton />
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FolderTree className="h-10 w-10" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-900">
                No categories found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search.trim()
                  ? "No records matched your search. Try another keyword."
                  : "No categories are available yet. Create your first category to get started."}
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#082a5e] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01]"
                >
                  <Plus className="h-4 w-4" />
                  Create Category
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/90">
                      <tr className="text-left">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Category
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Master Category
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Status
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Updated
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item, index) => {
                        const imageUrl = getImageUrl(item);
                        const itemId = item._id;
                        const isToggling = togglingId === itemId;
                        const isDeleting = deletingId === itemId;

                        return (
                          <tr
                            key={itemId || `row-${index}`}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                  {imageUrl ? (
                                    <Image
                                      src={imageUrl}
                                      alt={item.name}
                                      fill
                                      sizes="56px"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <FolderKanban className="h-6 w-6 text-slate-400" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {item.name}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-slate-500">
                                    Key: {item.nameKey || "-"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                                <FolderTree className="h-3.5 w-3.5" />
                                {getMasterCategoryName(item)}
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              {item.isActive ? (
                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-5 text-sm font-medium text-slate-600">
                              <div className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {formatDate(item.updatedAt || item.createdAt)}
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleToggleStatus(itemId, item.isActive)
                                  }
                                  disabled={isToggling}
                                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    item.isActive
                                      ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                >
                                  <Power className="h-4 w-4" />
                                  {isToggling
                                    ? "Updating..."
                                    : item.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleEdit(itemId)}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleDelete(itemId)}
                                  disabled={isDeleting}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Trash2 className="h-4 w-4" />
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

              <div className="grid grid-cols-1 gap-5 lg:hidden">
                {filteredItems.map((item, index) => {
                  const imageUrl = getImageUrl(item);
                  const itemId = item._id;
                  const isToggling = togglingId === itemId;
                  const isDeleting = deletingId === itemId;

                  return (
                    <div
                      key={itemId || `card-${index}`}
                      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={item.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            ) : (
                              <FolderKanban className="h-7 w-7 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="truncate text-base font-bold text-slate-900">
                                  {item.name}
                                </h3>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                  Key: {item.nameKey || "-"}
                                </p>
                              </div>

                              {item.isActive ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                                  <XCircle className="h-3 w-3" />
                                  Inactive
                                </span>
                              )}
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl bg-slate-50 p-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                  Master Category
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {getMasterCategoryName(item)}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-slate-50 p-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                  Updated
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                  {formatDate(item.updatedAt || item.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleToggleStatus(itemId, item.isActive)
                                }
                                disabled={isToggling}
                                className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  item.isActive
                                    ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                <Power className="h-4 w-4" />
                                {isToggling
                                  ? "Updating..."
                                  : item.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEdit(itemId)}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(itemId)}
                                disabled={isDeleting}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}