"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  FileBadge2,
  FileImage,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
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

function formatShopType(value?: string | null) {
  if (value === "WAREHOUSE_RETAIL_SHOP" || value === "MAIN") return "Warehouse Retail Shop";
  if (
    value === "RETAIL_BRANCH_SHOP" ||
    value === "BRANCH_RETAIL_SHOP" ||
    value === "BRANCH"
  )
    return "Retail Branch Shop";
  if (value === "WHOLESALE_SHOP" || value === "WHOLESALE") return "Wholesale Shop";

  return String(value || "-");
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 wrap-break-word text-[13px] font-bold text-slate-950">
        {value || "-"}
      </p>
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
    <div className="mb-3 flex items-start gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        {icon}
      </div>

      <div className="min-w-0">
        <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          {description}
        </p>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-slate-950">{title}</p>

        {imageUrl ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
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
            className="relative block h-32 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white sm:h-36"
          >
            <Image
              src={imageUrl}
              alt={alt}
              fill
              sizes="(max-width: 768px) 100vw, 340px"
              className="object-contain p-2"
              unoptimized
            />
          </a>
        ) : (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 text-center sm:h-36"
          >
            {String(mimeType || "").toLowerCase().includes("pdf") ? (
              <FileText className="h-8 w-8 text-slate-400" />
            ) : (
              <FileImage className="h-8 w-8 text-slate-400" />
            )}

            <p className="mt-2 text-xs font-bold text-slate-700">
              Open uploaded document
            </p>
          </a>
        )
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 text-center sm:h-36">
          <p className="text-xs font-semibold text-slate-500">
            No file uploaded.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ShopViewPage() {
  return <ShopViewPanel />;
}

export function ShopViewPanel({
  shopId: shopIdProp = "",
  asModal = false,
  onClose,
}: {
  shopId?: string;
  asModal?: boolean;
  onClose?: () => void;
  onEdit?: (shopId: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const accessToken = auth?.accessToken ?? null;

  const currentRole = normalizeRole(
    (auth as { role?: string | null; user?: { role?: string | null } })?.role ||
      (auth as { user?: { role?: string | null } })?.user?.role
  );

  const shopBasePath = getShopBasePath(currentRole);
  const shopId = String(shopIdProp || searchParams.get("id") || "").trim();

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

  const handleClose = () => {
    if (asModal) {
      onClose?.();
      return;
    }

    router.push(`${shopBasePath}/list`);
  };

  if (loading) {
    return (
      <div className={asModal ? "w-full" : "page-shell"}>
        <div
          className={
            asModal
              ? "flex min-h-40 w-full items-center justify-center"
              : "mx-auto flex min-h-80 w-full max-w-6xl items-center justify-center"
          }
        >
          <div className="flex w-full max-w-md items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>

            <div>
              <h2 className="text-base font-extrabold text-slate-950">
                Loading Shop
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Fetching shop details.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shopId || !data) {
    return (
      <div className={asModal ? "w-full" : "page-shell"}>
        <div
          className={
            asModal
              ? "w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              : "mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          }
        >
          <h1 className="text-xl font-extrabold text-slate-950">Shop View</h1>

          <p className="mt-2 text-sm text-slate-500">
            A valid shop id was not found, or the details could not be loaded.
          </p>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {asModal ? "Close" : "Back to List"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isActive = data.isActive !== false;

  return (
    <div className={asModal ? "w-full" : "page-shell bg-slate-50"}>
      <div
        className={
          asModal
            ? "w-full"
            : "mx-auto w-full max-w-7xl rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
        }
      >
        {!asModal ? (
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-950">
                {data.name || "Shop"}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                View shop details, owner, address, images, and documents.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <Link
                href={`${shopBasePath}/edit/${data._id}`}
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Edit Shop
              </Link>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <SectionHeader
                icon={<Store className="h-5 w-5" />}
                title="Shop Information"
                description="Basic business details and status."
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <DetailCard label="Shop Name" value={String(data.name || "-")} />
                <DetailCard
                  label="Shop Type"
                  value={formatShopType(data.shopType)}
                />
                <DetailCard
                  label="Business Type"
                  value={String(data.businessType || "-")}
                />
                <DetailCard
                  label="Status"
                  value={isActive ? "Active" : "Inactive"}
                />
                <DetailCard
                  label="Billing Type"
                  value={String(data.billingType || "-")}
                />
                <DetailCard
                  label="GST Number"
                  value={String(data.gstNumber || "-")}
                />
                <DetailCard
                  label="Created On"
                  value={formatDate(data.createdAt)}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <SectionHeader
                icon={<User2 className="h-5 w-5" />}
                title="Shop Owner"
                description="Owner account linked to this shop."
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailCard label="Owner Name" value={String(owner?.name || "-")} />
                <DetailCard
                  label="Username"
                  value={owner?.username ? `@${owner.username}` : "-"}
                />
                <DetailCard label="Email" value={String(owner?.email || "-")} />
                <DetailCard label="Mobile" value={String(owner?.mobile || "-")} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <SectionHeader
                icon={<MapPin className="h-5 w-5" />}
                title="Address Details"
                description="Mapped location and address."
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <SectionHeader
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Front Image"
                description="Shop front image."
              />

              <ImageOnlyCard
                title="Front Image"
                url={data.frontImageUrl}
                alt={data.name || "Shop front image"}
                mimeType="image/*"
              />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <SectionHeader
                icon={<FileBadge2 className="h-5 w-5" />}
                title="Documents"
                description="GST and Udyam files."
              />

              <div className="space-y-3">
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
          </aside>
        </div>
      </div>
    </div>
  );
}