"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  User2,
  ImagePlus,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import {
  removeStaffAvatarById,
  removeStaffIdProofById,
  updateStaffWithFiles,
} from "@/lib/staffApi";

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

type StaffResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    name?: string;
    username?: string;
    email?: string;
    role?: string;
    mobile?: string;
    additionalNumber?: string;
    avatarUrl?: string;
    idProofUrl?: string;
    address?: {
      state?: string;
      district?: string;
      taluk?: string;
      area?: string;
      street?: string;
      pincode?: string;
    };
  };
};

const INITIAL: FormState = {
  role: "STAFF",
  name: "",
  username: "",
  email: "",
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
            "peer h-12 w-full rounded-2xl border bg-white px-4 pt-5 text-sm text-slate-900 outline-none transition shadow-sm placeholder-transparent",
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
            "peer h-12 w-full appearance-none rounded-2xl border bg-white px-4 pt-5 text-sm text-slate-900 outline-none transition shadow-sm",
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
      </div>

      {error ? <p className="px-1 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function UploadCard({
  title,
  description,
  preview,
  onPick,
  onRemove,
  inputRef,
  fileLabel,
}: {
  title: string;
  description: string;
  preview: string;
  onPick: (file: File | null | undefined) => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  fileLabel: "avatar" | "idproof";
}) {
  const isAvatar = fileLabel === "avatar";

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <p className="mt-1 text-xs text-slate-500">{description}</p>

      <div className="mt-4 flex flex-col items-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={title}
            className={
              isAvatar
                ? "h-36 w-36 rounded-full object-cover border border-slate-200 bg-white"
                : "h-40 w-full max-w-65 rounded-2xl object-cover border border-slate-200 bg-white"
            }
          />
        ) : (
          <div className="flex h-40 w-full max-w-65 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400">
            {isAvatar ? (
              <ImagePlus className="h-8 w-8" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {preview ? "Replace" : "Upload"}
          </button>

          {preview ? (
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

export default function EditTeamMemberPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { accessToken, role } = useAuth();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

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

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [removingIdProof, setRemovingIdProof] = useState(false);

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
  const [existingAvatarUrl, setExistingAvatarUrl] = useState("");

  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState("");
  const [existingIdProofUrl, setExistingIdProofUrl] = useState("");

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
        return [];
      }

      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.results)) return data.results;
      if (Array.isArray(data)) return data;
      return [];
    } catch {
      return [];
    }
  };

  const fetchAreas = async (state: string, district: string, taluk: string) => {
    const primaryUrl = `${SummaryApi.location_villages.url}?state=${encodeURIComponent(
      state
    )}&district=${encodeURIComponent(district)}&talukName=${encodeURIComponent(
      taluk
    )}`;

    const fallbackUrl = `${SummaryApi.location_villages.url}?state=${encodeURIComponent(
      state
    )}&district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(
      taluk
    )}`;

    let data = await fetchApi(primaryUrl);

    if (!data.length) {
      data = await fetchApi(fallbackUrl);
    }

    return data;
  };

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      if (idProofPreview?.startsWith("blob:")) URL.revokeObjectURL(idProofPreview);
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
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      return;
    }

    if (idProofPreview?.startsWith("blob:")) URL.revokeObjectURL(idProofPreview);
    setIdProofFile(file);
    setIdProofPreview(previewUrl);
  };

  const handleRemoveAvatar = async () => {
    if (!accessToken || !id) {
      toast.error("Authentication or staff id missing");
      return;
    }

    if (avatarFile && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarFile(null);
      setAvatarPreview(existingAvatarUrl || "");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      toast.success("Selected avatar removed");
      return;
    }

    if (!existingAvatarUrl) {
      setAvatarPreview("");
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    try {
      setRemovingAvatar(true);
      await removeStaffAvatarById(accessToken, id);
      setAvatarFile(null);
      setAvatarPreview("");
      setExistingAvatarUrl("");
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      toast.success("Avatar removed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove avatar");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleRemoveIdProof = async () => {
    if (!accessToken || !id) {
      toast.error("Authentication or staff id missing");
      return;
    }

    if (idProofFile && idProofPreview.startsWith("blob:")) {
      URL.revokeObjectURL(idProofPreview);
      setIdProofFile(null);
      setIdProofPreview(existingIdProofUrl || "");
      if (idProofInputRef.current) idProofInputRef.current.value = "";
      toast.success("Selected ID proof removed");
      return;
    }

    if (!existingIdProofUrl) {
      setIdProofPreview("");
      setIdProofFile(null);
      if (idProofInputRef.current) idProofInputRef.current.value = "";
      return;
    }

    try {
      setRemovingIdProof(true);
      await removeStaffIdProofById(accessToken, id);
      setIdProofFile(null);
      setIdProofPreview("");
      setExistingIdProofUrl("");
      if (idProofInputRef.current) idProofInputRef.current.value = "";
      toast.success("ID proof removed successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove ID proof"
      );
    } finally {
      setRemovingIdProof(false);
    }
  };

  const validateForm = () => {
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

    if (form.secondaryMobile.trim() && !isValidIndianMobile(form.secondaryMobile)) {
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

    loadStates();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (!options.length) {
        setLocationError("No districts found for the selected state.");
      }
    }

    loadDistricts();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (!options.length) {
        setLocationError("No taluks found for the selected district.");
      }
    }

    loadTaluks();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const data = await fetchAreas(form.state, form.district, form.taluk);

      if (!active) return;

      const options = toOptions(data);
      setAreas(options);
      setLoadingAreas(false);

      if (!options.length) {
        setLocationError("No areas found for the selected taluk.");
      }
    }

    loadAreas();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state, form.district, form.taluk, accessToken]);

  useEffect(() => {
    let active = true;

    async function loadStaff() {
      if (!accessToken || !id) return;

      try {
        setPageLoading(true);

        const response = await fetch(`${baseURL}${SummaryApi.staff_get.url(id)}`, {
          method: SummaryApi.staff_get.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const result = (await response.json().catch(() => ({}))) as StaffResponse;

        if (!active) return;

        if (!response.ok || !result?.data) {
          toast.error(result?.message || "Failed to load team member");
          router.replace(getRedirectPath(currentUserRole));
          return;
        }

        const staff = result.data;
        const staffRole = String(staff.role || "STAFF").toUpperCase() as CreateRole;

        setForm({
          role: allowedRoles.includes(staffRole) ? staffRole : "STAFF",
          name: staff.name || "",
          username: staff.username || "",
          email: staff.email || "",
          mobile: staff.mobile || "",
          secondaryMobile: staff.additionalNumber || "",
          state: staff.address?.state || "",
          district: staff.address?.district || "",
          taluk: staff.address?.taluk || "",
          area: staff.address?.area || "",
          street: staff.address?.street || "",
          pincode: staff.address?.pincode || "",
        });

        setAvatarPreview(staff.avatarUrl || "");
        setExistingAvatarUrl(staff.avatarUrl || "");
        setIdProofPreview(staff.idProofUrl || "");
        setExistingIdProofUrl(staff.idProofUrl || "");
      } catch {
        toast.error("Something went wrong while loading staff details");
      } finally {
        if (active) setPageLoading(false);
      }
    }

    loadStaff();
    return () => {
      active = false;
    };
  }, [accessToken, id, router, currentUserRole, allowedRoles]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!id) {
      toast.error("Invalid staff id");
      return;
    }

    if (isLocationLoading) {
      toast.error("Please wait until location data finishes loading");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before updating");
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

      if (form.secondaryMobile.trim()) {
        payload.append("secondaryMobile", form.secondaryMobile.trim());
        payload.append("additionalNumber", form.secondaryMobile.trim());
      } else {
        payload.append("secondaryMobile", "");
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

      await updateStaffWithFiles(accessToken, id, payload);

      toast.success("Team member updated successfully");
      router.replace(getRedirectPath(currentUserRole));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-100">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading team member details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeader
              icon={<User2 className="h-5 w-5" />}
              title="Basic Information"
              description="Update role, identity, login details, and contact information."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                onChange={(e) => updateField("name", alphaSpaceOnly(e.target.value))}
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
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "")
                      .slice(0, 30)
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

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeader
              icon={<MapPin className="h-5 w-5" />}
              title="Address Details"
              description="Update mapped location details and street address."
            />

            {locationError ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {locationError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    area: "",
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    state: undefined,
                    district: undefined,
                    taluk: undefined,
                    area: undefined,
                  }));
                  resetDistrictTree();
                }}
                options={states}
                disabled={loadingStates}
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
                    area: "",
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    district: undefined,
                    taluk: undefined,
                    area: undefined,
                  }));
                  resetTalukTree();
                }}
                options={districts}
                disabled={!form.state || loadingDistricts}
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
                    area: "",
                  }));
                  setErrors((prev) => ({
                    ...prev,
                    taluk: undefined,
                    area: undefined,
                  }));
                  resetAreaTree();
                }}
                options={taluks}
                disabled={!form.district || loadingTaluks}
                error={errors.taluk}
                required
              />

              <FloatingSelect
                id="area"
                label={loadingAreas ? "Area (Loading...)" : "Area"}
                value={form.area}
                onChange={(e) => updateField("area", e.target.value)}
                options={areas}
                disabled={!form.taluk || loadingAreas}
                error={errors.area}
                required
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

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <SectionHeader
              icon={<UploadCloud className="h-5 w-5" />}
              title="Profile & Upload"
              description="Upload avatar and ID proof, or remove existing files."
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <UploadCard
                title="Profile Avatar"
                description="Upload or replace staff profile image."
                preview={avatarPreview}
                onPick={(file) => handleImageChange(file, "avatar")}
                onRemove={handleRemoveAvatar}
                inputRef={avatarInputRef}
                fileLabel="avatar"
              />

              <UploadCard
                title="ID Proof"
                description="Upload or replace staff ID proof image."
                preview={idProofPreview}
                onPick={(file) => handleImageChange(file, "idproof")}
                onRemove={handleRemoveIdProof}
                inputRef={idProofInputRef}
                fileLabel="idproof"
              />
            </div>

            {(removingAvatar || removingIdProof) && (
              <div className="mt-4 text-sm font-medium text-slate-500">
                Removing file...
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-linear-to-r from-[#082a5e] to-[#9116a1] px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Staff"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}