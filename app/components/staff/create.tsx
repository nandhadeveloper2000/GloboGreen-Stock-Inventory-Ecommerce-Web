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
  UploadCloud,
  User2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";

type Role = "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF";
type CreateRole = "MANAGER" | "SUPERVISOR" | "STAFF";

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
  secondaryMobile: string;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type CreateStaffApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    role?: string;
  };
};

type StaffDetail = {
  _id?: string;
  role?: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  secondaryMobile?: string;
  avatarUrl?: string;
  avatar?: string;
  idProofUrl?: string;
  idproof?: string;
  address?: {
    state?: string;
    district?: string;
    taluk?: string;
    area?: string;
    street?: string;
    pincode?: string;
  };
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type StaffDetailApiResponse = {
  success?: boolean;
  message?: string;
  data?: StaffDetail;
};

type CreateStaffPageProps = {
  mode?: "create" | "edit";
  staffId?: string;
  asModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const INITIAL: FormState = {
  role: "STAFF",
  name: "",
  username: "",
  email: "",
  pin: "",
  mobile: "",
  secondaryMobile: "",
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

function isCreateRole(value: string): value is CreateRole {
  return value === "MANAGER" || value === "SUPERVISOR" || value === "STAFF";
}

function getRoleBadgeText(role?: string | null) {
  const value = String(role || "").toUpperCase();

  if (value === "MASTER_ADMIN") return "Master Admin";
  if (value === "MANAGER") return "Manager";
  if (value === "SUPERVISOR") return "Supervisor";
  if (value === "STAFF") return "Staff";

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

function revokePreviewUrl(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function getRedirectPath(role: Role) {
  if (role === "MASTER_ADMIN") return "/master/staff/list";
  if (role === "MANAGER") return "/manager/staff/list";
  if (role === "SUPERVISOR") return "/supervisor/staff/list";
  return "/staff/list";
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
    <div className="mb-4 flex items-start gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs leading-5 text-slate-500">{description}</p>
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
          placeholder=" "
          className={classNames(
            "peer h-11 w-full rounded-xl border bg-white px-3.5 pt-5 text-sm text-slate-900 outline-none transition shadow-sm placeholder-transparent",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary-soft",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        />
        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 bg-white px-1 text-sm transition-all",
            "peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm",
            "peer-focus:top-0 peer-focus:text-[11px]",
            value ? "top-0 text-[11px]" : "",
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
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={classNames(
            "peer h-11 w-full appearance-none rounded-xl border bg-white px-3.5 pt-5 text-sm text-slate-900 outline-none transition shadow-sm",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary-soft",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        >
          <option value=""></option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 bg-white px-1 text-sm transition-all",
            "peer-focus:top-0 peer-focus:text-[11px]",
            value ? "top-0 text-[11px]" : "",
            error ? "text-rose-500" : "text-slate-500"
          )}
        >
          {label} {required ? "*" : ""}
        </label>

        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
            "peer flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3.5 pt-5 text-left text-sm text-slate-900 outline-none transition shadow-sm",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary-soft",
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
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 bg-white px-1 text-sm transition-all",
            (value || open) ? "top-0 text-[11px]" : "",
            error ? "text-rose-500" : "text-slate-500"
          )}
        >
          {label} {required ? "*" : ""}
        </label>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]">
            <div className="border-b border-slate-100 p-2.5">
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
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary-soft"
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
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-primary transition hover:bg-primary-soft"
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
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                        selected
                          ? "bg-primary-soft font-semibold text-primary"
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
  emptyIcon: ReactNode;
  previewClassName: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <p className="mt-1 text-xs text-slate-500">{description}</p>

      <div className="mt-3 flex flex-col items-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={title} className={previewClassName} />
        ) : (
          <div className="flex h-32 w-full max-w-60 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
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

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-3.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            {buttonLabel}
          </button>

          {preview ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
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

export default function CreateStaffPage({
  mode = "create",
  staffId = "",
  asModal = false,
  onClose,
  onSuccess,
}: CreateStaffPageProps) {
  const router = useRouter();
  const { accessToken, role } = useAuth();
  const isEditMode = mode === "edit";

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const idProofInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserRole = useMemo(
    () => String(role || "").toUpperCase() as Role,
    [role]
  );

  const allowedRoles: CreateRole[] = useMemo(() => {
    if (currentUserRole === "MASTER_ADMIN") {
      return ["MANAGER", "SUPERVISOR", "STAFF"];
    }
    if (currentUserRole === "MANAGER") {
      return ["SUPERVISOR", "STAFF"];
    }
    if (currentUserRole === "SUPERVISOR") {
      return ["STAFF"];
    }
    return [];
  }, [currentUserRole]);

  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    role: "STAFF",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(isEditMode);

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
  const [removeAvatarRequested, setRemoveAvatarRequested] = useState(false);

  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState("");
  const [removeIdProofRequested, setRemoveIdProofRequested] = useState(false);

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

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      role: allowedRoles.includes(prev.role) ? prev.role : allowedRoles[0] ?? "STAFF",
    }));
  }, [allowedRoles]);

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
      if (avatarPreview) revokePreviewUrl(avatarPreview);
      if (idProofPreview) revokePreviewUrl(idProofPreview);
    };
  }, [avatarPreview, idProofPreview]);

  useEffect(() => {
    let active = true;

    async function loadStaffForEdit() {
      if (!isEditMode) {
        if (active) setLoadingStaff(false);
        return;
      }

      if (!accessToken) return;

      if (!staffId.trim()) {
        toast.error("Staff id missing");
        if (active) setLoadingStaff(false);
        return;
      }

      try {
        setLoadingStaff(true);

        const response = await fetch(
          `${baseURL}${SummaryApi.staff_get.url(staffId)}`,
          {
            method: SummaryApi.staff_get.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const result =
          (await response.json().catch(() => ({}))) as StaffDetailApiResponse;

        if (!response.ok || !result?.success || !result.data) {
          throw new Error(result?.message || "Failed to load staff details");
        }

        if (!active) return;

        const record = result.data;
        const address = record.address || {};
        const normalizedRole = String(record.role || "").trim().toUpperCase();
        const resolvedRole = isCreateRole(normalizedRole)
          ? normalizedRole
          : allowedRoles[0] ?? "STAFF";

        setForm({
          role: resolvedRole,
          name: String(record.name || ""),
          username: String(record.username || ""),
          email: String(record.email || ""),
          pin: "",
          mobile: String(record.mobile || ""),
          secondaryMobile: String(
            record.additionalNumber || record.secondaryMobile || ""
          ),
          state: String(address.state || record.state || ""),
          district: String(address.district || record.district || ""),
          taluk: String(address.taluk || record.taluk || ""),
          area: String(address.area || record.area || ""),
          street: String(address.street || record.street || ""),
          pincode: String(address.pincode || record.pincode || ""),
        });

        setErrors({});
        setLocationError("");
        setAvatarFile(null);
        setIdProofFile(null);
        setRemoveAvatarRequested(false);
        setRemoveIdProofRequested(false);
        setAvatarPreview(String(record.avatarUrl || record.avatar || ""));
        setIdProofPreview(String(record.idProofUrl || record.idproof || ""));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load staff details"
        );
      } finally {
        if (active) setLoadingStaff(false);
      }
    }

    void loadStaffForEdit();

    return () => {
      active = false;
    };
  }, [isEditMode, staffId, accessToken, allowedRoles]);

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
      if (avatarPreview) revokePreviewUrl(avatarPreview);
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      setRemoveAvatarRequested(false);
      return;
    }

    if (idProofPreview) revokePreviewUrl(idProofPreview);
    setIdProofFile(file);
    setIdProofPreview(previewUrl);
    setRemoveIdProofRequested(false);
  };

  const removeImage = (type: "avatar" | "idproof") => {
    if (type === "avatar") {
      if (avatarPreview) revokePreviewUrl(avatarPreview);
      setAvatarPreview("");
      setAvatarFile(null);
      setRemoveAvatarRequested(true);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    if (idProofPreview) revokePreviewUrl(idProofPreview);
    setIdProofPreview("");
    setIdProofFile(null);
    setRemoveIdProofRequested(true);
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

    if (!isEditMode) {
      if (!form.pin.trim()) {
        nextErrors.pin = "PIN is required";
      } else if (!isValidPin(form.pin)) {
        nextErrors.pin = "PIN must be 4 to 6 digits";
      }
    } else if (form.pin.trim() && !isValidPin(form.pin)) {
      nextErrors.pin = "PIN must be 4 to 6 digits";
    }

    if (!form.mobile.trim()) {
      nextErrors.mobile = "Primary mobile is required";
    } else if (!isValidIndianMobile(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit Indian mobile number";
    }

    if (
      form.secondaryMobile.trim() &&
      !isValidIndianMobile(form.secondaryMobile)
    ) {
      nextErrors.secondaryMobile = "Enter a valid 10-digit secondary mobile";
    }

    if (
      form.mobile &&
      form.secondaryMobile &&
      form.mobile === form.secondaryMobile
    ) {
      nextErrors.secondaryMobile =
        "Secondary mobile must be different from primary mobile";
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
    if (submitting || loadingStaff) return;

    if (asModal) {
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

    if (isEditMode && !staffId.trim()) {
      toast.error("Staff id missing");
      return;
    }

    if (!allowedRoles.includes(form.role)) {
      toast.error(
        isEditMode
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

      payload.append("role", form.role);
      payload.append("name", cleanName);
      payload.append("username", cleanUsername);
      payload.append("email", cleanEmail);
      payload.append("mobile", form.mobile.trim());

      if (form.pin.trim()) {
        payload.append("pin", form.pin.trim());
      }

      if (form.secondaryMobile.trim()) {
        payload.append("secondaryMobile", form.secondaryMobile.trim());
        payload.append("additionalNumber", form.secondaryMobile.trim());
      } else if (isEditMode) {
        payload.append("additionalNumber", "");
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

      if (isEditMode && removeAvatarRequested) {
        payload.append("removeAvatar", "true");
      }

      if (isEditMode && removeIdProofRequested) {
        payload.append("removeIdProof", "true");
      }

      const endpoint = isEditMode
        ? SummaryApi.staff_update.url(staffId)
        : SummaryApi.staff_create.url;

      const method = isEditMode
        ? SummaryApi.staff_update.method
        : SummaryApi.staff_create.method;

      const response = await fetch(`${baseURL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: payload,
      });

      const result =
        (await response.json().catch(() => ({}))) as CreateStaffApiResponse;

      if (!response.ok || !result?.success) {
        toast.error(
          result?.message ||
            (isEditMode
              ? "Failed to update team member"
              : "Failed to create team member")
        );
        return;
      }

      toast.success(
        isEditMode
          ? `${getRoleBadgeText(form.role)} account updated successfully`
          : `${getRoleBadgeText(form.role)} account created successfully`
      );

      if (!isEditMode) {
        setForm({
          ...INITIAL,
          role: allowedRoles[0] ?? "STAFF",
        });
        setErrors({});
        setLocationError("");
        removeImage("avatar");
        removeImage("idproof");
      }

      if (onSuccess) {
        await onSuccess();
        return;
      }

      if (asModal) {
        onClose?.();
        return;
      }

      router.replace(getRedirectPath(currentUserRole));
    } catch (error) {
      console.error(error);
      toast.error(
        isEditMode
          ? "Something went wrong while updating the account"
          : "Something went wrong while creating the account"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pageTitle = isEditMode ? "Edit Team Member" : "Create Team Member";
  const pageDescription = isEditMode
    ? "Update staff details, address information, profile avatar, and ID proof in one single form."
    : "Add a new team member with basic details, address information, profile avatar, and ID proof in one single form.";
  const footerDescription = isEditMode
    ? "Single page edit form with basic, address, avatar, and ID proof updates."
    : "Single page create form with basic, address, avatar, and ID proof.";
  const pageShellClass = asModal
    ? "max-h-[85vh] overflow-y-auto bg-slate-50 px-2.5 py-2.5 sm:px-3"
    : "page-shell";

  if (loadingStaff) {
    return (
      <div className={pageShellClass}>
        <div className="mx-auto flex min-h-[40vh] w-full max-w-5xl items-center justify-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            Loading staff details...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageShellClass}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm md:px-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Staff Management
          </span>

          <h1 className="mt-2.5 text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            {pageTitle}
          </h1>

          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
            {pageDescription}
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm md:p-4">
            <SectionHeader
              icon={<User2 className="h-5 w-5" />}
              title="Basic Information"
              description="Enter role, identity, login details, and contact information."
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FloatingSelect
                id="role"
                label="Role"
                value={form.role}
                onChange={(e) => updateField("role", e.target.value as CreateRole)}
                options={allowedRoles.map((item) => ({
                  label: getRoleBadgeText(item),
                  value: item,
                }))}
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

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                  <FloatingInput
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
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
                  >
                    Auto Generate
                  </button>
                </div>
              </div>

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
                id="pin"
                label={isEditMode ? "PIN (Optional)" : "PIN"}
                type="password"
                maxLength={6}
                value={form.pin}
                onChange={(e) =>
                  updateField("pin", digitsOnly(e.target.value).slice(0, 6))
                }
                error={errors.pin}
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
                id="secondaryMobile"
                label="Secondary Mobile"
                type="tel"
                maxLength={10}
                value={form.secondaryMobile}
                onChange={(e) =>
                  updateField(
                    "secondaryMobile",
                    digitsOnly(e.target.value).slice(0, 10)
                  )
                }
                error={errors.secondaryMobile}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm md:p-4">
            <SectionHeader
              icon={<MapPin className="h-5 w-5" />}
              title="Address Details"
              description="Search loaded address options or type your own custom values."
            />

            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              Search the dropdown or type a value to add it as a custom address option.
              {locationError ? (
                <p className="mt-1 text-xs text-slate-500">
                  Location lookup note: {locationError}
                </p>
              ) : null}
            </div>

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
                placeholder="Select or type a state"
                searchPlaceholder="Search or type a state"
                helperText="Choose from loaded states or add your own."
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
                placeholder="Select or type a district"
                searchPlaceholder="Search or type a district"
                helperText="Type a district if it is not in the loaded list."
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
                placeholder="Select or type a taluk"
                searchPlaceholder="Search or type a taluk"
                helperText="Add a custom taluk value when needed."
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
                placeholder="Select or type an area"
                searchPlaceholder="Search or type an area"
                helperText="Type a custom area if it is not listed."
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

          <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm md:p-4">
            <SectionHeader
              icon={<ImagePlus className="h-5 w-5" />}
              title="Profile & Documents"
              description="Upload optional avatar and ID proof image."
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <UploadPreviewCard
                title="Avatar"
                description="Upload a profile image for the team member."
                preview={avatarPreview}
                onUpload={(file) => handleImageChange(file, "avatar")}
                onRemove={() => removeImage("avatar")}
                inputRef={avatarInputRef}
                buttonLabel="Upload Avatar"
                emptyIcon={<ImagePlus className="h-8 w-8" />}
                previewClassName="h-32 w-full max-w-[240px] rounded-xl border border-slate-200 object-cover shadow-sm"
              />

              <UploadPreviewCard
                title="ID Proof"
                description="Upload ID proof image."
                preview={idProofPreview}
                onUpload={(file) => handleImageChange(file, "idproof")}
                onRemove={() => removeImage("idproof")}
                inputRef={idProofInputRef}
                buttonLabel="Upload ID Proof"
                emptyIcon={<UploadCloud className="h-8 w-8" />}
                previewClassName="h-32 w-full max-w-[240px] rounded-xl border border-slate-200 object-cover shadow-sm"
              />
            </div>
          </section>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {footerDescription}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || isLocationLoading || allowedRoles.length === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isEditMode ? "Update Account" : "Create Account"}
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

