/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  FileBadge2,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Store,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
type BusinessType = "" | "Retail" | "Wholesale";

type ShopType =
  | ""
  | "WAREHOUSE_RETAIL_SHOP"
  | "RETAIL_BRANCH_SHOP"
  | "WHOLESALE_SHOP";

type ShopBillingType = "" | "GST" | "NON_GST";

type Option = {
  label: string;
  value: string;
  searchText?: string;
};

type OwnerOption = Option & {
  name: string;
  username: string;
  email: string;
};

type FormState = {
  ownerId: string;
  shopName: string;
  shopType: ShopType;
  billingType: ShopBillingType;
  businessType: BusinessType;
  mobile: string;
  gstNumber: string;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;
type ShopFormMode = "create" | "edit";

type CreateShopApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
  };
};

type ShopDocument = {
  url?: string;
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

type ShopDetailsResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    mobile?: string;
    shopType?: ShopType;
    businessType?: BusinessType;
    isMainWarehouse?: boolean;
    billingType?: "GST" | "NON_GST" | "BOTH";
    enableGSTBilling?: boolean;
    gstNumber?: string;
    isActive?: boolean;
    frontImageUrl?: string;
    shopAddress?: {
      state?: string;
      district?: string;
      taluk?: string;
      area?: string;
      street?: string;
      pincode?: string;
    };
    shopOwnerAccountId?: string | ShopOwnerRef;
    gstCertificate?: ShopDocument;
    udyamCertificate?: ShopDocument;
  };
};

type ShopActionResponse = {
  success?: boolean;
  message?: string;
  data?: {
    frontImageUrl?: string;
    gstCertificate?: ShopDocument;
    udyamCertificate?: ShopDocument;
  };
};

type ShopOwnerListItem = {
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
};

const INITIAL: FormState = {
  ownerId: "",
  shopName: "",
  shopType: "",
  billingType: "GST",
  businessType: "",
  mobile: "",
  gstNumber: "",
  state: "",
  district: "",
  taluk: "",
  area: "",
  street: "",
  pincode: "",
};

const BUSINESS_OPTIONS: Option[] = [
  { label: "Retail", value: "Retail" },
  { label: "Wholesale", value: "Wholesale" },
];

const SHOP_TYPE_OPTIONS: Option[] = [
  {
    label: "Warehouse Retail Shop",
    value: "WAREHOUSE_RETAIL_SHOP",
    searchText: "warehouse main warehouse retail warehouse shop",
  },
  {
    label: "Warehouse Retail Branch Shop",
    value: "RETAIL_BRANCH_SHOP",
    searchText: "branch retail branch shop retail shop",
  },
  {
    label: "Wholesale Shop",
    value: "WHOLESALE_SHOP",
    searchText: "wholesale shop wholesale",
  },
];

const GST_BILLING_OPTIONS: Option[] = [
  { label: "GST", value: "GST" },
  { label: "NON GST", value: "NON_GST" },
];

