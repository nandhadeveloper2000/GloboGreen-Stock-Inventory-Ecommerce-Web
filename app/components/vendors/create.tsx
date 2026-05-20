/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type VendorStatus = "ACTIVE" | "INACTIVE";

type Option = {
  label: string;
  value: string;
};

type VendorAddress = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type VendorRecord = {
  _id: string;
  shopId?: string | { _id?: string; id?: string; $oid?: string };
  code?: string;
  vendorName?: string;
  vendorKey?: string;
  contactPerson?: string;
  email?: string;
  mobile?: string;
  gstNumber?: string;
  gstState?: string;
  state?: string;
  address?: VendorAddress | string;
  notes?: string;
  status?: VendorStatus;
  createdAt?: string;
  updatedAt?: string;
};

type VendorFormState = {
  code: string;
  vendorName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  gstNumber: string;
  gstState: string;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
  notes: string;
  status: VendorStatus;
};

type FieldErrors = Partial<Record<keyof VendorFormState, string>>;

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: VendorRecord;
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

const INITIAL_FORM: VendorFormState = {
  code: "",
  vendorName: "",
  contactPerson: "",
  email: "",
  mobile: "",
  gstNumber: "",
  gstState: "",
  state: "",
  district: "",
  taluk: "",
  area: "",
  street: "",
  pincode: "",
  notes: "",
  status: "ACTIVE",
};

const GST_STATE_OPTIONS: Option[] = [
  "01 - Jammu & Kashmir",
  "02 - Himachal Pradesh",
  "03 - Punjab",
  "04 - Chandigarh (UT)",
  "05 - Uttarakhand",
  "06 - Haryana",
  "07 - Delhi (UT)",
  "08 - Rajasthan",
  "09 - Uttar Pradesh",
  "10 - Bihar",
  "11 - Sikkim",
  "12 - Arunachal Pradesh",
  "13 - Nagaland",
  "14 - Manipur",
  "15 - Mizoram",
  "16 - Tripura",
  "17 - Meghalaya",
  "18 - Assam",
  "19 - West Bengal",
  "20 - Jharkhand",
  "21 - Odisha",
  "22 - Chhattisgarh",
  "23 - Madhya Pradesh",
  "24 - Gujarat",
  "26 - Dadra & Nagar Haveli and Daman & Diu (UT)",
  "27 - Maharashtra",
  "28 - Andhra Pradesh",
  "29 - Karnataka",
  "30 - Goa",
  "31 - Lakshadweep (UT)",
  "32 - Kerala",
  "33 - Tamil Nadu",
  "34 - Puducherry (UT)",
  "35 - Andaman & Nicobar Islands (UT)",
  "36 - Telangana",
  "37 - Andhra Pradesh (New)",
  "38 - Ladakh (UT)",
].map((item) => ({ label: item, value: item }));

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCodeInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 15);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  return /^\d{7,15}$/.test(value.trim());
}

function isValidPincode(value: string) {
  return /^\d{6}$/.test(value.trim());
}

function getId(value?: string | { _id?: string; id?: string; $oid?: string }) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || value.$oid || "");
}

function readSelectedShop() {
  if (typeof window === "undefined") return { id: "", name: "" };

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
  };
}

function buildVendorCode(name: string) {
  const prefix =
    normalizeText(name)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "VENDOR";

  return `${prefix}-${Date.now().toString().slice(-6)}`.slice(0, 24);
}

function appendOption(options: Option[], rawValue: string) {
  const value = normalizeText(rawValue);
  if (!value) return options;

  const exists = options.some(
    (option) => option.value.trim().toLowerCase() === value.toLowerCase()
  );

  return exists ? options : [...options, { label: value, value }];
}

function toOptions(arr: unknown): Option[] {
  if (!Array.isArray(arr)) return [];

  return arr
    .map((item) => {
      if (typeof item === "string") return { label: item, value: item };

      if (!item || typeof item !== "object") return null;

      const obj = item as Record<string, unknown>;

      const value =
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

      return value ? { label: value, value } : null;
    })
    .filter(Boolean) as Option[];
}

