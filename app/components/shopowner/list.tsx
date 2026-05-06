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
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
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

  if (uploadedAvatar) return uploadedAvatar;

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
    hasTextValue(item.mobile || item.additionalNumber),
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

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-9xl">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#00008b]/5 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#00008b]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Shop Owner Management
                </span>

                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                    Shop Owner List
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Review shop owners, email verification, profile completion,
                    active status, and direct actions.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void fetchShopOwners()}
                  disabled={loading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <Link
                  href={`${panelBasePath}/create`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f]"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Shop Owner
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  placeholder="Search by shop owner name, mobile, username, email, or address"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                />
              </div>

              <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-700">
                Total:
                <span className="ml-1 text-[#00008b]">
                  {filteredData.length}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-70 items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading shop owner records...
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex min-h-70 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <CircleOff className="h-8 w-8 text-slate-400" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                No shop owners found
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                No shop owner matches your current search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-330 w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3">S.No</th>
                    <th className="px-4 py-3">Avatar</th>
                    <th className="px-4 py-3">Shop Owner Name</th>
                    <th className="px-4 py-3">Mobile Number</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email ID</th>
                    <th className="px-4 py-3">Email Status</th>
                    <th className="px-4 py-3">Profile Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
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
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4 font-semibold text-slate-700">
                          {index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                            <Image
                              src={getAvatarSrc(item)}
                              alt={item.name || "Shop Owner Avatar"}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="min-w-40 font-bold text-slate-900">
                            {item.name || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-700">
                          {getMobileNumber(item)}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-700">
                          {item.username || "-"}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-700">
                          <span className="block min-w-55 break-all">
                            {item.email || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
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

                        <td className="px-4 py-4">
                          <div className="min-w-52.5 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-extrabold text-slate-900">
                                {profileMetrics.percent}%
                              </span>

                              <span className="text-xs font-semibold text-slate-500">
                                {profileMetrics.filledCount}/
                                {profileMetrics.totalCount} complete
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

                            <p className="text-xs font-medium text-slate-500">
                              {profileMetrics.emptyCount === 0
                                ? "All sections complete"
                                : `${profileMetrics.emptyCount} section${
                                    profileMetrics.emptyCount === 1 ? "" : "s"
                                  } incomplete`}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex min-w-36.25 items-center gap-3">
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
                              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                                isActive
                                  ? "border-emerald-300 bg-emerald-500 shadow-[0_8px_18px_rgba(16,185,129,0.22)]"
                                  : "border-slate-300 bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                                  isActive ? "translate-x-8" : "translate-x-1"
                                }`}
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                                ) : null}
                              </span>
                            </button>

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                                isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`${panelBasePath}/view?id=${item._id}`}
                              title="View"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            <Link
                              href={`${panelBasePath}/edit/${item._id}`}
                              title="Edit"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={isBusy}
                              title="Delete"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          )}
        </section>
      </div>
    </div>
  );
}