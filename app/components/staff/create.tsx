"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Loader2,
  MapPin,
  ShieldCheck,
  UploadCloud,
  User2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";

/* =========================
   TYPES
========================= */

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
  village: string;
  street: string;
  pincode: string;
};

type StepKey = "basic" | "address" | "profile";

type FieldErrors = Partial<Record<keyof FormState, string>>;

/* =========================
   CONSTANTS
========================= */

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
  village: "",
  street: "",
  pincode: "",
};

const STEPS: { key: StepKey; title: string; description: string }[] = [
  {
    key: "basic",
    title: "Basic Information",
    description: "Role, identity, login and contact details",
  },
  {
    key: "address",
    title: "Address Details",
    description: "Location mapping and address information",
  },
  {
    key: "profile",
    title: "Profile & Upload",
    description: "Avatar preview and final submission",
  },
];

/* =========================
   HELPERS
========================= */

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
  if (value === "MASTER_ADMIN") return "Master Admin";
  if (value === "MANAGER") return "Manager";
  if (value === "SUPERVISOR") return "Supervisor";
  if (value === "STAFF") return "Staff";
  return "Unknown";
}

function toOptions(arr: string[]) {
  return (arr || [])
    .filter(Boolean)
    .map((item) => ({
      label: item,
      value: item,
    }));
}