function getAddressObject(record?: VendorRecord | null): VendorAddress {
  const source = record?.address;

  if (source && typeof source === "object") return source;

  return {
    state: String(record?.state || ""),
    district: "",
    taluk: "",
    area: "",
    street: typeof source === "string" ? source : "",
    pincode: "",
  };
}

function buildAddressPayload(form: VendorFormState) {
  return {
    state: form.state.trim(),
    district: form.district.trim(),
    taluk: form.taluk.trim(),
    area: form.area.trim(),
    street: form.street.trim(),
    pincode: form.pincode.trim(),
  };
}

function buildForm(record?: VendorRecord | null): VendorFormState {
  const address = getAddressObject(record);

  return {
    code: String(record?.code || ""),
    vendorName: String(record?.vendorName || ""),
    contactPerson: String(record?.contactPerson || ""),
    email: String(record?.email || ""),
    mobile: String(record?.mobile || ""),
    gstNumber: String(record?.gstNumber || ""),
    gstState: String(record?.gstState || ""),
    state: String(address.state || ""),
    district: String(address.district || ""),
    taluk: String(address.taluk || ""),
    area: String(address.area || ""),
    street: String(address.street || ""),
    pincode: String(address.pincode || ""),
    notes: String(record?.notes || ""),
    status: record?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
}

const labelClass =
  "text-[10px] font-black uppercase tracking-[0.08em] text-slate-600";

const inputClass =
  "h-10 w-full rounded-xl border bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400";

const focusClass =
  "border-slate-200 focus:border-[#00008B] focus:ring-2 focus:ring-blue-50";

const errorClass =
  "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100";

function FieldError({ error }: { error?: string }) {
  if (!error) return null;

  return <p className="px-1 text-[10px] font-semibold text-rose-600">{error}</p>;
}

function InputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  disabled,
  maxLength,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          inputClass,
          error ? errorClass : focusClass,
          disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
        )}
      />

      <FieldError error={error} />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>

      <textarea
        id={id}
        rows={5}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full resize-none rounded-xl border bg-white px-3 py-2 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400",
          error ? errorClass : focusClass
        )}
      />

      <FieldError error={error} />
    </div>
  );
}

function StatusSwitch({
  value,
  onChange,
}: {
  value: VendorStatus;
  onChange: (value: VendorStatus) => void;
}) {
  const active = value === "ACTIVE";

  return (
    <div className="space-y-1">
      <p className={labelClass}>Status</p>

      <button
        type="button"
        onClick={() => onChange(active ? "INACTIVE" : "ACTIVE")}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border px-3 text-[13px] font-black transition",
          active
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-500"
        )}
      >
        <span>{active ? "Active" : "Inactive"}</span>

        <span
          className={cn(
            "relative h-5 w-9 rounded-full transition",
            active ? "bg-emerald-500" : "bg-slate-300"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
              active ? "left-4" : "left-0.5"
            )}
          />
        </span>
      </button>
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
    return options.find((option) => option.value === value)?.label || value;
  }, [options, value]);

  const normalizedQuery = normalizeText(query);
  const loweredQuery = normalizedQuery.toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!loweredQuery) return options;

    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(loweredQuery)
    );
  }, [options, loweredQuery]);

  const canCreate =
    allowCustom &&
    Boolean(normalizedQuery) &&
    !options.some((option) => {
      const labelValue = option.label.trim().toLowerCase();
      const optionValue = option.value.trim().toLowerCase();
      return labelValue === loweredQuery || optionValue === loweredQuery;
    });

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  function handleSelect(nextValue: string) {
    onChange(normalizeText(nextValue));
    closeDropdown();
  }

  function handleCreate() {
    if (!canCreate) return;
    onCreateOption?.(normalizedQuery);
    handleSelect(normalizedQuery);
  }

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="space-y-1">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>

      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={cn(
            "relative flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-[13px] font-semibold outline-none transition",
            error
              ? "border-rose-300 ring-2 ring-rose-50"
              : open
                ? "border-[#00008B] ring-2 ring-blue-50"
                : "border-slate-200 hover:border-slate-300",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        >
          <span
            className={cn(
              "block min-w-0 truncate pr-6",
              value ? "text-slate-900" : "text-slate-400"
            )}
          >
            {selectedLabel || placeholder || `Select ${label}`}
          </span>

          <ChevronsUpDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") closeDropdown();

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
                    (allowCustom ? "Search or type new value" : "Search")
                  }
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-900 outline-none focus:border-[#00008B] focus:bg-white"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto p-1.5">
              {canCreate ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-bold text-[#00008B] transition hover:bg-blue-50"
                >
                  <Plus className="h-3.5 w-3.5" />
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
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition",
                        selected
                          ? "bg-blue-50 font-bold text-[#00008B]"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {selected ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>
                  );
                })
              ) : canCreate ? null : (
                <p className="px-3 py-3 text-[13px] text-slate-500">
                  No matching options found.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <FieldError error={error} />
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#00008B] ring-1 ring-blue-100">
          {icon}
        </div>

        <h2 className="text-[15px] font-black text-slate-950">{title}</h2>
      </div>

      {children}
    </section>
  );
}

