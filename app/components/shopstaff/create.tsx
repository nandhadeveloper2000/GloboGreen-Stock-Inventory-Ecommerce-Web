/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Sparkles,
  Store,
  UploadCloud,
  User2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";

type Role = "SHOP_OWNER" | "SHOP_MANAGER" | "SHOP_SUPERVISOR" | "EMPLOYEE";
type CreateRole = "SHOP_MANAGER" | "SHOP_SUPERVISOR" | "EMPLOYEE";

type Option = {
  label: string;
  value: string;
};

type FormState = {
  role: CreateRole;
  name: string;
  username: string;
  email: string;
  pin: string;
  mobile: string;
  additionalNumber: string;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type CreateShopStaffApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    role?: string;
  };
};

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type ShopStaffItem = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  role?: string;
  isActive?: boolean;
  avatarUrl?: string;
  idProofUrl?: string;
  idProof?: { url?: string };
  address?: Address;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

type PageMode = "create" | "edit";

type CreateShopStaffPageProps = {
  mode?: PageMode;
  staffId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const INITIAL: FormState = {
  role: "EMPLOYEE",
  name: "",
  username: "",
  email: "",
  pin: "",
  mobile: "",
  additionalNumber: "",
  state: "",
  district: "",
  taluk: "",
  area: "",
  street: "",
  pincode: "",
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

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

  const suffix = String(Date.now()).slice(-4);
  return `${base}${suffix}`;
}

function isValidGmail(email: string) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim());
}

function isValidPin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

function isValidIndianMobile(mobile: string) {
  return /^[6-9]\d{9}$/.test(mobile);
}

function isValidPincode(pincode: string) {
  return /^\d{6}$/.test(pincode);
}

function getRoleBadgeText(role?: string | null) {
  const value = String(role || "").toUpperCase();

  if (value === "SHOP_OWNER") return "Shop Owner";
  if (value === "SHOP_MANAGER") return "Shop Manager";
  if (value === "SHOP_SUPERVISOR") return "Shop Supervisor";
  if (value === "EMPLOYEE") return "Employee";

  return "Unknown";
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

function getRedirectPath(role: Role) {
  if (role === "SHOP_OWNER") return "/shopowner/shopstaff/list";
  if (role === "SHOP_MANAGER") return "/shopmanager/shopstaff/list";
  if (role === "SHOP_SUPERVISOR") return "/shopsupervisor/shopstaff/list";
  return "/employee";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readSingle(json: ApiResponse): ShopStaffItem | null {
  if (
    isRecord(json.data) &&
    isRecord((json.data as Record<string, unknown>).staff)
  ) {
    return (json.data as Record<string, unknown>).staff as ShopStaffItem;
  }

  if (isRecord(json.data)) {
    return json.data as ShopStaffItem;
  }

  return null;
}

function SectionHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#00008B]">
        {icon}
      </div>
      <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
    </div>
  );
}

function FormBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={classNames(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </section>
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
  readOnly,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  readOnly?: boolean;
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
          readOnly={readOnly}
          placeholder={label}
          className={classNames(
            "h-11 w-full rounded-xl border bg-white px-3 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400",
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              : "border-slate-200 focus:border-[#00008B] focus:ring-2 focus:ring-blue-50",
            (disabled || readOnly) && "cursor-not-allowed bg-slate-50 text-slate-500"
          )}
        />

        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-3 top-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em]",
            error ? "text-rose-500" : "text-slate-500"
          )}
        >
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </label>
      </div>

      {error ? <p className="px-1 text-[11px] text-rose-500">{error}</p> : null}
    </div>
  );
}

