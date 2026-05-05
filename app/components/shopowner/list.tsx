"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CircleOff,
  Eye,
  Loader2,
  MailCheck,
  MailX,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type AppRole = "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF";

type ShopOwnerAddress = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type ShopOwnerDocument = {
  url?: string;
  fileName?: string;
  mimeType?: string;
  bytes?: number;
};

type ShopOwnerListItem = {
  _id: string;
  name: string;
  username: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  verifyEmail?: boolean;
  isActive?: boolean;
  role?: string;
  shopControl?: string;
  address?: ShopOwnerAddress;
  idProof?: ShopOwnerDocument;
  shopIds?: string[];
  validTo?: string | null;
};

type ApiListResponse = {
  success?: boolean;
  message?: string;
  data?: ShopOwnerListItem[];
};

type ApiActionResponse = {
  success?: boolean;
  message?: string;
  data?: ShopOwnerListItem;
};

function normalizeRole(role?: string | null): AppRole {
  const value = String(role || "").trim().toUpperCase();

  if (value === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (value === "MANAGER") return "MANAGER";
  if (value === "SUPERVISOR") return "SUPERVISOR";

  return "STAFF";
}

function getPanelBasePath(role: AppRole) {
  if (role === "MASTER_ADMIN") return "/master/shopowner";
  if (role === "MANAGER") return "/manager/shopowner";
  if (role === "SUPERVISOR") return "/supervisor/shopowner";

  return "/staff/shopowner";
}

function getAvatarSrc(item: ShopOwnerListItem) {
  const uploadedAvatar = String(item.avatarUrl || "").trim();

  if (uploadedAvatar) {
    return uploadedAvatar;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    item.name || "Shop Owner"
  )}&background=2e3192&color=ffffff`;
}

function getMobileNumber(item: ShopOwnerListItem) {
  return String(item.mobile || item.additionalNumber || "").trim() || "-";
}

function hasTextValue(value?: string | null) {
  return String(value || "").trim().length > 0;
}

function getProfileMetrics(item: ShopOwnerListItem) {
  const address = item.address || {};

  const addressComplete = [
    address.state,
    address.district,
    address.taluk,
    address.area,
    address.street,
    address.pincode,
  ].every((value) => hasTextValue(value));

  const documentsComplete =
    hasTextValue(item.avatarUrl) && hasTextValue(item.idProof?.url);

  const trackedSections = [
    hasTextValue(item.name),
    hasTextValue(item.mobile),
    item.verifyEmail === true,
    addressComplete,
    documentsComplete,
  ];

  const totalCount = trackedSections.length;
  const filledCount = trackedSections.filter(Boolean).length;
  const emptyCount = totalCount - filledCount;

  const percent = totalCount
    ? Math.round((filledCount / totalCount) * 100)
    : 0;

  return {
    percent,
    filledCount,
    emptyCount,
    totalCount,
  };
}

function getProfileProgressTone(percent: number) {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 70) return "bg-sky-500";
  if (percent >= 40) return "bg-amber-500";

  return "bg-rose-500";
}

export default function ShopOwnerListPage() {
  const auth = useAuth();
  const accessToken = auth?.accessToken ?? null;

  const currentRole = normalizeRole(
    (auth as { role?: string | null; user?: { role?: string | null } })?.role ||
      (auth as { user?: { role?: string | null } })?.user?.role
  );

  const [data, setData] = useState<ShopOwnerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const panelBasePath = useMemo(
    () => getPanelBasePath(currentRole),
    [currentRole]
  );

  const fetchShopOwners = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setData([]);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${baseURL}${SummaryApi.shopowner_list.url}`, {
        method: SummaryApi.shopowner_list.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = (await response.json().catch(() => ({}))) as ApiListResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load shop owner records");
      }

      setData(Array.isArray(result?.data) ? result.data : []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load shop owner records";

      console.error(error);
      toast.error(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchShopOwners();
  }, [fetchShopOwners]);

  const handleToggleStatus = async (item: ShopOwnerListItem) => {
    if (!accessToken) {
      toast.error("Unauthorized");
      return;
    }

    const currentStatus = item.isActive ?? false;

    try {
      setActionLoading(item._id);

      const response = await fetch(
        `${baseURL}${SummaryApi.shopowner_toggle_active.url(item._id)}`,
        {
          method: SummaryApi.shopowner_toggle_active.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const result =
        (await response.json().catch(() => ({}))) as ApiActionResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Status update failed");
      }

      const nextIsActive = result?.data?.isActive ?? !currentStatus;

      setData((prev) =>
        prev.map((row) =>
          row._id === item._id ? { ...row, isActive: nextIsActive } : row
        )
      );

      toast.success(
        nextIsActive
          ? "Shop owner activated successfully"
          : "Shop owner deactivated successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Status update failed";

      console.error(error);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (item: ShopOwnerListItem) => {
    if (!accessToken) {
      toast.error("Unauthorized");
      return;
    }

    const confirmed = window.confirm("Delete this shop owner?");
    if (!confirmed) return;

    try {
      setActionLoading(item._id);

      const response = await fetch(
        `${baseURL}${SummaryApi.shopowner_delete.url(item._id)}`,
        {
          method: SummaryApi.shopowner_delete.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const result =
        (await response.json().catch(() => ({}))) as ApiActionResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Delete failed");
      }

      toast.success("Shop owner deleted successfully");
      await fetchShopOwners();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";

      console.error(error);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return data;

    return data.filter((item) => {
      const address = item.address || {};

      const searchValues = [
        item.name,
        item.username,
        item.email,
        getMobileNumber(item),
        item.shopControl,
        address.state,
        address.district,
        address.taluk,
        address.area,
        address.street,
        address.pincode,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchValues.includes(term);
    });
  }, [data, search]);

  const totalCount = data.length;
  const verifiedEmailCount = data.filter((item) => item.verifyEmail).length;
  const activeCount = data.filter((item) => item.isActive).length;

  const averageProfileCompletion = useMemo(() => {
    if (data.length === 0) return 0;

    const totalProgress = data.reduce(
      (sum, item) => sum + getProfileMetrics(item).percent,
      0
    );

    return Math.round(totalProgress / data.length);
  }, [data]);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-9xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <ShieldCheck className="h-3.5 w-3.5" />
                Shop Owner Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  Shop Owner List
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  Review all shop owners with quick visibility into email
                  verification, active status, and direct actions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Total</p>
                <p className="mt-2 text-2xl font-bold text-white">{totalCount}</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Email Verified</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {verifiedEmailCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Active</p>
                <p className="mt-2 text-2xl font-bold text-white">{activeCount}</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Avg Profile</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {averageProfileCompletion}%
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-card-solid rounded-card p-4 md:p-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">Directory</h2>

                <p className="text-sm text-slate-500">
                  Search by shop owner name, mobile, username, email, or address.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search shop owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="premium-input pl-11"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading shop owner records...
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <CircleOff className="h-8 w-8 text-slate-400" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                No shop owners found
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                No shop owner matches your current search.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="px-5 py-4 font-semibold">S.No</th>
                      <th className="px-5 py-4 font-semibold">Avatar</th>
                      <th className="px-5 py-4 font-semibold">
                        Shop Owner Name
                      </th>
                      <th className="px-5 py-4 font-semibold">Mobile Number</th>
                      <th className="px-5 py-4 font-semibold">Username</th>
                      <th className="px-5 py-4 font-semibold">Email ID</th>
                      <th className="px-5 py-4 font-semibold">Email Status</th>
                      <th className="px-5 py-4 font-semibold">
                        Profile Progress
                      </th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white">
                    {filteredData.map((item, index) => {
                      const isBusy = actionLoading === item._id;
                      const isActive = item.isActive ?? false;
                      const isEmailVerified = item.verifyEmail ?? false;
                      const profileMetrics = getProfileMetrics(item);
                      const progressTone = getProfileProgressTone(
                        profileMetrics.percent
                      );

                      return (
                        <tr
                          key={item._id}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="px-5 py-4 font-medium text-slate-700">
                            {index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <div className="relative h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                              <Image
                                src={getAvatarSrc(item)}
                                alt={item.name || "Shop Owner Avatar"}
                                fill
                                sizes="44px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="min-w-[180px] wrap-break-word font-semibold text-slate-900">
                              {item.name || "-"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {getMobileNumber(item)}
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {item.username || "-"}
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            <span className="block min-w-[220px] break-all">
                              {item.email || "-"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                                isEmailVerified
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              {isEmailVerified ? (
                                <MailCheck className="h-3.5 w-3.5" />
                              ) : (
                                <MailX className="h-3.5 w-3.5" />
                              )}

                              {isEmailVerified ? "Verified" : "Pending"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="min-w-[220px] space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-slate-900">
                                  {profileMetrics.percent}%
                                </span>

                                <span className="text-xs text-slate-500">
                                  {profileMetrics.filledCount}/
                                  {profileMetrics.totalCount} sections complete
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all ${progressTone}`}
                                  style={{
                                    width: `${profileMetrics.percent}%`,
                                  }}
                                />
                              </div>

                              <p className="text-xs text-slate-500">
                                {profileMetrics.emptyCount === 0
                                  ? "All tracked profile sections are complete."
                                  : `${profileMetrics.emptyCount} section${
                                      profileMetrics.emptyCount === 1 ? "" : "s"
                                    } still incomplete.`}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex min-w-[165px] items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                disabled={isBusy}
                                aria-label={
                                  isActive
                                    ? "Deactivate shop owner"
                                    : "Activate shop owner"
                                }
                                title={
                                  isActive
                                    ? "Click to deactivate"
                                    : "Click to activate"
                                }
                                className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isActive
                                    ? "border-emerald-300 bg-emerald-500 shadow-[0_8px_18px_rgba(16,185,129,0.25)]"
                                    : "border-slate-300 bg-slate-300"
                                }`}
                              >
                                <span
                                  className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                                    isActive
                                      ? "translate-x-9"
                                      : "translate-x-1"
                                  }`}
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                                  ) : null}
                                </span>
                              </button>

                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                  isActive
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`${panelBasePath}/view?id=${item._id}`}
                                title="View"
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 transition hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>

                              <Link
                                href={`${panelBasePath}/edit/${item._id}`}
                                title="Edit"
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 transition hover:bg-slate-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                disabled={isBusy}
                                title="Delete"
                                className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
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
          )}
        </section>
      </div>
    </div>
  );
}