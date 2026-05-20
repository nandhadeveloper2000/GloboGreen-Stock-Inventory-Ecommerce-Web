"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  ImagePlus,
  Loader2,
  MailCheck,
  MailX,
  MapPin,
  Pencil,
  Plus,
  Power,
  ShoppingBag,
  Trash2,
  UploadCloud,
  User2,
  X,
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
  mobile?: string;
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

type ShopListResponse = {
  success?: boolean;
  message?: string;
  data?: LinkedShop[];
};

type ShopOwnerViewProps = {
  shopOwnerId: string;
  asModal?: boolean;
  onClose?: () => void;
  onAddBusinessLocation?: (shopOwnerId: string) => void;
};

type ShopTypeLoc = "" | "WAREHOUSE_RETAIL_SHOP" | "RETAIL_BRANCH_SHOP" | "WHOLESALE_SHOP";
type BillingTypeLoc = "" | "GST" | "NON_GST";
type BusinessTypeLoc = "" | "Retail" | "Wholesale";

type LocationDraftForm = {
  shopName: string;
  shopType: ShopTypeLoc;
  billingType: BillingTypeLoc;
  businessType: BusinessTypeLoc;
  mobile: string;
  gstNumber: string;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
};

type LocationDraftErrors = Partial<Record<keyof LocationDraftForm, string>>;

const LOCATION_FORM_INITIAL: LocationDraftForm = {
  shopName: "",
  shopType: "",
  billingType: "GST",
  businessType: "Retail",
  mobile: "",
  gstNumber: "",
  state: "",
  district: "",
  taluk: "",
  area: "",
  street: "",
  pincode: "",
};

const SHOP_TYPE_OPTS = [
  { label: "Warehouse Retail Shop", value: "WAREHOUSE_RETAIL_SHOP" },
  { label: "Retail Branch Shop", value: "RETAIL_BRANCH_SHOP" },
  { label: "Wholesale Shop", value: "WHOLESALE_SHOP" },
];

const BILLING_TYPE_OPTS = [
  { label: "GST", value: "GST" },
  { label: "Non GST", value: "NON_GST" },
];

const BUSINESS_TYPE_OPTS = [
  { label: "Retail", value: "Retail" },
  { label: "Wholesale", value: "Wholesale" },
];

function digitsOnly(v: string) { return v.replace(/\D/g, ""); }
function isValidMobile(v: string) { return /^[6-9]\d{9}$/.test(v); }
function isValidPincode(v: string) { return /^\d{6}$/.test(v); }

