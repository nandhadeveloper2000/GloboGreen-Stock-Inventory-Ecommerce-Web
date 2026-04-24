"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileBadge2,
  FileImage,
  FileText,
  Loader2,
  MailCheck,
  MailX,
  MapPin,
  Pencil,
  Power,
  ShoppingBag,
  Sparkles,
  Trash2,
  User2,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type AppRole = "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF";

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

type ShopOwnerDoc = {
  url?: string;
  publicId?: string;
  public_id?: string;
  mimeType?: string;
  fileName?: string;
  bytes?: number;
};

type LinkedShopOwnerRef = {
  _id?: string;
};

type LinkedShop = {
  _id?: string;
  name?: string;
  shopType?: string;
  businessType?: string;
  isActive?: boolean;
  createdAt?: string;

  enableGSTBilling?: boolean;
  billingType?: "GST" | "NON_GST" | "BOTH" | string;
  gstNumber?: string;

  frontImageUrl?: string;
  frontImagePublicId?: string;

  gstCertificate?: ShopDocument;
  udyamCertificate?: ShopDocument;

  shopAddress?: ShopAddress;
  shopOwnerAccountId?: string | LinkedShopOwnerRef;
};

type ShopOwnerDetails = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  verifyEmail?: boolean;
  isActive?: boolean;
  shopControl?: string;
  address?: ShopAddress;
  idProof?: ShopOwnerDoc;
  validTo?: string | null;
  createdAt?: string;
  shopIds?: LinkedShop[];
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: ShopOwnerDetails;
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

function getShopBasePath(role: AppRole) {
  if (role === "MASTER_ADMIN") return "/master/shop";
  if (role === "MANAGER") return "/manager/shop";
  if (role === "SUPERVISOR") return "/supervisor/shop";

  return "/staff/shop";
}

