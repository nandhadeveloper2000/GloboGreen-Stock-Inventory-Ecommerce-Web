"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Store,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type BrandRef =
  | string
  | {
      _id?: string;
      name?: string;
      nameKey?: string;
      image?: {
        url?: string;
      };
    };

type ModelItem = {
  _id: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
  brandId?: BrandRef;
};

type ApiErrorResponse = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const SELECTED_SHOP_KEY = "selected_shop_id_web";

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as ApiErrorResponse;

  return err?.response?.data?.message || err?.message || fallback;
};

function getBrandName(brand: BrandRef | undefined) {
  if (!brand) return "-";
  if (typeof brand === "string") return brand;
  return brand.name || "-";
}

export default function MyModelCreatePage() {
  const router = useRouter();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiClient({
        method: SummaryApi.model_list.method,
        url: SummaryApi.model_list.url,
        params: {
          limit: 500,
          status: "ACTIVE",
        },
      });

      const rows: ModelItem[] = response.data?.data || [];

      setModels(rows);
      setSelectedIds([]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load models"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const shopId = localStorage.getItem(SELECTED_SHOP_KEY) || "";
    setSelectedShopId(shopId);
  }, []);

  useEffect(() => {
    if (!selectedShopId) return;

    void fetchInitialData();
  }, [selectedShopId, fetchInitialData]);

  const availableModels = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return models.filter((item) => {
      if (!item?._id) return false;
      if (item.isActive === false) return false;

      if (!keyword) return true;

      return `${item.name || ""} ${item.nameKey || ""} ${getBrandName(item.brandId)}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [models, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    setSelectedIds(availableModels.map((item) => item._id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleSubmit = async () => {
    if (!selectedShopId) {
      toast.error("Please select shop first");
      return;
    }

    if (!selectedIds.length) {
      toast.error("Please select at least one model");
      return;
    }

    try {
      setSaving(true);

      await apiClient({
        method: SummaryApi.shopModelMapBulkCreate.method,
        url: SummaryApi.shopModelMapBulkCreate.url,
        data: {
          shopId: selectedShopId,
          modelIds: selectedIds,
        },
      });

      toast.success("Models mapped successfully");
      router.push("/shopowner/my-model/list");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to map models"));
    } finally {
      setSaving(false);
    }
  };

  if (!selectedShopId) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
          Please select a shop before creating my models.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative overflow-hidden rounded-card bg-[linear-gradient(135deg,#2e3192,#ec0677)] p-5 text-white shadow-xl md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(650px_260px_at_10%_0%,rgba(255,255,255,0.22),transparent_65%)]" />

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                <Wrench className="h-3.5 w-3.5" />
                My Model
              </div>

              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                Add Shop Models
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-white/80">
                Select the active models your shop can use for shop products.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/shopowner/my-model/list")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search model or brand..."
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-violet-400 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                disabled={!availableModels.length}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearSelection}
                disabled={!selectedIds.length}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !selectedIds.length}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Save Models
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Store className="h-4 w-4 text-violet-600" />
            Selected Shop ID: {selectedShopId}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          {loading ? (
            <div className="flex h-52 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
            </div>
          ) : availableModels.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <CheckCircle2 className="mb-3 h-9 w-9 text-emerald-500" />

              <h3 className="text-base font-black text-slate-900">
                No models available
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                No active model found.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-155 overflow-auto">
                <table className="w-full min-w-160 border-collapse bg-white text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="w-17.5 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                        S.No
                      </th>

                      <th className="w-21.25 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                        Select
                      </th>

                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                        Model
                      </th>

                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                        Model Key
                      </th>

                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
                        Brand
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {availableModels.map((item, index) => {
                      const selected = selectedIds.includes(item._id);

                      return (
                        <tr
                          key={item._id}
                          onClick={() => toggleSelect(item._id)}
                          className={`cursor-pointer border-b border-slate-100 transition last:border-b-0 ${
                            selected
                              ? "bg-violet-50 hover:bg-violet-100"
                              : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {index + 1}
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(item._id);
                              }}
                              className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                                selected
                                  ? "border-violet-600 bg-violet-600 text-white"
                                  : "border-slate-300 bg-white text-transparent hover:border-violet-400"
                              }`}
                              aria-label={
                                selected ? "Unselect model" : "Select model"
                              }
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <div className="max-w-70 truncate font-black text-slate-900">
                              {item.name}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="max-w-70 truncate text-xs font-semibold text-slate-500">
                              {item.nameKey || "-"}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="max-w-70 truncate text-xs font-semibold text-slate-500">
                              {getBrandName(item.brandId)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
