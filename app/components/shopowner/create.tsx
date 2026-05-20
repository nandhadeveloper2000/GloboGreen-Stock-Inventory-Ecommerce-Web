/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  FileBadge2,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Search,
  Store,
  UploadCloud,
  User2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type AppRole = "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF";
type ShopControl = "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE";
type ShopOwnerFormMode = "create" | "edit";

type Option = {
  label: string;
  value: string;
};

type FormState = {
  name: string;
  username: string;
  email: string;
  pin: string;
  mobile: string;
  secondaryMobile: string;
  shopControl: ShopControl;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type ShopDocument = {
  url?: string;
  mimeType?: string;
  fileName?: string;
  bytes?: number;
};

type BusinessLocation = {
  _id?: string;
  name?: string;
  businessType?: string;
  mobile?: string;
  billingType?: string;
  isActive?: boolean;
  frontImageUrl?: string;
  gstCertificate?: ShopDocument;
  udyamCertificate?: ShopDocument;
  shopAddress?: {
    state?: string;
    district?: string;
    taluk?: string;
    area?: string;
    street?: string;
    pincode?: string;
  };
};

type ShopType = "" | "WAREHOUSE_RETAIL_SHOP" | "RETAIL_BRANCH_SHOP" | "WHOLESALE_SHOP";
type ShopBillingType = "" | "GST" | "NON_GST";
type BusinessLocationType = "" | "Retail" | "Wholesale";

type BusinessLocationDraft = {
  tempId: string;
  shopName: string;
  shopType: ShopType;
  billingType: ShopBillingType;
  businessType: BusinessLocationType;
  mobile: string;
  gstNumber: string;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
  frontImageFile: File | null;
  frontImagePreview: string;
  gstCertificateFile: File | null;
  gstCertificatePreview: string;
  udyamCertificateFile: File | null;
  udyamCertificatePreview: string;
};

type LocationDraftForm = Omit<BusinessLocationDraft, "tempId">;
type LocationFormErrors = Partial<Record<keyof LocationDraftForm, string>>;

type CreateShopOwnerApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    role?: string;
  };
};

type ShopOwnerDetailsResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    username?: string;
    email?: string;
    mobile?: string;
    additionalNumber?: string;
    avatarUrl?: string;
    verifyEmail?: boolean;
    shopControl?: ShopControl;
    address?: {
      state?: string;
      district?: string;
      taluk?: string;
      area?: string;
      street?: string;
      pincode?: string;
    };
    idProof?: {
      url?: string;
      mimeType?: string;
      fileName?: string;
    };
    shopIds?: BusinessLocation[];
  };
};

type ShopOwnerActionResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    avatarUrl?: string;
    idProof?: {
      url?: string;
      mimeType?: string;
      fileName?: string;
    };
  };
};

type ShopLocationActionResponse = {
  success?: boolean;
  message?: string;
  data?: BusinessLocation;
};

type ShopOwnerFormProps = {
  mode?: ShopOwnerFormMode;
  shopOwnerId?: string;
  asModal?: boolean;
  onClose?: () => void;
  onSaved?: () => void | Promise<void>;
};

const INITIAL: FormState = {
  name: "",
  username: "",
  email: "",
  pin: "",
  mobile: "",
  secondaryMobile: "",
  shopControl: "INVENTORY_ONLY",
  state: "",
  district: "",
  taluk: "",
  area: "",
  street: "",
  pincode: "",
};

const SHOP_CONTROL_OPTIONS: Option[] = [
  { label: "Inventory Only", value: "INVENTORY_ONLY" },
  { label: "All In One Ecommerce", value: "ALL_IN_ONE_ECOMMERCE" },
];

const SHOP_TYPE_OPTIONS: Option[] = [
  { label: "Warehouse Retail Shop", value: "WAREHOUSE_RETAIL_SHOP" },
  { label: "Retail Branch Shop", value: "RETAIL_BRANCH_SHOP" },
  { label: "Wholesale Shop", value: "WHOLESALE_SHOP" },
];

const BILLING_TYPE_OPTIONS: Option[] = [
  { label: "GST", value: "GST" },
  { label: "Non GST", value: "NON_GST" },
];

const BUSINESS_TYPE_OPTIONS: Option[] = [
  { label: "Retail", value: "Retail" },
  { label: "Wholesale", value: "Wholesale" },
];

const LOCATION_INITIAL: LocationDraftForm = {
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
  frontImageFile: null,
  frontImagePreview: "",
  gstCertificateFile: null,
  gstCertificatePreview: "",
  udyamCertificateFile: null,
  udyamCertificatePreview: "",
};

function classNames(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function alphaSpaceOnly(value: string) {
  return value.replace(/[^a-zA-Z\s]/g, "");
}

function toTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) =>
      part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""
    )
    .join(" ");
}

function normalizeOptionText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function appendOption(options: Option[], rawValue: string) {
  const value = normalizeOptionText(rawValue);

  if (!value) return options;

  const exists = options.some(
    (option) =>
      normalizeOptionText(option.value).toLowerCase() === value.toLowerCase()
  );

  if (exists) return options;

  return [...options, { label: value, value }];
}

