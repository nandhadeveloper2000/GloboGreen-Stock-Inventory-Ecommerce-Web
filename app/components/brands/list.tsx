"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type SelectedShop = {
  _id?: string;
  id?: string;
  shopName?: string;
  name?: string;
};

type BrandData = {
  _id: string;
  name?: string;
  nameKey?: string;
  isActive?: boolean;
  image?: {
    url?: string;
    publicId?: string;
    public_id?: string;
  };
};

type ShopBrandMap = {
  _id: string;
  shopId?:
    | string
    | {
        _id?: string;
        shopName?: string;
        name?: string;
        code?: string;
        shopType?: string;
      };
  brandId?: string | BrandData;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const SELECTED_SHOP_KEY = "selected_shop_id_web";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "" };
  }

  const raw = window.localStorage.getItem(SELECTED_SHOP_KEY);

  if (!raw) {
    return { id: "", name: "" };
  }

  try {
    const parsed = JSON.parse(raw) as SelectedShop | string;

    if (typeof parsed === "string") {
      return { id: parsed, name: "" };
    }

    return {
      id: parsed?._id || parsed?.id || "",
      name: parsed?.shopName || parsed?.name || "",
    };
  } catch {
    return { id: raw, name: "" };
  }
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;

    return response?.data?.message || fallback;
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

function getBrand(row: ShopBrandMap): BrandData | null {
  if (row.brandId && typeof row.brandId === "object") {
    return row.brandId;
  }

  return null;
}

function getImageUrl(row: ShopBrandMap) {
  return getBrand(row)?.image?.url || "";
}

function getStatusClass(isActive: boolean) {
  return isActive ? "premium-badge-active" : "premium-badge-inactive";
}

