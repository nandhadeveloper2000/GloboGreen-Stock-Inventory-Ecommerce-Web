"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FolderTree,
  Loader2,
  RefreshCw,
  Search,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  type DiscountApplicableItem,
  type DiscountItem,
  formatApplyOnLabel,
  formatDate,
  formatDiscountTypeLabel,
  formatDiscountValue,
  getDiscountStatus,
  readSelectedShop,
} from "./shared";

type DiscountListResponse = {
  success?: boolean;
  message?: string;
  count?: number;
  data?: DiscountItem[];
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function uniqueNames(values: Array<string | undefined>) {
  return Array.from(
    new Set(
      values.map((value) => String(value || "").trim()).filter(Boolean)
    )
  );
}

function summarizeNames(names: string[], fallback: string) {
  if (names.length === 0) return fallback;
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

function getStatusMeta(item: DiscountItem) {
  const status = getDiscountStatus(item);

  if (status === "ACTIVE") {
    return {
      key: status,
      label: "Active",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "SCHEDULED") {
    return {
      key: status,
      label: "Scheduled",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  if (status === "EXPIRED") {
    return {
      key: status,
      label: "Expired",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    key: status,
    label: "Inactive",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  };
}

function buildRuleSummary(item: DiscountItem) {
  const parts: string[] = [];

  if (Number(item.minOrderAmount || 0) > 0) {
    parts.push(`Min order Rs. ${Number(item.minOrderAmount).toFixed(2)}`);
  }

  if (Number(item.maxDiscountAmount || 0) > 0) {
    parts.push(`Max discount Rs. ${Number(item.maxDiscountAmount).toFixed(2)}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "No extra limits";
}

function getApplicableItems(row: DiscountItem) {
  if (!Array.isArray(row.applicableItems)) return [];

  return row.applicableItems.filter(Boolean) as DiscountApplicableItem[];
}

function getTargetDetails(row: DiscountItem) {
  const applyOn = String(row.applyOn || "").trim().toUpperCase();
  const applicableItems = getApplicableItems(row);
  const rawCount = Array.isArray(row.applicableIds) ? row.applicableIds.length : 0;

  if (applyOn === "ORDER") {
    return {
      categoryText: "Entire order",
      subCategoryText: "-",
    };
  }

  if (applyOn === "SUBCATEGORY") {
    const categoryNames = uniqueNames(
      applicableItems.map((item) => item.categoryName)
    );
    const subCategoryNames = uniqueNames(applicableItems.map((item) => item.name));

    return {
      categoryText: summarizeNames(
        categoryNames,
        rawCount > 0 ? `${rawCount} selected` : "-"
      ),
      subCategoryText: summarizeNames(
        subCategoryNames,
        rawCount > 0 ? `${rawCount} selected` : "-"
      ),
    };
  }

  if (applyOn === "CATEGORY") {
    const categoryNames = uniqueNames(applicableItems.map((item) => item.name));

    return {
      categoryText: summarizeNames(
        categoryNames,
        rawCount > 0 ? `${rawCount} selected` : "-"
      ),
      subCategoryText: "All selected category items",
    };
  }

  return {
    categoryText: rawCount > 0 ? `${rawCount} selected` : "-",
    subCategoryText: "-",
  };
}

export default function DiscountListPage() {
  const { accessToken } = useAuth();

  const [selectedShop, setSelectedShop] = useState(readSelectedShop());
  const [rows, setRows] = useState<DiscountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "SCHEDULED" | "EXPIRED" | "INACTIVE"
  >("ALL");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const syncSelectedShop = useCallback(() => {
    setSelectedShop(readSelectedShop());
  }, []);

  useEffect(() => {
    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  const fetchDiscounts = useCallback(
    async (showLoader = true) => {
      if (!accessToken || !selectedShop.id) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const url =
          typeof SummaryApi.discount_list.url === "function"
            ? SummaryApi.discount_list.url({ shopId: selectedShop.id })
            : SummaryApi.discount_list.url;

        const response = await fetch(`${baseURL}${url}`, {
          method: SummaryApi.discount_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const result =
          (await response.json().catch(() => ({}))) as DiscountListResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load discounts");
        }

        setRows(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load discounts"
        );
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShop.id]
  );

  useEffect(() => {
    void fetchDiscounts(true);
  }, [fetchDiscounts]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const status = getDiscountStatus(row);
      const targets = getTargetDetails(row);

      const matchesSearch =
        !keyword ||
        [
          row.code,
          row.description,
          row.discountType,
          row.applyOn,
          formatApplyOnLabel(row.applyOn),
          targets.categoryText,
          targets.subCategoryText,
          buildRuleSummary(row),
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => getDiscountStatus(row) === "ACTIVE").length;
    const scheduled = rows.filter(
      (row) => getDiscountStatus(row) === "SCHEDULED"
    ).length;
    const expired = rows.filter((row) => getDiscountStatus(row) === "EXPIRED").length;

    return {
      total: rows.length,
      active,
      scheduled,
      expired,
    };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  const paginationStart =
    filteredRows.length === 0 ? 0 : page * rowsPerPage + 1;

  const paginationEnd = Math.min(
    filteredRows.length,
    page * rowsPerPage + rowsPerPage
  );

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, rowsPerPage, selectedShop.id]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  function handleDelete(id?: string, code?: string) {
    if (!id) {
      toast.error("Invalid discount id");
      return;
    }

    toast(`Delete ${code || "this discount"}?`, {
      description:
        "This will deactivate the selected discount and hide it from active use.",
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
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    try {
      setDeletingId(id);

      const url =
        typeof SummaryApi.discount_delete.url === "function"
          ? SummaryApi.discount_delete.url(id)
          : SummaryApi.discount_delete.url;

      const response = await fetch(`${baseURL}${url}`, {
        method: SummaryApi.discount_delete.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const result =
        (await response.json().catch(() => ({}))) as DiscountListResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete discount");
      }

      setRows((prev) => prev.filter((row) => row._id !== id));
      toast.success(result.message || "Discount deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete discount"
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="premium-card-solid w-full px-8 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#00008b]/10 border-t-[#00008b]">
              <Loader2 className="h-6 w-6 animate-spin text-[#00008b]" />
            </div>

            <p className="mt-4 text-sm font-semibold text-secondary-text">
              Loading discounts...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="w-full">
        <section className="premium-card-solid overflow-hidden rounded-[20px]">
          <div className="border-b border-token px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#00008b]">
                  <Tag className="h-3.5 w-3.5" />
                  Discount Center
                </div>

                <h1 className="mt-3 text-[24px] font-bold tracking-tight text-heading md:text-[26px]">
                  Discounts and Coupons
                </h1>

                <p className="mt-1.5 text-[13px] text-secondary-text">
                  Review discounts by category and subcategory tree for the
                  currently selected shop.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-token bg-soft-token px-3 text-[12px] font-semibold text-primary-text">
                    <Store className="h-3.5 w-3.5 text-[#00008b]" />
                    {selectedShop.name || "No shop selected"}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-[#00008b]/5 px-3 text-[12px] font-semibold text-[#00008b]">
                    Total: {stats.total}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-700">
                    Active: {stats.active}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-sky-50 px-3 text-[12px] font-semibold text-sky-700">
                    Scheduled: {stats.scheduled}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-amber-50 px-3 text-[12px] font-semibold text-amber-700">
                    Expired: {stats.expired}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchDiscounts(false)}
                  disabled={refreshing || !selectedShop.id}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/25 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={classNames(
                      "h-4 w-4",
                      refreshing && "animate-spin"
                    )}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <Link
                  href="/shopowner/discounts/create"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#00008b] bg-[#00008b] px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#06066f]"
                >
                  <Tag className="h-4 w-4" />
                  Create Discount
                </Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by code, category, subcategory, or description"
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                />
              </div>

              <div className="flex h-10 flex-col items-center justify-center rounded-lg border border-[#00008b]/15 bg-[#00008b]/5 px-3 text-center">
                <span className="text-[10px] font-semibold text-secondary-text">
                  Search by
                </span>

                <span className="text-[12px] font-bold text-[#00008b]">
                  Scope / Tree
                </span>
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "ALL"
                      | "ACTIVE"
                      | "SCHEDULED"
                      | "EXPIRED"
                      | "INACTIVE"
                  )
                }
                className="premium-select h-10 rounded-lg px-3 text-[13px]"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="EXPIRED">Expired</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <p className="mt-2.5 text-[11px] text-secondary-text">
              Search also matches applicable category and subcategory names for
              the selected shop.
            </p>
          </div>

          {!selectedShop.id ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00008b]/5 text-[#00008b]">
                <Store className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No shop selected
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Select a shop first to view discounts linked to that shop.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00008b]/5 text-[#00008b]">
                <FolderTree className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No discounts found
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                {search.trim() || statusFilter !== "ALL"
                  ? "Adjust the search or status filters to see matching discounts."
                  : "Create a discount to start applying offers across your category tree."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse">
                  <thead className="bg-soft-token">
                    <tr>
                      {[
                        "S.No",
                        "Discount Code",
                        "Offer",
                        "Apply On",
                        "Category",
                        "Subcategory",
                        "Validity",
                        "Status",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={classNames(
                            "border-b border-token px-3 py-3 text-[11px] font-bold text-primary-text",
                            heading === "Actions" ? "text-center" : "text-left"
                          )}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-divider bg-card-token">
                    {paginatedRows.map((row, index) => {
                      const status = getStatusMeta(row);
                      const target = getTargetDetails(row);
                      const isDeleting = deletingId === row._id;

                      return (
                        <tr
                          key={row._id}
                          className="transition hover:bg-[#00008b]/5"
                        >
                          <td className="px-3 py-3 text-[12px] text-secondary-text">
                            {page * rowsPerPage + index + 1}
                          </td>

                          <td className="px-3 py-3">
                            <div className="min-w-0">
                              <div className="font-mono text-[12px] font-bold uppercase text-heading">
                                {row.code || "-"}
                              </div>
                              <p className="mt-1 max-w-[260px] text-[11px] leading-5 text-secondary-text">
                                {row.description || "No description added"}
                              </p>
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="text-[12px] font-semibold text-heading">
                              {formatDiscountValue(row)}
                            </div>
                            <p className="mt-1 max-w-[220px] text-[11px] leading-5 text-secondary-text">
                              {formatDiscountTypeLabel(row.discountType)} |{" "}
                              {buildRuleSummary(row)}
                            </p>
                          </td>

                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-2.5 py-1 text-[11px] font-bold text-[#00008b]">
                              <Tag className="h-3.5 w-3.5" />
                              {formatApplyOnLabel(row.applyOn)}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <div className="text-[12px] font-semibold text-heading">
                              {target.categoryText}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="text-[12px] font-semibold text-primary-text">
                              {target.subCategoryText}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="inline-flex items-start gap-2 text-[12px] text-primary-text">
                              <CalendarDays className="mt-0.5 h-4 w-4 text-muted-text" />
                              <div>
                                <div>{formatDate(row.validFrom)}</div>
                                <p className="mt-1 text-[11px] text-secondary-text">
                                  to {formatDate(row.validTo)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDelete(row._id, row.code)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Delete"
                                aria-label="Delete"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-token px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <label className="inline-flex items-center justify-end gap-2 text-[13px] font-semibold text-primary-text">
                    Rows per page:
                    <select
                      value={rowsPerPage}
                      onChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                      }}
                      className="premium-select h-10 rounded-lg px-3 text-[13px]"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center justify-end gap-3">
                    <p className="text-[13px] font-semibold text-primary-text">
                      {paginationStart}-{paginationEnd} of {filteredRows.length}
                    </p>

                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                      disabled={page === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      &lt;
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPage((prev) => Math.min(prev + 1, totalPages - 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