function getAvatarSrc(item?: ShopOwnerDetails | null) {
  const uploadedAvatar = String(item?.avatarUrl || "").trim();

  if (uploadedAvatar) {
    return uploadedAvatar;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    item?.name || "Shop Owner"
  )}&background=2e3192&color=ffffff`;
}

function getMobileNumber(item?: ShopOwnerDetails | null) {
  return String(item?.mobile || item?.additionalNumber || "").trim() || "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "-";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getShopControlLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "ALL_IN_ONE_ECOMMERCE") {
    return "All In One Ecommerce";
  }

  if (normalized === "INVENTORY_ONLY") {
    return "Inventory Only";
  }

  return "-";
}

function isImageAsset(url?: string | null, mimeType?: string | null) {
  const normalizedMime = String(mimeType || "").trim().toLowerCase();

  if (normalizedMime.startsWith("image/")) {
    return true;
  }

  const normalizedUrl = String(url || "").trim().toLowerCase();

  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(normalizedUrl);
}

function hasTextValue(value?: string | null) {
  return String(value || "").trim().length > 0;
}

function hasDocument(doc?: ShopDocument) {
  return (
    hasTextValue(doc?.url) ||
    hasTextValue(doc?.publicId) ||
    hasTextValue(doc?.public_id) ||
    Number(doc?.bytes || 0) > 0
  );
}

function hasFrontImage(shop: LinkedShop) {
  return (
    hasTextValue(shop.frontImageUrl) ||
    hasTextValue(shop.frontImagePublicId)
  );
}

function hasAnyShopDocument(shop: LinkedShop) {
  return hasDocument(shop.gstCertificate) || hasDocument(shop.udyamCertificate);
}

function getLinkedShopOwnerId(shop: LinkedShop, fallbackOwnerId?: string) {
  if (typeof shop.shopOwnerAccountId === "string") {
    return shop.shopOwnerAccountId;
  }

  const populatedOwnerId = String(shop.shopOwnerAccountId?._id || "").trim();

  if (populatedOwnerId) {
    return populatedOwnerId;
  }

  return String(fallbackOwnerId || "").trim();
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

function getLinkedShopProgressMetrics(
  shop: LinkedShop,
  fallbackOwnerId?: string
) {
  const trackedSections = [
    hasTextValue(shop.name),
    hasTextValue(shop.businessType),
    isAddressComplete(shop.shopAddress),
    hasTextValue(getLinkedShopOwnerId(shop, fallbackOwnerId)),
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

function getLinkedShopMissingFields(
  shop: LinkedShop,
  fallbackOwnerId?: string
) {
  const missing: string[] = [];

  if (!hasTextValue(shop.name)) missing.push("Shop Name");
  if (!hasTextValue(shop.businessType)) missing.push("Business Type");
  if (!isAddressComplete(shop.shopAddress)) missing.push("Address");

  if (!hasTextValue(getLinkedShopOwnerId(shop, fallbackOwnerId))) {
    missing.push("Shop Owner");
  }

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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

function LinkCard({ label, href }: { label: string; href?: string | null }) {
  const url = String(href || "").trim();

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-start gap-2 text-sm font-semibold text-slate-900 transition hover:text-violet-700"
        >
          <span className="break-all">{url}</span>
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
        </a>
      ) : (
        <p className="mt-1 text-sm font-semibold text-slate-900">-</p>
      )}
    </div>
  );
}

export default function ShopOwnerViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const accessToken = auth?.accessToken ?? null;

  const currentRole = normalizeRole(
    (auth as { role?: string | null; user?: { role?: string | null } })?.role ||
      (auth as { user?: { role?: string | null } })?.user?.role
  );

  const panelBasePath = useMemo(
    () => getPanelBasePath(currentRole),
    [currentRole]
  );

  const shopBasePath = useMemo(
    () => getShopBasePath(currentRole),
    [currentRole]
  );

  const shopOwnerId = String(searchParams.get("id") || "").trim();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShopOwnerDetails | null>(null);
  const [shopActionLoading, setShopActionLoading] = useState<string | null>(
    null
  );

  const fetchDetails = useCallback(async () => {
    if (!shopOwnerId) {
      setLoading(false);
      setData(null);
      return;
    }

    if (!accessToken) {
      setLoading(false);
      setData(null);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.shopowner_get.url(shopOwnerId)}`,
        {
          method: SummaryApi.shopowner_get.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.message || "Failed to load shop owner details");
      }

      setData(result.data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load shop owner details";

      console.error(error);
      toast.error(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, shopOwnerId]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  const linkedShops = useMemo(
    () => (Array.isArray(data?.shopIds) ? data.shopIds : []),
    [data]
  );

  const handleToggleLinkedShop = async (shop: LinkedShop) => {
    if (!accessToken || !shop._id) {
      toast.error("Authentication or shop id missing");
      return;
    }

    const nextStatus = !(shop.isActive ?? false);

    try {
      setShopActionLoading(shop._id);

      const response = await fetch(
        `${baseURL}${SummaryApi.master_update_shop.url(shop._id)}`,
        {
          method: SummaryApi.master_update_shop.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ isActive: nextStatus }),
        }
      );

      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Status update failed");
      }

      toast.success(
        nextStatus
          ? "Shop activated successfully"
          : "Shop deactivated successfully"
      );

      await fetchDetails();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status update failed");
    } finally {
      setShopActionLoading(null);
    }
  };

  const handleDeleteLinkedShop = async (shop: LinkedShop) => {
    if (!accessToken || !shop._id) {
      toast.error("Authentication or shop id missing");
      return;
    }

    try {
      setShopActionLoading(shop._id);

      const response = await fetch(
        `${baseURL}${SummaryApi.master_delete_shop.url(shop._id)}`,
        {
          method: SummaryApi.master_delete_shop.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Delete failed");
      }

      toast.success("Shop deleted successfully");
      await fetchDetails();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setShopActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-80 w-full max-w-7xl items-center justify-center">
          <div className="premium-card-solid flex w-full max-w-xl items-center gap-4 rounded-[28px] p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Loading Shop Owner
              </h2>
              <p className="text-sm text-slate-500">
                Fetching the shop owner details for the view page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shopOwnerId || !data) {
    return (
      <div className="page-shell">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Shop Owner View
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            A valid shop owner id was not found, or the details could not be
            loaded.
          </p>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => router.push(`${panelBasePath}/list`)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isEmailVerified = data.verifyEmail ?? false;
  const isActive = data.isActive ?? false;
  const avatarUrl = String(data.avatarUrl || "").trim();
  const idProofUrl = String(data.idProof?.url || "").trim();
  const hasImageIdProof = isImageAsset(idProofUrl, data.idProof?.mimeType);

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Shop Owner Management
              </span>

              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-3xl border border-white/20 bg-white/10">
                  <Image
                    src={getAvatarSrc(data)}
                    alt={data.name || "Shop Owner Avatar"}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                    {data.name || "Shop Owner"}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-white/80 md:text-base">
                    View complete shop owner account details, verification
                    status, address, documents, and linked shops.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                    isEmailVerified
                      ? "border-emerald-200/40 bg-emerald-500/15 text-white"
                      : "border-amber-200/40 bg-amber-500/15 text-white"
                  }`}
                >
                  {isEmailVerified ? (
                    <MailCheck className="h-3.5 w-3.5" />
                  ) : (
                    <MailX className="h-3.5 w-3.5" />
                  )}
                  {isEmailVerified ? "Email Verified" : "Email Pending"}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                    isActive
                      ? "border-emerald-200/40 bg-emerald-500/15 text-white"
                      : "border-slate-200/40 bg-white/10 text-white"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <InfoPill label="Username" value={data.username || "-"} />
              <InfoPill label="Mobile" value={getMobileNumber(data)} />
              <InfoPill label="Linked Shops" value={String(linkedShops.length)} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`${panelBasePath}/list`)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </button>

          <Link
            href={`${panelBasePath}/edit/${data._id}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Edit Shop Owner
          </Link>
        </div>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <SectionHeader
            icon={<User2 className="h-5 w-5" />}
            title="Basic Information"
            description="View owner identity, contact details, account status, and control mode."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard label="Full Name" value={String(data.name || "-")} />
            <DetailCard label="Username" value={String(data.username || "-")} />
            <DetailCard label="Email ID" value={String(data.email || "-")} />
            <DetailCard label="Primary Mobile" value={String(data.mobile || "-")} />
            <DetailCard
              label="Secondary Mobile"
              value={String(data.additionalNumber || "-")}
            />
            <DetailCard
              label="Shop Control"
              value={getShopControlLabel(data.shopControl)}
            />
            <DetailCard
              label="Email Status"
              value={isEmailVerified ? "Verified" : "Pending"}
            />
            <DetailCard label="Status" value={isActive ? "Active" : "Inactive"} />
            <DetailCard label="Valid To" value={formatDate(data.validTo)} />
          </div>
        </section>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <SectionHeader
            icon={<MapPin className="h-5 w-5" />}
            title="Address Details"
            description="Mapped location and street details stored for this shop owner."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard label="State" value={String(data.address?.state || "-")} />
            <DetailCard
              label="District"
              value={String(data.address?.district || "-")}
            />
            <DetailCard label="Taluk" value={String(data.address?.taluk || "-")} />
            <DetailCard label="Area" value={String(data.address?.area || "-")} />
            <DetailCard label="Street" value={String(data.address?.street || "-")} />
            <DetailCard
              label="Pincode"
              value={String(data.address?.pincode || "-")}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <SectionHeader
              icon={<FileBadge2 className="h-5 w-5" />}
              title="Documents"
              description="Avatar, ID proof, and account timeline details."
            />

            <div className="space-y-4">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">Avatar</p>

                  {avatarUrl ? (
                    <a
                      href={avatarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-violet-700 transition hover:text-violet-800"
                    >
                      Open Avatar
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 flex justify-center">
                  <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    <Image
                      src={getAvatarSrc(data)}
                      alt={data.name || "Shop Owner Avatar"}
                      fill
                      sizes="160px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <DetailCard
                    label="Avatar Status"
                    value={avatarUrl ? "Uploaded" : "Not uploaded"}
                  />
                  <LinkCard label="Avatar URL" href={avatarUrl} />
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">ID Proof</p>

                  {idProofUrl ? (
                    <a
                      href={idProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-violet-700 transition hover:text-violet-800"
                    >
                      Open ID Proof
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>

                {data.idProof?.url ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-center">
                      {hasImageIdProof ? (
                        <a
                          href={idProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative block h-48 w-full max-w-[220px] overflow-hidden rounded-3xl border border-slate-200 bg-white"
                        >
                          <Image
                            src={idProofUrl}
                            alt={data.idProof.fileName || "ID Proof"}
                            fill
                            sizes="220px"
                            className="object-cover"
                            unoptimized
                          />
                        </a>
                      ) : (
                        <a
                          href={idProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-48 w-full max-w-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-4 text-center"
                        >
                          {String(data.idProof.mimeType || "")
                            .toLowerCase()
                            .includes("pdf") ? (
                            <FileText className="h-10 w-10 text-slate-400" />
                          ) : (
                            <FileImage className="h-10 w-10 text-slate-400" />
                          )}

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            {data.idProof.fileName || "Open uploaded document"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Preview in new tab
                          </p>
                        </a>
                      )}
                    </div>

                    <DetailCard
                      label="File Name"
                      value={String(data.idProof.fileName || "Uploaded file")}
                    />
                    <DetailCard
                      label="File Type"
                      value={String(data.idProof.mimeType || "-")}
                    />
                    <DetailCard
                      label="File Size"
                      value={formatBytes(data.idProof.bytes)}
                    />
                    <LinkCard label="ID Proof URL" href={idProofUrl} />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-slate-500">No ID proof uploaded.</p>
                    <LinkCard label="ID Proof URL" href="" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <DetailCard label="Created On" value={formatDate(data.createdAt)} />
                <DetailCard label="Expiry Date" value={formatDate(data.validTo)} />
              </div>
            </div>
          </section>

          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <SectionHeader
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Linked Shops"
              description="Shops currently mapped to this shop owner account."
            />

            {linkedShops.length ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {linkedShops.map((shop, index) => {
                  const progress = getLinkedShopProgressMetrics(shop, data._id);
                  const progressTone = getProgressTone(progress.percent);
                  const missingFields = getLinkedShopMissingFields(shop, data._id);
                  const shopActive = shop.isActive !== false;

                  return (
                    <div
                      key={shop._id || `${shop.name || "shop"}-${index}`}
                      className="rounded-[26px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-base font-bold text-slate-900">
                            {shop.name || "Shop"}
                          </h4>
                          <p className="mt-1 text-sm text-slate-500">
                            {shop.businessType || "-"}
                          </p>
                        </div>

                        <span
                          className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                            shopActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {shopActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <DetailCard
                          label="Shop Name"
                          value={String(shop.name || "-")}
                        />
                        <DetailCard
                          label="Status"
                          value={shopActive ? "Active" : "Inactive"}
                        />
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Shop Progress
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {progress.percent}%
                          </p>
                        </div>

                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${progressTone}`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          {progress.filledCount}/{progress.totalCount} sections
                          completed
                        </p>

                        {missingFields.length > 0 && (
                          <p className="mt-1 line-clamp-1 text-xs text-rose-500">
                            Missing: {missingFields.join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <DetailCard
                          label="Business Type"
                          value={String(shop.businessType || "-")}
                        />
                        <DetailCard
                          label="Created On"
                          value={formatDate(shop.createdAt)}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
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
                          onClick={() => handleToggleLinkedShop(shop)}
                          disabled={shopActionLoading === shop._id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title={shopActive ? "Deactivate Shop" : "Activate Shop"}
                        >
                          {shopActionLoading === shop._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLinkedShop(shop)}
                          disabled={shopActionLoading === shop._id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Delete Shop"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                No shops are linked to this shop owner yet.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}