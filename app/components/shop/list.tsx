"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CircleOff,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import { ShopForm } from "@/components/shop/create";
import { ShopViewPanel } from "@/components/shop/view";

type AppRole =
  | "MASTER_ADMIN"
  | "MANAGER"
  | "SUPERVISOR"
  | "STAFF"
  | "SHOP_OWNER"
  | "SHOP_MANAGER"
  | "SHOP_SUPERVISOR"
  | "EMPLOYEE";

type ShopAddress = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type ShopDocument = {
  url?: string;
  publicId?: string;
  public_id?: string;
  mimeType?: string;
  fileName?: string;
  bytes?: number;
};

type ShopOwnerRef = {
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
};

type PrimitiveIdObject = {
  _id?: string;
  id?: string;
  $oid?: string;
};

type AuthUser = {
  _id?: string;
  id?: string;
  role?: string;
  shopIds?: (string | PrimitiveIdObject)[];
  [key: string]: unknown;
};

type ShopListItem = {
  _id: string;
  name?: string;
  shopType?: string;
  businessType?: string;
  isActive?: boolean;
  createdAt?: string;
  mobile?: string;
  email?: string;
  enableGSTBilling?: boolean;
  billingType?: "GST" | "NON_GST" | "BOTH" | string;
  gstNumber?: string;
  frontImageUrl?: string;
  frontImagePublicId?: string;
  gstCertificate?: ShopDocument;
  udyamCertificate?: ShopDocument;
  shopAddress?: ShopAddress;
  shopOwnerAccountId?: string | ShopOwnerRef;
};

type ApiListResponse = {
  success?: boolean;
  message?: string;
  data?: ShopListItem[];
};

type ApiActionResponse = {
  success?: boolean;
  message?: string;
  data?: ShopListItem;
};

type ShopModalState =
  | { type: "create" }
  | { type: "edit"; shopId: string }
  | { type: "view"; shopId: string }
  | null;

