"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CircleOff,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  Pencil,
  Power,
  Search,
  Sparkles,
  Store,
  Trash2,
  User2,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

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

type ShopOwnerGroup = {
  ownerId: string;
  ownerName: string;
  ownerUsername: string;
  ownerEmail: string;
  ownerMobile: string;
  shops: ShopListItem[];
};

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

function getShopBasePath(role: AppRole) {
  if (role === "MASTER_ADMIN") return "/master/shop";
  if (role === "MANAGER") return "/manager/shop";
  if (role === "SUPERVISOR") return "/supervisor/shop";
  if (role === "SHOP_OWNER") return "/shopowner/shopprofile";
  if (role === "SHOP_MANAGER") return "/shopmanager/shop";
  if (role === "SHOP_SUPERVISOR") return "/shopsupervisor/shop";
  if (role === "EMPLOYEE") return "/employee/shop";

  return "/staff/shop";
}

function getShopOwnerBasePath(role: AppRole) {
  if (role === "MASTER_ADMIN") return "/master/shopowner";
  if (role === "MANAGER") return "/manager/shopowner";
  if (role === "SUPERVISOR") return "/supervisor/shopowner";
  if (role === "SHOP_OWNER") return "/shopowner/profile";
  if (role === "SHOP_MANAGER") return "/shopmanager/shopowner";
  if (role === "SHOP_SUPERVISOR") return "/shopsupervisor/shopowner";
  if (role === "EMPLOYEE") return "/employee/shopowner";

  return "/staff/shopowner";
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

function DocumentBadge({
  active,
  label,
  icon,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
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

  const isShopOwnerView = currentRole === "SHOP_OWNER";

  const shopBasePath = useMemo(
    () => getShopBasePath(currentRole),
    [currentRole]
  );

  const shopOwnerBasePath = useMemo(
    () => getShopOwnerBasePath(currentRole),
    [currentRole]
  );

  const ownerActionHref = useMemo(() => {
    if (currentRole === "SHOP_OWNER") {
      return "/shopowner/profile";
    }

    return `${shopOwnerBasePath}/view`;
  }, [currentRole, shopOwnerBasePath]);

  const [data, setData] = useState<ShopListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

            if (
              ownerId &&
              shopOwnerId &&
              String(shopOwnerId) === String(ownerId)
            ) {
              return true;
            }

            if (
              allowedShopIds.length &&
              allowedShopIds.includes(String(shop._id))
            ) {
              return true;
            }

            return false;
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

  const groupedData = useMemo(() => {
    const grouped = new Map<string, ShopOwnerGroup>();

    data.forEach((shop) => {
      const ownerId = getOwnerId(shop) || `owner-${shop._id}`;
      const owner = getOwnerRef(shop);
      const existing = grouped.get(ownerId);

      if (existing) {
        existing.shops.push(shop);
        return;
      }

      grouped.set(ownerId, {
        ownerId,
        ownerName: getOwnerName(shop),
        ownerUsername: String(owner?.username || ""),
        ownerEmail: String(owner?.email || ""),
        ownerMobile: String(owner?.mobile || ""),
        shops: [shop],
      });
    });

    return Array.from(grouped.values());
  }, [data]);

  const filteredGroupedData = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return groupedData;

    return groupedData.filter((group) => {
      const ownerHaystack = [
        group.ownerName,
        group.ownerUsername,
        group.ownerEmail,
        group.ownerMobile,
      ]
        .join(" ")
        .toLowerCase();

      const shopMatch = group.shops.some((shop) => {
        const progress = getShopProgressMetrics(shop);
        const missingFields = getMissingShopFields(shop);

        return [
          shop.name,
          shop.shopType,
          shop.businessType,
          shop.billingType,
          shop.gstNumber,
          getCompactAddress(shop.shopAddress),
          `${progress.percent}%`,
          `${progress.filledCount}/${progress.totalCount}`,
          missingFields.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });

      return ownerHaystack.includes(term) || shopMatch;
    });
  }, [groupedData, search]);

  const flatFilteredShops = useMemo(() => {
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

  const totalShopCount = data.length;
  const totalOwnerCount = groupedData.length;
  const activeShopCount = data.filter((shop) => shop.isActive !== false).length;

  const averageShopProgress = useMemo(() => {
    if (data.length === 0) return 0;

    const total = data.reduce(
      (sum, shop) => sum + getShopProgressMetrics(shop).percent,
      0
    );

    return Math.round(total / data.length);
  }, [data]);

  const isEmpty = isShopOwnerView
    ? flatFilteredShops.length === 0
    : filteredGroupedData.length === 0;

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Store className="h-3.5 w-3.5" />
                Shop Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  Shop List
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  {isShopOwnerView
                    ? "Review your linked shops, billing type, documents, and setup progress."
                    : "Review grouped shop records by shop owner and track setup completion with front image and shop document validation."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Total Shops</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {totalShopCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Owners</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {totalOwnerCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Active Shops</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {activeShopCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Avg Progress</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {averageShopProgress}%
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">Directory</h2>
                <p className="text-sm text-slate-500">
                  {isShopOwnerView
                    ? "Search by shop name, address, billing type, document status, or progress."
                    : "Search by shop owner, shop name, business type, address, or progress."}
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shops..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="premium-input pl-11"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading shop records...
              </div>
            </div>
          ) : isEmpty ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <CircleOff className="h-8 w-8 text-slate-400" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                No shops found
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                No shop record matches your current search.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                {isShopOwnerView ? (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-5 py-4 font-semibold">S.No</th>
                        <th className="px-5 py-4 font-semibold">Shop Name</th>
                        <th className="px-5 py-4 font-semibold">Address</th>
                        <th className="px-5 py-4 font-semibold">Billing</th>
                        <th className="px-5 py-4 font-semibold">
                          Shop Progress
                        </th>
                        <th className="px-5 py-4 font-semibold">Document</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white">
                      {flatFilteredShops.map((shop, index) => {
                        const isBusy = actionLoading === shop._id;
                        const isActive = shop.isActive !== false;
                        const progress = getShopProgressMetrics(shop);
                        const progressTone = getProgressTone(progress.percent);

                        return (
                          <tr
                            key={shop._id}
                            className="border-b border-slate-100 align-top last:border-b-0"
                          >
                            <td className="px-5 py-4 align-top font-medium text-slate-700">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4 align-top">
                              <div className="min-w-[220px]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`${shopBasePath}/view?id=${shop._id}`}
                                    className="max-w-[220px] truncate font-semibold text-slate-900 transition hover:text-[color:var(--primary)]"
                                    title={shop.name || "Shop"}
                                  >
                                    {shop.name || "Shop"}
                                  </Link>

                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                                      isActive
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {isActive ? "Active" : "Inactive"}
                                  </span>
                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                  {shop.businessType || "-"}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4 align-top">
                              <p className="max-w-[260px] text-xs leading-5 text-slate-600">
                                {getCompactAddress(shop.shopAddress)}
                              </p>
                            </td>

                            <td className="px-5 py-4 align-top">
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                    shop.billingType === "GST" ||
                                    shop.billingType === "BOTH"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  {shop.billingType || "NON_GST"}
                                </span>

                                {shop.gstNumber ? (
                                  <p className="text-[11px] text-slate-500">
                                    GST: {shop.gstNumber}
                                  </p>
                                ) : null}
                              </div>
                            </td>

                            <td className="px-5 py-4 align-top">
                              <div className="min-w-[190px]">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                  <span className="text-xs font-semibold text-slate-900">
                                    {progress.percent}% Complete
                                  </span>

                                  <span className="text-[11px] text-slate-500">
                                    {progress.filledCount}/
                                    {progress.totalCount}
                                  </span>
                                </div>

                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                  <div
                                    className={`h-full rounded-full transition-all ${progressTone}`}
                                    style={{ width: `${progress.percent}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 align-top">
                              <div className="flex min-w-[230px] flex-wrap gap-2">
                                <DocumentBadge
                                  active={hasFrontImage(shop)}
                                  label="Front Image"
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

                            <td className="px-5 py-4 align-top">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`${shopBasePath}/view?id=${shop._id}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                                  title="View Shop"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>

                                <Link
                                  href={`${shopBasePath}/edit/${shop._id}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                                  title="Edit Shop"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(shop)}
                                  disabled={isBusy}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  title={
                                    isActive
                                      ? "Deactivate Shop"
                                      : "Activate Shop"
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
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-5 py-4 font-semibold">S.No</th>
                        <th className="px-5 py-4 font-semibold">
                          Shop Owner Name
                        </th>
                        <th className="px-5 py-4 font-semibold">
                          Shop Details
                        </th>
                        <th className="px-5 py-4 font-semibold">Shop Count</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white">
                      {filteredGroupedData.map((group, index) => (
                        <tr
                          key={group.ownerId}
                          className="border-b border-slate-100 align-top last:border-b-0"
                        >
                          <td className="px-5 py-4 align-top font-medium text-slate-700">
                            {index + 1}
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="min-w-55 space-y-1">
                              <p className="font-semibold text-slate-900">
                                {group.ownerName || "-"}
                              </p>

                              <p className="text-xs text-slate-500">
                                {group.ownerUsername
                                  ? `@${group.ownerUsername}`
                                  : "-"}
                              </p>

                              <p className="break-all text-xs text-slate-500">
                                {group.ownerEmail || "-"}
                              </p>

                              <p className="text-xs text-slate-500">
                                {group.ownerMobile || "-"}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="min-w-[430px] space-y-2">
                              {group.shops.map((shop) => {
                                const isBusy = actionLoading === shop._id;
                                const isActive = shop.isActive !== false;
                                const progress = getShopProgressMetrics(shop);
                                const progressTone = getProgressTone(
                                  progress.percent
                                );
                                const missingFields =
                                  getMissingShopFields(shop);

                                return (
                                  <div
                                    key={shop._id}
                                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                                  >
                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Link
                                            href={`${shopBasePath}/view?id=${shop._id}`}
                                            className="max-w-[220px] truncate font-semibold text-slate-900 transition hover:text-[color:var(--primary)]"
                                            title={shop.name || "Shop"}
                                          >
                                            {shop.name || "Shop"}
                                          </Link>

                                          <span
                                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                                              isActive
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-slate-200 bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {isActive ? "Active" : "Inactive"}
                                          </span>

                                          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                                            {progress.percent}% Complete
                                          </span>
                                        </div>

                                        <div className="mt-2 space-y-1">
                                          <p className="truncate text-xs text-slate-500">
                                            {shop.businessType || "-"}
                                          </p>

                                          <p className="line-clamp-1 text-xs text-slate-500">
                                            {getCompactAddress(
                                              shop.shopAddress
                                            )}
                                          </p>
                                        </div>

                                        <div className="mt-3">
                                          <div className="mb-1 flex items-center justify-between gap-3">
                                            <span className="text-xs font-semibold text-slate-900">
                                              Shop Progress
                                            </span>

                                            <span className="text-[11px] text-slate-500">
                                              {progress.filledCount}/
                                              {progress.totalCount}
                                            </span>
                                          </div>

                                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                            <div
                                              className={`h-full rounded-full transition-all ${progressTone}`}
                                              style={{
                                                width: `${progress.percent}%`,
                                              }}
                                            />
                                          </div>

                                          {missingFields.length > 0 && (
                                            <p className="mt-2 line-clamp-1 text-[11px] text-slate-500">
                                              Missing:{" "}
                                              {missingFields.join(", ")}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-2 xl:pl-2">
                                        <Link
                                          href={`${shopBasePath}/view?id=${shop._id}`}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                                          title="View Shop"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Link>

                                        <Link
                                          href={`${shopBasePath}/edit/${shop._id}`}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                                          title="Edit Shop"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Link>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleStatus(shop)
                                          }
                                          disabled={isBusy}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                          title={
                                            isActive
                                              ? "Deactivate Shop"
                                              : "Activate Shop"
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
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span className="inline-flex min-w-14 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                              {group.shops.length}
                            </span>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`${ownerActionHref}?id=${group.ownerId}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                                title="View Shop Owner"
                              >
                                <User2 className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}