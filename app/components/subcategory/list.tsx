"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers3,
  Package2,
  FolderTree,
  Search as SearchIcon,
  CalendarDays,
  Power,
  Sparkles,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

/* ================= TYPES ================= */

type MasterCategoryRef = {
  _id?: string;
  name?: string;
};

type CategoryRef = {
  _id?: string;
  name?: string;
  masterCategoryId?: MasterCategoryRef;
};

type SubCategoryImage = {
  url?: string;
};

type SubCategoryItem = {
  _id?: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  image?: SubCategoryImage;
  categoryId?: CategoryRef;
  updatedAt?: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: SubCategoryItem[];
};

type StatCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconWrapClassName?: string;
};

type ActionButtonProps = {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

/* ================= HELPERS ================= */

const isValidMongoId = (id?: string): id is string =>
  typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

const getImage = (item: SubCategoryItem) => item.image?.url?.trim() || "";

const getCategoryName = (item: SubCategoryItem) =>
  item.categoryId?.name?.trim() || "Unassigned";

const getMasterCategoryName = (item: SubCategoryItem) =>
  item.categoryId?.masterCategoryId?.name?.trim() || "-";

const formatDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

/* ================= COMPONENT ================= */

export default function SubCategoryListPage() {
  const router = useRouter();
  const { role } = useAuth();

  const basePath =
    role === "MANAGER"
      ? "/manager"
      : role === "SUPERVISOR"
      ? "/supervisor"
      : role === "STAFF"
      ? "/staff"
      : "/master";

  const [items, setItems] = useState<SubCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  const fetchSubCategories = useCallback(async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await apiClient.get<ApiResponse>(
        SummaryApi.sub_category_list.url
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to load sub categories");
      }

      setItems(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load sub categories"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubCategories();
  }, [fetchSubCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const values = [
        item.name,
        item.nameKey,
        getCategoryName(item),
        getMasterCategoryName(item),
      ];

      return values.some((value) => value.toLowerCase().includes(q));
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  const totalCount = items.length;
  const activeCount = items.filter((item) => item.isActive).length;
  const inactiveCount = items.filter((item) => !item.isActive).length;
  const withImageCount = items.filter((item) => Boolean(getImage(item))).length;

  const startEntry =
    filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry =
    filteredItems.length === 0
      ? 0
      : Math.min(currentPage * pageSize, filteredItems.length);

  const handleDelete = async (id?: string) => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid sub category id");
      return;
    }

    try {
      setDeletingId(id);

      const res = await apiClient.delete<{ success?: boolean; message?: string }>(
        SummaryApi.sub_category_delete.url(id)
      );

      if (res.data?.success === false) {
        throw new Error(res.data.message || "Delete failed");
      }

      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success("Sub category deleted successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Delete failed"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id?: string, currentStatus?: boolean) => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid sub category id");
      return;
    }

    try {
      setTogglingId(id);

      const nextStatus = !currentStatus;

      const res = await apiClient.put<{ success?: boolean; message?: string }>(
        SummaryApi.sub_category_toggle_active.url(id),
        { isActive: nextStatus }
      );

      if (res.data?.success === false) {
        throw new Error(res.data.message || "Status update failed");
      }

      setItems((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isActive: nextStatus } : item
        )
      );

      toast.success(
        nextStatus
          ? "Sub category activated successfully"
          : "Sub category deactivated successfully"
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Status update failed"));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="page-shell">
            <div className="mx-auto w-full max-w-7xl space-y-5">


        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </span>

              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Sub Categories
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                View, search, edit, activate, deactivate, and delete sub
                categories with a clean, modern, enterprise-grade admin
                experience.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fetchSubCategories(true)}
                disabled={refreshing}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => router.push(`${basePath}/subcategory/create`)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#2e3192] shadow-lg transition hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                Create SubCategory
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Sub Categories"
            value={totalCount}
            icon={<Layers3 className="h-6 w-6 text-[#7c3aed]" />}
            iconWrapClassName="bg-violet-100"
          />
          <StatCard
            title="Active"
            value={activeCount}
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
            iconWrapClassName="bg-emerald-100"
          />
          <StatCard
            title="Inactive"
            value={inactiveCount}
            icon={<XCircle className="h-6 w-6 text-rose-600" />}
            iconWrapClassName="bg-rose-100"
          />
          <StatCard
            title="With Image"
            value={withImageCount}
            icon={<Package2 className="h-6 w-6 text-sky-600" />}
            iconWrapClassName="bg-sky-100"
          />
        </div>

        <section className="premium-card-solid rounded-[30px] p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#5b2bbd] to-[#9116a1] text-white shadow-lg">
                <FolderKanban className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  SubCategory Directory
                </h3>
                <p className="text-sm text-slate-500">
                  Search by sub category name, key, category, or master category.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-md">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sub categories..."
                className="premium-input pl-11"
              />
            </div>
          </div>
        </section>

        <div>
          {loading ? (
            <TableSkeleton />
          ) : filteredItems.length === 0 ? (
            <div className="premium-card-solid rounded-[30px] border-dashed border-slate-300 p-12 text-center shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FolderTree className="h-10 w-10" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-900">
                No sub categories found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search.trim()
                  ? "No records matched your search. Try another keyword."
                  : "No sub categories are available yet. Create your first sub category to get started."}
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push(`${basePath}/subcategory/create`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01]"
                >
                  <Plus className="h-4 w-4" />
                  Create SubCategory
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-[1180px] w-full border-collapse">
                    <thead className="bg-slate-50/90">
                      <tr className="text-left">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          S.No
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          SubCategory
                        </th>
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

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {paginatedItems.map((item, index) => {
                        const itemId = item._id;
                        const imageUrl = getImage(item);
                        const isDeleting = deletingId === itemId;
                        const isToggling = togglingId === itemId;

                        return (
                          <tr
                            key={itemId || item.nameKey}
                            className="transition-colors hover:bg-slate-50/70"
                          >
                            <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                              {(currentPage - 1) * pageSize + index + 1}
                            </td>

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
                                    <FolderTree className="h-5 w-5 text-slate-400" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {item.name}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-slate-500">
                                    Key: {item.nameKey}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              <div className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                                {getCategoryName(item)}
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              <div className="inline-flex items-center rounded-full bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700">
                                {getMasterCategoryName(item)}
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              {item.isActive ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-5 text-sm font-medium text-slate-600">
                              <div className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {formatDate(item.updatedAt)}
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              <div className="flex items-center justify-end gap-2">
                                <ActionButton
                                  label={item.isActive ? "Deactivate" : "Activate"}
                                  onClick={() => handleToggle(itemId, item.isActive)}
                                  icon={
                                    <Power
                                      className={`h-4 w-4 ${
                                        isToggling ? "animate-pulse" : ""
                                      }`}
                                    />
                                  }
                                  className={
                                    item.isActive
                                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }
                                  disabled={isToggling}
                                />

                                <ActionButton
                                  label="Edit"
                                  onClick={() =>
                                    itemId &&
                                    router.push(`${basePath}/subcategory/edit/${itemId}`)
                                  }
                                  icon={<Pencil className="h-4 w-4" />}
                                  className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                  disabled={!itemId}
                                />

                                <ActionButton
                                  label="Delete"
                                  onClick={() => handleDelete(itemId)}
                                  icon={
                                    <Trash2
                                      className={`h-4 w-4 ${
                                        isDeleting ? "animate-pulse" : ""
                                      }`}
                                    />
                                  }
                                  className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                  disabled={isDeleting}
                                />
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
                {paginatedItems.map((item, index) => {
                  const itemId = item._id;
                  const imageUrl = getImage(item);
                  const isDeleting = deletingId === itemId;
                  const isToggling = togglingId === itemId;

                  return (
                    <div
                      key={itemId || item.nameKey}
                      className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
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
                              <FolderTree className="h-5 w-5 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <span className="text-xs font-bold text-slate-400">
                                  #{(currentPage - 1) * pageSize + index + 1}
                                </span>
                                <h4 className="text-base font-bold text-slate-900">
                                  {item.name}
                                </h4>
                                <p className="mt-1 text-sm text-slate-500">
                                  Key: {item.nameKey}
                                </p>
                              </div>

                              {item.isActive ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Inactive
                                </span>
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <InfoChip
                                label="Category"
                                value={getCategoryName(item)}
                              />
                              <InfoChip
                                label="Master Category"
                                value={getMasterCategoryName(item)}
                              />
                              <InfoChip
                                label="Updated"
                                value={formatDate(item.updatedAt)}
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <ActionButton
                                label={item.isActive ? "Deactivate" : "Activate"}
                                onClick={() => handleToggle(itemId, item.isActive)}
                                icon={<Power className="h-4 w-4" />}
                                className={
                                  item.isActive
                                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }
                                disabled={isToggling}
                              />

                              <ActionButton
                                label="Edit"
                                onClick={() =>
                                  itemId &&
                                  router.push(`${basePath}/subcategory/edit/${itemId}`)
                                }
                                icon={<Pencil className="h-4 w-4" />}
                                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                disabled={!itemId}
                              />

                              <ActionButton
                                label="Delete"
                                onClick={() => handleDelete(itemId)}
                                icon={<Trash2 className="h-4 w-4" />}
                                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                disabled={isDeleting}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {startEntry} to {endEntry} of {filteredItems.length} entries
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= REUSABLES ================= */

function StatCard({
  title,
  value,
  icon,
  iconWrapClassName = "bg-slate-100",
}: StatCardProps) {
  return (
    <div className="premium-card-solid rounded-[26px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">
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

function ActionButton({
  label,
  onClick,
  icon,
  className = "",
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="premium-card-solid overflow-hidden rounded-[30px] p-0">
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
