/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Sparkles,
  UploadCloud,
  User2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";

type Role = "SHOP_OWNER" | "SHOP_MANAGER" | "SHOP_SUPERVISOR" | "EMPLOYEE";
type EditRole = "SHOP_MANAGER" | "SHOP_SUPERVISOR" | "EMPLOYEE";

type Option = {
  label: string;
  value: string;
};

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type FormState = {
  role: EditRole;
  name: string;
  username: string;
  email: string;
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

type ShopStaffItem = {
  idProofUrl: string | undefined;
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  role?: string;
  isActive?: boolean;
  avatarUrl?: string;
  idProof?: {
    url?: string;
  };
  address?: Address;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

const INITIAL: FormState = {
  role: "EMPLOYEE",
  name: "",
  username: "",
  email: "",
  mobile: "",
  additionalNumber: "",
  state: "",
  district: "",
  taluk: "",
  area: "",
  street: "",
  pincode: "",
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

function isValidGmail(email: string) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim());
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
  if (isRecord(json.data) && isRecord((json.data as Record<string, unknown>).staff)) {
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
  const hasValue = Boolean(String(value).trim());

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
          placeholder=" "
          className={classNames(
            "peer h-14 w-full rounded-2xl border bg-white px-4 pb-2 pt-6 text-sm text-slate-900 outline-none transition shadow-sm placeholder-transparent",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-100",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        />
        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-4 bg-white px-1 transition-all duration-200",
            hasValue
              ? "top-2 text-[11px] font-medium"
              : "top-1/2 -translate-y-1/2 text-sm",
            "peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-medium",
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
  const hasValue = Boolean(String(value).trim());

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={classNames(
            "peer h-14 w-full appearance-none rounded-2xl border bg-white px-4 pb-2 pt-6 text-sm text-slate-900 outline-none transition shadow-sm",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-100",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-4 bg-white px-1 transition-all duration-200",
            hasValue
              ? "top-2 text-[11px] font-medium"
              : "top-1/2 -translate-y-1/2 text-sm",
            "peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-medium",
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

  const hasValue = Boolean(String(value).trim());

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
    <div ref={containerRef} className="space-y-1.5">
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={classNames(
            "peer relative flex h-14 w-full items-end justify-between rounded-2xl border bg-white px-4 pb-3 pt-6 text-left text-sm outline-none transition shadow-sm",
            error
              ? "border-rose-300 ring-4 ring-rose-50"
              : open
                ? "border-violet-500 ring-4 ring-violet-100"
                : "border-slate-200 hover:border-slate-300",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        >
          <span
            className={classNames(
              "block min-w-0 truncate pr-6 leading-5",
              hasValue ? "text-slate-900" : "text-slate-400"
            )}
          >
            {selectedLabel || placeholder || `Select ${label.toLowerCase()}`}
          </span>

          <ChevronsUpDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-slate-400" />
        </button>

        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-4 z-[1] bg-white px-1 leading-none transition-all duration-200",
            hasValue || open
              ? "top-2 text-[11px] font-medium"
              : "top-1/2 -translate-y-1/2 text-sm",
            error ? "text-rose-500" : open ? "text-violet-700" : "text-slate-500"
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
  emptyIcon: React.ReactNode;
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

          {preview ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function EditShopStaffPage() {
  const router = useRouter();
  const params = useParams();
  const { accessToken, role } = useAuth();

  const staffId = String(params?.id || "");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const idProofInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserRole = useMemo(
    () => String(role || "").toUpperCase() as Role,
    [role]
  );

  const allowedRoles: EditRole[] = useMemo(() => {
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

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});

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
        console.error("Location API failed:", { url, status: response.status, data });
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
    if (!accessToken || !staffId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.shopstaff_get.url(staffId)}`,
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
        (staff.role || "EMPLOYEE") as EditRole
      )
        ? ((staff.role || "EMPLOYEE") as EditRole)
        : (allowedRoles[0] ?? "EMPLOYEE");

      setForm({
        role: nextRole,
        name: staff.name || "",
        username: staff.username || "",
        email: staff.email || "",
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowedRoles.length) {
      void fetchStaff();
    }
  }, [staffId, accessToken, allowedRoles.length]);

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
    }

    void loadStates();

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state) return;

    async function loadDistricts() {
      setLoadingDistricts(true);

      const data = await fetchApi(
        `${SummaryApi.location_districts.url}?state=${encodeURIComponent(
          form.state
        )}`
      );

      if (!active) return;

      const options = toOptions(data);
      setDistricts(appendOption(options, form.district));
      setLoadingDistricts(false);
    }

    void loadDistricts();

    return () => {
      active = false;
    };
  }, [form.state, accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state || !form.district) return;

    async function loadTaluks() {
      setLoadingTaluks(true);

      const data = await fetchApi(
        `${SummaryApi.location_taluks.url}?state=${encodeURIComponent(
          form.state
        )}&district=${encodeURIComponent(form.district)}`
      );

      if (!active) return;

      const options = toOptions(data);
      setTaluks(appendOption(options, form.taluk));
      setLoadingTaluks(false);
    }

    void loadTaluks();

    return () => {
      active = false;
    };
  }, [form.state, form.district, accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state || !form.district || !form.taluk) return;

    async function loadAreas() {
      setLoadingAreas(true);

      const data = await fetchAreas();

      if (!active) return;

      const options = toOptions(data);
      setAreas(appendOption(options, form.area));
      setLoadingAreas(false);
    }

    void loadAreas();

    return () => {
      active = false;
    };
  }, [form.state, form.district, form.taluk, accessToken]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      if (idProofFile && idProofPreview.startsWith("blob:")) {
        URL.revokeObjectURL(idProofPreview);
      }
    };
  }, [avatarFile, avatarPreview, idProofFile, idProofPreview]);

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
      if (avatarFile && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      return;
    }

    if (idProofFile && idProofPreview.startsWith("blob:")) {
      URL.revokeObjectURL(idProofPreview);
    }
    setIdProofFile(file);
    setIdProofPreview(previewUrl);
  };

  const removeImage = (type: "avatar" | "idproof") => {
    if (type === "avatar") {
      if (avatarFile && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview("");
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    if (idProofFile && idProofPreview.startsWith("blob:")) {
      URL.revokeObjectURL(idProofPreview);
    }
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

    if (!form.mobile.trim()) {
      nextErrors.mobile = "Primary mobile is required";
    } else if (!isValidIndianMobile(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit Indian mobile number";
    }

    if (
      form.additionalNumber.trim() &&
      !isValidIndianMobile(form.additionalNumber)
    ) {
      nextErrors.additionalNumber =
        "Enter a valid 10-digit additional mobile";
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

    if (!allowedRoles.includes(form.role)) {
      toast.error("You are not allowed to update this role");
      return;
    }

    try {
      setSubmitting(true);

      const payload = new FormData();

      payload.append("role", form.role);
      payload.append("name", toTitleCase(alphaSpaceOnly(form.name)));
      payload.append("username", form.username.trim().toLowerCase());
      payload.append("email", form.email.trim().toLowerCase());
      payload.append("mobile", form.mobile.trim());

      if (form.additionalNumber.trim()) {
        payload.append("additionalNumber", form.additionalNumber.trim());
      }

      const addressPayload = {
        state: form.state.trim(),
        district: form.district.trim(),
        taluk: form.taluk.trim(),
        area: form.area.trim(),
        street: form.street.trim(),
        pincode: form.pincode.trim(),
      };

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

      const response = await fetch(
        `${baseURL}${SummaryApi.shopstaff_update.url(staffId)}`,
        {
          method: SummaryApi.shopstaff_update.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: payload,
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(
          (json as { message?: string })?.message || "Failed to update staff"
        );
        return;
      }

      toast.success(
        (json as { message?: string })?.message || "Staff updated successfully"
      );
      router.replace(`${getRedirectPath(currentUserRole)}`);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while updating the account");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="rounded-[30px] border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-violet-100 border-t-violet-700">
              <Loader2 className="h-6 w-6 animate-spin text-violet-700" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-slate-500">
              Loading staff details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Shop Staff Management
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Edit Shop Staff
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Update role, contact, address, avatar, and ID proof details.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Logged In As
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {getRoleBadgeText(currentUserRole)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Form Status
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {submitting ? "Saving..." : "Ready"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
                <SectionHeader
                  icon={<User2 className="h-5 w-5" />}
                  title="Basic Information"
                  description="Update the core account details for the shop staff member."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FloatingSelect
                    id="role"
                    label="Role"
                    value={form.role}
                    onChange={(e) =>
                      updateField("role", e.target.value as EditRole)
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
                    id="name"
                    label="Full Name"
                    value={form.name}
                    onChange={(e) =>
                      updateField("name", alphaSpaceOnly(e.target.value))
                    }
                    error={errors.name}
                    required
                  />

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

                  <FloatingInput
                    id="email"
                    label="Gmail Address"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    error={errors.email}
                    required
                  />

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
                    label="Additional Mobile"
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
              </div>

              <section className="rounded-card border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-5">
                <SectionHeader
                  icon={<MapPin className="h-5 w-5" />}
                  title="Address Details"
                  description="Search loaded address options or type your own custom values."
                />

                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Search the dropdown or type a value to add it as a custom address option.
                  {locationError ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Location lookup note: {locationError}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              </section>
            </div>

            <div className="space-y-5">
              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
                <SectionHeader
                  icon={<ImagePlus className="h-5 w-5" />}
                  title="Uploads"
                  description="Update avatar and ID proof images."
                />

                <div className="grid grid-cols-1 gap-4">
                  <UploadPreviewCard
                    title="Profile Avatar"
                    description="Upload a clear profile photo. PNG/JPG/WEBP up to 2MB."
                    preview={avatarPreview}
                    onUpload={(file) => handleImageChange(file, "avatar")}
                    onRemove={() => removeImage("avatar")}
                    inputRef={avatarInputRef}
                    buttonLabel="Upload Avatar"
                    emptyIcon={<ImagePlus className="h-8 w-8" />}
                    previewClassName="h-40 w-40 rounded-2xl border border-slate-200 object-cover shadow-sm"
                  />

                  <UploadPreviewCard
                    title="ID Proof"
                    description="Upload a valid ID proof image. PNG/JPG/WEBP up to 2MB."
                    preview={idProofPreview}
                    onUpload={(file) => handleImageChange(file, "idproof")}
                    onRemove={() => removeImage("idproof")}
                    inputRef={idProofInputRef}
                    buttonLabel="Upload ID Proof"
                    emptyIcon={<UploadCloud className="h-8 w-8" />}
                    previewClassName="h-40 w-full max-w-[260px] rounded-2xl border border-slate-200 object-cover shadow-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-card border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Sparkles className="h-4 w-4 text-violet-600" />
                Edit and save updated shop staff information.
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`${getRedirectPath(currentUserRole)}`)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || isLocationLoading || allowedRoles.length === 0}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,139,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