function normalizeRole(role?: string | null): AppRole {
  const value = String(role || "").trim().toUpperCase();

  if (value === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (value === "MANAGER") return "MANAGER";
  if (value === "SUPERVISOR") return "SUPERVISOR";
  if (value === "STAFF") return "STAFF";
  if (value === "SHOP_OWNER") return "SHOP_OWNER";
  if (value === "SHOP_MANAGER") return "SHOP_MANAGER";
  if (value === "SHOP_SUPERVISOR") return "SHOP_SUPERVISOR";
  if (value === "EMPLOYEE") return "EMPLOYEE";

  return "STAFF";
}

function hasTextValue(value?: string | null) {
  return String(value || "").trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (isRecord(value)) {
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
    if (typeof value.$oid === "string") return value.$oid;
  }

  return "";
}

function hasDocument(doc?: ShopDocument) {
  return (
    hasTextValue(doc?.url) ||
    hasTextValue(doc?.publicId) ||
    hasTextValue(doc?.public_id) ||
    Number(doc?.bytes || 0) > 0
  );
}

function hasAnyShopDocument(shop: ShopListItem) {
  return hasDocument(shop.gstCertificate) || hasDocument(shop.udyamCertificate);
}

function hasFrontImage(shop: ShopListItem) {
  return (
    hasTextValue(shop.frontImageUrl) ||
    hasTextValue(shop.frontImagePublicId)
  );
}

function isAddressComplete(address?: ShopAddress) {
  return [
    address?.state,
    address?.district,
    address?.taluk,
    address?.area,
    address?.street,
    address?.pincode,
  ].every((value) => hasTextValue(value));
}

function getOwnerRef(shop: ShopListItem) {
  if (shop.shopOwnerAccountId && typeof shop.shopOwnerAccountId === "object") {
    return shop.shopOwnerAccountId;
  }

  return null;
}

function getOwnerId(shop: ShopListItem) {
  if (typeof shop.shopOwnerAccountId === "string") {
    return shop.shopOwnerAccountId;
  }

  return String(getOwnerRef(shop)?._id || "");
}

function getOwnerName(shop: ShopListItem) {
  return String(getOwnerRef(shop)?.name || "Shop Owner");
}

function getOwnerEmail(shop: ShopListItem) {
  return String(getOwnerRef(shop)?.email || "-");
}

function getOwnerMobile(shop: ShopListItem) {
  return String(getOwnerRef(shop)?.mobile || "-");
}

function getCompactAddress(address?: ShopAddress) {
  const parts = [
    address?.area,
    address?.taluk,
    address?.district,
    address?.state,
    address?.pincode,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.join(", ") || "-";
}

function getShopProgressMetrics(shop: ShopListItem) {
  const trackedSections = [
    hasTextValue(shop.name),
    hasTextValue(shop.businessType),
    isAddressComplete(shop.shopAddress),
    hasTextValue(getOwnerId(shop)),
    shop.isActive !== false,
    hasFrontImage(shop),
    hasAnyShopDocument(shop),
  ];

  const totalCount = trackedSections.length;
  const filledCount = trackedSections.filter(Boolean).length;
  const percent = totalCount
    ? Math.round((filledCount / totalCount) * 100)
    : 0;

  return {
    percent,
    filledCount,
    totalCount,
  };
}

function getMissingShopFields(shop: ShopListItem) {
  const missing: string[] = [];

  if (!hasTextValue(shop.name)) missing.push("Shop Name");
  if (!hasTextValue(shop.businessType)) missing.push("Business Type");
  if (!isAddressComplete(shop.shopAddress)) missing.push("Address");
  if (!hasTextValue(getOwnerId(shop))) missing.push("Shop Owner");
  if (shop.isActive === false) missing.push("Active Status");
  if (!hasFrontImage(shop)) missing.push("Front Image");
  if (!hasAnyShopDocument(shop)) missing.push("Shop Document");

  return missing;
}

function getProgressTone(percent: number) {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 70) return "bg-sky-500";
  if (percent >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function CenterModal({
  title,
  maxWidth = "max-w-6xl",
  onClose,
  children,
}: {
  title: string;
  maxWidth?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal overlay"
        onClick={onClose}
      />

      <div
        className={`relative flex max-h-[calc(100vh-1.5rem)] w-full ${maxWidth} flex-col overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] sm:max-h-[calc(100vh-2.5rem)]`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Close popup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/80 p-3 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function DocumentBadge({
  active,
  label,
  icon,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

export default function ShopListPage() {
  const auth = useAuth();
  const accessToken = auth?.accessToken ?? null;

  const authUser = ((auth as { user?: AuthUser | null })?.user ?? null) as
    | AuthUser
    | null;

  const currentRole = normalizeRole(
    (auth as { role?: string | null; user?: { role?: string | null } })?.role ||
      (auth as { user?: { role?: string | null } })?.user?.role
  );

  const [data, setData] = useState<ShopListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ShopModalState>(null);

  const fetchShops = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setData([]);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${baseURL}${SummaryApi.shop_list.url}`, {
        method: SummaryApi.shop_list.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiListResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load shop records");
      }

      const items = Array.isArray(result?.data) ? result.data : [];

      if (currentRole === "SHOP_OWNER") {
        const ownerId = getId(authUser?._id) || getId(authUser?.id);

        const allowedShopIds = Array.isArray(authUser?.shopIds)
          ? authUser.shopIds.map((item) => getId(item)).filter(Boolean)
          : [];

        setData(
          items.filter((shop) => {
            const shopOwnerId =
              typeof shop.shopOwnerAccountId === "string"
                ? shop.shopOwnerAccountId
                : shop.shopOwnerAccountId?._id || "";

            return (
              (!!ownerId &&
                !!shopOwnerId &&
                String(shopOwnerId) === String(ownerId)) ||
              (!!allowedShopIds.length &&
                allowedShopIds.includes(String(shop._id)))
            );
          })
        );
      } else {
        setData(items);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load shop records";

      console.error(error);
      toast.error(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, authUser, currentRole]);

  useEffect(() => {
    void fetchShops();
  }, [fetchShops]);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const handleModalSuccess = useCallback(() => {
    setModal(null);
    void fetchShops();
  }, [fetchShops]);

  const handleToggleStatus = async (shop: ShopListItem) => {
    if (!accessToken) {
      toast.error("Unauthorized");
      return;
    }

    const nextStatus = !(shop.isActive ?? false);

    try {
      setActionLoading(shop._id);

      const response = await fetch(
        `${baseURL}${SummaryApi.shop_update.url(shop._id)}`,
        {
          method: SummaryApi.shop_update.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ isActive: nextStatus }),
        }
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiActionResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Status update failed");
      }

      setData((prev) =>
        prev.map((item) =>
          item._id === shop._id
            ? { ...item, isActive: result?.data?.isActive ?? nextStatus }
            : item
        )
      );

      toast.success(
        nextStatus
          ? "Shop activated successfully"
          : "Shop deactivated successfully"
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

  const handleDelete = async (shop: ShopListItem) => {
    if (!accessToken) {
      toast.error("Unauthorized");
      return;
    }

    try {
      setActionLoading(shop._id);

      const response = await fetch(
        `${baseURL}${SummaryApi.shop_delete.url(shop._id)}`,
        {
          method: SummaryApi.shop_delete.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiActionResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Delete failed");
      }

      setData((prev) => prev.filter((item) => item._id !== shop._id));
      toast.success("Shop deleted successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";

      console.error(error);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredShops = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return data;

    return data.filter((shop) => {
      const progress = getShopProgressMetrics(shop);
      const missingFields = getMissingShopFields(shop);
      const owner = getOwnerRef(shop);

      return [
        shop.name,
        shop.shopType,
        shop.businessType,
        shop.billingType,
        shop.gstNumber,
        shop.mobile,
        shop.email,
        getCompactAddress(shop.shopAddress),
        owner?.name,
        owner?.username,
        owner?.email,
        owner?.mobile,
        `${progress.percent}%`,
        `${progress.filledCount}/${progress.totalCount}`,
        missingFields.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [data, search]);

  const isEmpty = filteredShops.length === 0;

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-9xl">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Shop List
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Review shops, shop owners, billing type, document validation,
                active status, and direct actions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void fetchShops()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-[#00008b] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>

              <button
                type="button"
                onClick={() => setModal({ type: "create" })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#00008b] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(0,0,139,0.22)] transition hover:bg-[#000070]"
              >
                <Plus className="h-4 w-4" />
                Add Shop
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-[calc(100%-120px)]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by shop name, shop owner, mobile, email, business type, address..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10"
              />
            </div>

            <div className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 px-5 text-sm font-extrabold text-slate-950">
              Total: {filteredShops.length}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading shop records...
              </div>
            </div>
          ) : isEmpty ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <CircleOff className="h-8 w-8 text-slate-400" />
              </div>

              <h3 className="text-lg font-extrabold text-slate-900">
                No shops found
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                No shop record matches your current search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-375 w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-[12px] uppercase tracking-[0.04em] text-slate-600">
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      S.No
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Front Image
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Shop Name
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Shop Owner
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Business Type
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Address
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Billing
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Documents
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Shop Progress
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 font-extrabold">
                      Status
                    </th>
                    <th className="border-b border-slate-200 px-4 py-4 text-right font-extrabold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredShops.map((shop, index) => {
                    const isBusy = actionLoading === shop._id;
                    const isActive = shop.isActive !== false;
                    const progress = getShopProgressMetrics(shop);
                    const progressTone = getProgressTone(progress.percent);
                    const missingFields = getMissingShopFields(shop);

                    return (
                      <tr
                        key={shop._id}
                        className="border-b border-slate-100 transition hover:bg-slate-50/80"
                      >
                        <td className="border-b border-slate-100 px-4 py-5 align-middle font-semibold text-slate-700">
                          {index + 1}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          {shop.frontImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={shop.frontImageUrl}
                              alt={shop.name || "Shop"}
                              className="h-11 w-11 rounded-full border border-slate-200 object-cover shadow-sm"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
                              <Building2 className="h-5 w-5" />
                            </div>
                          )}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <div className="min-w-47.5">
                            <button
                              type="button"
                              onClick={() =>
                                setModal({ type: "view", shopId: shop._id })
                              }
                              title={shop.name || "Shop"}
                              className="max-w-57.5 truncate text-left font-extrabold text-slate-950 transition hover:text-[#00008b]"
                            >
                              {shop.name || "Shop"}
                            </button>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {shop.shopType || "-"}
                            </p>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <div className="min-w-57.5">
                            <p className="font-extrabold text-slate-900">
                              {getOwnerName(shop)}
                            </p>

                            <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                              {getOwnerEmail(shop)}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {getOwnerMobile(shop)}
                            </p>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                            {shop.businessType || "-"}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <p className="max-w-70 text-xs font-semibold leading-5 text-slate-600">
                            {getCompactAddress(shop.shopAddress)}
                          </p>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <div className="min-w-32.5 space-y-1">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${
                                shop.billingType === "GST" ||
                                shop.billingType === "BOTH"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {shop.billingType || "NON_GST"}
                            </span>

                            {shop.gstNumber ? (
                              <p className="text-[11px] font-semibold text-slate-500">
                                GST: {shop.gstNumber}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <div className="flex min-w-57.5 flex-wrap gap-2">
                            <DocumentBadge
                              active={hasFrontImage(shop)}
                              label="Front"
                              icon={<ImageIcon className="h-3.5 w-3.5" />}
                            />

                            <DocumentBadge
                              active={hasDocument(shop.gstCertificate)}
                              label="GST"
                              icon={<FileText className="h-3.5 w-3.5" />}
                            />

                            <DocumentBadge
                              active={hasDocument(shop.udyamCertificate)}
                              label="Udyam"
                              icon={<FileText className="h-3.5 w-3.5" />}
                            />
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <div className="min-w-60">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="text-sm font-extrabold text-slate-950">
                                {progress.percent}%
                              </span>

                              <span className="text-xs font-semibold text-slate-500">
                                {progress.filledCount}/{progress.totalCount}{" "}
                                complete
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${progressTone}`}
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>

                            <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-500">
                              {missingFields.length
                                ? `Missing: ${missingFields.join(", ")}`
                                : "All sections complete"}
                            </p>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <div className="flex min-w-32.5 items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(shop)}
                              disabled={isBusy}
                              className={`relative inline-flex h-7 w-14 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                isActive ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                              title={
                                isActive ? "Deactivate Shop" : "Activate Shop"
                              }
                            >
                              <span
                                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                                  isActive
                                    ? "translate-x-8"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${
                                isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-5 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setModal({ type: "view", shopId: shop._id })
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                              title="View Shop"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setModal({ type: "edit", shopId: shop._id })
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                              title="Edit Shop"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(shop)}
                              disabled={isBusy}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              title={
                                isActive ? "Deactivate Shop" : "Activate Shop"
                              }
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(shop)}
                              disabled={isBusy}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Delete Shop"
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

        {modal?.type === "create" ? (
          <CenterModal
            title="Create Shop"
            maxWidth="max-w-7xl"
            onClose={closeModal}
          >
            <ShopForm
              mode="create"
              asModal
              onClose={closeModal}
              onSuccess={handleModalSuccess}
            />
          </CenterModal>
        ) : null}

        {modal?.type === "edit" ? (
          <CenterModal
            title="Edit Shop"
            maxWidth="max-w-7xl"
            onClose={closeModal}
          >
            <ShopForm
              mode="edit"
              shopId={modal.shopId}
              asModal
              onClose={closeModal}
              onSuccess={handleModalSuccess}
            />
          </CenterModal>
        ) : null}

        {modal?.type === "view" ? (
          <CenterModal
            title="View Shop"
            maxWidth="max-w-6xl"
            onClose={closeModal}
          >
            <ShopViewPanel
              shopId={modal.shopId}
              asModal
              onClose={closeModal}
              onEdit={(id) => setModal({ type: "edit", shopId: id })}
            />
          </CenterModal>
        ) : null}
      </div>
    </div>
  );
}