/* =========================
   SMALL UI PARTS
========================= */

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Stepper({
  steps,
  current,
}: {
  steps: typeof STEPS;
  current: number;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const active = index === current;
          const done = index < current;

          return (
            <div
              key={step.key}
              className={classNames(
                "relative rounded-2xl border p-4 transition-all",
                done
                  ? "border-emerald-200 bg-emerald-50"
                  : active
                  ? "border-violet-200 bg-violet-50 shadow-sm"
                  : "border-slate-200 bg-slate-50"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={classNames(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    done
                      ? "bg-emerald-600 text-white"
                      : active
                      ? "bg-violet-700 text-white"
                      : "bg-slate-200 text-slate-700"
                  )}
                >
                  {done ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900">
                    {step.title}
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
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
            "peer h-[48px] w-full rounded-2xl border bg-white px-4 pt-5 text-sm text-slate-900 outline-none transition",
            "placeholder-transparent shadow-sm",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-violet-600",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
          )}
        />
        <label
          htmlFor={id}
          className={classNames(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm transition-all",
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
            "peer h-[48px] w-full appearance-none rounded-2xl border bg-white px-4 pt-5 text-sm text-slate-900 outline-none transition shadow-sm",
            error
              ? "border-rose-300 focus:border-rose-500"
              : "border-slate-200 focus:border-violet-600",
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
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm transition-all",
            "peer-focus:top-0 peer-focus:text-[11px]",
            value ? "top-0 text-[11px]" : "",
            error ? "text-rose-500" : "text-slate-500"
          )}
        >
          {label} {required ? "*" : ""}
        </label>

        <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
      </div>
      {error ? <p className="px-1 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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

/* =========================
   COMPONENT
========================= */

export default function CreateStaffPage() {
  const { accessToken, role } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    role: allowedRoles[0] ?? "STAFF",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [taluks, setTaluks] = useState<Option[]>([]);
  const [villages, setVillages] = useState<Option[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTaluks, setLoadingTaluks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  /* =========================
     CORE HELPERS
  ========================= */

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const fetchApi = async (url: string) => {
    try {
      const response = await fetch(`${baseURL}${url}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (Array.isArray(data?.data)) {
        return data.data;
      }

      return [];
    } catch (error) {
      console.error("Location API error:", error);
      return [];
    }
  };

  /* =========================
     LOCATION LOAD
  ========================= */

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      role: allowedRoles.includes(prev.role) ? prev.role : allowedRoles[0] ?? "STAFF",
    }));
  }, [allowedRoles]);

  useEffect(() => {
    let active = true;

    const loadStates = async () => {
      setLoadingStates(true);
      const data = await fetchApi(SummaryApi.locations_states.url);

      if (!active) return;

      setStates(toOptions(data));
      setLoadingStates(false);
    };

    loadStates();

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state) {
      setDistricts([]);
      setTaluks([]);
      setVillages([]);
      setForm((prev) => ({
        ...prev,
        district: "",
        taluk: "",
        village: "",
      }));
      return;
    }

    const loadDistricts = async () => {
      setLoadingDistricts(true);

      const data = await fetchApi(
        `${SummaryApi.locations_districts.url}?state=${encodeURIComponent(form.state)}`
      );

      if (!active) return;

      setDistricts(toOptions(data));
      setTaluks([]);
      setVillages([]);
      setLoadingDistricts(false);
    };

    loadDistricts();

    return () => {
      active = false;
    };
  }, [form.state, accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state || !form.district) {
      setTaluks([]);
      setVillages([]);
      setForm((prev) => ({
        ...prev,
        taluk: "",
        village: "",
      }));
      return;
    }

    const loadTaluks = async () => {
      setLoadingTaluks(true);

      const data = await fetchApi(
        `${SummaryApi.locations_taluks.url}?state=${encodeURIComponent(
          form.state
        )}&district=${encodeURIComponent(form.district)}`
      );

      if (!active) return;

      setTaluks(toOptions(data));
      setVillages([]);
      setLoadingTaluks(false);
    };

    loadTaluks();

    return () => {
      active = false;
    };
  }, [form.state, form.district, accessToken]);

  useEffect(() => {
    let active = true;

    if (!form.state || !form.district || !form.taluk) {
      setVillages([]);
      setForm((prev) => ({
        ...prev,
        village: "",
      }));
      return;
    }

    const loadVillages = async () => {
      setLoadingVillages(true);

      const data = await fetchApi(
        `${SummaryApi.locations_villages.url}?state=${encodeURIComponent(
          form.state
        )}&district=${encodeURIComponent(
          form.district
        )}&talukName=${encodeURIComponent(form.taluk)}`
      );

      if (!active) return;

      setVillages(toOptions(data));
      setLoadingVillages(false);
    };

    loadVillages();

    return () => {
      active = false;
    };
  }, [form.state, form.district, form.taluk, accessToken]);

  /* =========================
     AVATAR
  ========================= */

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarChange = (file?: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Avatar image must be below 2MB");
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const preview = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(preview);
    toast.success("Avatar selected successfully");
  };

  const removeAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Avatar removed");
  };

  /* =========================
     VALIDATION
  ========================= */

  const validateBasic = () => {
    const nextErrors: FieldErrors = {};

    if (!form.role) nextErrors.role = "Role is required";

    if (!form.name.trim()) nextErrors.name = "Full name is required";
    if (form.name.trim() && form.name.trim().length < 3) {
      nextErrors.name = "Enter at least 3 characters";
    }

    if (!form.username.trim()) nextErrors.username = "Username is required";
    if (form.username.trim() && form.username.trim().length < 4) {
      nextErrors.username = "Username must be at least 4 characters";
    }

    if (!form.email.trim()) nextErrors.email = "Gmail address is required";
    else if (!isValidGmail(form.email)) {
      nextErrors.email = "Enter a valid Gmail address";
    }

    if (!form.pin.trim()) nextErrors.pin = "PIN is required";
    else if (!isValidPin(form.pin)) {
      nextErrors.pin = "PIN must be 4 to 6 digits";
    }

    if (!form.mobile.trim()) nextErrors.mobile = "Mobile number is required";
    else if (!isValidIndianMobile(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number";
    }

    if (
      form.secondaryMobile.trim() &&
      !isValidIndianMobile(form.secondaryMobile)
    ) {
      nextErrors.secondaryMobile = "Enter a valid optional mobile number";
    }

    if (
      form.secondaryMobile.trim() &&
      form.secondaryMobile.trim() === form.mobile.trim()
    ) {
      nextErrors.secondaryMobile =
        "Primary and optional mobile numbers must be different";
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateAddress = () => {
    const nextErrors: FieldErrors = {};

    if (!form.state.trim()) nextErrors.state = "State is required";
    if (!form.district.trim()) nextErrors.district = "District is required";
    if (!form.taluk.trim()) nextErrors.taluk = "Taluk is required";
    if (!form.village.trim()) nextErrors.village = "Village is required";
    if (!form.street.trim()) nextErrors.street = "Street is required";

    if (!form.pincode.trim()) nextErrors.pincode = "Pincode is required";
    else if (!isValidPincode(form.pincode)) {
      nextErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = () => {
    const basicOk = validateBasic();
    const addressOk = validateAddress();
    return basicOk && addressOk;
  };

  /* =========================
     STEP ACTIONS
  ========================= */

  const handleNext = () => {
    if (stepIndex === 0) {
      if (!validateBasic()) {
        toast.error("Please fix the basic information fields");
        return;
      }
    }

    if (stepIndex === 1) {
      if (!validateAddress()) {
        toast.error("Please complete the address details");
        return;
      }
    }

    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateAll()) {
      toast.error("Please correct the required fields before submitting");
      return;
    }

    try {
      setSubmitting(true);

      const endpoint =
        form.role === "MANAGER"
          ? SummaryApi.master_create_subadmin.url
          : form.role === "SUPERVISOR"
          ? SummaryApi.supervisor_create.url
          : SummaryApi.staff_create.url;

      const payload = {
        role: form.role,
        name: toTitleCase(form.name),
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        pin: form.pin,
        mobile: form.mobile,
        secondaryMobile: form.secondaryMobile || undefined,

        state: form.state,
        district: form.district,
        taluk: form.taluk,
        village: form.village,
        street: form.street.trim(),
        pincode: form.pincode,

        address: {
          state: form.state,
          district: form.district,
          city: form.taluk,
          area: form.village,
          street: form.street.trim(),
          pincode: form.pincode,
        },
      };

      let response: Response;

      if (avatarFile) {
        const formData = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
          if (key === "address") {
            formData.append("address", JSON.stringify(value));
          } else if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });

        formData.append("avatar", avatarFile);

        response = await fetch(`${baseURL}${endpoint}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });
      } else {
        response = await fetch(`${baseURL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok || !data?.success) {
        toast.error(data?.message || "Failed to create staff account");
        return;
      }

      toast.success(`${form.role} account created successfully`);

      setForm({
        ...INITIAL,
        role: allowedRoles[0] ?? "STAFF",
      });
      setErrors({});
      setStepIndex(0);
      removeAvatar();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while creating the account");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     RENDER STEP
  ========================= */

  const renderCurrentStep = () => {
    if (stepIndex === 0) {
      return (
        <section className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-5 shadow-sm md:p-6">
          <SectionHeader
            icon={<User2 className="h-5 w-5" />}
            title="Basic Information"
            description="Enter role, identity, Gmail, PIN, and contact details."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FloatingSelect
              id="role"
              label="Create Role"
              value={form.role}
              onChange={(e) =>
                updateField("role", e.target.value as CreateRole)
              }
              options={allowedRoles.map((roleItem) => ({
                label: roleItem,
                value: roleItem,
              }))}
              error={errors.role}
              required
            />

            <FloatingInput
              id="name"
              label="Full Name"
              value={form.name}
              onChange={(e) => {
                const nextName = alphaSpaceOnly(e.target.value);
                updateField("name", nextName);

                if (!form.username.trim()) {
                  const autoUsername = createUsernameFromName(nextName);
                  if (autoUsername) {
                    setForm((prev) => ({ ...prev, username: autoUsername }));
                  }
                }
              }}
              error={errors.name}
              required
            />

            <FloatingInput
              id="username"
              label="Username"
              value={form.username}
              onChange={(e) =>
                updateField(
                  "username",
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                )
              }
              error={errors.username}
              required
            />

            <FloatingInput
              id="email"
              label="Gmail Address"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value.trim())}
              error={errors.email}
              required
            />

            <FloatingInput
              id="pin"
              label="PIN"
              type="password"
              maxLength={6}
              value={form.pin}
              onChange={(e) => updateField("pin", digitsOnly(e.target.value))}
              error={errors.pin}
              required
            />

            <FloatingInput
              id="mobile"
              label="Mobile Number"
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
              label="Optional Mobile Number"
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
      );
    }

    if (stepIndex === 1) {
      return (
        <section className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-5 shadow-sm md:p-6">
          <SectionHeader
            icon={<MapPin className="h-5 w-5" />}
            title="Address Details"
            description="Location mapping and address information"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FloatingSelect
              id="state"
              label={loadingStates ? "State (Loading...)" : "State"}
              value={form.state}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  state: value,
                  district: "",
                  taluk: "",
                  village: "",
                }));
                setErrors((prev) => ({
                  ...prev,
                  state: undefined,
                  district: undefined,
                  taluk: undefined,
                  village: undefined,
                }));
              }}
              options={states}
              error={errors.state}
              required
            />

            <FloatingSelect
              id="district"
              label={loadingDistricts ? "District (Loading...)" : "District"}
              value={form.district}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  district: value,
                  taluk: "",
                  village: "",
                }));
                setErrors((prev) => ({
                  ...prev,
                  district: undefined,
                  taluk: undefined,
                  village: undefined,
                }));
              }}
              options={districts}
              disabled={!form.state}
              error={errors.district}
              required
            />

            <FloatingSelect
              id="taluk"
              label={loadingTaluks ? "Taluk (Loading...)" : "Taluk"}
              value={form.taluk}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  taluk: value,
                  village: "",
                }));
                setErrors((prev) => ({
                  ...prev,
                  taluk: undefined,
                  village: undefined,
                }));
              }}
              options={taluks}
              disabled={!form.district}
              error={errors.taluk}
              required
            />

            <FloatingSelect
              id="village"
              label={loadingVillages ? "Village (Loading...)" : "Village"}
              value={form.village}
              onChange={(e) => updateField("village", e.target.value)}
              options={villages}
              disabled={!form.taluk}
              error={errors.village}
              required
            />

            <FloatingInput
              id="street"
              label="Street / Door No"
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
      );
    }

    return (
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-5 shadow-sm md:p-6">
        <SectionHeader
          icon={<UploadCloud className="h-5 w-5" />}
          title="Profile & Upload"
          description="Upload avatar preview and review before final submission."
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar Preview"
                    className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <ImagePlus className="h-8 w-8" />
                  </div>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-900">
                Profile Avatar
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                JPG, PNG, WEBP up to 2MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
              />

              <div className="mt-4 flex w-full flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload Avatar
                </button>

                {avatarFile ? (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Remove Avatar
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-emerald-700">
              <BadgeCheck className="h-5 w-5" />
              <h4 className="text-sm font-bold text-slate-900">
                Final Review
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ReviewItem label="Role" value={form.role} />
              <ReviewItem label="Full Name" value={toTitleCase(form.name)} />
              <ReviewItem label="Username" value={form.username} />
              <ReviewItem label="Gmail" value={form.email} />
              <ReviewItem label="Mobile" value={form.mobile} />
              <ReviewItem
                label="Optional Mobile"
                value={form.secondaryMobile || "-"}
              />
              <ReviewItem label="State" value={form.state} />
              <ReviewItem label="District" value={form.district} />
              <ReviewItem label="Taluk" value={form.taluk} />
              <ReviewItem label="Village" value={form.village} />
              <ReviewItem label="Street" value={form.street} />
              <ReviewItem label="Pincode" value={form.pincode} />
            </div>

            <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
              Account will be created using your selected role permissions and
              mapped address data.
            </div>
          </div>
        </div>
      </section>
    );
  };