export function VendorForm({
  mode,
  vendorId,
  embedded = false,
  shopId: propShopId = "",
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  vendorId?: string;
  embedded?: boolean;
  shopId?: string;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { accessToken } = useAuth();

  const isEditMode = mode === "edit";

  const [selectedShopId, setSelectedShopId] = useState(propShopId);
  const [selectedShopName, setSelectedShopName] = useState("");
  const [shopReady, setShopReady] = useState(false);

  const [form, setForm] = useState<VendorFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState("");
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

  const isLocationLoading =
    loadingStates || loadingDistricts || loadingTaluks || loadingAreas;

  function updateField<K extends keyof VendorFormState>(
    key: K,
    value: VendorFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function resetDistrictTree() {
    setDistricts([]);
    setTaluks([]);
    setAreas([]);
  }

  function resetTalukTree() {
    setTaluks([]);
    setAreas([]);
  }

  function resetAreaTree() {
    setAreas([]);
  }

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
    if (propShopId) {
      setSelectedShopId(propShopId);
      setShopReady(true);
      return;
    }

    function syncSelectedShop() {
      const shop = readSelectedShop();

      setSelectedShopId(shop.id);
      setSelectedShopName(shop.name);
      setShopReady(true);
    }

    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [propShopId]);

  useEffect(() => {
    async function fetchVendor() {
      if (!isEditMode) return;

      if (!vendorId) {
        setLoadError("Vendor id is missing.");
        setLoading(false);
        return;
      }

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const endpoint = SummaryApi.vendors.getById(vendorId);

        const response = await fetch(`${baseURL}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const result = (await response.json().catch(() => ({}))) as ApiResponse;

        if (!response.ok || !result?.data) {
          const message = result?.message || "Failed to load vendor details";
          toast.error(message);
          setLoadError(message);
          return;
        }

        setForm(buildForm(result.data));
        setLoadError("");

        const recordShopId = getId(result.data.shopId);
        if (!selectedShopId && recordShopId) setSelectedShopId(recordShopId);
      } catch (error) {
        console.error(error);
        setLoadError("Unable to load vendor details");
        toast.error("Unable to load vendor details");
      } finally {
        setLoading(false);
      }
    }

    void fetchVendor();
  }, [accessToken, isEditMode, selectedShopId, vendorId]);

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

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!normalizeCodeInput(form.code)) {
      nextErrors.code = "Vendor code is required";
    }

    if (!normalizeText(form.vendorName)) {
      nextErrors.vendorName = "Vendor company name is required";
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (form.mobile.trim() && !isValidPhone(form.mobile)) {
      nextErrors.mobile = "Mobile number should contain 7 to 15 digits";
    }

    if (form.gstNumber.trim() && !form.gstState.trim()) {
      nextErrors.gstState = "GST state is required when GST number is entered";
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
  }

  function handleGenerateCode() {
    updateField("code", buildVendorCode(form.vendorName || "Vendor"));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLocationLoading) {
      toast.error("Please wait until location data finishes loading");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the highlighted vendor fields");
      return;
    }

    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    if (!isEditMode && !selectedShopId) {
      toast.error("Select a shop first");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...(isEditMode ? {} : { shopId: selectedShopId }),
        code: normalizeCodeInput(form.code),
        vendorName: normalizeText(form.vendorName),
        contactPerson: normalizeText(form.contactPerson),
        email: form.email.trim().toLowerCase(),
        mobile: digitsOnly(form.mobile),
        gstNumber: normalizeText(form.gstNumber).toUpperCase(),
        gstState: normalizeText(form.gstState),
        address: buildAddressPayload(form),
        notes: form.notes.trim(),
        status: form.status,
      };

      const endpoint = isEditMode
        ? SummaryApi.vendors.update(String(vendorId))
        : SummaryApi.vendors.create;

      const response = await fetch(`${baseURL}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        toast.error(result?.message || "Failed to save vendor");
        return;
      }

      toast.success(
        result?.message ||
          (isEditMode
            ? "Vendor updated successfully"
            : "Vendor created successfully")
      );

      if (embedded) {
        await onSuccess?.();
        onClose?.();
      } else {
        router.replace("/shopowner/vendors/list");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to save vendor right now");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-80 w-full items-center justify-center bg-white">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-100 border-t-[#00008B]">
            <Loader2 className="h-6 w-6 animate-spin text-[#00008B]" />
          </div>

          <p className="mt-4 text-center text-sm font-bold text-slate-500">
            Loading vendor details...
          </p>
        </div>
      </div>
    );
  }

  if (!isEditMode && shopReady && !selectedShopId) {
    return (
      <div className="w-full bg-white p-5">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#00008B]">
            <Store className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-xl font-black text-slate-900">
            Select a shop before creating a vendor
          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Vendors are stored shop-wise. Pick the active shop from the
            dashboard switcher first, then return here.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/shopowner/shopprofile/list"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Go to Shop List
            </Link>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("storage"))}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008B] px-4 text-[13px] font-bold text-white transition hover:bg-[#00006f]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recheck Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEditMode && loadError) {
    return (
      <div className="w-full bg-white p-5">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#00008B]">
            <Store className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-xl font-black text-slate-900">
            Vendor details could not be loaded
          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            {loadError}
          </p>

          <Link
            href="/shopowner/vendors/list"
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Vendor List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      <form
        onSubmit={handleSubmit}
        className={embedded ? "flex flex-col bg-white" : "flex max-h-[calc(100vh-155px)] min-h-0 flex-col overflow-hidden bg-white"}
      >
        <div className={embedded ? "px-4 py-4 md:px-5" : "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5"}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_292px]">
            <div className="space-y-4">
              <SectionCard
                icon={<Building2 className="h-4 w-4" />}
                title="Basic Information"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <InputField
                      id="code"
                      label="Vendor Code"
                      value={form.code}
                      onChange={(value) =>
                        updateField("code", normalizeCodeInput(value))
                      }
                      placeholder="Example: VEND-1001"
                      error={errors.code}
                      required
                    />
                  </div>

                  <div className="md:col-span-3">
                    <div className="space-y-1">
                      <p className={labelClass}>Generate</p>
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#00008B] px-3 text-[13px] font-black text-white transition hover:bg-[#00006f]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Code
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <InputField
                      id="vendorName"
                      label="Vendor Company"
                      value={form.vendorName}
                      onChange={(value) => updateField("vendorName", value)}
                      placeholder="Enter vendor company"
                      error={errors.vendorName}
                      required
                    />
                  </div>

                  <div className="md:col-span-6">
                    <InputField
                      id="contactPerson"
                      label="Contact Person"
                      value={form.contactPerson}
                      onChange={(value) => updateField("contactPerson", value)}
                      placeholder="Primary person"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <InputField
                      id="email"
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(value) => updateField("email", value)}
                      placeholder="vendor@example.com"
                      error={errors.email}
                    />
                  </div>

                  <div className="md:col-span-6">
                    <InputField
                      id="mobile"
                      label="Mobile"
                      value={form.mobile}
                      onChange={(value) =>
                        updateField("mobile", digitsOnly(value))
                      }
                      placeholder="Contact number"
                      error={errors.mobile}
                    />
                  </div>

                  <div className="md:col-span-6">
                    <InputField
                      id="gstNumber"
                      label="GST Number"
                      value={form.gstNumber}
                      onChange={(value) =>
                        updateField("gstNumber", value.toUpperCase())
                      }
                      placeholder="Optional GST"
                      error={errors.gstNumber}
                    />
                  </div>

                  <div className="md:col-span-6">
                    <SearchableSelect
                      id="gstState"
                      label="State (GST)"
                      value={form.gstState}
                      onChange={(value) => updateField("gstState", value)}
                      options={GST_STATE_OPTIONS}
                      error={errors.gstState}
                      placeholder="Select GST state"
                      searchPlaceholder="Search GST"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                icon={<MapPin className="h-4 w-4" />}
                title="Address Details"
              >
                {locationError ? (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">
                    {locationError}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-6">
                    <SearchableSelect
                      id="state"
                      label={loadingStates ? "State loading..." : "State"}
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
                      placeholder="Select / type state"
                      searchPlaceholder="Search state"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <SearchableSelect
                      id="district"
                      label={
                        loadingDistricts ? "District loading..." : "District"
                      }
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
                      placeholder="Select / type district"
                      searchPlaceholder="Search district"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <SearchableSelect
                      id="taluk"
                      label={loadingTaluks ? "Taluk loading..." : "Taluk"}
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
                      placeholder="Select / type taluk"
                      searchPlaceholder="Search taluk"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <SearchableSelect
                      id="area"
                      label={loadingAreas ? "Area loading..." : "Area"}
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
                      placeholder="Select / type area"
                      searchPlaceholder="Search area"
                    />
                  </div>

                  <div className="md:col-span-8">
                    <InputField
                      id="street"
                      label="Street"
                      value={form.street}
                      onChange={(value) => updateField("street", value)}
                      placeholder="Door no, street, landmark"
                      error={errors.street}
                      required
                    />
                  </div>

                  <div className="md:col-span-4">
                    <InputField
                      id="pincode"
                      label="Pincode"
                      value={form.pincode}
                      onChange={(value) =>
                        updateField("pincode", digitsOnly(value).slice(0, 6))
                      }
                      placeholder="608001"
                      error={errors.pincode}
                      required
                    />
                  </div>
                </div>
              </SectionCard>
            </div>

            <aside className="space-y-4">
              <SectionCard
                icon={<Store className="h-4 w-4" />}
                title="Shop & Status"
              >
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className={labelClass}>Selected Shop</p>
                    <p className="mt-1 truncate text-[13px] font-black text-slate-900">
                      {selectedShopName || "Current shop"}
                    </p>
                  </div>

                  <StatusSwitch
                    value={form.status}
                    onChange={(value) => updateField("status", value)}
                  />

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-[12px] font-black text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready to save
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                title="Vendor Preview"
              >
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className={labelClass}>Code</p>
                    <p className="mt-1 truncate text-[13px] font-black text-slate-900">
                      {form.code || "Auto / Manual"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className={labelClass}>Company</p>
                    <p className="mt-1 truncate text-[13px] font-black text-slate-900">
                      {form.vendorName || "Vendor company"}
                    </p>
                  </div>

                  <TextAreaField
                    id="notes"
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Payment terms, follow-up notes, internal reference..."
                  />
                </div>
              </SectionCard>
            </aside>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 md:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-black text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Save vendor details for selected shop.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => embedded ? onClose?.() : router.push("/shopowner/vendors/list")}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 text-[12px] font-black text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  isLocationLoading ||
                  (!isEditMode && !selectedShopId)
                }
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#00008B] px-5 text-[12px] font-black text-white shadow-[0_8px_20px_rgba(0,0,139,0.20)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {isEditMode ? "Update Vendor" : "Create Vendor"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CreateVendorPage({
  embedded,
  selectedShopId,
  onClose,
  onSuccess,
}: {
  embedded?: boolean;
  selectedShopId?: string;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
} = {}) {
  return (
    <VendorForm
      mode="create"
      embedded={embedded}
      shopId={selectedShopId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}