export default function MyBrandListPage() {
  const router = useRouter();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [rows, setRows] = useState<ShopBrandMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">(
    "ALL"
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deletingId, setDeletingId] = useState("");

  const syncSelectedShop = useCallback(() => {
    const shop = readSelectedShop();
    setSelectedShopId(shop.id);
    setShopName(shop.name || "Selected Shop");
  }, []);

  const fetchRows = useCallback(
    async (isRefresh = false) => {
      if (!selectedShopId) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const api = SummaryApi.shopBrandMapByShop;

        const response = await apiClient.request<ApiResponse<ShopBrandMap[]>>({
          method: api.method,
          url: api.url(selectedShopId),
        });

        setRows(Array.isArray(response.data.data) ? response.data.data : []);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Failed to fetch shop brands"));
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedShopId]
  );

  useEffect(() => {
    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const brand = getBrand(row);
      const brandName = brand?.name || "";
      const brandKey = brand?.nameKey || "";

      const matchesSearch =
        !keyword ||
        brandName.toLowerCase().includes(keyword) ||
        brandKey.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && row.isActive) ||
        (statusFilter === "INACTIVE" && !row.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.isActive).length;

    return {
      total: rows.length,
      active,
      inactive: rows.length - active,
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
  }, [search, statusFilter, selectedShopId]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  async function handleDelete(id: string) {
    try {
      setDeletingId(id);

      const api = SummaryApi.shopBrandMapDelete;

      await apiClient.request({
        method: api.method,
        url: api.url(id),
      });

      toast.success("Brand removed from shop");
      setRows((prev) => prev.filter((row) => row._id !== id));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete brand"));
    } finally {
      setDeletingId("");
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="premium-card-solid w-full px-8 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary-soft-2 border-t-primary">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>

            <p className="mt-4 text-sm font-semibold text-secondary-text">
              Loading brands...
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
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(46,49,146,0.14)] bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <Tag className="h-3.5 w-3.5" />
                  Shop Owner Panel
                </div>

                <h1 className="mt-3 text-[24px] font-bold tracking-tight text-heading md:text-[26px]">
                  My Brands
                </h1>

                <p className="mt-1.5 text-[13px] text-secondary-text">
                  Manage brand records for the currently selected shop.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-token bg-soft-token px-3 text-[12px] font-semibold text-primary-text">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    {shopName || "No shop selected"}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-primary-soft px-3 text-[12px] font-semibold text-primary">
                    Total: {stats.total}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-success-soft px-3 text-[12px] font-semibold text-success-dark">
                    Active: {stats.active}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-danger-soft px-3 text-[12px] font-semibold text-danger">
                    Inactive: {stats.inactive}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchRows(true)}
                  className="premium-btn-secondary h-10 rounded-lg px-4 py-0 text-[13px]"
                >
                  <RefreshCw
                    className={classNames(
                      "h-4 w-4",
                      refreshing && "animate-spin"
                    )}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/shopowner/brands/create")}
                  className="premium-btn h-10 rounded-lg px-4 py-0 text-[13px]"
                >
                  <Plus className="h-4 w-4" />
                  Add Brand
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_160px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by brand name or brand key"
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                />
              </div>

              <div className="flex h-10 flex-col items-center justify-center rounded-lg border border-[rgba(46,49,146,0.18)] bg-primary-soft px-3 text-center">
                <span className="text-[10px] font-semibold text-secondary-text">
                  Search by
                </span>

                <span className="text-[12px] font-bold text-primary">
                  Brand / Key
                </span>
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "ALL" | "ACTIVE" | "INACTIVE"
                  )
                }
                className="premium-select h-10 rounded-lg px-3 text-[13px]"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <p className="mt-2.5 text-[11px] text-secondary-text">
              Search also matches brand keys across mapped shop records.
            </p>
          </div>

          {!selectedShopId ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Store className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No shop selected
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Select a shop first to view brands linked to that shop.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Tag className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No brands found
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Add a brand or adjust the search and status filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse">
                  <thead className="bg-soft-token">
                    <tr>
                      {[
                        "S.No",
                        "Image",
                        "Brand",
                        "Brand Key",
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
                      const brand = getBrand(row);
                      const imageUrl = getImageUrl(row);
                      const brandName = brand?.name || "Unnamed Brand";
                      const brandKey = brand?.nameKey || "-";
                      const isDeleting = deletingId === row._id;

                      return (
                        <tr
                          key={row._id}
                          className="transition hover:bg-primary-soft/60"
                        >
                          <td className="px-3 py-3 text-[12px] text-secondary-text">
                            {page * rowsPerPage + index + 1}
                          </td>

                          <td className="px-3 py-3">
                            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-token bg-soft-token">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={brandName}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-muted-text" />
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <div className="text-[12px] font-semibold text-heading">
                              {brandName}
                            </div>

                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            {brandKey}
                          </td>

                          <td className="px-3 py-3">
                            <span className={getStatusClass(row.isActive)}>
                              {row.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/shopowner/brands/view?id=${row._id}`)
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-secondary-text transition hover:bg-primary-soft hover:text-primary"
                                title="View"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/shopowner/brands/edit/${row._id}`)
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-secondary-text transition hover:bg-primary-soft hover:text-primary"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => void handleDelete(row._id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
                                title="Delete"
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

              <div className="flex flex-col gap-3 border-t border-token bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex flex-wrap items-center justify-end gap-3 text-[12px] text-secondary-text">
                  <span className="font-medium text-primary-text">
                    Rows per page:
                  </span>

                  <select
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setPage(0);
                    }}
                    className="h-8 rounded-md border border-token bg-white px-2 text-[12px] font-semibold text-primary-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>

                  <span className="min-w-[78px] text-right font-semibold text-primary-text">
                    {paginationStart}-{paginationEnd} of {filteredRows.length}
                  </span>

                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[16px] font-bold text-secondary-text transition hover:bg-soft-token disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    {"<"}
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages - 1, current + 1)
                      )
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[16px] font-bold text-secondary-text transition hover:bg-soft-token disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    {">"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