function FloatingSelect({
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
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
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
            "h-11 w-full appearance-none rounded-xl border bg-white px-3 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition",
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              : "border-slate-200 focus:border-[#00008B] focus:ring-2 focus:ring-blue-50",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-500"
          )}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-3 top-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em]",
            error ? "text-rose-500" : "text-slate-500"
          )}
        >
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </label>

        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </div>

      {error ? <p className="px-1 text-[11px] text-rose-500">{error}</p> : null}
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

    return options.filter((option) => {
      const haystack = `${option.label} ${option.value}`.toLowerCase();
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
    <div ref={containerRef} className="space-y-1">
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={classNames(
            "relative flex h-11 w-full items-end justify-between rounded-xl border bg-white px-3 pb-2 pt-5 text-left text-sm font-semibold outline-none transition",
            error
              ? "border-rose-300 ring-2 ring-rose-50"
              : open
                ? "border-[#00008B] ring-2 ring-blue-50"
                : "border-slate-200 hover:border-slate-300",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-500"
          )}
        >
          <span
            className={classNames(
              "block min-w-0 truncate pr-6 leading-5",
              value ? "text-slate-900" : "text-slate-400"
            )}
          >
            {selectedLabel || placeholder || `Select or type ${label.toLowerCase()}`}
          </span>

          <ChevronsUpDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </button>

        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-3 top-1.5 z-1 text-[9px] font-extrabold uppercase tracking-[0.16em]",
            error ? "text-rose-500" : open ? "text-[#00008B]" : "text-slate-500"
          )}
        >
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </label>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
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
                  placeholder={
                    searchPlaceholder ||
                    (allowCustom ? "Search or type new value" : "Search options")
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-[#00008B] focus:bg-white"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto p-2">
              {canCreate ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#00008B] transition hover:bg-blue-50"
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
                          ? "bg-blue-50 font-bold text-[#00008B]"
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

      {error ? <p className="px-1 text-[11px] text-rose-500">{error}</p> : null}
    </div>
  );
}

function UploadPreviewCard({
  title,
  description,
  preview,
  onUpload,
  onRemove,
  inputRef,
  accept = "image/*",
  buttonLabel,
  emptyIcon,
  previewClassName,
}: {
  title: string;
  description: string;
  preview: string;
  onUpload: (file: File | null | undefined) => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept?: string;
  buttonLabel: string;
  emptyIcon: ReactNode;
  previewClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-extrabold text-slate-950">{title}</h4>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>

      <div className="mt-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={title} className={previewClassName} />
        ) : (
          <div className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
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

        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#00008B] px-4 text-sm font-bold text-white transition hover:bg-[#00006f]"
          >
            {buttonLabel}
          </button>

          {preview ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CreateShopStaffPage({
  mode = "create",
  staffId = "",
  isModal = false,
  onClose,
  onSuccess,
}: CreateShopStaffPageProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const safeStaffId = String(staffId || "").trim();
  const { accessToken, role } = useAuth();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const idProofInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserRole = useMemo(
    () => String(role || "").toUpperCase() as Role,
    [role]
  );

  const allowedRoles: CreateRole[] = useMemo(() => {
    if (currentUserRole === "SHOP_OWNER") {
      return ["SHOP_MANAGER", "SHOP_SUPERVISOR", "EMPLOYEE"];
    }

    if (currentUserRole === "SHOP_MANAGER") {
      return ["SHOP_SUPERVISOR", "EMPLOYEE"];
    }

    if (currentUserRole === "SHOP_SUPERVISOR") {
      return ["EMPLOYEE"];
    }

    return [];
  }, [currentUserRole]);

  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    role: "EMPLOYEE",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [taluks, setTaluks] = useState<Option[]>([]);
  const [areas, setAreas] = useState<Option[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTaluks, setLoadingTaluks] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState("");

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");

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
        console.error("Location API failed:", {
          url,
          status: response.status,
          data,
        });
        return [];
      }

      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.results)) return data.results;
      if (Array.isArray(data)) return data;

      return [];
    } catch (error) {
      console.error("Location API error:", error);
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

  const fetchStaff = async () => {
    if (!isEdit || !accessToken || !safeStaffId) {
      setLoadingEdit(false);
      return;
    }

    try {
      setLoadingEdit(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.shopstaff_get.url(safeStaffId)}`,
        {
          method: SummaryApi.shopstaff_get.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      const json = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        toast.error(json?.message || "Failed to load staff details");
        return;
      }

      const staff = readSingle(json);

      if (!staff) {
        toast.error("Staff data not found");
        return;
      }

      const nextRole = allowedRoles.includes(
        (staff.role || "EMPLOYEE") as CreateRole
      )
        ? ((staff.role || "EMPLOYEE") as CreateRole)
        : (allowedRoles[0] ?? "EMPLOYEE");

      setForm({
        role: nextRole,
        name: staff.name || "",
        username: staff.username || "",
        email: staff.email || "",
        pin: "",
        mobile: staff.mobile || "",
        additionalNumber: staff.additionalNumber || "",
        state: staff.address?.state || "",
        district: staff.address?.district || "",
        taluk: staff.address?.taluk || "",
        area: staff.address?.area || "",
        street: staff.address?.street || "",
        pincode: staff.address?.pincode || "",
      });

      setAvatarPreview(staff.avatarUrl || "");
      setIdProofPreview(staff.idProofUrl || staff.idProof?.url || "");
    } catch (error) {
      console.error(error);
      toast.error("Unable to load staff details");
    } finally {
      setLoadingEdit(false);
    }
  };

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      role: allowedRoles.includes(prev.role)
        ? prev.role
        : allowedRoles[0] ?? "EMPLOYEE",
    }));
  }, [allowedRoles]);

  useEffect(() => {
    if (isEdit && allowedRoles.length) {
      void fetchStaff();
    }
  }, [isEdit, safeStaffId, accessToken, allowedRoles.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncSelectedShop = () => {
      const storedShopId =
        window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "";
      const storedShopName =
        window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "";

      setSelectedShopId(storedShopId);
      setSelectedShopName(storedShopName);
    };

    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, []);

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
      setDistricts(isEdit ? appendOption(options, form.district) : options);
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
      setTaluks(isEdit ? appendOption(options, form.taluk) : options);
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
      setAreas(isEdit ? appendOption(options, form.area) : options);
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
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      if (idProofPreview.startsWith("blob:")) URL.revokeObjectURL(idProofPreview);
    };
  }, [avatarPreview, idProofPreview]);

  const handleImageChange = (
    file: File | null | undefined,
    type: "avatar" | "idproof"
  ) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be under 2MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === "avatar") {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      return;
    }

    if (idProofPreview.startsWith("blob:")) URL.revokeObjectURL(idProofPreview);
    setIdProofFile(file);
    setIdProofPreview(previewUrl);
  };

  const removeImage = (type: "avatar" | "idproof") => {
    if (type === "avatar") {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview("");
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    if (idProofPreview.startsWith("blob:")) URL.revokeObjectURL(idProofPreview);
    setIdProofPreview("");
    setIdProofFile(null);
    if (idProofInputRef.current) idProofInputRef.current.value = "";
  };

  const validateBasicAndAddress = () => {
    const nextErrors: FieldErrors = {};

    if (!form.role) nextErrors.role = "Role is required";
    if (!form.name.trim()) nextErrors.name = "Full name is required";
    if (!form.username.trim()) nextErrors.username = "Username is required";

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!isValidGmail(form.email)) {
      nextErrors.email = "Enter a valid Gmail address";
    }

    if (!isEdit) {
      if (!form.pin.trim()) {
        nextErrors.pin = "PIN is required";
      } else if (!isValidPin(form.pin)) {
        nextErrors.pin = "PIN must be 4 to 6 digits";
      }
    }

    if (!form.mobile.trim()) {
      nextErrors.mobile = "Primary mobile is required";
    } else if (!isValidIndianMobile(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit Indian mobile number";
    }

    if (
      form.additionalNumber.trim() &&
      !isValidIndianMobile(form.additionalNumber)
    ) {
      nextErrors.additionalNumber = "Enter a valid 10-digit additional mobile";
    }

    if (
      form.mobile &&
      form.additionalNumber &&
      form.mobile === form.additionalNumber
    ) {
      nextErrors.additionalNumber =
        "Additional mobile must be different from primary mobile";
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

  const handleCancel = () => {
    if (isModal) {
      onClose?.();
      return;
    }

    router.push(getRedirectPath(currentUserRole));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLocationLoading) {
      toast.error("Please wait until location data finishes loading");
      return;
    }

    const valid = validateBasicAndAddress();

    if (!valid) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    if (!isEdit && !selectedShopId) {
      toast.error("Please select a shop first");
      return;
    }

    if (isEdit && !safeStaffId) {
      toast.error("Staff id missing");
      return;
    }

    if (!allowedRoles.includes(form.role)) {
      toast.error(
        isEdit
          ? "You are not allowed to update this role"
          : "You are not allowed to create this role"
      );
      return;
    }

    try {
      setSubmitting(true);

      const cleanName = toTitleCase(alphaSpaceOnly(form.name));
      const cleanUsername = form.username.trim().toLowerCase();
      const cleanEmail = form.email.trim().toLowerCase();
      const addressPayload = buildAddressPayload(form);

      const payload = new FormData();

      if (!isEdit) {
        payload.append("shopId", selectedShopId);
        payload.append("pin", form.pin.trim());
      }

      payload.append("role", form.role);
      payload.append("name", cleanName);
      payload.append("username", cleanUsername);
      payload.append("email", cleanEmail);
      payload.append("mobile", form.mobile.trim());

      if (form.additionalNumber.trim()) {
        payload.append("additionalNumber", form.additionalNumber.trim());
      }

      payload.append("address", JSON.stringify(addressPayload));
      payload.append("state", addressPayload.state);
      payload.append("district", addressPayload.district);
      payload.append("taluk", addressPayload.taluk);
      payload.append("area", addressPayload.area);
      payload.append("street", addressPayload.street);
      payload.append("pincode", addressPayload.pincode);

      if (avatarFile) {
        payload.append("avatar", avatarFile);
      }

      if (idProofFile) {
        payload.append("idproof", idProofFile);
      }

      const endpoint = isEdit
        ? SummaryApi.shopstaff_update.url(safeStaffId)
        : SummaryApi.shopstaff_create.url;

      const method = isEdit
        ? SummaryApi.shopstaff_update.method
        : SummaryApi.shopstaff_create.method;

      const response = await fetch(`${baseURL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: payload,
      });

      const result =
        (await response.json().catch(() => ({}))) as CreateShopStaffApiResponse;

      if (!response.ok || (!isEdit && result?.success === false)) {
        toast.error(
          result?.message ||
            (isEdit ? "Failed to update shop staff" : "Failed to create shop staff")
        );
        return;
      }

      toast.success(
        result?.message ||
          (isEdit
            ? "Staff updated successfully"
            : `${getRoleBadgeText(form.role)} account created successfully`)
      );

      if (!isEdit) {
        setForm({
          ...INITIAL,
          role: allowedRoles[0] ?? "EMPLOYEE",
        });
        setErrors({});
        setLocationError("");
        removeImage("avatar");
        removeImage("idproof");
      }

      await onSuccess?.();

      if (isModal) {
        onClose?.();
        return;
      }

      router.replace(getRedirectPath(currentUserRole));
    } catch (error) {
      console.error(error);
      toast.error(
        isEdit
          ? "Something went wrong while updating the account"
          : "Something went wrong while creating the account"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className={isModal ? "w-full" : "min-h-screen bg-slate-50 p-4"}>
        <div className="mx-auto flex min-h-90 max-w-5xl items-center justify-center">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-100 border-t-[#00008B]">
              <Loader2 className="h-6 w-6 animate-spin text-[#00008B]" />
            </div>
            <p className="mt-4 text-center text-sm font-bold text-slate-500">
              Loading staff details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const shopControlText = isEdit
    ? selectedShopName || "Existing Staff"
    : selectedShopName || "No shop selected";

  return (
    <div className={isModal ? "w-full" : "min-h-screen bg-slate-50 p-4"}>
      <div
        className={classNames(
          isModal
            ? "w-full"
            : "mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
        )}
      >
        {!isModal ? (
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                <Store className="h-3.5 w-3.5" />
                Staff Management
              </div>
              <h1 className="mt-2 text-2xl font-black text-slate-950">
                {isEdit ? "Edit Staff" : "Create Staff"}
              </h1>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <FormBox>
                <SectionHeader
                  icon={<User2 className="h-5 w-5" />}
                  title="Basic Information"
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FloatingSelect
                    id="role"
                    label="Role"
                    value={form.role}
                    onChange={(e) =>
                      updateField("role", e.target.value as CreateRole)
                    }
                    options={allowedRoles.map((item) => ({
                      label: getRoleBadgeText(item),
                      value: item,
                    }))}
                    disabled={!allowedRoles.length}
                    error={errors.role}
                    required
                  />

                  <FloatingInput
                    id="shop-control"
                    label="Shop Control"
                    value={shopControlText}
                    readOnly
                    required={!isEdit}
                  />

                  <FloatingInput
                    id="name"
                    label="Full Name"
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", alphaSpaceOnly(e.target.value))
                    }
                    error={errors.name}
                    required
                  />

                  <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-2">
                    <FloatingInput
                      id="username"
                      label="Username"
                      value={form.username}
                      onChange={(e) =>
                        updateField("username", e.target.value.toLowerCase())
                      }
                      error={errors.username}
                      required
                    />

                    <button
                      type="button"
                      onClick={handleAutoUsername}
                      className="mt-0 inline-flex h-11 items-center justify-center rounded-xl bg-[#00008B] px-3 text-xs font-extrabold text-white transition hover:bg-[#00006f]"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Auto
                    </button>
                  </div>

                  <FloatingInput
                    id="email"
                    label="Email Address"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    error={errors.email}
                    required
                  />

                  {!isEdit ? (
                    <FloatingInput
                      id="pin"
                      label="PIN"
                      type="password"
                      maxLength={6}
                      value={form.pin}
                      onChange={(e) =>
                        updateField("pin", digitsOnly(e.target.value).slice(0, 6))
                      }
                      error={errors.pin}
                      required
                    />
                  ) : (
                    <FloatingInput
                      id="pin-hidden"
                      label="PIN"
                      value="Not editable"
                      readOnly
                    />
                  )}

                  <FloatingInput
                    id="mobile"
                    label="Primary Mobile"
                    type="tel"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) =>
                      updateField("mobile", digitsOnly(e.target.value).slice(0, 10))
                    }
                    error={errors.mobile}
                    required
                  />

                  <FloatingInput
                    id="additionalNumber"
                    label="Secondary Mobile"
                    type="tel"
                    maxLength={10}
                    value={form.additionalNumber}
                    onChange={(e) =>
                      updateField(
                        "additionalNumber",
                        digitsOnly(e.target.value).slice(0, 10)
                      )
                    }
                    error={errors.additionalNumber}
                  />
                </div>
              </FormBox>

              <FormBox>
                <SectionHeader
                  icon={<MapPin className="h-5 w-5" />}
                  title="Address Details"
                />

                {locationError ? (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    {locationError}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <SearchableSelect
                    id="state"
                    label={loadingStates ? "State Loading" : "State"}
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
                    label={loadingDistricts ? "District Loading" : "District"}
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
                    label={loadingTaluks ? "Taluk Loading" : "Taluk"}
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
                      updateField("pincode", digitsOnly(e.target.value).slice(0, 6))
                    }
                    error={errors.pincode}
                    required
                  />
                </div>
              </FormBox>
            </div>

            <div className="space-y-4">
              <FormBox>
                <SectionHeader
                  icon={<ImagePlus className="h-5 w-5" />}
                  title="Profile & Documents"
                />

                <div className="space-y-3">
                  <UploadPreviewCard
                    title="Avatar"
                    description="Profile image"
                    preview={avatarPreview}
                    onUpload={(file) => handleImageChange(file, "avatar")}
                    onRemove={() => removeImage("avatar")}
                    inputRef={avatarInputRef}
                    buttonLabel="Upload Avatar"
                    emptyIcon={<ImagePlus className="h-7 w-7" />}
                    previewClassName="h-24 w-full rounded-xl border border-slate-200 object-cover shadow-sm"
                  />

                  <UploadPreviewCard
                    title="ID Proof"
                    description="PDF or image"
                    preview={idProofPreview}
                    onUpload={(file) => handleImageChange(file, "idproof")}
                    onRemove={() => removeImage("idproof")}
                    inputRef={idProofInputRef}
                    buttonLabel="Upload ID Proof"
                    emptyIcon={<UploadCloud className="h-7 w-7" />}
                    previewClassName="h-24 w-full rounded-xl border border-slate-200 object-cover shadow-sm"
                  />
                </div>
              </FormBox>

              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Ready to save
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  isLocationLoading ||
                  allowedRoles.length === 0 ||
                  (!isEdit && !selectedShopId)
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00008B] px-7 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEdit ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEdit ? "Save Changes" : "Create Account"}
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