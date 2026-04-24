"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileBadge2,
  FileImage,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  User2,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

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

type AppRole =
  | "MASTER_ADMIN"
  | "MANAGER"
  | "SUPERVISOR"
  | "STAFF"
  | "SHOP_OWNER"
  | "SHOP_MANAGER"
  | "SHOP_SUPERVISOR"
  | "EMPLOYEE";

type ShopDetails = {
  _id: string;
  name?: string;
  shopType?: string;
  businessType?: string;
  isActive?: boolean;
  createdAt?: string;

  enableGSTBilling?: boolean;
  billingType?: string;
  gstNumber?: string;

  shopAddress?: ShopAddress;

  frontImageUrl?: string;
  frontImagePublicId?: string;

  shopOwnerAccountId?: string | ShopOwnerRef;

  gstCertificate?: ShopDocument;
  udyamCertificate?: ShopDocument;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: ShopDetails;
};

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

function normalizeRole(role?: string | null): AppRole {
  const value = String(role || "").trim().toUpperCase();

  if (value === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (value === "MANAGER") return "MANAGER";
  if (value === "SUPERVISOR") return "SUPERVISOR";
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

  return "/master/shop";
}

function isImageAsset(url?: string | null, mimeType?: string | null) {
  const normalizedMime = String(mimeType || "").trim().toLowerCase();

  if (normalizedMime.startsWith("image/")) {
    return true;
  }

  const normalizedUrl = String(url || "").trim().toLowerCase();

  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(normalizedUrl);
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

function ImageOnlyCard({
  title,
  url,
  alt,
  mimeType,
}: {
  title: string;
  url?: string | null;
  alt: string;
  mimeType?: string | null;
}) {
  const imageUrl = String(url || "").trim();
  const isImage = isImageAsset(imageUrl, mimeType);

  return (
    <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900">{title}</p>

        {imageUrl ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
            title={`Open ${title}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      {imageUrl ? (
        isImage ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="relative block h-[220px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white"
          >
            <Image
              src={imageUrl}
              alt={alt}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              className="object-contain p-2"
              unoptimized
            />
          </a>
        ) : (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-[220px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-4 text-center"
          >
            {String(mimeType || "").toLowerCase().includes("pdf") ? (
              <FileText className="h-10 w-10 text-slate-400" />
            ) : (
              <FileImage className="h-10 w-10 text-slate-400" />
            )}

            <p className="mt-3 text-sm font-semibold text-slate-700">
              Open uploaded document
            </p>
            <p className="mt-1 text-xs text-slate-500">Preview in new tab</p>
          </a>
        )
      ) : (
        <div className="flex h-[220px] w-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-4 text-center">
          <p className="text-sm font-medium text-slate-500">
            No image uploaded.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ShopViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const accessToken = auth?.accessToken ?? null;
  const currentRole = normalizeRole(
    (auth as { role?: string | null; user?: { role?: string | null } })?.role ||
      (auth as { user?: { role?: string | null } })?.user?.role
  );
  const shopBasePath = getShopBasePath(currentRole);

  const shopId = String(searchParams.get("id") || "").trim();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShopDetails | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!shopId || !accessToken) {
        setLoading(false);
        setData(null);
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(
          `${baseURL}${SummaryApi.shop_get.url(shopId)}`,
          {
            method: SummaryApi.shop_get.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result = (await response.json().catch(() => ({}))) as ApiResponse;

        if (!response.ok || !result?.success || !result?.data) {
          throw new Error(result?.message || "Failed to load shop details");
        }

        setData(result.data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load shop details";

        console.error(error);
        toast.error(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [accessToken, shopId]);

  const owner = useMemo(() => {
    if (data?.shopOwnerAccountId && typeof data.shopOwnerAccountId === "object") {
      return data.shopOwnerAccountId;
    }

    return null;
  }, [data]);
  const ownerViewHref =
    currentRole === "SHOP_OWNER"
      ? "/shopowner/profile"
      : owner?._id
        ? `/master/shopowner/view?id=${owner._id}`
        : "";

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-80 w-full max-w-7xl items-center justify-center">
          <div className="premium-card-solid flex w-full max-w-xl items-center gap-4 rounded-[28px] p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">Loading Shop</h2>
              <p className="text-sm text-slate-500">
                Fetching the shop details for the view page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shopId || !data) {
    return (
      <div className="page-shell">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Shop View</h1>

          <p className="mt-2 text-sm text-slate-500">
            A valid shop id was not found, or the details could not be loaded.
          </p>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => router.push(`${shopBasePath}/list`)}
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

  const isActive = data.isActive !== false;

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
                Shop Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  {data.name || "Shop"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  View complete shop details, linked owner information, address,
                  front image, and uploaded documents.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
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
              <InfoPill label="Business Type" value={data.businessType || "-"} />
              <InfoPill label="Shop Owner" value={owner?.name || "-"} />
              <InfoPill label="Created On" value={formatDate(data.createdAt)} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`${shopBasePath}/list`)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </button>

          <Link
            href={`${shopBasePath}/edit/${data._id}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Edit Shop
          </Link>
        </div>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <SectionHeader
            icon={<Store className="h-5 w-5" />}
            title="Shop Information"
            description="Basic business details and current shop status."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard label="Shop Name" value={String(data.name || "-")} />
            <DetailCard
              label="Shop Type"
              value={String(data.shopType || "-")}
            />
            <DetailCard
              label="Business Type"
              value={String(data.businessType || "-")}
            />
            <DetailCard label="Status" value={isActive ? "Active" : "Inactive"} />
            <DetailCard label="Billing Type" value={String(data.billingType || "-")} />
            <DetailCard label="GST Number" value={String(data.gstNumber || "-")} />
            <DetailCard label="Created On" value={formatDate(data.createdAt)} />
          </div>
        </section>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <SectionHeader
            icon={<User2 className="h-5 w-5" />}
            title="Shop Owner"
            description="Owner account linked to this shop."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailCard label="Owner Name" value={String(owner?.name || "-")} />
            <DetailCard
              label="Username"
              value={owner?.username ? `@${owner.username}` : "-"}
            />
            <DetailCard label="Email" value={String(owner?.email || "-")} />
            <DetailCard label="Mobile" value={String(owner?.mobile || "-")} />
          </div>

          {owner?._id ? (
            <div className="mt-4">
              <Link
                href={ownerViewHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {currentRole === "SHOP_OWNER" ? "View Profile" : "View Shop Owner"}
              </Link>
            </div>
          ) : null}
        </section>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <SectionHeader
            icon={<MapPin className="h-5 w-5" />}
            title="Address Details"
            description="Mapped location and address for this shop."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard
              label="State"
              value={String(data.shopAddress?.state || "-")}
            />
            <DetailCard
              label="District"
              value={String(data.shopAddress?.district || "-")}
            />
            <DetailCard
              label="Taluk"
              value={String(data.shopAddress?.taluk || "-")}
            />
            <DetailCard
              label="Area"
              value={String(data.shopAddress?.area || "-")}
            />
            <DetailCard
              label="Street"
              value={String(data.shopAddress?.street || "-")}
            />
            <DetailCard
              label="Pincode"
              value={String(data.shopAddress?.pincode || "-")}
            />
          </div>
        </section>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <SectionHeader
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Front Image"
            description="Primary visual identity for the shop."
          />

          <div className="max-w-md">
            <ImageOnlyCard
              title="Front Image"
              url={data.frontImageUrl}
              alt={data.name || "Shop front image"}
              mimeType="image/*"
            />
          </div>
        </section>

        <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
          <SectionHeader
            icon={<FileBadge2 className="h-5 w-5" />}
            title="Documents"
            description="GST and Udyam documents uploaded for this shop."
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <ImageOnlyCard
              title="GST Certificate"
              url={data.gstCertificate?.url}
              alt={data.gstCertificate?.fileName || "GST Certificate"}
              mimeType={data.gstCertificate?.mimeType}
            />

            <ImageOnlyCard
              title="Udyam Certificate"
              url={data.udyamCertificate?.url}
              alt={data.udyamCertificate?.fileName || "Udyam Certificate"}
              mimeType={data.udyamCertificate?.mimeType}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