function createUsernameFromName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "");

  if (!base) return "";

  return `${base}${String(Date.now()).slice(-4)}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPin(pin: string) {
  return /^\d{4,8}$/.test(pin);
}

function isValidIndianMobile(mobile: string) {
  return /^[6-9]\d{9}$/.test(mobile);
}

function isValidPincode(pincode: string) {
  return /^\d{6}$/.test(pincode);
}

function normalizeRole(role?: string | null): AppRole {
  const value = String(role || "").trim().toUpperCase();

  if (value === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (value === "MANAGER") return "MANAGER";
  if (value === "SUPERVISOR") return "SUPERVISOR";

  return "STAFF";
}

function getPanelBasePath(role?: string | null) {
  const normalized = normalizeRole(role);

  if (normalized === "MASTER_ADMIN") return "/master/shopowner";
  if (normalized === "MANAGER") return "/manager/shopowner";
  if (normalized === "SUPERVISOR") return "/supervisor/shopowner";

  return "/staff/shopowner";
}

function isImageAsset(url?: string | null, mimeType?: string | null) {
  const normalizedMime = String(mimeType || "").trim().toLowerCase();

  if (normalizedMime.startsWith("image/")) return true;

  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(
    String(url || "").trim().toLowerCase()
  );
}

function toOptions(arr: unknown): Option[] {
  if (!Array.isArray(arr)) return [];

  return arr
    .map((item) => {
      if (typeof item === "string") return { label: item, value: item };

      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const raw =
          typeof obj.name === "string"
            ? obj.name
            : typeof obj.label === "string"
              ? obj.label
              : typeof obj.value === "string"
                ? obj.value
                : typeof obj.title === "string"
                  ? obj.title
                  : "";

        if (raw) return { label: raw, value: raw };
      }

      return null;
    })
    .filter(Boolean) as Option[];
}

function buildAddressPayload(form: FormState) {
  return {
    state: form.state.trim(),
    district: form.district.trim(),
    taluk: form.taluk.trim(),
    area: form.area.trim(),
    street: form.street.trim(),
    pincode: form.pincode.trim(),
  };
}

function buildCompactAddress(address?: BusinessLocation["shopAddress"]) {
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

function revokePreviewUrl(url?: string | null) {
  if (String(url || "").startsWith("blob:")) {
    URL.revokeObjectURL(String(url));
  }
}

function buildLocationDocumentLabels(location: {
  frontImageUrl?: string;
  gstCertificate?: ShopDocument;
  udyamCertificate?: ShopDocument;
  frontImageFile?: File | null;
  gstCertificateFile?: File | null;
  udyamCertificateFile?: File | null;
}) {
  const labels: string[] = [];

  if (location.frontImageUrl || location.frontImageFile) {
    labels.push("Front");
  }

  if (location.gstCertificate?.url || location.gstCertificateFile) {
    labels.push("GST");
  }

  if (location.udyamCertificate?.url || location.udyamCertificateFile) {
    labels.push("Udyam");
  }

  return labels;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1.5 bg-white px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {label} {required ? <span className="text-rose-500">*</span> : null}
    </span>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  disabled,
  error,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder || label}
          className={classNames(
            "h-11 w-full rounded-xl border bg-white px-3 pb-1 pt-5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400",
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              : "border-slate-200 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        />
        <FieldLabel label={label} required={required} />
      </div>
      {error ? <p className="px-1 text-xs font-medium text-rose-500">{error}</p> : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  disabled?: boolean;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={classNames(
            "h-11 w-full appearance-none rounded-xl border bg-white px-3 pb-1 pt-5 text-sm font-semibold text-slate-900 outline-none transition",
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              : "border-slate-200 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        >
          <option value="" />
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldLabel label={label} required={required} />
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error ? <p className="px-1 text-xs font-medium text-rose-500">{error}</p> : null}
    </div>
  );
}

function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  required,
  placeholder,
  searchPlaceholder,
  allowCustom = false,
  onCreateOption,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  error?: string;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  onCreateOption?: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    const matched = options.find((option) => option.value === value);
    return matched?.label || value;
  }, [options, value]);

  const normalizedQuery = normalizeOptionText(query);
  const loweredQuery = normalizedQuery.toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!loweredQuery) return options;

    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(loweredQuery)
    );
  }, [loweredQuery, options]);

  const canCreate =
    allowCustom &&
    Boolean(normalizedQuery) &&
    !options.some((option) => {
      const optionLabel = normalizeOptionText(option.label).toLowerCase();
      const optionValue = normalizeOptionText(option.value).toLowerCase();
      return optionLabel === loweredQuery || optionValue === loweredQuery;
    });

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSelect = (nextValue: string) => {
    onChange(normalizeOptionText(nextValue));
    setOpen(false);
    setQuery("");
  };

  const handleCreate = () => {
    if (!canCreate) return;
    onCreateOption?.(normalizedQuery);
    handleSelect(normalizedQuery);
  };

  return (
    <div ref={containerRef} className="space-y-1">
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={classNames(
            "flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 pb-1 pt-5 text-left text-sm font-semibold outline-none transition",
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
              : "border-slate-200 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        >
          <span className={classNames("truncate", selectedLabel ? "text-slate-900" : "text-slate-400")}>
            {selectedLabel || placeholder || `Select ${label.toLowerCase()}`}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <FieldLabel label={label} required={required} />

        {open ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setOpen(false);

                    if (event.key === "Enter") {
                      event.preventDefault();

                      if (canCreate) {
                        handleCreate();
                        return;
                      }

                      if (filteredOptions.length === 1) {
                        handleSelect(filteredOptions[0].value);
                      }
                    }
                  }}
                  placeholder={searchPlaceholder || "Search options"}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00008b] focus:bg-white"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto p-2">
              {canCreate ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-[#00008b] transition hover:bg-[#00008b]/5"
                >
                  <Plus className="h-4 w-4" />
                  Use &quot;{normalizedQuery}&quot;
                </button>
              ) : null}

              {filteredOptions.length ? (
                filteredOptions.map((option) => {
                  const selected = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={classNames(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                        selected
                          ? "bg-[#00008b]/5 font-bold text-[#00008b]"
                          : "font-semibold text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  );
                })
              ) : canCreate ? null : (
                <p className="px-3 py-3 text-sm font-medium text-slate-500">
                  No matching options found.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="px-1 text-xs font-medium text-rose-500">{error}</p> : null}
    </div>
  );
}

function UploadBox({
  title,
  description,
  preview,
  fileName,
  onUpload,
  onRemove,
  inputRef,
  accept,
  buttonLabel,
  emptyIcon,
  busy,
}: {
  title: string;
  description: string;
  preview: string;
  fileName: string;
  onUpload: (file: File | null | undefined) => void;
  onRemove: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  buttonLabel: string;
  emptyIcon: ReactNode;
  busy?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={title}
            className="h-24 w-full rounded-xl border border-slate-200 object-cover"
          />
        ) : fileName ? (
          <div className="flex h-24 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center">
            <FileBadge2 className="h-6 w-6 text-slate-400" />
            <p className="mt-2 line-clamp-2 text-xs font-bold text-slate-700">{fileName}</p>
          </div>
        ) : (
          <div className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
            {emptyIcon}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onUpload(event.target.files?.[0])}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-[#00008b] px-3 text-xs font-extrabold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonLabel}
        </button>

        {preview || fileName ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-white px-3 text-xs font-extrabold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="mb-3.5 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00008b]/5 text-[#00008b]">
          {icon}
        </span>
        <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function ShopOwnerForm({
  mode = "create",
  shopOwnerId: propShopOwnerId,
  asModal = false,
  onClose,
  onSaved,
}: ShopOwnerFormProps) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const auth = useAuth();
  const accessToken = auth?.accessToken ?? null;
  const currentRole = String(
    (auth as { role?: string | null; user?: { role?: string | null } })?.role ||
      (auth as { user?: { role?: string | null } })?.user?.role ||
      "MASTER_ADMIN"
  );

  const paramShopOwnerId = String(params?.id || "").trim();
  const initialShopOwnerId = String(propShopOwnerId || paramShopOwnerId || "").trim();
  const [activeMode, setActiveMode] = useState<ShopOwnerFormMode>(mode);
  const [activeShopOwnerId, setActiveShopOwnerId] = useState(initialShopOwnerId);
  const isEditMode = activeMode === "edit";
  const shopOwnerId = activeShopOwnerId;
  const listPath = `${getPanelBasePath(currentRole)}/list`;

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const idProofInputRef = useRef<HTMLInputElement | null>(null);
  const locationFrontImageInputRef = useRef<HTMLInputElement | null>(null);
  const locationGstInputRef = useRef<HTMLInputElement | null>(null);
  const locationUdyamInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [loadFailed, setLoadFailed] = useState(false);

  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [taluks, setTaluks] = useState<Option[]>([]);
  const [areas, setAreas] = useState<Option[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTaluks, setLoadingTaluks] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [businessLocations, setBusinessLocations] = useState<BusinessLocation[]>([]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [existingAvatarUrl, setExistingAvatarUrl] = useState("");
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState("");
  const [existingIdProofUrl, setExistingIdProofUrl] = useState("");
  const [existingIdProofName, setExistingIdProofName] = useState("");
  const [existingIdProofMimeType, setExistingIdProofMimeType] = useState("");
  const [removingIdProof, setRemovingIdProof] = useState(false);
  const avatarPreviewRef = useRef("");
  const idProofPreviewRef = useRef("");

  const [showLocationForm, setShowLocationForm] = useState(false);
  const [locationForm, setLocationForm] = useState<LocationDraftForm>(LOCATION_INITIAL);
  const [locationFormErrors, setLocationFormErrors] = useState<LocationFormErrors>({});
  const [locationDrafts, setLocationDrafts] = useState<BusinessLocationDraft[]>([]);
  const [addingLocation, setAddingLocation] = useState(false);
  const locationFormRef = useRef<LocationDraftForm>(LOCATION_INITIAL);
  const locationDraftsRef = useRef<BusinessLocationDraft[]>([]);

  const isLocationLoading =
    loadingStates || loadingDistricts || loadingTaluks || loadingAreas;

  useEffect(() => {
    setActiveMode(mode);
    setActiveShopOwnerId(initialShopOwnerId);
  }, [initialShopOwnerId, mode]);

  useEffect(() => {
    locationFormRef.current = locationForm;
  }, [locationForm]);

  useEffect(() => {
    locationDraftsRef.current = locationDrafts;
  }, [locationDrafts]);

  useEffect(() => {
    avatarPreviewRef.current = avatarPreview;
  }, [avatarPreview]);

  useEffect(() => {
    idProofPreviewRef.current = idProofPreview;
  }, [idProofPreview]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const resetDistrictTree = () => {
    setDistricts([]);
    setTaluks([]);
    setAreas([]);
  };

  const resetTalukTree = () => {
    setTaluks([]);
    setAreas([]);
  };

  const resetAreaTree = () => {
    setAreas([]);
  };

  const clearAvatarInput = () => {
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const clearIdProofInput = () => {
    if (idProofInputRef.current) idProofInputRef.current.value = "";
  };

  const clearLocationUploadInputs = () => {
    if (locationFrontImageInputRef.current) locationFrontImageInputRef.current.value = "";
    if (locationGstInputRef.current) locationGstInputRef.current.value = "";
    if (locationUdyamInputRef.current) locationUdyamInputRef.current.value = "";
  };

  const revokeLocationPreviews = (
    draft?: Partial<
      Pick<
        LocationDraftForm,
        "frontImagePreview" | "gstCertificatePreview" | "udyamCertificatePreview"
      >
    >
  ) => {
    revokePreviewUrl(draft?.frontImagePreview);
    revokePreviewUrl(draft?.gstCertificatePreview);
    revokePreviewUrl(draft?.udyamCertificatePreview);
  };

  const resetLocationFormState = () => {
    revokeLocationPreviews(locationFormRef.current);
    setLocationForm(LOCATION_INITIAL);
    setLocationFormErrors({});
    clearLocationUploadInputs();
  };

  const resetAvatar = () => {
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);

    setAvatarFile(null);
    setAvatarPreview("");
    setExistingAvatarUrl("");
    clearAvatarInput();
  };

  const resetIdProof = () => {
    if (idProofPreview.startsWith("blob:")) URL.revokeObjectURL(idProofPreview);

    setIdProofFile(null);
    setIdProofPreview("");
    setExistingIdProofUrl("");
    setExistingIdProofName("");
    setExistingIdProofMimeType("");
    clearIdProofInput();
  };

  const closeForm = () => {
    if (onClose) {
      onClose();
      return;
    }

    router.push(listPath);
  };

  const fetchApi = async (url: string) => {
    if (!accessToken) return [];

    try {
      const response = await fetch(`${baseURL}${url}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) return [];
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.results)) return data.results;
      if (Array.isArray(data)) return data;

      return [];
    } catch {
      return [];
    }
  };

  const fetchAreas = async () => {
    const primaryUrl = `${SummaryApi.location_villages.url}?state=${encodeURIComponent(
      form.state
    )}&district=${encodeURIComponent(
      form.district
    )}&talukName=${encodeURIComponent(form.taluk)}`;

    const fallbackUrl = `${SummaryApi.location_villages.url}?state=${encodeURIComponent(
      form.state
    )}&district=${encodeURIComponent(form.district)}&taluk=${encodeURIComponent(
      form.taluk
    )}`;

    const primaryData = await fetchApi(primaryUrl);
    return primaryData.length ? primaryData : fetchApi(fallbackUrl);
  };

  useEffect(() => {
    let active = true;

    async function loadStates() {
      if (!accessToken) return;

      setLoadingStates(true);
      setLocationError("");

      const data = await fetchApi(SummaryApi.location_states.url);

      if (!active) return;

      const options = toOptions(data);
      setStates(options);
      setLoadingStates(false);

      if (!options.length) setLocationError("Unable to load states.");
    }

    void loadStates();

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state) {
      resetDistrictTree();
      setForm((prev) => ({ ...prev, district: "", taluk: "", area: "" }));
      return;
    }

    async function loadDistricts() {
      setLoadingDistricts(true);
      setLocationError("");

      const data = await fetchApi(
        `${SummaryApi.location_districts.url}?state=${encodeURIComponent(form.state)}`
      );

      if (!active) return;

      const options = toOptions(data);
      setDistricts(options);
      setTaluks([]);
      setAreas([]);
      setLoadingDistricts(false);

      if (!options.length) setLocationError("No districts found for the selected state.");
    }

    void loadDistricts();

    return () => {
      active = false;
    };
  }, [form.state, accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state || !form.district) {
      resetTalukTree();
      setForm((prev) => ({ ...prev, taluk: "", area: "" }));
      return;
    }

    async function loadTaluks() {
      setLoadingTaluks(true);
      setLocationError("");

      const data = await fetchApi(
        `${SummaryApi.location_taluks.url}?state=${encodeURIComponent(
          form.state
        )}&district=${encodeURIComponent(form.district)}`
      );

      if (!active) return;

      const options = toOptions(data);
      setTaluks(options);
      setAreas([]);
      setLoadingTaluks(false);

      if (!options.length) setLocationError("No taluks found for the selected district.");
    }

    void loadTaluks();

    return () => {
      active = false;
    };
  }, [form.state, form.district, accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state || !form.district || !form.taluk) {
      resetAreaTree();
      setForm((prev) => ({ ...prev, area: "" }));
      return;
    }

    async function loadAreas() {
      setLoadingAreas(true);
      setLocationError("");

      const data = await fetchAreas();

      if (!active) return;

      const options = toOptions(data);
      setAreas(options);
      setLoadingAreas(false);

      if (!options.length) setLocationError("No areas found for the selected taluk.");
    }

    void loadAreas();

    return () => {
      active = false;
    };
  }, [form.state, form.district, form.taluk, accessToken]);

  useEffect(() => {
    return () => {
      revokePreviewUrl(avatarPreviewRef.current);
      revokePreviewUrl(idProofPreviewRef.current);
      revokeLocationPreviews(locationFormRef.current);
      locationDraftsRef.current.forEach((draft) => revokeLocationPreviews(draft));
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadShopOwner() {
      if (!isEditMode) {
        setBusinessLocations([]);
        setPageLoading(false);
        setLoadFailed(false);
        return;
      }

      if (!shopOwnerId) {
        setBusinessLocations([]);
        setLoadFailed(true);
        setPageLoading(false);
        return;
      }

      if (!accessToken) return;

      try {
        setPageLoading(true);
        setLoadFailed(false);

        const response = await fetch(
          `${baseURL}${SummaryApi.shopowner_get.url(shopOwnerId)}`,
          {
            method: SummaryApi.shopowner_get.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result =
          (await response.json().catch(() => ({}))) as ShopOwnerDetailsResponse;

        if (!active) return;

        if (!response.ok || !result?.success || !result?.data) {
          throw new Error(result?.message || "Failed to load shop owner details");
        }

        const owner = result.data;
        const nextAvatarUrl = String(owner.avatarUrl || "").trim();
        const nextIdProofUrl = String(owner.idProof?.url || "").trim();
        const nextIdProofMimeType = String(owner.idProof?.mimeType || "").trim();

        setForm({
          name: owner.name || "",
          username: owner.username || "",
          email: owner.email || "",
          pin: "",
          mobile: owner.mobile || "",
          secondaryMobile: owner.additionalNumber || "",
          shopControl: owner.shopControl || "INVENTORY_ONLY",
          state: owner.address?.state || "",
          district: owner.address?.district || "",
          taluk: owner.address?.taluk || "",
          area: owner.address?.area || "",
          street: owner.address?.street || "",
          pincode: owner.address?.pincode || "",
        });
        setBusinessLocations(Array.isArray(owner.shopIds) ? owner.shopIds : []);

        setExistingAvatarUrl(nextAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(nextAvatarUrl);

        setExistingIdProofUrl(nextIdProofUrl);
        setExistingIdProofName(String(owner.idProof?.fileName || ""));
        setExistingIdProofMimeType(nextIdProofMimeType);
        setIdProofFile(null);
        setIdProofPreview(
          isImageAsset(nextIdProofUrl, nextIdProofMimeType) ? nextIdProofUrl : ""
        );

        clearAvatarInput();
        clearIdProofInput();
      } catch (error) {
        if (!active) return;

        setLoadFailed(true);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load shop owner details"
        );
      } finally {
        if (active) setPageLoading(false);
      }
    }

    void loadShopOwner();

    return () => {
      active = false;
    };
  }, [accessToken, isEditMode, shopOwnerId]);

  const handleAvatarChange = (file: File | null | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid avatar image");
      clearAvatarInput();
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar size must be under 2MB");
      clearAvatarInput();
      return;
    }

    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleIdProofChange = (file: File | null | undefined) => {
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      toast.error("Upload PDF, JPG, JPEG, PNG, or WEBP for ID proof");
      clearIdProofInput();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ID proof size must be under 5MB");
      clearIdProofInput();
      return;
    }

    if (idProofPreview.startsWith("blob:")) URL.revokeObjectURL(idProofPreview);

    setIdProofFile(file);
    setIdProofPreview(isImage ? URL.createObjectURL(file) : "");
  };

  const handleRemoveAvatar = async () => {
    if (avatarFile) {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);

      setAvatarFile(null);
      setAvatarPreview(existingAvatarUrl || "");
      clearAvatarInput();
      return;
    }

    if (!isEditMode) {
      resetAvatar();
      return;
    }

    if (!accessToken || !shopOwnerId) {
      toast.error("Authentication or shop owner id missing");
      return;
    }

    if (!existingAvatarUrl) {
      setAvatarPreview("");
      clearAvatarInput();
      return;
    }

    try {
      setRemovingAvatar(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.shopowner_admin_avatar_remove.url(shopOwnerId)}`,
        {
          method: SummaryApi.shopowner_admin_avatar_remove.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const result =
        (await response.json().catch(() => ({}))) as ShopOwnerActionResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to remove avatar");
      }

      setAvatarFile(null);
      setAvatarPreview("");
      setExistingAvatarUrl("");
      clearAvatarInput();
      toast.success("Avatar removed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove avatar");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleRemoveIdProof = async () => {
    if (idProofFile) {
      if (idProofPreview.startsWith("blob:")) URL.revokeObjectURL(idProofPreview);

      setIdProofFile(null);
      setIdProofPreview(
        isImageAsset(existingIdProofUrl, existingIdProofMimeType)
          ? existingIdProofUrl
          : ""
      );
      clearIdProofInput();
      return;
    }

    if (!isEditMode) {
      resetIdProof();
      return;
    }

    if (!accessToken || !shopOwnerId) {
      toast.error("Authentication or shop owner id missing");
      return;
    }

    if (!existingIdProofUrl) {
      setIdProofPreview("");
      clearIdProofInput();
      return;
    }

    try {
      setRemovingIdProof(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.shopowner_admin_docs_remove.url(shopOwnerId, "idProof")}`,
        {
          method: SummaryApi.shopowner_admin_docs_remove.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const result =
        (await response.json().catch(() => ({}))) as ShopOwnerActionResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to remove ID proof");
      }

      setIdProofFile(null);
      setIdProofPreview("");
      setExistingIdProofUrl("");
      setExistingIdProofName("");
      setExistingIdProofMimeType("");
      clearIdProofInput();
      toast.success("ID proof removed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove ID proof");
    } finally {
      setRemovingIdProof(false);
    }
  };

  const handleLocationFrontImageChange = (file: File | null | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid location front image");
      if (locationFrontImageInputRef.current) locationFrontImageInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Front image size must be under 5MB");
      if (locationFrontImageInputRef.current) locationFrontImageInputRef.current.value = "";
      return;
    }

    revokePreviewUrl(locationForm.frontImagePreview);

    setLocationForm((prev) => ({
      ...prev,
      frontImageFile: file,
      frontImagePreview: URL.createObjectURL(file),
    }));
  };

  const handleLocationDocumentChange = (
    key: "gstCertificate" | "udyamCertificate",
    file: File | null | undefined
  ) => {
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      toast.error("Upload PDF, JPG, JPEG, PNG, or WEBP");
      if (key === "gstCertificate" && locationGstInputRef.current) {
        locationGstInputRef.current.value = "";
      }
      if (key === "udyamCertificate" && locationUdyamInputRef.current) {
        locationUdyamInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Document size must be under 5MB");
      if (key === "gstCertificate" && locationGstInputRef.current) {
        locationGstInputRef.current.value = "";
      }
      if (key === "udyamCertificate" && locationUdyamInputRef.current) {
        locationUdyamInputRef.current.value = "";
      }
      return;
    }

    const previewKey =
      key === "gstCertificate" ? "gstCertificatePreview" : "udyamCertificatePreview";
    revokePreviewUrl(locationForm[previewKey]);

    setLocationForm((prev) => ({
      ...prev,
      ...(key === "gstCertificate"
        ? {
            gstCertificateFile: file,
            gstCertificatePreview: isImage ? URL.createObjectURL(file) : "",
          }
        : {
            udyamCertificateFile: file,
            udyamCertificatePreview: isImage ? URL.createObjectURL(file) : "",
          }),
    }));
  };

  const handleRemoveLocationFrontImage = () => {
    revokePreviewUrl(locationForm.frontImagePreview);
    setLocationForm((prev) => ({
      ...prev,
      frontImageFile: null,
      frontImagePreview: "",
    }));
    if (locationFrontImageInputRef.current) locationFrontImageInputRef.current.value = "";
  };

  const handleRemoveLocationDocument = (key: "gstCertificate" | "udyamCertificate") => {
    if (key === "gstCertificate") {
      revokePreviewUrl(locationForm.gstCertificatePreview);
      setLocationForm((prev) => ({
        ...prev,
        gstCertificateFile: null,
        gstCertificatePreview: "",
      }));
      if (locationGstInputRef.current) locationGstInputRef.current.value = "";
      return;
    }

    revokePreviewUrl(locationForm.udyamCertificatePreview);
    setLocationForm((prev) => ({
      ...prev,
      udyamCertificateFile: null,
      udyamCertificatePreview: "",
    }));
    if (locationUdyamInputRef.current) locationUdyamInputRef.current.value = "";
  };

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!form.name.trim()) nextErrors.name = "Full name is required";
    if (!form.username.trim()) nextErrors.username = "Username is required";

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!isValidEmail(form.email)) {
      nextErrors.email = "Enter a valid email";
    }

    if (!isEditMode && !form.pin.trim()) {
      nextErrors.pin = "PIN is required";
    } else if (form.pin.trim() && !isValidPin(form.pin)) {
      nextErrors.pin = "PIN must be 4 to 8 digits";
    }

    if (!form.mobile.trim()) {
      nextErrors.mobile = "Primary mobile is required";
    } else if (!isValidIndianMobile(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit mobile";
    }

    if (form.secondaryMobile.trim() && !isValidIndianMobile(form.secondaryMobile)) {
      nextErrors.secondaryMobile = "Enter a valid 10-digit secondary mobile";
    }

    if (form.secondaryMobile.trim() && form.secondaryMobile === form.mobile) {
      nextErrors.secondaryMobile = "Secondary mobile must be different";
    }

    if (!form.state.trim()) nextErrors.state = "State is required";
    if (!form.district.trim()) nextErrors.district = "District is required";
    if (!form.taluk.trim()) nextErrors.taluk = "Taluk is required";
    if (!form.area.trim()) nextErrors.area = "Area is required";
    if (!form.street.trim()) nextErrors.street = "Street is required";

    if (!form.pincode.trim()) {
      nextErrors.pincode = "Pincode is required";
    } else if (!isValidPincode(form.pincode)) {
      nextErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAutoUsername = () => {
    if (!form.name.trim()) {
      toast.error("Enter full name first");
      return;
    }

    updateField("username", createUsernameFromName(form.name));
  };

  const uploadOwnerAvatar = async (ownerId: string) => {
    if (!avatarFile || !accessToken) return;

    const payload = new FormData();
    payload.append("avatar", avatarFile);

    const response = await fetch(
      `${baseURL}${SummaryApi.shopowner_admin_avatar_upload.url(ownerId)}`,
      {
        method: SummaryApi.shopowner_admin_avatar_upload.method,
        headers: { Authorization: `Bearer ${accessToken}` },
        body: payload,
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Avatar upload failed");
    }
  };

  const uploadOwnerIdProof = async (ownerId: string) => {
    if (!idProofFile || !accessToken) return;

    const payload = new FormData();
    payload.append("idProof", idProofFile);

    const response = await fetch(
      `${baseURL}${SummaryApi.shopowner_admin_docs_upload.url(ownerId)}`,
      {
        method: SummaryApi.shopowner_admin_docs_upload.method,
        headers: { Authorization: `Bearer ${accessToken}` },
        body: payload,
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "ID proof upload failed");
    }
  };

  const createShopLocation = async (
    ownerId: string,
    draft: LocationDraftForm
  ) => {
    const payload = new FormData();
    payload.append("name", draft.shopName.trim());
    payload.append("shopName", draft.shopName.trim());
    payload.append("ownerId", ownerId);
    payload.append("shopOwnerAccountId", ownerId);
    payload.append("shopType", draft.shopType);
    payload.append("mobile", draft.mobile.trim());
    payload.append("billingType", draft.billingType || "GST");
    payload.append("enableGSTBilling", String(draft.billingType === "GST"));
    payload.append("isMainWarehouse", String(draft.shopType === "WAREHOUSE_RETAIL_SHOP"));
    if (draft.businessType) payload.append("businessType", draft.businessType);
    if (draft.gstNumber.trim()) payload.append("gstNumber", draft.gstNumber.trim());
    payload.append("state", draft.state.trim());
    payload.append("district", draft.district.trim());
    payload.append("taluk", draft.taluk.trim());
    payload.append("area", draft.area.trim());
    payload.append("street", draft.street.trim());
    payload.append("pincode", draft.pincode.trim());
    if (draft.frontImageFile) payload.append("frontImage", draft.frontImageFile);
    if (draft.gstCertificateFile) payload.append("gstCertificate", draft.gstCertificateFile);
    if (draft.udyamCertificateFile) payload.append("udyamCertificate", draft.udyamCertificateFile);

    const response = await fetch(`${baseURL}${SummaryApi.shop_create.url}`, {
      method: SummaryApi.shop_create.method,
      headers: { Authorization: `Bearer ${accessToken ?? ""}` },
      body: payload,
    });

    const result =
      (await response.json().catch(() => ({}))) as ShopLocationActionResponse;

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Failed to create business location");
    }

    return result?.data || {};
  };

  const saveShopOwner = async () => {
    if (isLocationLoading) {
      toast.error("Please wait until location data finishes loading");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    let targetOwnerId = isEditMode ? shopOwnerId : "";
    const wasEditMode = isEditMode;

    try {
      setSubmitting(true);

      const payload = {
        name: toTitleCase(alphaSpaceOnly(form.name)),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        additionalNumber: form.secondaryMobile.trim() || "",
        shopControl: form.shopControl,
        ...buildAddressPayload(form),
        ...(form.pin.trim() ? { pin: form.pin.trim() } : {}),
      };

      if (isEditMode) {
        if (!shopOwnerId) {
          toast.error("Invalid shop owner id");
          return;
        }

        const response = await fetch(
          `${baseURL}${SummaryApi.shopowner_update.url(shopOwnerId)}`,
          {
            method: SummaryApi.shopowner_update.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const result =
          (await response.json().catch(() => ({}))) as CreateShopOwnerApiResponse;

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to update shop owner");
        }
      } else {
        const response = await fetch(`${baseURL}${SummaryApi.shopowner_create.url}`, {
          method: SummaryApi.shopowner_create.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result =
          (await response.json().catch(() => ({}))) as CreateShopOwnerApiResponse;

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to create shop owner");
        }

        targetOwnerId = String(result?.data?._id || "");

        if (!targetOwnerId) {
          throw new Error("Shop owner created but missing owner id");
        }
      }

      await uploadOwnerAvatar(targetOwnerId);
      await uploadOwnerIdProof(targetOwnerId);

      if (!wasEditMode && locationDrafts.length > 0) {
        for (const draft of locationDrafts) {
          try {
            await createShopLocation(targetOwnerId, draft);
          } catch {
            // Continue with remaining locations
          }
        }

        locationDrafts.forEach((draft) => revokeLocationPreviews(draft));
      }

      toast.success(wasEditMode ? "Shop owner updated successfully" : "Shop owner saved successfully");

      await onSaved?.();

      if (!wasEditMode && asModal && targetOwnerId) {
        setActiveMode("edit");
        setActiveShopOwnerId(targetOwnerId);
        setForm((prev) => ({ ...prev, pin: "" }));
        setLocationDrafts([]);
        setPageLoading(true);
        return;
      }

      if (asModal && onClose) {
        onClose();
        return;
      }

      router.replace(listPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const validateLocationForm = (): boolean => {
    const errs: LocationFormErrors = {};
    if (!locationForm.shopName.trim()) errs.shopName = "Shop name is required";
    if (!locationForm.shopType) errs.shopType = "Shop type is required";
    if (!locationForm.mobile.trim()) errs.mobile = "Mobile is required";
    else if (!isValidIndianMobile(locationForm.mobile)) errs.mobile = "Enter a valid 10-digit mobile";
    if (!locationForm.state.trim()) errs.state = "State is required";
    if (!locationForm.district.trim()) errs.district = "District is required";
    if (!locationForm.taluk.trim()) errs.taluk = "Taluk is required";
    if (!locationForm.area.trim()) errs.area = "Area is required";
    if (!locationForm.street.trim()) errs.street = "Street is required";
    if (!locationForm.pincode.trim()) errs.pincode = "Pincode is required";
    else if (!isValidPincode(locationForm.pincode)) errs.pincode = "Pincode must be 6 digits";
    setLocationFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const updateLocationField = <K extends keyof LocationDraftForm>(
    key: K,
    value: LocationDraftForm[K]
  ) => {
    setLocationForm((prev) => ({ ...prev, [key]: value }));
    setLocationFormErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleLocationFormSubmit = async () => {
    if (!validateLocationForm()) return;

    if (isEditMode) {
      if (!shopOwnerId || !accessToken) {
        toast.error("Authentication or shop owner id missing");
        return;
      }
      try {
        setAddingLocation(true);
        const createdLocation = await createShopLocation(shopOwnerId, locationForm);
        const newLoc: BusinessLocation = {
          ...createdLocation,
          _id: createdLocation._id,
          name: locationForm.shopName.trim(),
          businessType: locationForm.businessType,
          mobile: locationForm.mobile.trim(),
          billingType: locationForm.billingType,
          isActive: true,
          frontImageUrl: createdLocation.frontImageUrl || "",
          gstCertificate: createdLocation.gstCertificate,
          udyamCertificate: createdLocation.udyamCertificate,
          shopAddress: {
            state: locationForm.state.trim(),
            district: locationForm.district.trim(),
            taluk: locationForm.taluk.trim(),
            area: locationForm.area.trim(),
            street: locationForm.street.trim(),
            pincode: locationForm.pincode.trim(),
          },
        };
        setBusinessLocations((prev) => [...prev, newLoc]);
        resetLocationFormState();
        setShowLocationForm(false);
        toast.success("Business location added successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add business location");
      } finally {
        setAddingLocation(false);
      }
    } else {
      const draft: BusinessLocationDraft = {
        tempId: `draft-${Date.now()}`,
        ...locationForm,
      };
      setLocationDrafts((prev) => [...prev, draft]);
      setLocationForm(LOCATION_INITIAL);
      setLocationFormErrors({});
      clearLocationUploadInputs();
      setShowLocationForm(false);
    }
  };

  const removeLocationDraft = (tempId: string) => {
    setLocationDrafts((prev) => {
      const target = prev.find((draft) => draft.tempId === tempId);
      if (target) revokeLocationPreviews(target);
      return prev.filter((draft) => draft.tempId !== tempId);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveShopOwner();
  };

  const title = isEditMode ? "Edit Shop Owner" : "Create Shop Owner";
  const canSubmit = submitting || isLocationLoading || removingAvatar || removingIdProof || addingLocation;

  const formContent = (
    <form onSubmit={handleSubmit} className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#00008b]/70">
            {isEditMode ? "Shop Owner Workspace" : "Shop Owner Setup"}
          </p>
          <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isEditMode
              ? "Update personal details, documents, and linked business locations."
              : "Create the shop owner account, then continue with business locations in the same workspace."}
          </p>
          {locationError ? (
            <p className="mt-1.5 text-xs font-semibold text-amber-600">{locationError}</p>
          ) : null}
        </div>

        {asModal ? (
          <button
            type="button"
            onClick={closeForm}
            disabled={submitting}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={closeForm}
            disabled={submitting}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop Owners
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-6 sm:py-5">
        {pageLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading shop owner details...
            </div>
          </div>
        ) : isEditMode && (loadFailed || !shopOwnerId) ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <X className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-slate-950">
              Shop owner not found
            </h2>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
              A valid shop owner record could not be loaded for editing.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)] xl:items-start">
              <div className="space-y-4">
                <FormSection title="Basic Information" icon={<User2 className="h-4 w-4" />}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <TextField
                    id="role"
                    label="Role"
                    value="Shop Owner"
                    onChange={() => undefined}
                    disabled
                  />

                  <SelectField
                    id="shopControl"
                    label="Shop Control"
                    value={form.shopControl}
                    onChange={(e) => updateField("shopControl", e.target.value as ShopControl)}
                    options={SHOP_CONTROL_OPTIONS}
                    error={errors.shopControl}
                    required
                  />

                  <TextField
                    id="name"
                    label="Full Name"
                    value={form.name}
                    onChange={(e) => updateField("name", alphaSpaceOnly(e.target.value))}
                    error={errors.name}
                    required
                  />

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_132px]">
                    <TextField
                      id="username"
                      label="Username"
                      value={form.username}
                      onChange={(e) =>
                        updateField(
                          "username",
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "")
                            .slice(0, 30)
                        )
                      }
                      error={errors.username}
                      required
                    />

                    <button
                      type="button"
                      onClick={handleAutoUsername}
                      className="h-11 rounded-xl bg-[#00008b] px-3 text-xs font-extrabold text-white transition hover:bg-[#00006f]"
                    >
                      Auto
                    </button>
                  </div>

                  <TextField
                    id="email"
                    label="Email Address"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    error={errors.email}
                    required
                  />

                  <TextField
                    id="pin"
                    label={isEditMode ? "New PIN" : "PIN"}
                    type="password"
                    maxLength={8}
                    value={form.pin}
                    onChange={(e) => updateField("pin", digitsOnly(e.target.value).slice(0, 8))}
                    error={errors.pin}
                    required={!isEditMode}
                  />

                  <TextField
                    id="mobile"
                    label="Primary Mobile"
                    type="tel"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) => updateField("mobile", digitsOnly(e.target.value).slice(0, 10))}
                    error={errors.mobile}
                    required
                  />

                  <TextField
                    id="secondaryMobile"
                    label="Secondary Mobile"
                    type="tel"
                    maxLength={10}
                    value={form.secondaryMobile}
                    onChange={(e) =>
                      updateField("secondaryMobile", digitsOnly(e.target.value).slice(0, 10))
                    }
                    error={errors.secondaryMobile}
                  />
                </div>
                </FormSection>

                <FormSection title="Personal Address" icon={<Search className="h-4 w-4" />}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <SearchableSelect
                    id="state"
                    label={loadingStates ? "State Loading" : "State"}
                    value={form.state}
                    onChange={(value) => {
                      setLocationError("");
                      setForm((prev) => ({ ...prev, state: value, district: "", taluk: "", area: "" }));
                      setErrors((prev) => ({ ...prev, state: undefined, district: undefined, taluk: undefined, area: undefined }));
                      setStates((prev) => appendOption(prev, value));
                      resetDistrictTree();
                    }}
                    options={states}
                    disabled={loadingStates}
                    error={errors.state}
                    required
                    allowCustom
                    onCreateOption={(value) => setStates((prev) => appendOption(prev, value))}
                    placeholder="Select or type state"
                    searchPlaceholder="Search or type state"
                  />

                  <SearchableSelect
                    id="district"
                    label={loadingDistricts ? "District Loading" : "District"}
                    value={form.district}
                    onChange={(value) => {
                      setLocationError("");
                      setForm((prev) => ({ ...prev, district: value, taluk: "", area: "" }));
                      setErrors((prev) => ({ ...prev, district: undefined, taluk: undefined, area: undefined }));
                      setDistricts((prev) => appendOption(prev, value));
                      resetTalukTree();
                    }}
                    options={districts}
                    disabled={!form.state || loadingDistricts}
                    error={errors.district}
                    required
                    allowCustom
                    onCreateOption={(value) => setDistricts((prev) => appendOption(prev, value))}
                    placeholder="Select or type district"
                    searchPlaceholder="Search or type district"
                  />

                  <SearchableSelect
                    id="taluk"
                    label={loadingTaluks ? "Taluk Loading" : "Taluk"}
                    value={form.taluk}
                    onChange={(value) => {
                      setLocationError("");
                      setForm((prev) => ({ ...prev, taluk: value, area: "" }));
                      setErrors((prev) => ({ ...prev, taluk: undefined, area: undefined }));
                      setTaluks((prev) => appendOption(prev, value));
                      resetAreaTree();
                    }}
                    options={taluks}
                    disabled={!form.district || loadingTaluks}
                    error={errors.taluk}
                    required
                    allowCustom
                    onCreateOption={(value) => setTaluks((prev) => appendOption(prev, value))}
                    placeholder="Select or type taluk"
                    searchPlaceholder="Search or type taluk"
                  />

                  <SearchableSelect
                    id="area"
                    label={loadingAreas ? "Area Loading" : "Area"}
                    value={form.area}
                    onChange={(value) => {
                      setLocationError("");
                      updateField("area", value);
                      setAreas((prev) => appendOption(prev, value));
                    }}
                    options={areas}
                    disabled={!form.taluk || loadingAreas}
                    error={errors.area}
                    required
                    allowCustom
                    onCreateOption={(value) => setAreas((prev) => appendOption(prev, value))}
                    placeholder="Select or type area"
                    searchPlaceholder="Search or type area"
                  />

                  <TextField
                    id="street"
                    label="Street"
                    value={form.street}
                    onChange={(e) => updateField("street", e.target.value)}
                    error={errors.street}
                    required
                  />

                  <TextField
                    id="pincode"
                    label="Pincode"
                    type="tel"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) => updateField("pincode", digitsOnly(e.target.value).slice(0, 6))}
                    error={errors.pincode}
                    required
                  />
                </div>
                </FormSection>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-5">
                <FormSection
                  title="Personal Profile & Documents"
                  icon={<ImagePlus className="h-4 w-4" />}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <UploadBox
                      title="Avatar"
                      description="Profile image"
                      preview={avatarPreview}
                      fileName={avatarFile?.name || (existingAvatarUrl ? "Uploaded avatar" : "")}
                      onUpload={handleAvatarChange}
                      onRemove={handleRemoveAvatar}
                      inputRef={avatarInputRef}
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      buttonLabel={isEditMode ? "Change Avatar" : "Upload Avatar"}
                      emptyIcon={<ImagePlus className="h-7 w-7" />}
                      busy={removingAvatar}
                    />

                    <UploadBox
                      title="ID Proof"
                      description="PDF or image"
                      preview={idProofPreview}
                      fileName={idProofFile?.name || existingIdProofName}
                      onUpload={handleIdProofChange}
                      onRemove={handleRemoveIdProof}
                      inputRef={idProofInputRef}
                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                      buttonLabel={isEditMode ? "Change ID Proof" : "Upload ID Proof"}
                      emptyIcon={<UploadCloud className="h-7 w-7" />}
                      busy={removingIdProof}
                    />
                  </div>
                </FormSection>
              </aside>
            </div>

            <FormSection title="Business Locations" icon={<Store className="h-4 w-4" />}>
              <div className="space-y-3">
                {(isEditMode ? businessLocations : []).length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-[920px] w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                          <th className="px-3 py-3">S.No</th>
                          <th className="px-3 py-3">Location Name</th>
                          <th className="px-3 py-3">Business Type</th>
                          <th className="px-3 py-3">Mobile</th>
                          <th className="px-3 py-3">Billing</th>
                          <th className="px-3 py-3">Documents</th>
                          <th className="px-3 py-3">Address</th>
                          <th className="px-3 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {businessLocations.map((location, index) => (
                          <tr key={location._id || `${location.name || "location"}-${index}`}>
                            <td className="px-3 py-3 font-semibold text-slate-700">{index + 1}</td>
                            <td className="px-3 py-3 font-bold text-slate-900">{location.name || "-"}</td>
                            <td className="px-3 py-3 font-medium text-slate-600">{location.businessType || "-"}</td>
                            <td className="px-3 py-3 font-medium text-slate-600">{location.mobile || "-"}</td>
                            <td className="px-3 py-3 font-medium text-slate-600">{location.billingType || "-"}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {buildLocationDocumentLabels(location).length ? (
                                  buildLocationDocumentLabels(location).map((label) => (
                                    <span
                                      key={`${location._id || location.name}-${label}`}
                                      className="inline-flex rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-2 py-1 text-[11px] font-extrabold text-[#00008b]"
                                    >
                                      {label}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs font-medium text-slate-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600">{buildCompactAddress(location.shopAddress)}</td>
                            <td className="px-3 py-3">
                              <span className={classNames(
                                "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold",
                                location.isActive !== false
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                              )}>
                                {location.isActive !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isEditMode && locationDrafts.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-[920px] w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                          <th className="px-3 py-3">S.No</th>
                          <th className="px-3 py-3">Location Name</th>
                          <th className="px-3 py-3">Business Type</th>
                          <th className="px-3 py-3">Mobile</th>
                          <th className="px-3 py-3">Billing</th>
                          <th className="px-3 py-3">Documents</th>
                          <th className="px-3 py-3">Address</th>
                          <th className="px-3 py-3">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {locationDrafts.map((draft, index) => (
                          <tr key={draft.tempId}>
                            <td className="px-3 py-3 font-semibold text-slate-700">{index + 1}</td>
                            <td className="px-3 py-3 font-bold text-slate-900">{draft.shopName}</td>
                            <td className="px-3 py-3 font-medium text-slate-600">{draft.businessType || "-"}</td>
                            <td className="px-3 py-3 font-medium text-slate-600">{draft.mobile}</td>
                            <td className="px-3 py-3 font-medium text-slate-600">{draft.billingType}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {buildLocationDocumentLabels(draft).length ? (
                                  buildLocationDocumentLabels(draft).map((label) => (
                                    <span
                                      key={`${draft.tempId}-${label}`}
                                      className="inline-flex rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-2 py-1 text-[11px] font-extrabold text-[#00008b]"
                                    >
                                      {label}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs font-medium text-slate-400">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {[draft.street, draft.area, draft.taluk, draft.district, draft.state, draft.pincode]
                                .filter(Boolean).join(", ") || "-"}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => removeLocationDraft(draft.tempId)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!showLocationForm &&
                  (isEditMode ? businessLocations : locationDrafts).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
                    No business locations added yet. Click &ldquo;+ Add Business Location&rdquo; to add one.
                  </div>
                )}

                {showLocationForm && (
                  <div className="rounded-2xl border border-[#00008b]/20 bg-[#00008b]/[0.02] p-4 sm:p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-slate-900">New Business Location</h4>
                      <button
                        type="button"
                        onClick={() => { setShowLocationForm(false); resetLocationFormState(); }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      <TextField
                        id="loc-shopName"
                        label="Shop / Location Name"
                        value={locationForm.shopName}
                        onChange={(e) => updateLocationField("shopName", e.target.value)}
                        error={locationFormErrors.shopName}
                        required
                      />

                      <SelectField
                        id="loc-shopType"
                        label="Shop Type"
                        value={locationForm.shopType}
                        onChange={(e) => updateLocationField("shopType", e.target.value as ShopType)}
                        options={SHOP_TYPE_OPTIONS}
                        error={locationFormErrors.shopType}
                        required
                      />

                      <SelectField
                        id="loc-businessType"
                        label="Business Type"
                        value={locationForm.businessType}
                        onChange={(e) => updateLocationField("businessType", e.target.value as BusinessLocationType)}
                        options={BUSINESS_TYPE_OPTIONS}
                      />

                      <SelectField
                        id="loc-billingType"
                        label="Billing Type"
                        value={locationForm.billingType}
                        onChange={(e) => updateLocationField("billingType", e.target.value as ShopBillingType)}
                        options={BILLING_TYPE_OPTIONS}
                        required
                      />

                      <TextField
                        id="loc-mobile"
                        label="Mobile"
                        type="tel"
                        maxLength={10}
                        value={locationForm.mobile}
                        onChange={(e) => updateLocationField("mobile", digitsOnly(e.target.value).slice(0, 10))}
                        error={locationFormErrors.mobile}
                        required
                      />

                      <TextField
                        id="loc-gstNumber"
                        label="GST Number"
                        value={locationForm.gstNumber}
                        onChange={(e) => updateLocationField("gstNumber", e.target.value.toUpperCase())}
                      />

                      <TextField
                        id="loc-state"
                        label="State"
                        value={locationForm.state}
                        onChange={(e) => updateLocationField("state", e.target.value)}
                        error={locationFormErrors.state}
                        required
                      />

                      <TextField
                        id="loc-district"
                        label="District"
                        value={locationForm.district}
                        onChange={(e) => updateLocationField("district", e.target.value)}
                        error={locationFormErrors.district}
                        required
                      />

                      <TextField
                        id="loc-taluk"
                        label="Taluk"
                        value={locationForm.taluk}
                        onChange={(e) => updateLocationField("taluk", e.target.value)}
                        error={locationFormErrors.taluk}
                        required
                      />

                      <TextField
                        id="loc-area"
                        label="Area"
                        value={locationForm.area}
                        onChange={(e) => updateLocationField("area", e.target.value)}
                        error={locationFormErrors.area}
                        required
                      />

                      <TextField
                        id="loc-street"
                        label="Street"
                        value={locationForm.street}
                        onChange={(e) => updateLocationField("street", e.target.value)}
                        error={locationFormErrors.street}
                        required
                      />

                      <TextField
                        id="loc-pincode"
                        label="Pincode"
                        type="tel"
                        maxLength={6}
                        value={locationForm.pincode}
                        onChange={(e) => updateLocationField("pincode", digitsOnly(e.target.value).slice(0, 6))}
                        error={locationFormErrors.pincode}
                        required
                      />
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
                      <div className="mb-3">
                        <h5 className="text-sm font-extrabold text-slate-900">
                          Location Proof Documents
                        </h5>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Add the shop front image and business proof documents for this location.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                        <UploadBox
                          title="Front Image"
                          description="Shop front photo"
                          preview={locationForm.frontImagePreview}
                          fileName={locationForm.frontImageFile?.name || ""}
                          onUpload={handleLocationFrontImageChange}
                          onRemove={handleRemoveLocationFrontImage}
                          inputRef={locationFrontImageInputRef}
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          buttonLabel="Upload Front Image"
                          emptyIcon={<ImagePlus className="h-7 w-7" />}
                          busy={addingLocation}
                        />

                        <UploadBox
                          title="GST Certificate"
                          description="PDF or image"
                          preview={locationForm.gstCertificatePreview}
                          fileName={locationForm.gstCertificateFile?.name || ""}
                          onUpload={(file) => handleLocationDocumentChange("gstCertificate", file)}
                          onRemove={() => handleRemoveLocationDocument("gstCertificate")}
                          inputRef={locationGstInputRef}
                          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                          buttonLabel="Upload GST Proof"
                          emptyIcon={<UploadCloud className="h-7 w-7" />}
                          busy={addingLocation}
                        />

                        <UploadBox
                          title="Udyam Certificate"
                          description="PDF or image"
                          preview={locationForm.udyamCertificatePreview}
                          fileName={locationForm.udyamCertificateFile?.name || ""}
                          onUpload={(file) => handleLocationDocumentChange("udyamCertificate", file)}
                          onRemove={() => handleRemoveLocationDocument("udyamCertificate")}
                          inputRef={locationUdyamInputRef}
                          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                          buttonLabel="Upload Udyam Proof"
                          emptyIcon={<UploadCloud className="h-7 w-7" />}
                          busy={addingLocation}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        type="button"
                        onClick={() => { setShowLocationForm(false); resetLocationFormState(); }}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleLocationFormSubmit}
                        disabled={addingLocation}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-xs font-extrabold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {addingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        {addingLocation ? "Saving..." : isEditMode ? "Save Location" : "Add to List"}
                      </button>
                    </div>
                  </div>
                )}

                {!showLocationForm && (
                  <button
                    type="button"
                    onClick={() => setShowLocationForm(true)}
                    disabled={submitting || pageLoading || addingLocation}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#00008b]/20 bg-[#00008b] px-4 text-xs font-extrabold text-white shadow-[0_4px_14px_rgba(0,0,139,0.18)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Business Location
                  </button>
                )}
              </div>
            </FormSection>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={closeForm}
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </button>

          <button
            type="submit"
            disabled={canSubmit || pageLoading || loadFailed}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#00008b]/15 transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditMode ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditMode ? "Update Shop Owner" : "Save Shop Owner Details"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
        <div className="flex max-h-[calc(100vh-24px)] w-full max-w-9xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-[96rem] py-2 md:py-4">
        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
          {formContent}
        </div>
      </div>
    </div>
  );
}

export default function ShopOwnerCreatePage() {
  return <ShopOwnerForm mode="create" />;
}
