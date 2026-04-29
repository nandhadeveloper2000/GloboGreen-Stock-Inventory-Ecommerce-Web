"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  XCircle,
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

function getSelectedShopId() {
  if (typeof window === "undefined") return "";

  const raw = localStorage.getItem(SELECTED_SHOP_KEY);

  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw) as SelectedShop | string;

    if (typeof parsed === "string") return parsed;

    return parsed?._id || parsed?.id || "";
  } catch {
    return raw;
  }
}

function getSelectedShopName() {
  if (typeof window === "undefined") return "Selected Shop";

  const raw = localStorage.getItem(SELECTED_SHOP_KEY);

  if (!raw) return "Selected Shop";

  try {
    const parsed = JSON.parse(raw) as SelectedShop | string;

    if (typeof parsed === "string") return "Selected Shop";

    return parsed?.shopName || parsed?.name || "Selected Shop";
  } catch {
    return "Selected Shop";
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

export default function MyBrandListPage() {
  const router = useRouter();

  const [shopName, setShopName] = useState("Selected Shop");
  const [rows, setRows] = useState<ShopBrandMap[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    setShopName(getSelectedShopName());
  }, []);

  const fetchRows = useCallback(async () => {
    const currentShopId = getSelectedShopId();

    if (!currentShopId) {
      setRows([]);
      setLoading(false);
      toast.error("Please select a shop first");
      return;
    }

    try {
      setLoading(true);

      const api = SummaryApi.shopBrandMapByShop;

      const response = await apiClient.request<ApiResponse<ShopBrandMap[]>>({
        method: api.method,
        url: api.url(currentShopId),
      });

      setRows(Array.isArray(response.data.data) ? response.data.data : []);
      setSelectedIds([]);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch shop brands"));
      setRows([]);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
        status === "ALL" ||
        (status === "ACTIVE" && row.isActive) ||
        (status === "INACTIVE" && !row.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, status]);

  const allSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedIds.includes(row._id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filteredRows.some((row) => row._id === id))
      );
      return;
    }

    setSelectedIds((prev) => {
      const merged = new Set(prev);

      filteredRows.forEach((row) => merged.add(row._id));

      return Array.from(merged);
    });
  }

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
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete brand"));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="relative overflow-hidden rounded-card bg-[linear-gradient(135deg,#2e3192_0%,#7c1dc9_45%,#ec0677_100%)] p-5 text-white shadow-[0_22px_55px_rgba(46,49,146,0.28)] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.26),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(255,255,255,0.2),transparent_28%)]" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur">
                <Tag className="h-3.5 w-3.5" />
                Shop Owner
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                My Brands
              </h1>

              <p className="mt-1 text-sm font-medium text-white/85">
                Manage brands mapped to {shopName}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/shopowner/my-brand/create")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-900 shadow-[0_12px_25px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Brand
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search brand..."
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <button
                type="button"
                onClick={() => void fetchRows()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          {loading ? (
            <div className="flex min-h-65 items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                Loading brands...
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-65 flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Tag className="h-7 w-7" />
              </div>

              <h2 className="text-base font-black text-slate-900">
                No brands found
              </h2>

              <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
                Add brands to make them available for this shop.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="w-16 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      S.No
                    </th>

                    <th className="w-16 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </th>

                    <th className="w-24 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Image
                    </th>

                    <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Brand
                    </th>

                    <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Brand Key
                    </th>

                    <th className="w-32 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>

                    <th className="w-40 px-4 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row, index) => {
                    const brand = getBrand(row);
                    const imageUrl = getImageUrl(row);
                    const brandName = brand?.name || "Unnamed Brand";
                    const brandKey = brand?.nameKey || "-";
                    const isDeleting = deletingId === row._id;

                    return (
                      <tr
                        key={row._id}
                        className="border-b border-slate-100 transition hover:bg-violet-50/40"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-slate-600">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row._id)}
                            onChange={() => toggleSelect(row._id)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={brandName}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm font-black text-slate-900">
                            {brandName}
                          </div>

                          <div className="mt-0.5 text-xs font-medium text-slate-400">
                            ID: {brand?._id || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm font-bold text-slate-600">
                          {brandKey}
                        </td>

                        <td className="px-4 py-3">
                          {row.isActive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
                              <XCircle className="h-3.5 w-3.5" />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/shopowner/my-brand/view?id=${row._id}`)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/shopowner/my-brand/edit/${row._id}`)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 transition hover:bg-violet-100"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => void handleDelete(row._id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Delete"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
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
          )}
        </section>

        {!loading && filteredRows.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredRows.length} of {rows.length} brands
            </span>

            <span>{selectedIds.length} selected</span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