function classNames(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeOptionText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeGstNumber(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
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

function isValidPincode(pincode: string) {
  return /^\d{6}$/.test(pincode);
}

function isValidIndianMobile(mobile: string) {
  return /^[6-9]\d{9}$/.test(mobile);
}

function isValidGST(gstNumber: string) {
  if (!gstNumber) return true;
  return /^[0-9A-Z]{15}$/.test(gstNumber);
}

function appendOption(options: Option[], rawValue: string) {
  const value = normalizeOptionText(rawValue);

  if (!value) return options;

  const exists = options.some(
    (option) =>
      normalizeOptionText(option.value).toLowerCase() === value.toLowerCase()
  );

  if (exists) return options;

  return [...options, { label: value, value, searchText: value }];
}

function isImageAsset(url?: string | null, mimeType?: string | null) {
  const normalizedMime = String(mimeType || "").trim().toLowerCase();

  if (normalizedMime.startsWith("image/")) {
    return true;
  }

  const normalizedUrl = String(url || "").trim().toLowerCase();
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(normalizedUrl);
}

function getEntityId(value: unknown) {
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;

  if (typeof record._id === "string") return record._id;
  if (typeof record.id === "string") return record.id;
  if (typeof record.$oid === "string") return record.$oid;

  return "";
}

function getShopListPath(role?: string | null) {
  const value = String(role || "").trim().toUpperCase();

  if (value === "MASTER_ADMIN") return "/master/shop/list";
  if (value === "MANAGER") return "/manager/shop/list";
  if (value === "SUPERVISOR") return "/supervisor/shop/list";
  if (value === "SHOP_OWNER") return "/shopowner/shopprofile/list";

  return "/master/shop/list";
}

function toOptions(arr: unknown): Option[] {
  if (!Array.isArray(arr)) return [];

  return arr
    .map((item) => {
      if (typeof item === "string") {
        return { label: item, value: item };
      }

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
                  : typeof obj.villageName === "string"
                    ? obj.villageName
                    : typeof obj.talukName === "string"
                      ? obj.talukName
                      : "";

        if (raw) {
          return { label: raw, value: raw };
        }
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

export default function CreateShopPage({
  mode = "create",
  shopId = "",
  asModal = false,
  onClose,
  onSuccess,
  presetOwnerId = "",
}: {
  mode?: ShopFormMode;
  shopId?: string;
  asModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  presetOwnerId?: string;
}) {
  return (
    <ShopForm
      mode={mode}
      shopId={shopId}
      asModal={asModal}
      onClose={onClose}
      onSuccess={onSuccess}
      presetOwnerId={presetOwnerId}
    />
  );
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

function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  disabled,
  error,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={disabled ? "" : `Enter ${label.toLowerCase()}`}
          className={classNames(
            "h-14 w-full rounded-2xl border bg-white px-4 pb-2 pt-6 text-sm text-slate-900 outline-none transition shadow-sm placeholder:text-slate-400",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-100",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        />
        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none transition-all",
            error ? "text-rose-500" : "text-slate-500"
          )}
        >
          {label} {required ? "*" : ""}
        </label>
      </div>

      {error ? <p className="px-1 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function FloatingSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={classNames(
            "h-14 w-full appearance-none rounded-2xl border bg-white px-4 pb-2 pt-6 text-sm text-slate-900 outline-none transition shadow-sm",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-100",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        >
          <option value="">{placeholder || ""}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none transition-all",
            error ? "text-rose-500" : "text-slate-500"
          )}
        >
          {label} {required ? "*" : ""}
        </label>

        <svg
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </div>

      {error ? <p className="px-1 text-xs text-rose-500">{error}</p> : null}
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
  helperText,
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
  helperText?: string;
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

    return options.filter((option) => {
      const haystack =
        `${option.label} ${option.value} ${option.searchText || ""}`.toLowerCase();
      return haystack.includes(loweredQuery);
    });
  }, [options, loweredQuery]);

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

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

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
    <div ref={containerRef} className="space-y-1.5">
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={classNames(
            "flex h-14 w-full items-center justify-between rounded-2xl border bg-white px-4 pb-2 pt-6 text-left text-sm text-slate-900 outline-none transition shadow-sm",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-100",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        >
          <span
            className={classNames(
              "truncate",
              selectedLabel ? "text-slate-900" : "text-slate-400"
            )}
          >
            {selectedLabel || placeholder || `Select ${label.toLowerCase()}`}
          </span>

          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none transition-all",
            error ? "text-rose-500" : "text-slate-500"
          )}
        >
          {label} {required ? "*" : ""}
        </label>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setOpen(false);
                    }

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
                  placeholder={
                    searchPlaceholder ||
                    (allowCustom
                      ? "Search or type a new value"
                      : "Search options")
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-violet-500 focus:bg-white"
                />
              </div>

              {helperText ? (
                <p className="mt-2 text-xs text-slate-500">{helperText}</p>
              ) : null}
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {canCreate ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-50"
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
                          ? "bg-violet-50 font-semibold text-violet-700"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  );
                })
              ) : canCreate ? null : (
                <p className="px-3 py-3 text-sm text-slate-500">
                  No matching options found.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="px-1 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function UploadCard({
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
  previewClassName,
}: {
  title: string;
  description: string;
  preview: string;
  fileName: string;
  onUpload: (file: File | null | undefined) => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  buttonLabel: string;
  emptyIcon: ReactNode;
  previewClassName: string;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <p className="mt-1 text-xs text-slate-500">{description}</p>

      <div className="mt-4 flex flex-col items-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={title} className={previewClassName} />
        ) : fileName ? (
          <div className="flex h-40 w-full max-w-65 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 text-center">
            <FileBadge2 className="h-9 w-9 text-slate-400" />
            <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-700">
              {fileName}
            </p>
          </div>
        ) : (
          <div className="flex h-40 w-full max-w-65 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400">
            {emptyIcon}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onUpload(e.target.files?.[0])}
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {buttonLabel}
          </button>

          {preview || fileName ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <X className="h-4 w-4" />
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ShopForm({
  mode = "create",
  shopId: shopIdProp = "",
  asModal = false,
  onClose,
  onSuccess,
  presetOwnerId: presetOwnerIdProp = "",
}: {
  mode?: ShopFormMode;
  shopId?: string;
  asModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  presetOwnerId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, role, user } = useAuth();

  const isEditMode = mode === "edit";
  const shopId = String(shopIdProp || "").trim();
  const presetOwnerId = isEditMode
    ? ""
    : String(presetOwnerIdProp || searchParams.get("ownerId") || "").trim();
  const ownerSelectionLocked = Boolean(presetOwnerId);

  const frontImageInputRef = useRef<HTMLInputElement | null>(null);
  const gstInputRef = useRef<HTMLInputElement | null>(null);
  const udyamInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserRole = useMemo(
    () => String(role || "").toUpperCase() as AppRole,
    [role]
  );
  const listPath = useMemo(
    () => getShopListPath(currentUserRole),
    [currentUserRole]
  );

  const handleClose = () => {
    if (asModal) {
      onClose?.();
      return;
    }

    router.push(listPath);
  };

  const handleSuccess = () => {
    onSuccess?.();

    if (asModal) {
      onClose?.();
      return;
    }

    router.replace(listPath);
  };

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [loadFailed, setLoadFailed] = useState(false);
  const [shopActive, setShopActive] = useState(true);

  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [taluks, setTaluks] = useState<Option[]>([]);
  const [areas, setAreas] = useState<Option[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTaluks, setLoadingTaluks] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState("");
  const [existingFrontImageUrl, setExistingFrontImageUrl] = useState("");
  const [removingFrontImage, setRemovingFrontImage] = useState(false);

  const [gstFile, setGstFile] = useState<File | null>(null);
  const [gstPreview, setGstPreview] = useState("");
  const [existingGstUrl, setExistingGstUrl] = useState("");
  const [existingGstName, setExistingGstName] = useState("");
  const [existingGstMimeType, setExistingGstMimeType] = useState("");
  const [removingGst, setRemovingGst] = useState(false);

  const [udyamFile, setUdyamFile] = useState<File | null>(null);
  const [udyamPreview, setUdyamPreview] = useState("");
  const [existingUdyamUrl, setExistingUdyamUrl] = useState("");
  const [existingUdyamName, setExistingUdyamName] = useState("");
  const [existingUdyamMimeType, setExistingUdyamMimeType] = useState("");
  const [removingUdyam, setRemovingUdyam] = useState(false);

  const isLocationLoading =
    loadingStates || loadingDistricts || loadingTaluks || loadingAreas;


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

  const clearPreview = (
    preview: string,
    setPreview: (value: string) => void,
    setFile: (value: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setPreview("");
    setFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const resetFrontImage = () => {
    clearPreview(
      frontImagePreview,
      setFrontImagePreview,
      setFrontImageFile,
      frontImageInputRef
    );
    setExistingFrontImageUrl("");
  };

  const resetGst = () => {
    clearPreview(gstPreview, setGstPreview, setGstFile, gstInputRef);
    setExistingGstUrl("");
    setExistingGstName("");
    setExistingGstMimeType("");
  };

  const resetUdyam = () => {
    clearPreview(udyamPreview, setUdyamPreview, setUdyamFile, udyamInputRef);
    setExistingUdyamUrl("");
    setExistingUdyamName("");
    setExistingUdyamMimeType("");
  };

  const resetForm = () => {
    setForm(INITIAL);
    setErrors({});
    setLocationError("");
    setShopActive(true);
    resetDistrictTree();
    resetFrontImage();
    resetGst();
    resetUdyam();
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

      if (!response.ok) {
        console.error("API failed:", { url, status: response.status, data });
        return [];
      }

      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.results)) return data.results;
      if (Array.isArray(data)) return data;

      return [];
    } catch (error) {
      console.error("API error:", error);
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

    let data = await fetchApi(primaryUrl);

    if (!data.length) {
      data = await fetchApi(fallbackUrl);
    }

    return data;
  };

  useEffect(() => {
    let active = true;

    async function loadOwners() {
      if (!accessToken) return;

      if (currentUserRole === "SHOP_OWNER") {
        const ownerId = getEntityId(user);
        const ownerUsername = String(
          (user as { username?: string } | null)?.username || ""
        ).trim();
        const ownerEmail = String(
          (user as { email?: string } | null)?.email || ""
        ).trim();
        const ownerName = String(
          (user as { name?: string } | null)?.name ||
            ownerUsername ||
            ownerEmail ||
            "Shop Owner"
        ).trim();

        if (!active) return;

        setOwners(
          ownerId
            ? [
                {
                  value: ownerId,
                  label: ownerUsername ? `${ownerName} (@${ownerUsername})` : ownerName,
                  name: ownerName,
                  username: ownerUsername,
                  email: ownerEmail,
                  searchText: `${ownerName} ${ownerUsername} ${ownerEmail}`,
                },
              ]
            : []
        );

        setForm((prev) => ({
          ...prev,
          ownerId: ownerId || prev.ownerId,
        }));
        setLoadingOwners(false);
        return;
      }

      try {
        setLoadingOwners(true);

        const response = await fetch(`${baseURL}${SummaryApi.shopowner_list.url}`, {
          method: SummaryApi.shopowner_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (!active) return;

        const items = Array.isArray(result?.data)
          ? (result.data as ShopOwnerListItem[])
          : [];

        setOwners(
          items
            .map((item) => {
              const id = String(item?._id || "").trim();
              const name = String(item?.name || "").trim();
              const username = String(item?.username || "").trim();
              const email = String(item?.email || "").trim();

              if (!id || !name) return null;

              return {
                value: id,
                label: username ? `${name} (@${username})` : name,
                name,
                username,
                email,
                searchText: `${name} ${username} ${email}`,
              };
            })
            .filter(Boolean) as OwnerOption[]
        );
      } catch (error) {
        console.error("Owner list fetch failed:", error);

        if (active) {
          setOwners([]);
        }
      } finally {
        if (active) {
          setLoadingOwners(false);
        }
      }
    }

    void loadOwners();

    return () => {
      active = false;
    };
  }, [accessToken, currentUserRole, user]);

  useEffect(() => {
    if (!presetOwnerId) return;

    setForm((prev) =>
      prev.ownerId === presetOwnerId ? prev : { ...prev, ownerId: presetOwnerId }
    );
    setErrors((prev) => ({ ...prev, ownerId: undefined }));
  }, [presetOwnerId]);

  useEffect(() => {
    let active = true;

    async function loadShop() {
      if (!isEditMode) {
        setPageLoading(false);
        setLoadFailed(false);
        return;
      }

      if (!shopId) {
        setLoadFailed(true);
        setPageLoading(false);
        return;
      }

      if (!accessToken) return;

      try {
        setPageLoading(true);
        setLoadFailed(false);

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

        const result =
          (await response.json().catch(() => ({}))) as ShopDetailsResponse;

        if (!active) return;

        if (!response.ok || !result?.success || !result?.data) {
          throw new Error(result?.message || "Failed to load shop details");
        }

        const shop = result.data;
        
        const ownerRef =
          shop.shopOwnerAccountId && typeof shop.shopOwnerAccountId === "object"
            ? shop.shopOwnerAccountId
            : null;

        const ownerId =
          typeof shop.shopOwnerAccountId === "string"
            ? shop.shopOwnerAccountId
            : String(ownerRef?._id || "");

        if (ownerId && ownerRef?.name) {
          setOwners((prev) => {
            if (prev.some((item) => item.value === ownerId)) {
              return prev;
            }

            const name = String(ownerRef.name || "").trim();
            const username = String(ownerRef.username || "").trim();
            const email = String(ownerRef.email || "").trim();

            return [
              ...prev,
              {
                value: ownerId,
                label: username ? `${name} (@${username})` : name,
                name,
                username,
                email,
                searchText: `${name} ${username} ${email}`,
              },
            ];
          });
        }

        const nextFrontImageUrl = String(shop.frontImageUrl || "").trim();
        const nextGstUrl = String(shop.gstCertificate?.url || "").trim();
        const nextGstMimeType = String(shop.gstCertificate?.mimeType || "").trim();
        const nextUdyamUrl = String(shop.udyamCertificate?.url || "").trim();
        const nextUdyamMimeType = String(
          shop.udyamCertificate?.mimeType || ""
        ).trim();

        setForm({
          ownerId,
          shopName: shop.name || "",
          shopType: shop.shopType || "",
          billingType:
            shop.enableGSTBilling === false || shop.billingType === "NON_GST"
              ? "NON_GST"
              : "GST",
          businessType: shop.businessType || "",
          mobile: digitsOnly(String(shop.mobile || "")).slice(0, 10),
          gstNumber: normalizeGstNumber(String(shop.gstNumber || "")),
          state: shop.shopAddress?.state || "",
          district: shop.shopAddress?.district || "",
          taluk: shop.shopAddress?.taluk || "",
          area: shop.shopAddress?.area || "",
          street: shop.shopAddress?.street || "",
          pincode: shop.shopAddress?.pincode || "",
        });

        setShopActive(shop.isActive !== false);

        setExistingFrontImageUrl(nextFrontImageUrl);
        setFrontImageFile(null);
        setFrontImagePreview(nextFrontImageUrl);

        setExistingGstUrl(nextGstUrl);
        setExistingGstName(String(shop.gstCertificate?.fileName || ""));
        setExistingGstMimeType(nextGstMimeType);
        setGstFile(null);
        setGstPreview(isImageAsset(nextGstUrl, nextGstMimeType) ? nextGstUrl : "");

        setExistingUdyamUrl(nextUdyamUrl);
        setExistingUdyamName(String(shop.udyamCertificate?.fileName || ""));
        setExistingUdyamMimeType(nextUdyamMimeType);
        setUdyamFile(null);
        setUdyamPreview(
          isImageAsset(nextUdyamUrl, nextUdyamMimeType) ? nextUdyamUrl : ""
        );

        if (frontImageInputRef.current) {
          frontImageInputRef.current.value = "";
        }

        if (gstInputRef.current) {
          gstInputRef.current.value = "";
        }

        if (udyamInputRef.current) {
          udyamInputRef.current.value = "";
        }
      } catch (error) {
        console.error(error);

        if (!active) return;

        setLoadFailed(true);
        toast.error(
          error instanceof Error ? error.message : "Failed to load shop details"
        );
      } finally {
        if (active) {
          setPageLoading(false);
        }
      }
    }

    void loadShop();

    return () => {
      active = false;
    };
  }, [accessToken, isEditMode, shopId]);

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

      if (!options.length) {
        setLocationError("Unable to load states. Please check location API.");
      }
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
      setForm((prev) => ({
        ...prev,
        district: "",
        taluk: "",
        area: "",
      }));
      return;
    }

    async function loadDistricts() {
      setLoadingDistricts(true);
      setLocationError("");

      const data = await fetchApi(
        `${SummaryApi.location_districts.url}?state=${encodeURIComponent(
          form.state
        )}`
      );

      if (!active) return;

      const options = toOptions(data);
      setDistricts(options);
      setTaluks([]);
      setAreas([]);
      setLoadingDistricts(false);

      if (!options.length) {
        setLocationError("No districts found for the selected state.");
      }
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
      setForm((prev) => ({
        ...prev,
        taluk: "",
        area: "",
      }));
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

      if (!options.length) {
        setLocationError("No taluks found for the selected district.");
      }
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
      setForm((prev) => ({
        ...prev,
        area: "",
      }));
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

      if (!options.length) {
        setLocationError("No areas found for the selected taluk.");
      }
    }

    void loadAreas();

    return () => {
      active = false;
    };
  }, [form.state, form.district, form.taluk, accessToken]);

  useEffect(() => {
    return () => {
      if (frontImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(frontImagePreview);
      }

      if (gstPreview.startsWith("blob:")) {
        URL.revokeObjectURL(gstPreview);
      }

      if (udyamPreview.startsWith("blob:")) {
        URL.revokeObjectURL(udyamPreview);
      }
    };
  }, [frontImagePreview, gstPreview, udyamPreview]);

  const handleImageUpload = (
    file: File | null | undefined,
    currentPreview: string,
    setPreview: (value: string) => void,
    setFile: (value: File | null) => void,
    sizeMessage: string
  ) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(sizeMessage);
      return;
    }

    if (currentPreview.startsWith("blob:")) {
      URL.revokeObjectURL(currentPreview);
    }

    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDocumentUpload = (
    file: File | null | undefined,
    currentPreview: string,
    setPreview: (value: string) => void,
    setFile: (value: File | null) => void
  ) => {
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      toast.error("Upload PDF, JPG, JPEG, PNG, or WEBP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Document size must be under 5MB");
      return;
    }

    if (currentPreview.startsWith("blob:")) {
      URL.revokeObjectURL(currentPreview);
    }

    setFile(file);
    setPreview(isImage ? URL.createObjectURL(file) : "");
  };

  const handleRemoveFrontImage = async () => {
    if (frontImageFile) {
      if (frontImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(frontImagePreview);
      }

      setFrontImageFile(null);
      setFrontImagePreview(existingFrontImageUrl || "");

      if (frontImageInputRef.current) {
        frontImageInputRef.current.value = "";
      }

      toast.success("Selected front image removed");
      return;
    }

    if (!isEditMode) {
      resetFrontImage();
      return;
    }

    if (!accessToken || !shopId) {
      toast.error("Authentication or shop id missing");
      return;
    }

    if (!existingFrontImageUrl) {
      setFrontImagePreview("");
      if (frontImageInputRef.current) {
        frontImageInputRef.current.value = "";
      }
      return;
    }

    try {
      const frontRemoveApi =
        currentUserRole === "SHOP_OWNER"
          ? SummaryApi.shop_front_remove
          : SummaryApi.shop_front_remove_admin;

      setRemovingFrontImage(true);

      const response = await fetch(`${baseURL}${frontRemoveApi.url(shopId)}`, {
        method: frontRemoveApi.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const result =
        (await response.json().catch(() => ({}))) as ShopActionResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to remove front image");
      }

      setFrontImageFile(null);
      setFrontImagePreview("");
      setExistingFrontImageUrl("");

      if (frontImageInputRef.current) {
        frontImageInputRef.current.value = "";
      }

      toast.success("Front image removed successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove front image"
      );
    } finally {
      setRemovingFrontImage(false);
    }
  };

  const handleRemoveDocument = async (
    key: "gstCertificate" | "udyamCertificate"
  ) => {
    const isGst = key === "gstCertificate";
    const selectedFile = isGst ? gstFile : udyamFile;
    const preview = isGst ? gstPreview : udyamPreview;
    const existingUrl = isGst ? existingGstUrl : existingUdyamUrl;
    const existingMimeType = isGst ? existingGstMimeType : existingUdyamMimeType;
    const inputRef = isGst ? gstInputRef : udyamInputRef;

    if (selectedFile) {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      if (isGst) {
        setGstFile(null);
        setGstPreview(isImageAsset(existingUrl, existingMimeType) ? existingUrl : "");
      } else {
        setUdyamFile(null);
        setUdyamPreview(
          isImageAsset(existingUrl, existingMimeType) ? existingUrl : ""
        );
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      toast.success("Selected document removed");
      return;
    }

    if (!isEditMode) {
      if (isGst) {
        resetGst();
      } else {
        resetUdyam();
      }
      return;
    }

    if (!accessToken || !shopId) {
      toast.error("Authentication or shop id missing");
      return;
    }

    if (!existingUrl) {
      if (isGst) {
        setGstPreview("");
      } else {
        setUdyamPreview("");
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    try {
      const removeDocApi =
        currentUserRole === "SHOP_OWNER"
          ? SummaryApi.shop_docs_remove
          : SummaryApi.shop_docs_remove_admin;

      if (isGst) {
        setRemovingGst(true);
      } else {
        setRemovingUdyam(true);
      }

      const response = await fetch(
        `${baseURL}${removeDocApi.url(shopId, key)}`,
        {
          method: removeDocApi.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const result =
        (await response.json().catch(() => ({}))) as ShopActionResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to remove document");
      }

      if (isGst) {
        setGstFile(null);
        setGstPreview("");
        setExistingGstUrl("");
        setExistingGstName("");
        setExistingGstMimeType("");
      } else {
        setUdyamFile(null);
        setUdyamPreview("");
        setExistingUdyamUrl("");
        setExistingUdyamName("");
        setExistingUdyamMimeType("");
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      toast.success(`${isGst ? "GST" : "Udyam"} document removed successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove document"
      );
    } finally {
      if (isGst) {
        setRemovingGst(false);
      } else {
        setRemovingUdyam(false);
      }
    }
  };

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!form.ownerId.trim()) {
      nextErrors.ownerId = "Shop owner is required";
    }

    if (!form.shopName.trim()) {
      nextErrors.shopName = "Shop name is required";
    }

    if (!form.shopType.trim()) {
      nextErrors.shopType = "Shop type is required";
    }

    if (!form.billingType.trim()) {
      nextErrors.billingType = "GST billing selection is required";
    }

    if (!form.mobile.trim()) {
      nextErrors.mobile = "Shop mobile number is required";
    } else if (!isValidIndianMobile(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number";
    }

    const cleanGst = normalizeGstNumber(form.gstNumber);
    const shouldValidateGstNumber = form.billingType === "GST";

    if (shouldValidateGstNumber && cleanGst && !isValidGST(cleanGst)) {
      nextErrors.gstNumber = "GST number must be 15 characters";
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

  const uploadShopDocs = async (targetShopId: string) => {
    if ((!gstFile && !udyamFile) || !accessToken) return;

    const uploadDocsApi =
      currentUserRole === "SHOP_OWNER"
        ? SummaryApi.shop_docs_upload
        : SummaryApi.shop_docs_upload_admin;

    const payload = new FormData();

    if (gstFile) {
      payload.append("gstCertificate", gstFile);
    }

    if (udyamFile) {
      payload.append("udyamCertificate", udyamFile);
    }

    const response = await fetch(
      `${baseURL}${uploadDocsApi.url(targetShopId)}`,
      {
        method: uploadDocsApi.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: payload,
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Shop document upload failed");
    }
  };

  const uploadFrontImage = async (targetShopId: string) => {
    if (!frontImageFile || !accessToken) return;

    const uploadFrontApi =
      currentUserRole === "SHOP_OWNER"
        ? SummaryApi.shop_front_upload
        : SummaryApi.shop_front_upload_admin;

    const payload = new FormData();
    payload.append("front", frontImageFile);

    const response = await fetch(
      `${baseURL}${uploadFrontApi.url(targetShopId)}`,
      {
        method: uploadFrontApi.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: payload,
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Front image upload failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLocationLoading) {
      toast.error("Please wait until location data finishes loading");
      return;
    }

    if (loadingOwners) {
      toast.error("Please wait until shop owners finish loading");
      return;
    }

    const valid = validateForm();

    if (!valid) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    let targetShopId = isEditMode ? shopId : "";

    try {
      setSubmitting(true);

      const address = buildAddressPayload(form);
      const cleanShopName = toTitleCase(form.shopName);
      const cleanMobile = digitsOnly(form.mobile).slice(0, 10);
      const cleanGstNumber = normalizeGstNumber(form.gstNumber);
      const resolvedBillingType =
        form.billingType === "NON_GST" ? "NON_GST" : "GST";
      const enableGSTBilling = resolvedBillingType === "GST";
      const gstNumberForSubmit =
        resolvedBillingType === "NON_GST" ? "" : cleanGstNumber;

      if (isEditMode) {
        if (!shopId) {
          toast.error("Invalid shop id");
          return;
        }

        const updateShopApi = SummaryApi.shop_update;
        const response = await fetch(
          `${baseURL}${updateShopApi.url(shopId)}`,
          {
            method: updateShopApi.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              name: cleanShopName,
              shopType: form.shopType,
              isMainWarehouse: form.shopType === "WAREHOUSE_RETAIL_SHOP",
              billingType: resolvedBillingType,
              enableGSTBilling,
              businessType: form.businessType,
              mobile: cleanMobile,
              gstNumber: gstNumberForSubmit,
              state: address.state,
              district: address.district,
              taluk: address.taluk,
              area: address.area,
              street: address.street,
              pincode: address.pincode,
            }),
          }
        );

        const result =
          (await response.json().catch(() => ({}))) as CreateShopApiResponse;

        if (!response.ok || !result?.success) {
          toast.error(result?.message || "Failed to update shop");
          return;
        }
      } else {
        const createShopApi = SummaryApi.shop_create;
        const payload = new FormData();

        payload.append("name", cleanShopName);
        payload.append("shopName", cleanShopName);
        payload.append("ownerId", form.ownerId);
        payload.append("shopOwnerAccountId", form.ownerId);
        payload.append("shopType", form.shopType);
        payload.append("mobile", cleanMobile);
        payload.append("gstNumber", gstNumberForSubmit);

        payload.append(
          "isMainWarehouse",
          String(form.shopType === "WAREHOUSE_RETAIL_SHOP")
        );

        payload.append("billingType", resolvedBillingType);

        payload.append("enableGSTBilling", String(enableGSTBilling));

        if (form.businessType) {
          payload.append("businessType", form.businessType);
        }

        payload.append("state", address.state);
        payload.append("district", address.district);
        payload.append("taluk", address.taluk);
        payload.append("area", address.area);
        payload.append("street", address.street);
        payload.append("pincode", address.pincode);

        if (frontImageFile) {
          payload.append("frontImage", frontImageFile);
        }

        const response = await fetch(
          `${baseURL}${createShopApi.url}`,
          {
            method: createShopApi.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: payload,
          }
        );

        const result =
          (await response.json().catch(() => ({}))) as CreateShopApiResponse;

        if (!response.ok || !result?.success) {
          toast.error(result?.message || "Failed to create shop");
          return;
        }

        targetShopId = String(result?.data?._id || "");

        if (!targetShopId) {
          toast.error("Shop created but missing shop id");
          return;
        }
      }

      await uploadFrontImage(targetShopId);
      await uploadShopDocs(targetShopId);

      toast.success(
        isEditMode ? "Shop updated successfully" : "Shop created successfully"
      );

      if (!isEditMode) {
        resetForm();
      }

      handleSuccess();
    } catch (error) {
      console.error(error);

      if (!isEditMode && targetShopId) {
        toast.error(
          error instanceof Error
            ? `Shop created, but ${error.message}`
            : "Shop created, but document upload failed"
        );
        return;
      }

      toast.error(
        isEditMode
          ? "Something went wrong while updating the shop"
          : "Something went wrong while creating the shop"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className={asModal ? "w-full" : "page-shell"}>
        <div className={classNames(
          "flex items-center justify-center",
          asModal ? "min-h-48" : "mx-auto min-h-[60vh] max-w-7xl"
        )}>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading shop details...
          </div>
        </div>
      </div>
    );
  }

  if (isEditMode && (loadFailed || !shopId)) {
    return (
      <div className={asModal ? "w-full" : "page-shell"}>
        <div className={classNames(
          "w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm",
          asModal ? "" : "mx-auto max-w-4xl"
        )}>
          <h1 className="text-2xl font-bold text-slate-900">Edit Shop</h1>
          <p className="mt-2 text-sm text-slate-500">
            A valid shop record could not be loaded for editing.
          </p>

          <div className="mt-5">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {asModal ? "Close" : "Back to List"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={asModal ? "w-full" : "page-shell bg-slate-50"}>
      <div
        className={classNames(
          asModal
            ? "w-full"
            : "mx-auto w-full max-w-6xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]"
        )}
      >
        {!asModal ? (
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950">
                {isEditMode ? "Edit Shop" : "Create Shop"}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {isEditMode
                  ? "Update shop details, address, image, and documents."
                  : "Create a shop and link it with an existing shop owner."}
              </p>
            </div>

            <span
              className={classNames(
                "inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold",
                shopActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              )}
            >
              {isEditMode ? (shopActive ? "Active" : "Inactive") : "New Shop"}
            </span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-4">
                <SectionHeader
                  icon={<Store className="h-5 w-5" />}
                  title="Shop Information"
                  description={
                    ownerSelectionLocked
                      ? "Enter the business location details for the selected shop owner."
                      : "Select the linked owner account and enter the primary shop details."
                  }
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <SearchableSelect
                    id="ownerId"
                    label={loadingOwners ? "Shop Owner (Loading...)" : "Shop Owner"}
                    value={form.ownerId}
                    onChange={(value) => updateField("ownerId", value)}
                    options={owners}
                    disabled={
                      currentUserRole === "SHOP_OWNER" ||
                      isEditMode ||
                      loadingOwners ||
                      owners.length === 0 ||
                      ownerSelectionLocked
                    }
                    error={errors.ownerId}
                    required
                    placeholder="Search and select a shop owner"
                    searchPlaceholder="Search owner by name, username, or email"
                  />

                  <FloatingSelect
                    id="businessType"
                    label="Business Type"
                    value={form.businessType}
                    onChange={(e) =>
                      updateField("businessType", e.target.value as BusinessType)
                    }
                    options={BUSINESS_OPTIONS}
                    placeholder="Select business type"
                    error={errors.businessType}
                  />

                  <SearchableSelect
                    id="shopType"
                    label="Shop Type"
                    value={form.shopType}
                    onChange={(value) => {
                      const nextShopType = value as ShopType;

                      setForm((prev) => ({
                        ...prev,
                        shopType: nextShopType,
                        businessType:
                          nextShopType === "WHOLESALE_SHOP"
                            ? "Wholesale"
                            : prev.businessType || "Retail",
                      }));

                      setErrors((prev) => ({ ...prev, shopType: undefined }));
                    }}
                    options={SHOP_TYPE_OPTIONS}
                    error={errors.shopType}
                    required
                    placeholder="Select shop type"
                    searchPlaceholder="Search shop type"
                  />

                  <FloatingSelect
                    id="billingType"
                    label="GST Billing"
                    value={form.billingType}
                    onChange={(e) => {
                      const nextBillingType = e.target.value as ShopBillingType;

                      setForm((prev) => ({
                        ...prev,
                        billingType: nextBillingType,
                        gstNumber:
                          nextBillingType === "NON_GST" ? "" : prev.gstNumber,
                      }));

                      setErrors((prev) => ({
                        ...prev,
                        billingType: undefined,
                        gstNumber: undefined,
                      }));
                    }}
                    options={GST_BILLING_OPTIONS}
                    placeholder="Select GST billing"
                    error={errors.billingType}
                    required
                  />

                  <FloatingInput
                    id="shopName"
                    label="Shop Name"
                    value={form.shopName}
                    onChange={(e) => updateField("shopName", e.target.value)}
                    error={errors.shopName}
                    required
                  />

                  <FloatingInput
                    id="mobile"
                    label="Shop Mobile Number"
                    type="tel"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) =>
                      updateField(
                        "mobile",
                        digitsOnly(e.target.value).slice(0, 10)
                      )
                    }
                    error={errors.mobile}
                    required
                  />

                  <FloatingInput
                    id="gstNumber"
                    label="GST Number"
                    maxLength={15}
                    value={form.gstNumber}
                    onChange={(e) =>
                      updateField("gstNumber", normalizeGstNumber(e.target.value))
                    }
                    disabled={form.billingType === "NON_GST"}
                    error={errors.gstNumber}
                  />
                </div>

                {!loadingOwners && owners.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    No shop owners are available yet. Create a shop owner first.
                  </div>
                ) : null}

                {ownerSelectionLocked ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    This business location will be created for the selected shop owner.
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4">
                <SectionHeader
                  icon={<MapPin className="h-5 w-5" />}
                  title={ownerSelectionLocked ? "Business Location Address" : "Address Details"}
                  description="Search loaded address options or type your own custom values."
                />

                {locationError ? (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                    {locationError}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <SearchableSelect
                    id="state"
                    label={loadingStates ? "State (Loading...)" : "State"}
                    value={form.state}
                    onChange={(value) => {
                      setLocationError("");
                      setForm((prev) => ({
                        ...prev,
                        state: value,
                        district: "",
                        taluk: "",
                        area: "",
                      }));
                      setErrors((prev) => ({
                        ...prev,
                        state: undefined,
                        district: undefined,
                        taluk: undefined,
                        area: undefined,
                      }));
                      setStates((prev) => appendOption(prev, value));
                      resetDistrictTree();
                    }}
                    options={states}
                    disabled={loadingStates}
                    error={errors.state}
                    required
                    allowCustom
                    onCreateOption={(value) =>
                      setStates((prev) => appendOption(prev, value))
                    }
                    placeholder="Select or type state"
                    searchPlaceholder="Search or type state"
                  />

                  <SearchableSelect
                    id="district"
                    label={loadingDistricts ? "District (Loading...)" : "District"}
                    value={form.district}
                    onChange={(value) => {
                      setLocationError("");
                      setForm((prev) => ({
                        ...prev,
                        district: value,
                        taluk: "",
                        area: "",
                      }));
                      setErrors((prev) => ({
                        ...prev,
                        district: undefined,
                        taluk: undefined,
                        area: undefined,
                      }));
                      setDistricts((prev) => appendOption(prev, value));
                      resetTalukTree();
                    }}
                    options={districts}
                    disabled={!form.state || loadingDistricts}
                    error={errors.district}
                    required
                    allowCustom
                    onCreateOption={(value) =>
                      setDistricts((prev) => appendOption(prev, value))
                    }
                    placeholder="Select or type district"
                    searchPlaceholder="Search or type district"
                  />

                  <SearchableSelect
                    id="taluk"
                    label={loadingTaluks ? "Taluk (Loading...)" : "Taluk"}
                    value={form.taluk}
                    onChange={(value) => {
                      setLocationError("");
                      setForm((prev) => ({
                        ...prev,
                        taluk: value,
                        area: "",
                      }));
                      setErrors((prev) => ({
                        ...prev,
                        taluk: undefined,
                        area: undefined,
                      }));
                      setTaluks((prev) => appendOption(prev, value));
                      resetAreaTree();
                    }}
                    options={taluks}
                    disabled={!form.district || loadingTaluks}
                    error={errors.taluk}
                    required
                    allowCustom
                    onCreateOption={(value) =>
                      setTaluks((prev) => appendOption(prev, value))
                    }
                    placeholder="Select or type taluk"
                    searchPlaceholder="Search or type taluk"
                  />

                  <SearchableSelect
                    id="area"
                    label={loadingAreas ? "Area (Loading...)" : "Area"}
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
                    onCreateOption={(value) =>
                      setAreas((prev) => appendOption(prev, value))
                    }
                    placeholder="Select or type area"
                    searchPlaceholder="Search or type area"
                  />

                  <FloatingInput
                    id="street"
                    label="Street"
                    value={form.street}
                    onChange={(e) => updateField("street", e.target.value)}
                    error={errors.street}
                    required
                  />

                  <FloatingInput
                    id="pincode"
                    label="Pincode"
                    type="tel"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) =>
                      updateField(
                        "pincode",
                        digitsOnly(e.target.value).slice(0, 6)
                      )
                    }
                    error={errors.pincode}
                    required
                  />
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-4">
                <SectionHeader
                  icon={<ImagePlus className="h-5 w-5" />}
                  title="Images & Documents"
                  description="Upload shop front image, GST certificate, and Udyam certificate."
                />

                <div className="space-y-3">
                  <UploadCard
                    title="Front Image"
                    description="Shop front photo"
                    preview={frontImagePreview}
                    fileName={
                      frontImageFile?.name ||
                      (existingFrontImageUrl ? "Uploaded image" : "")
                    }
                    onUpload={(file) =>
                      handleImageUpload(
                        file,
                        frontImagePreview,
                        setFrontImagePreview,
                        setFrontImageFile,
                        "Front image size must be under 5MB"
                      )
                    }
                    onRemove={handleRemoveFrontImage}
                    inputRef={frontImageInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    buttonLabel={
                      isEditMode ? "Change Front Image" : "Upload Front Image"
                    }
                    emptyIcon={<ImagePlus className="h-8 w-8" />}
                    previewClassName="h-32 w-full rounded-2xl border border-slate-200 object-cover"
                  />

                  <UploadCard
                    title="GST Certificate"
                    description="PDF or image"
                    preview={gstPreview}
                    fileName={gstFile?.name || existingGstName}
                    onUpload={(file) =>
                      handleDocumentUpload(
                        file,
                        gstPreview,
                        setGstPreview,
                        setGstFile
                      )
                    }
                    onRemove={() => handleRemoveDocument("gstCertificate")}
                    inputRef={gstInputRef}
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    buttonLabel={isEditMode ? "Change GST" : "Upload GST"}
                    emptyIcon={<UploadCloud className="h-8 w-8" />}
                    previewClassName="h-32 w-full rounded-2xl border border-slate-200 object-cover"
                  />

                  <UploadCard
                    title="Udyam Certificate"
                    description="PDF or image"
                    preview={udyamPreview}
                    fileName={udyamFile?.name || existingUdyamName}
                    onUpload={(file) =>
                      handleDocumentUpload(
                        file,
                        udyamPreview,
                        setUdyamPreview,
                        setUdyamFile
                      )
                    }
                    onRemove={() => handleRemoveDocument("udyamCertificate")}
                    inputRef={udyamInputRef}
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    buttonLabel={isEditMode ? "Change Udyam" : "Upload Udyam"}
                    emptyIcon={<UploadCloud className="h-8 w-8" />}
                    previewClassName="h-32 w-full rounded-2xl border border-slate-200 object-cover"
                  />
                </div>
              </section>
            </aside>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                {asModal ? "Close" : "Cancel"}
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  isLocationLoading ||
                  loadingOwners ||
                  (!isEditMode && owners.length === 0) ||
                  removingFrontImage ||
                  removingGst ||
                  removingUdyam
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#00008b] px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,139,0.22)] transition hover:bg-[#000070] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? "Update Shop" : "Create Shop"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