type CreateShopApiResponse = { success?: boolean; message?: string; data?: { _id?: string } };

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

  if (uploadedAvatar) return uploadedAvatar;

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    item?.name || "Shop Owner"
  )}&background=2e3192&color=ffffff`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getShopControlLabel(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "ALL_IN_ONE_ECOMMERCE") return "All In One Ecommerce";
  if (normalized === "INVENTORY_ONLY") return "Inventory Only";

  return "-";
}

function isImageAsset(url?: string | null, mimeType?: string | null) {
  const normalizedMime = String(mimeType || "").trim().toLowerCase();

  if (normalizedMime.startsWith("image/")) return true;

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
  return hasTextValue(shop.frontImageUrl) || hasTextValue(shop.frontImagePublicId);
}

function hasAnyShopDocument(shop: LinkedShop) {
  return hasDocument(shop.gstCertificate) || hasDocument(shop.udyamCertificate);
}

function getLinkedShopOwnerId(shop: LinkedShop, fallbackOwnerId?: string) {
  if (typeof shop.shopOwnerAccountId === "string") return shop.shopOwnerAccountId;

  const populatedOwnerId = String(shop.shopOwnerAccountId?._id || "").trim();

  return populatedOwnerId || String(fallbackOwnerId || "").trim();
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

function getLinkedShopProgressMetrics(shop: LinkedShop, fallbackOwnerId?: string) {
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
  const percent = totalCount ? Math.round((filledCount / totalCount) * 100) : 0;

  return { percent, filledCount, emptyCount, totalCount };
}

function getLinkedShopMissingFields(shop: LinkedShop, fallbackOwnerId?: string) {
  const missing: string[] = [];

  if (!hasTextValue(shop.name)) missing.push("Shop Name");
  if (!hasTextValue(shop.businessType)) missing.push("Business Type");
  if (!isAddressComplete(shop.shopAddress)) missing.push("Address");
  if (!hasTextValue(getLinkedShopOwnerId(shop, fallbackOwnerId))) missing.push("Shop Owner");
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

function getCompactAddress(address?: ShopAddress) {
  const parts = [
    address?.street,
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

function ViewFrame({
  asModal,
  children,
}: {
  asModal?: boolean;
  children: ReactNode;
}) {
  if (asModal) return <div className="w-full">{children}</div>;

  return <div className="page-shell">{children}</div>;
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00008b]/10 text-[#00008b]">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function DetailTableSection({
  icon,
  title,
  description,
  rows,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-sm">
      <SectionHeader icon={icon} title={title} description={description} />

      <div className="overflow-hidden rounded-[20px] border border-slate-200">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.label} className="align-top">
                <th className="w-44 bg-slate-50 px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  {row.label}
                </th>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  <div className="break-words">{row.value}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {active ? <MailCheck className="h-3.5 w-3.5" /> : <MailX className="h-3.5 w-3.5" />}
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function LoadingView({ asModal }: { asModal?: boolean }) {
  return (
    <ViewFrame asModal={asModal}>
      <div className="mx-auto flex min-h-70 w-full max-w-5xl items-center justify-center">
        <div className="flex w-full max-w-xl items-center gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Loading Shop Owner
            </h2>
            <p className="text-sm text-slate-500">Fetching shop owner details.</p>
          </div>
        </div>
      </div>
    </ViewFrame>
  );
}

function EmptyView({
  asModal,
  onBack,
}: {
  asModal?: boolean;
  onBack: () => void;
}) {
  return (
    <ViewFrame asModal={asModal}>
      <div className="mx-auto w-full max-w-4xl rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Shop Owner View</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          A valid shop owner id was not found, or the details could not be loaded.
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {asModal ? "Close" : "Back to List"}
        </button>
      </div>
    </ViewFrame>
  );
}

function ShopOwnerViewHeader({
  data,
  linkedShopCount,
}: {
  data: ShopOwnerDetails;
  linkedShopCount: number;
}) {
  const isEmailVerified = data.verifyEmail ?? false;
  const isActive = data.isActive ?? false;

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100">
              <Image
                src={getAvatarSrc(data)}
                alt={data.name || "Shop Owner Avatar"}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </div>

            <div className="min-w-0">
              <h1 className="wrap-break-word text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                {data.name || "Shop Owner"}
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-500">
                View personal details, verification status, documents, and
                linked business locations for this shop owner.
              </p>

              <div className="mt-2.5 flex flex-wrap gap-2">
                <StatusBadge
                  active={isEmailVerified}
                  activeLabel="Email Verified"
                  inactiveLabel="Email Pending"
                />

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                    isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-600"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isActive ? "Active" : "Inactive"}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {linkedShopCount} Business Location{linkedShopCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DocumentsSection({ data }: { data: ShopOwnerDetails }) {
  const avatarUrl = String(data.avatarUrl || "").trim();
  const idProofUrl = String(data.idProof?.url || "").trim();
  const hasImageIdProof = isImageAsset(idProofUrl, data.idProof?.mimeType);
  const documentRows = [
    {
      label: "Avatar",
      value: (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <Image
              src={getAvatarSrc(data)}
              alt={data.name || "Shop Owner Avatar"}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </div>

          {avatarUrl ? (
            <a
              href={avatarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#00008b] transition hover:text-[#00006f]"
            >
              Open Avatar
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <span className="text-sm font-medium text-slate-500">No uploaded avatar.</span>
          )}
        </div>
      ),
    },
    {
      label: "ID Proof",
      value: idProofUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          {hasImageIdProof ? (
            <a
              href={idProofUrl}
              target="_blank"
              rel="noreferrer"
              className="relative block h-18 w-30 overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <Image
                src={idProofUrl}
                alt={data.idProof?.fileName || "ID Proof"}
                fill
                sizes="120px"
                className="object-cover"
                unoptimized
              />
            </a>
          ) : (
            <a
              href={idProofUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-18 min-w-36 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
            >
              {String(data.idProof?.mimeType || "").toLowerCase().includes("pdf") ? (
                <FileText className="mr-2 h-4 w-4 text-slate-400" />
              ) : (
                <FileImage className="mr-2 h-4 w-4 text-slate-400" />
              )}
              {data.idProof?.fileName || "Open uploaded document"}
            </a>
          )}

          <a
            href={idProofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#00008b] transition hover:text-[#00006f]"
          >
            Open ID Proof
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <span className="text-sm font-medium text-slate-500">No ID proof uploaded.</span>
      ),
    },
    { label: "Created On", value: formatDate(data.createdAt) },
    { label: "Expiry Date", value: formatDate(data.validTo) },
  ];

  return (
    <DetailTableSection
      icon={<FileBadge2 className="h-5 w-5" />}
      title="Personal Profile & Documents"
      description="Uploaded avatar, ID proof preview, and account timeline."
      rows={documentRows}
    />
  );
}

function BusinessLocationsTable({
  shops,
  ownerId,
  shopBasePath,
  loadingId,
  onToggle,
  onDelete,
  accessToken,
  onShopAdded,
}: {
  shops: LinkedShop[];
  ownerId: string;
  shopBasePath: string;
  loadingId: string | null;
  onToggle: (shop: LinkedShop) => void;
  onDelete: (shop: LinkedShop) => void;
  accessToken: string | null;
  onShopAdded: (shop: LinkedShop) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<LocationDraftForm>(LOCATION_FORM_INITIAL);
  const [errors, setErrors] = useState<LocationDraftErrors>({});
  const [saving, setSaving] = useState(false);

  const frontImageRef = useRef<HTMLInputElement | null>(null);
  const gstRef = useRef<HTMLInputElement | null>(null);
  const udyamRef = useRef<HTMLInputElement | null>(null);
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState("");
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [gstFileName, setGstFileName] = useState("");
  const [udyamFile, setUdyamFile] = useState<File | null>(null);
  const [udyamFileName, setUdyamFileName] = useState("");

  const resetFiles = () => {
    if (frontImagePreview.startsWith("blob:")) URL.revokeObjectURL(frontImagePreview);
    setFrontImageFile(null); setFrontImagePreview("");
    setGstFile(null); setGstFileName("");
    setUdyamFile(null); setUdyamFileName("");
    if (frontImageRef.current) frontImageRef.current.value = "";
    if (gstRef.current) gstRef.current.value = "";
    if (udyamRef.current) udyamRef.current.value = "";
  };

  const updateField = <K extends keyof LocationDraftForm>(key: K, value: LocationDraftForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: LocationDraftErrors = {};
    if (!form.shopName.trim()) errs.shopName = "Shop name is required";
    if (!form.shopType) errs.shopType = "Shop type is required";
    if (!form.mobile.trim()) errs.mobile = "Mobile is required";
    else if (!isValidMobile(form.mobile)) errs.mobile = "Enter a valid 10-digit mobile";
    if (!form.state.trim()) errs.state = "State is required";
    if (!form.district.trim()) errs.district = "District is required";
    if (!form.taluk.trim()) errs.taluk = "Taluk is required";
    if (!form.area.trim()) errs.area = "Area is required";
    if (!form.street.trim()) errs.street = "Street is required";
    if (!form.pincode.trim()) errs.pincode = "Pincode is required";
    else if (!isValidPincode(form.pincode)) errs.pincode = "Pincode must be 6 digits";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!ownerId || !accessToken) { toast.error("Authentication or owner id missing"); return; }
    try {
      setSaving(true);
      const payload = new FormData();
      payload.append("name", form.shopName.trim());
      payload.append("shopName", form.shopName.trim());
      payload.append("ownerId", ownerId);
      payload.append("shopOwnerAccountId", ownerId);
      payload.append("shopType", form.shopType);
      payload.append("mobile", form.mobile.trim());
      payload.append("billingType", form.billingType || "GST");
      payload.append("enableGSTBilling", String(form.billingType === "GST"));
      payload.append("isMainWarehouse", String(form.shopType === "WAREHOUSE_RETAIL_SHOP"));
      if (form.businessType) payload.append("businessType", form.businessType);
      if (form.gstNumber.trim()) payload.append("gstNumber", form.gstNumber.trim());
      payload.append("state", form.state.trim());
      payload.append("district", form.district.trim());
      payload.append("taluk", form.taluk.trim());
      payload.append("area", form.area.trim());
      payload.append("street", form.street.trim());
      payload.append("pincode", form.pincode.trim());
      if (frontImageFile) payload.append("frontImage", frontImageFile);

      const response = await fetch(`${baseURL}${SummaryApi.shop_create.url}`, {
        method: SummaryApi.shop_create.method,
        headers: { Authorization: `Bearer ${accessToken}` },
        body: payload,
      });
      const result = (await response.json().catch(() => ({}))) as CreateShopApiResponse;
      if (!response.ok || !result?.success) throw new Error(result?.message || "Failed to create business location");

      const newShopId = result.data?._id;
      if (newShopId && (gstFile || udyamFile)) {
        const docsPayload = new FormData();
        if (gstFile) docsPayload.append("gstCertificate", gstFile);
        if (udyamFile) docsPayload.append("udyamCertificate", udyamFile);
        await fetch(`${baseURL}${SummaryApi.shop_docs_upload_admin.url(newShopId)}`, {
          method: SummaryApi.shop_docs_upload_admin.method,
          headers: { Authorization: `Bearer ${accessToken}` },
          body: docsPayload,
        }).catch(() => {});
      }

      onShopAdded({
        _id: newShopId,
        name: form.shopName.trim(),
        shopType: form.shopType,
        businessType: form.businessType,
        mobile: form.mobile.trim(),
        billingType: form.billingType,
        isActive: true,
        shopAddress: {
          state: form.state.trim(), district: form.district.trim(),
          taluk: form.taluk.trim(), area: form.area.trim(),
          street: form.street.trim(), pincode: form.pincode.trim(),
        },
      });
      setForm(LOCATION_FORM_INITIAL);
      setErrors({});
      setShowForm(false);
      resetFiles();
      toast.success("Business location added successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add business location");
    } finally {
      setSaving(false);
    }
  };

  const cancelForm = () => { setShowForm(false); setForm(LOCATION_FORM_INITIAL); setErrors({}); resetFiles(); };

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          icon={<ShoppingBag className="h-5 w-5" />}
          title="Business Locations"
          description="Business locations linked to this shop owner account."
        />

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(0,0,139,0.18)] transition hover:bg-[#00006f]"
          >
            <Plus className="h-4 w-4" />
            Add Business Location
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-4 rounded-2xl border border-[#00008b]/20 bg-[#00008b]/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-900">New Business Location</p>
            <button type="button" onClick={cancelForm}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Shop Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Shop / Location Name <span className="text-rose-500">*</span></label>
              <input value={form.shopName} onChange={(e) => updateField("shopName", e.target.value)}
                placeholder="Shop name"
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.shopName ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-[#00008b]"}`} />
              {errors.shopName && <p className="text-xs text-rose-500">{errors.shopName}</p>}
            </div>
            {/* Shop Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Shop Type <span className="text-rose-500">*</span></label>
              <select value={form.shopType} onChange={(e) => updateField("shopType", e.target.value as ShopTypeLoc)}
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.shopType ? "border-rose-300" : "border-slate-200 focus:border-[#00008b]"}`}>
                <option value="">Select type</option>
                {SHOP_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.shopType && <p className="text-xs text-rose-500">{errors.shopType}</p>}
            </div>
            {/* Business Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Business Type</label>
              <select value={form.businessType} onChange={(e) => updateField("businessType", e.target.value as BusinessTypeLoc)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00008b]">
                <option value="">Select type</option>
                {BUSINESS_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {/* Billing Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Billing Type <span className="text-rose-500">*</span></label>
              <select value={form.billingType} onChange={(e) => updateField("billingType", e.target.value as BillingTypeLoc)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00008b]">
                {BILLING_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {/* Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Mobile <span className="text-rose-500">*</span></label>
              <input value={form.mobile} onChange={(e) => updateField("mobile", digitsOnly(e.target.value).slice(0, 10))}
                type="tel" maxLength={10} placeholder="Mobile"
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.mobile ? "border-rose-300" : "border-slate-200 focus:border-[#00008b]"}`} />
              {errors.mobile && <p className="text-xs text-rose-500">{errors.mobile}</p>}
            </div>
            {/* GST Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">GST Number</label>
              <input value={form.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value.toUpperCase())}
                placeholder="GST number"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00008b]" />
            </div>
            {/* State */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">State <span className="text-rose-500">*</span></label>
              <input value={form.state} onChange={(e) => updateField("state", e.target.value)} placeholder="State"
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.state ? "border-rose-300" : "border-slate-200 focus:border-[#00008b]"}`} />
              {errors.state && <p className="text-xs text-rose-500">{errors.state}</p>}
            </div>
            {/* District */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">District <span className="text-rose-500">*</span></label>
              <input value={form.district} onChange={(e) => updateField("district", e.target.value)} placeholder="District"
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.district ? "border-rose-300" : "border-slate-200 focus:border-[#00008b]"}`} />
              {errors.district && <p className="text-xs text-rose-500">{errors.district}</p>}
            </div>
            {/* Taluk */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Taluk <span className="text-rose-500">*</span></label>
              <input value={form.taluk} onChange={(e) => updateField("taluk", e.target.value)} placeholder="Taluk"
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.taluk ? "border-rose-300" : "border-slate-200 focus:border-[#00008b]"}`} />
              {errors.taluk && <p className="text-xs text-rose-500">{errors.taluk}</p>}
            </div>
            {/* Area */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Area <span className="text-rose-500">*</span></label>
              <input value={form.area} onChange={(e) => updateField("area", e.target.value)} placeholder="Area"
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.area ? "border-rose-300" : "border-slate-200 focus:border-[#00008b]"}`} />
              {errors.area && <p className="text-xs text-rose-500">{errors.area}</p>}
            </div>
            {/* Street */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Street <span className="text-rose-500">*</span></label>
              <input value={form.street} onChange={(e) => updateField("street", e.target.value)} placeholder="Street"
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.street ? "border-rose-300" : "border-slate-200 focus:border-[#00008b]"}`} />
              {errors.street && <p className="text-xs text-rose-500">{errors.street}</p>}
            </div>
            {/* Pincode */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Pincode <span className="text-rose-500">*</span></label>
              <input value={form.pincode} onChange={(e) => updateField("pincode", digitsOnly(e.target.value).slice(0, 6))}
                type="tel" maxLength={6} placeholder="Pincode"
                className={`h-10 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition ${errors.pincode ? "border-rose-300" : "border-slate-200 focus:border-[#00008b]"}`} />
              {errors.pincode && <p className="text-xs text-rose-500">{errors.pincode}</p>}
            </div>
          </div>
          {/* Location Proof Documents */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-extrabold text-slate-900">Location Proof Documents</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Add the shop front image and business proof documents for this location.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Front Image */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-extrabold text-slate-900">Front Image</p>
                <p className="text-xs font-medium text-slate-500">Shop front photo</p>
                <div className="mt-2 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  {frontImagePreview
                    ? <img src={frontImagePreview} alt="Front" className="h-full w-full object-cover" />
                    : <ImagePlus className="h-8 w-8 text-slate-300" />}
                </div>
                <input ref={frontImageRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (frontImagePreview.startsWith("blob:")) URL.revokeObjectURL(frontImagePreview);
                    setFrontImageFile(file);
                    setFrontImagePreview(URL.createObjectURL(file));
                  }} />
                <button type="button" onClick={() => frontImageRef.current?.click()}
                  className="mt-2 h-9 w-full rounded-xl bg-[#00008b] text-xs font-extrabold text-white transition hover:bg-[#00006f]">
                  Upload Front Image
                </button>
              </div>
              {/* GST Certificate */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-extrabold text-slate-900">GST Certificate</p>
                <p className="text-xs font-medium text-slate-500">PDF or image</p>
                <div className="mt-2 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3">
                  {gstFileName
                    ? <p className="line-clamp-3 text-center text-xs font-bold text-slate-700">{gstFileName}</p>
                    : <UploadCloud className="h-8 w-8 text-slate-300" />}
                </div>
                <input ref={gstRef} type="file" accept="image/*,.pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setGstFile(f); setGstFileName(f.name); }} />
                <button type="button" onClick={() => gstRef.current?.click()}
                  className="mt-2 h-9 w-full rounded-xl bg-[#00008b] text-xs font-extrabold text-white transition hover:bg-[#00006f]">
                  Upload GST Proof
                </button>
              </div>
              {/* Udyam Certificate */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-extrabold text-slate-900">Udyam Certificate</p>
                <p className="text-xs font-medium text-slate-500">PDF or image</p>
                <div className="mt-2 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3">
                  {udyamFileName
                    ? <p className="line-clamp-3 text-center text-xs font-bold text-slate-700">{udyamFileName}</p>
                    : <UploadCloud className="h-8 w-8 text-slate-300" />}
                </div>
                <input ref={udyamRef} type="file" accept="image/*,.pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setUdyamFile(f); setUdyamFileName(f.name); }} />
                <button type="button" onClick={() => udyamRef.current?.click()}
                  className="mt-2 h-9 w-full rounded-xl bg-[#00008b] text-xs font-extrabold text-white transition hover:bg-[#00006f]">
                  Upload Udyam Proof
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={cancelForm}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-xs font-extrabold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {saving ? "Saving..." : "Save Location"}
            </button>
          </div>
        </div>
      )}

      {shops.length ? (
        <div className="overflow-x-auto rounded-[20px] border border-slate-200">
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Business Type</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Documents</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {shops.map((shop, index) => {
                const progress = getLinkedShopProgressMetrics(shop, ownerId);
                const progressTone = getProgressTone(progress.percent);
                const missingFields = getLinkedShopMissingFields(shop, ownerId);
                const shopActive = shop.isActive !== false;
                const isBusy = loadingId === shop._id;

                return (
                  <tr key={shop._id || `${shop.name || "shop"}-${index}`} className="align-top">
                    <td className="px-4 py-4 font-semibold text-slate-700">{index + 1}</td>

                    <td className="px-4 py-4">
                      <div className="min-w-44">
                        <p className="font-extrabold text-slate-900">
                          {shop.name || `Shop ${index + 1}`}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {shop.shopType || "-"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Created: {formatDate(shop.createdAt)}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-medium text-slate-600">
                      {shop.businessType || "-"}
                    </td>

                    <td className="px-4 py-4 font-medium text-slate-600">
                      {shop.mobile || "-"}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      <p className="max-w-72 leading-5">{getCompactAddress(shop.shopAddress)}</p>
                    </td>

                    <td className="px-4 py-4">
                      <div className="min-w-30 space-y-1">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700">
                          {shop.billingType || "-"}
                        </span>
                        {shop.gstNumber ? (
                          <p className="text-[11px] font-semibold text-slate-500">
                            GST: {shop.gstNumber}
                          </p>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex min-w-40 flex-wrap gap-2">
                        {shop.frontImageUrl ? (
                          <a
                            href={shop.frontImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-[#00008b] transition hover:bg-[#00008b]/5"
                          >
                            Front
                          </a>
                        ) : null}

                        {shop.gstCertificate?.url ? (
                          <a
                            href={shop.gstCertificate.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-[#00008b] transition hover:bg-[#00008b]/5"
                          >
                            GST
                          </a>
                        ) : null}

                        {shop.udyamCertificate?.url ? (
                          <a
                            href={shop.udyamCertificate.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-[#00008b] transition hover:bg-[#00008b]/5"
                          >
                            Udyam
                          </a>
                        ) : null}

                        {!shop.frontImageUrl &&
                        !shop.gstCertificate?.url &&
                        !shop.udyamCertificate?.url ? (
                          <span className="text-sm font-medium text-slate-500">-</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="min-w-52">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-extrabold text-slate-900">
                            {progress.percent}%
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {progress.filledCount}/{progress.totalCount}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${progressTone}`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>

                        <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">
                          {missingFields.length
                            ? `Missing: ${missingFields.join(", ")}`
                            : "All sections complete"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${
                          shopActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {shopActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {shop._id ? (
                          <>
                            <Link
                              href={`${shopBasePath}/view?id=${shop._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                              title="View Shop"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            <Link
                              href={`${shopBasePath}/edit/${shop._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                              title="Edit Shop"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => onToggle(shop)}
                          disabled={isBusy || !shop._id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title={shopActive ? "Deactivate Shop" : "Activate Shop"}
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(shop)}
                          disabled={isBusy || !shop._id}
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
      ) : (
        <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
          No business locations are linked to this shop owner yet.
        </div>
      )}
    </section>
  );
}

function ShopOwnerViewContent({
  shopOwnerId,
  asModal = false,
  onClose,
}: ShopOwnerViewProps) {
  const router = useRouter();
  const auth = useAuth();
  const accessToken = auth?.accessToken ?? null;

  const currentRole = normalizeRole(
    (auth as { role?: string | null; user?: { role?: string | null } })?.role ||
      (auth as { user?: { role?: string | null } })?.user?.role
  );

  const panelBasePath = useMemo(() => getPanelBasePath(currentRole), [currentRole]);
  const shopBasePath = useMemo(() => getShopBasePath(currentRole), [currentRole]); // kept for BusinessLocationsTable prop signature

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShopOwnerDetails | null>(null);
  const [linkedShops, setLinkedShops] = useState<LinkedShop[]>([]);
  const [shopActionLoading, setShopActionLoading] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (asModal) {
      onClose?.();
      return;
    }

    router.push(`${panelBasePath}/list`);
  }, [asModal, onClose, panelBasePath, router]);

  const handleShopAdded = useCallback((shop: LinkedShop) => {
    setLinkedShops((prev) => [...prev, shop]);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!shopOwnerId || !accessToken) {
      setLoading(false);
      setData(null);
      setLinkedShops([]);
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

      const ownerDetails = result.data;
      let nextLinkedShops = Array.isArray(ownerDetails.shopIds) ? ownerDetails.shopIds : [];

      try {
        const shopsResponse = await fetch(`${baseURL}${SummaryApi.shop_list.url}`, {
          method: SummaryApi.shop_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const shopsResult = (await shopsResponse
          .json()
          .catch(() => ({}))) as ShopListResponse;

        if (shopsResponse.ok && shopsResult?.success && Array.isArray(shopsResult.data)) {
          const filtered = shopsResult.data.filter(
            (shop) => getLinkedShopOwnerId(shop, ownerDetails._id) === ownerDetails._id
          );

          if (filtered.length) {
            nextLinkedShops = filtered;
          }
        }
      } catch (shopError) {
        console.error(shopError);
      }

      setData(ownerDetails);
      setLinkedShops(nextLinkedShops);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load shop owner details";

      console.error(error);
      toast.error(message);
      setData(null);
      setLinkedShops([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, shopOwnerId]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

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

      toast.success(nextStatus ? "Shop activated successfully" : "Shop deactivated successfully");
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

    const confirmed = window.confirm("Delete this linked shop?");
    if (!confirmed) return;

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

  if (loading) return <LoadingView asModal={asModal} />;

  if (!shopOwnerId || !data) {
    return <EmptyView asModal={asModal} onBack={handleBack} />;
  }

  const isEmailVerified = data.verifyEmail ?? false;
  const isActive = data.isActive ?? false;
  const personalDetailRows = [
    { label: "Full Name", value: String(data.name || "-") },
    { label: "Username", value: String(data.username || "-") },
    { label: "Email ID", value: String(data.email || "-") },
    { label: "Primary Mobile", value: String(data.mobile || "-") },
    { label: "Secondary Mobile", value: String(data.additionalNumber || "-") },
    { label: "Shop Control", value: getShopControlLabel(data.shopControl) },
    { label: "Email Status", value: isEmailVerified ? "Verified" : "Pending" },
    { label: "Status", value: isActive ? "Active" : "Inactive" },
    { label: "Valid To", value: formatDate(data.validTo) },
  ];
  const personalAddressRows = [
    { label: "State", value: String(data.address?.state || "-") },
    { label: "District", value: String(data.address?.district || "-") },
    { label: "Taluk", value: String(data.address?.taluk || "-") },
    { label: "Area", value: String(data.address?.area || "-") },
    { label: "Street", value: String(data.address?.street || "-") },
    { label: "Pincode", value: String(data.address?.pincode || "-") },
  ];

  return (
    <ViewFrame asModal={asModal}>
      <div className="mx-auto w-full max-w-7xl space-y-3.5">
        <ShopOwnerViewHeader data={data} linkedShopCount={linkedShops.length} />

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_320px] xl:items-start">
          <DetailTableSection
            icon={<User2 className="h-5 w-5" />}
            title="Personal Details"
            description="Owner identity, contact details, account status, and control mode."
            rows={personalDetailRows}
          />

          <DetailTableSection
            icon={<MapPin className="h-5 w-5" />}
            title="Personal Address"
            description="Mapped location and street details stored for this shop owner."
            rows={personalAddressRows}
          />

          <DocumentsSection data={data} />
        </div>

        <BusinessLocationsTable
          shops={linkedShops}
          ownerId={data._id}
          shopBasePath={shopBasePath}
          loadingId={shopActionLoading}
          onToggle={handleToggleLinkedShop}
          onDelete={handleDeleteLinkedShop}
          accessToken={accessToken}
          onShopAdded={handleShopAdded}
        />
      </div>
    </ViewFrame>
  );
}

export function ShopOwnerViewModal({
  shopOwnerId,
  onClose,
}: ShopOwnerViewProps) {
  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-slate-900">Shop Owner Details</p>
            <p className="text-sm text-slate-500">
              Review account information, documents, and business locations.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close view popup"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
          <ShopOwnerViewContent
            shopOwnerId={shopOwnerId}
            asModal
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export default function ShopOwnerViewPage() {
  const searchParams = useSearchParams();
  const shopOwnerId = String(searchParams.get("id") || "").trim();

  return <ShopOwnerViewContent shopOwnerId={shopOwnerId} />;
}
