/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  Camera,
  Check,
  ChevronsUpDown,
  FileBadge,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth/AuthProvider";
import type { UserRole } from "@/constants/navigation";
import apiClient from "@/lib/api-client";

type ShopControl = "ALL_IN_ONE_ECOMMERCE" | "INVENTORY_ONLY" | "";

type ProfileForm = {
  name: string;
  username: string;
  email: string;
  mobile: string;
  additionalNumber: string;
  shopControl: ShopControl;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
};

type FieldErrors = Partial<Record<keyof ProfileForm, string>>;

type StaticApiRoute = {
  method: string;
  url: string;
};

type DynamicApiRoute = {
  method: string;
  url: (key: string) => string;
};

type ApiRoute = StaticApiRoute | DynamicApiRoute;

type ProfileApiConfig = {
  me: StaticApiRoute | null;
  update: StaticApiRoute | null;
  avatarUpload: StaticApiRoute | null;
  avatarRemove: StaticApiRoute | null;
  idProofUpload: ApiRoute | null;
  idProofRemove: ApiRoute | null;
};

type Option = {
  label: string;
  value: string;
};

const SHOP_CONTROL_OPTIONS: Option[] = [
  {
    label: "All in One Ecommerce",
    value: "ALL_IN_ONE_ECOMMERCE",
  },
  {
    label: "Inventory Only",
    value: "INVENTORY_ONLY",
  },
];

function getShopControlLabel(value?: string | null) {
  switch (value) {
    case "ALL_IN_ONE_ECOMMERCE":
      return "All in One Ecommerce";
    case "INVENTORY_ONLY":
      return "Inventory Only";
    default:
      return "Select shop control";
  }
}

function normalizeRole(role?: string | null): UserRole | "" {
  return String(role || "").trim().toUpperCase() as UserRole | "";
}

function getRoleLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "MASTER_ADMIN":
      return "Master Admin";
    case "MANAGER":
      return "Manager";
    case "SUPERVISOR":
      return "Supervisor";
    case "STAFF":
      return "Staff";
    case "SHOP_OWNER":
      return "Shop Owner";
    case "SHOP_MANAGER":
      return "Shop Manager";
    case "SHOP_SUPERVISOR":
      return "Shop Supervisor";
    case "EMPLOYEE":
      return "Employee";
    default:
      return "User";
  }
}

function getDashboardPath(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "MASTER_ADMIN":
      return "/master/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "SUPERVISOR":
      return "/supervisor/dashboard";
    case "STAFF":
      return "/staff/dashboard";
    case "SHOP_OWNER":
      return "/shopowner/dashboard";
    case "SHOP_MANAGER":
      return "/shopmanager/dashboard";
    case "SHOP_SUPERVISOR":
      return "/shopsupervisor/dashboard";
    case "EMPLOYEE":
      return "/employee/dashboard";
    default:
      return "/";
  }
}

function canManageAddressAndIdProof(role?: string | null) {
  const normalized = normalizeRole(role);

  return [
    "MANAGER",
    "SUPERVISOR",
    "STAFF",
    "SHOP_OWNER",
    "SHOP_MANAGER",
    "SHOP_SUPERVISOR",
    "EMPLOYEE",
  ].includes(normalized);
}

function resolveApiUrl(route: ApiRoute, key = "idProof") {
  return typeof route.url === "function" ? route.url(key) : route.url;
}

function getProfileApi(role?: string | null): ProfileApiConfig | null {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case "MASTER_ADMIN":
      return {
        me: SummaryApi.master_me,
        update: SummaryApi.master_update_me,
        avatarUpload: SummaryApi.master_avatar_upload,
        avatarRemove: SummaryApi.master_avatar_remove,
        idProofUpload: null,
        idProofRemove: null,
      };

    case "MANAGER":
    case "SUPERVISOR":
    case "STAFF":
      return {
        me: SummaryApi.staff_me,
        update: SummaryApi.staff_update_me,
        avatarUpload: SummaryApi.staff_avatar_upload_me,
        avatarRemove: SummaryApi.staff_avatar_remove_me,
        idProofUpload: SummaryApi.staff_idproof_upload_me,
        idProofRemove: SummaryApi.staff_idproof_remove_me,
      };

    case "SHOP_OWNER":
      return {
        me: SummaryApi.shopowner_me,
        update: SummaryApi.shopowner_update_me,
        avatarUpload: SummaryApi.shopowner_avatar_upload,
        avatarRemove: SummaryApi.shopowner_avatar_remove,
        idProofUpload: SummaryApi.shopowner_docs_upload_me,
        idProofRemove: SummaryApi.shopowner_docs_remove_me,
      };

    case "SHOP_MANAGER":
    case "SHOP_SUPERVISOR":
    case "EMPLOYEE":
      return {
        me: SummaryApi.shopstaff_me,
        update: SummaryApi.shopstaff_update_me,
        avatarUpload: null,
        avatarRemove: null,
        idProofUpload: SummaryApi.shopstaff_docs_upload_me,
        idProofRemove: SummaryApi.shopstaff_docs_remove_me,
      };

    default:
      return null;
  }
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeOptionText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toOption(item: unknown, preferredKeys: string[] = []): Option | null {
  if (typeof item === "string") {
    const normalized = normalizeOptionText(item);
    return normalized ? { label: normalized, value: normalized } : null;
  }

  if (!item || typeof item !== "object") return null;

  const candidate = item as Record<string, unknown>;
  const fallbackKeys = [
    "name",
    "label",
    "value",
    "title",
    "state",
    "district",
    "talukName",
    "taluk",
    "villageName",
    "area",
    "village",
  ];

  const raw = [...preferredKeys, ...fallbackKeys].reduce<string>(
    (selected, key) => {
      if (selected) return selected;
      return typeof candidate[key] === "string" ? String(candidate[key]) : "";
    },
    ""
  );

  const normalized = normalizeOptionText(raw);
  return normalized ? { label: normalized, value: normalized } : null;
}

function toOptions(list: unknown, preferredKeys: string[] = []): Option[] {
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();

  return list.reduce<Option[]>((acc, item) => {
    const option = toOption(item, preferredKeys);
    if (!option) return acc;

    const key = option.value.toLowerCase();
    if (seen.has(key)) return acc;

    seen.add(key);
    acc.push(option);
    return acc;
  }, []);
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

function extractStateOptions(list: unknown) {
  return toOptions(list, ["state"]);
}

function extractDistrictOptions(list: unknown) {
  return toOptions(list, ["district"]);
}

function extractTalukOptions(list: unknown) {
  return toOptions(list, ["talukName", "taluk"]);
}

function extractAreaOptions(list: unknown) {
  return toOptions(list, ["villageName", "area", "village"]);
}

function extractProfileEntity(response: any) {
  return (
    response?.data?.data?.user ||
    response?.data?.data?.profile ||
    response?.data?.user ||
    response?.data?.profile ||
    response?.data?.data ||
    response?.data ||
    {}
  );
}

function extractLocationCollection(response: any) {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  if (Array.isArray(response?.data?.states)) return response.data.states;
  if (Array.isArray(response?.data?.districts)) return response.data.districts;
  if (Array.isArray(response?.data?.taluks)) return response.data.taluks;
  if (Array.isArray(response?.data?.villages)) return response.data.villages;
  if (Array.isArray(response?.data?.areas)) return response.data.areas;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

async function fetchLocationList(url: string) {
  const response = await apiClient.request({
    method: "GET",
    url,
  });

  return extractLocationCollection(response);
}

async function fetchAreas(state: string, district: string, taluk: string) {
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

  let data = await fetchLocationList(primaryUrl);

  if (!data.length) {
    data = await fetchLocationList(fallbackUrl);
  }

  return data;
}

function validateForm(
  form: ProfileForm,
  showExtraFields: boolean,
  showShopControlField: boolean
) {
  const nextErrors: FieldErrors = {};

  if (!form.name.trim()) nextErrors.name = "Full name is required";
  if (!form.username.trim()) nextErrors.username = "Username is required";

  if (form.mobile && form.mobile.length !== 10) {
    nextErrors.mobile = "Mobile number must be 10 digits";
  }

  if (form.additionalNumber && form.additionalNumber.length !== 10) {
    nextErrors.additionalNumber = "Additional number must be 10 digits";
  }

  if (
    showShopControlField &&
    !["ALL_IN_ONE_ECOMMERCE", "INVENTORY_ONLY"].includes(form.shopControl)
  ) {
    nextErrors.shopControl = "Shop control is required";
  }

  if (showExtraFields) {
    if (!form.state.trim()) nextErrors.state = "State is required";
    if (!form.district.trim()) nextErrors.district = "District is required";
    if (!form.taluk.trim()) nextErrors.taluk = "Taluk is required";
    if (!form.area.trim()) nextErrors.area = "Area is required";
    if (!form.street.trim()) nextErrors.street = "Street is required";

    if (!form.pincode.trim()) {
      nextErrors.pincode = "Pincode is required";
    } else if (form.pincode.length !== 6) {
      nextErrors.pincode = "Pincode must be 6 digits";
    }
  }

  return nextErrors;
}

export default function Profile() {
  const router = useRouter();

  const { user, setUser } = useAuth() as {
    user: any;
    setUser?: (user: any) => void;
  };

  const role = normalizeRole(user?.role);
  const roleLabel = getRoleLabel(role);
  const dashboardPath = getDashboardPath(role);
  const apiConfig = useMemo(() => getProfileApi(role), [role]);
  const showExtraFields = canManageAddressAndIdProof(role);
  const showShopControlField = role === "SHOP_OWNER";

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    username: "",
    email: "",
    mobile: "",
    additionalNumber: "",
    shopControl: "INVENTORY_ONLY",
    state: "",
    district: "",
    taluk: "",
    area: "",
    street: "",
    pincode: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [avatarPreview, setAvatarPreview] = useState("");
  const [idProofUrl, setIdProofUrl] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [uploadingIdProof, setUploadingIdProof] = useState(false);
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

  const isLocationLoading =
    loadingStates || loadingDistricts || loadingTaluks || loadingAreas;

  const initials = useMemo(() => {
    const source = form.name || form.username || "U";
    return source.trim().charAt(0).toUpperCase();
  }, [form.name, form.username]);

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

  useEffect(() => {
    let mounted = true;

    const fillFromUser = (data: any) => {
      if (!mounted) return;

      const address = data?.address || {};

      setForm({
        name: data?.name || "",
        username: data?.username || "",
        email: data?.email || "",
        mobile: data?.mobile || "",
        additionalNumber: data?.additionalNumber || "",
        shopControl:
          data?.shopControl === "ALL_IN_ONE_ECOMMERCE" ||
          data?.shopControl === "INVENTORY_ONLY"
            ? data.shopControl
            : "INVENTORY_ONLY",
        state: address?.state || data?.state || "",
        district: address?.district || data?.district || "",
        taluk: address?.taluk || data?.taluk || data?.talukName || "",
        area: address?.area || data?.area || data?.villageName || "",
        street: address?.street || data?.street || "",
        pincode: address?.pincode || data?.pincode || "",
      });

      setAvatarPreview(data?.avatarUrl || "");
      setIdProofUrl(data?.idProof?.url || data?.idProofUrl || "");
      setIsEmailVerified(Boolean(data?.verifyEmail));
    };

    const loadProfile = async () => {
      try {
        if (!apiConfig?.me) {
          fillFromUser(user || {});
          return;
        }

        const response = await apiClient.request({
          method: apiConfig.me.method,
          url: apiConfig.me.url,
        });

        const payload = extractProfileEntity(response);
        fillFromUser(payload || user || {});
      } catch (error: any) {
        fillFromUser(user || {});
        toast.error(
          error?.response?.data?.message || "Failed to load profile details"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [apiConfig, user]);

  useEffect(() => {
    let active = true;

    if (!showExtraFields) return;

    const loadStates = async () => {
      try {
        setLoadingStates(true);
        setLocationError("");

        const data = await fetchLocationList(SummaryApi.location_states.url);

        if (!active) return;

        const options = extractStateOptions(data);
        setStates(options);

        if (!options.length) {
          setLocationError("Unable to load states. Please check location API.");
        }
      } catch (error: any) {
        if (!active) return;

        setLocationError(
          error?.response?.data?.message || "Unable to load states"
        );
      } finally {
        if (active) setLoadingStates(false);
      }
    };

    void loadStates();

    return () => {
      active = false;
    };
  }, [showExtraFields]);

  useEffect(() => {
    let active = true;

    if (!showExtraFields) return;

    if (!form.state) {
      setDistricts([]);
      setTaluks([]);
      setAreas([]);
      return;
    }

    const loadDistricts = async () => {
      try {
        setLoadingDistricts(true);
        setLocationError("");

        const data = await fetchLocationList(
          `${SummaryApi.location_districts.url}?state=${encodeURIComponent(
            form.state
          )}`
        );

        if (!active) return;

        const options = extractDistrictOptions(data);
        setDistricts(appendOption(options, form.district));
        setTaluks([]);
        setAreas([]);

        if (!options.length) {
          setLocationError("No districts found for the selected state.");
        }
      } catch (error: any) {
        if (!active) return;

        setLocationError(
          error?.response?.data?.message || "Unable to load districts"
        );
      } finally {
        if (active) setLoadingDistricts(false);
      }
    };

    void loadDistricts();

    return () => {
      active = false;
    };
  }, [form.state, form.district, showExtraFields]);

  useEffect(() => {
    let active = true;

    if (!showExtraFields) return;

    if (!form.state || !form.district) {
      setTaluks([]);
      setAreas([]);
      return;
    }

    const loadTaluks = async () => {
      try {
        setLoadingTaluks(true);
        setLocationError("");

        const data = await fetchLocationList(
          `${SummaryApi.location_taluks.url}?state=${encodeURIComponent(
            form.state
          )}&district=${encodeURIComponent(form.district)}`
        );

        if (!active) return;

        const options = extractTalukOptions(data);
        setTaluks(appendOption(options, form.taluk));
        setAreas([]);

        if (!options.length) {
          setLocationError("No taluks found for the selected district.");
        }
      } catch (error: any) {
        if (!active) return;

        setLocationError(
          error?.response?.data?.message || "Unable to load taluks"
        );
      } finally {
        if (active) setLoadingTaluks(false);
      }
    };

    void loadTaluks();

    return () => {
      active = false;
    };
  }, [form.state, form.district, form.taluk, showExtraFields]);

  useEffect(() => {
    let active = true;

    if (!showExtraFields) return;

    if (!form.state || !form.district || !form.taluk) {
      setAreas([]);
      return;
    }

    const loadAreas = async () => {
      try {
        setLoadingAreas(true);
        setLocationError("");

        const data = await fetchAreas(form.state, form.district, form.taluk);

        if (!active) return;

        const options = extractAreaOptions(data);
        setAreas(appendOption(options, form.area));

        if (!options.length) {
          setLocationError("No areas found for the selected taluk.");
        }
      } catch (error: any) {
        if (!active) return;

        setLocationError(
          error?.response?.data?.message || "Unable to load areas"
        );
      } finally {
        if (active) setLoadingAreas(false);
      }
    };

    void loadAreas();

    return () => {
      active = false;
    };
  }, [form.state, form.district, form.taluk, form.area, showExtraFields]);

  const updateField = (name: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateField(name as keyof ProfileForm, value);
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiConfig?.avatarUpload) {
      toast.error("Avatar update is not available for this role");
      return;
    }

    const body = new FormData();
    body.append("avatar", file);

    try {
      setUploadingAvatar(true);

      const response = await apiClient.request({
        method: apiConfig.avatarUpload.method,
        url: apiConfig.avatarUpload.url,
        data: body,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updated = extractProfileEntity(response);
      const nextAvatar = updated?.avatarUrl || avatarPreview;

      setAvatarPreview(nextAvatar);

      if (setUser && updated) {
        setUser({
          ...(user || {}),
          ...updated,
          avatarUrl: nextAvatar,
        });
      }

      toast.success("Profile photo updated successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to upload profile photo"
      );
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    if (!apiConfig?.avatarRemove) {
      toast.error("Avatar remove is not available for this role");
      return;
    }

    try {
      setRemovingAvatar(true);

      await apiClient.request({
        method: apiConfig.avatarRemove.method,
        url: apiConfig.avatarRemove.url,
      });

      setAvatarPreview("");

      if (setUser) {
        setUser({
          ...(user || {}),
          avatarUrl: "",
        });
      }

      toast.success("Profile photo removed successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to remove profile photo"
      );
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleIdProofUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiConfig?.idProofUpload) {
      toast.error("ID proof upload is not available for this role");
      return;
    }

    const normalized = normalizeRole(role);
    const body = new FormData();

    let fieldName = "idProof";
    let routeKey = "idProof";

    if (
      normalized === "SHOP_MANAGER" ||
      normalized === "SHOP_SUPERVISOR" ||
      normalized === "EMPLOYEE"
    ) {
      fieldName = "idproof";
      routeKey = "idProof";
    }

    body.append(fieldName, file);

    try {
      setUploadingIdProof(true);

      const response = await apiClient.request({
        method: apiConfig.idProofUpload.method,
        url: resolveApiUrl(apiConfig.idProofUpload, routeKey),
        data: body,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updated = extractProfileEntity(response);
      const nextIdProof =
        updated?.idProof?.url || updated?.idProofUrl || idProofUrl;

      setIdProofUrl(nextIdProof);

      if (setUser && updated) {
        setUser({
          ...(user || {}),
          ...updated,
          idProofUrl: nextIdProof,
        });
      }

      toast.success("ID proof uploaded successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to upload ID proof");
    } finally {
      setUploadingIdProof(false);
      e.target.value = "";
    }
  };

  const handleIdProofRemove = async () => {
    if (!apiConfig?.idProofRemove) {
      toast.error("ID proof remove is not available for this role");
      return;
    }

    try {
      setRemovingIdProof(true);

      await apiClient.request({
        method: apiConfig.idProofRemove.method,
        url: resolveApiUrl(apiConfig.idProofRemove, "idProof"),
      });

      setIdProofUrl("");

      if (setUser) {
        setUser({
          ...(user || {}),
          idProofUrl: "",
        });
      }

      toast.success("ID proof removed successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to remove ID proof");
    } finally {
      setRemovingIdProof(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (!apiConfig?.update) {
      toast.error("Profile update API not available for this role");
      return;
    }

    if (showExtraFields && isLocationLoading) {
      toast.error("Please wait until location data finishes loading");
      return;
    }

    const nextErrors = validateForm(
      form,
      showExtraFields,
      showShopControlField
    );

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, any> = {
        name: form.name.trim(),
        username: form.username.trim(),
        mobile: form.mobile.trim(),
        additionalNumber: form.additionalNumber.trim(),
      };

      if (!isEmailVerified) {
        payload.email = form.email.trim();
      }

      if (showShopControlField) {
        payload.shopControl = form.shopControl || "INVENTORY_ONLY";
      }

      if (showExtraFields) {
        const addressPayload = {
          state: form.state.trim(),
          district: form.district.trim(),
          taluk: form.taluk.trim(),
          area: form.area.trim(),
          street: form.street.trim(),
          pincode: form.pincode.trim(),
        };

        payload.address = addressPayload;
        payload.state = addressPayload.state;
        payload.district = addressPayload.district;
        payload.taluk = addressPayload.taluk;
        payload.area = addressPayload.area;
        payload.street = addressPayload.street;
        payload.pincode = addressPayload.pincode;
      }

      const response = await apiClient.request({
        method: apiConfig.update.method,
        url: apiConfig.update.url,
        data: payload,
      });

      const updated = extractProfileEntity(response);

      if (setUser) {
        setUser({
          ...(user || {}),
          ...(updated || {}),
          name: updated?.name ?? payload.name,
          username: updated?.username ?? payload.username,
          email: updated?.email ?? form.email.trim(),
          mobile: updated?.mobile ?? payload.mobile,
          additionalNumber:
            updated?.additionalNumber ?? payload.additionalNumber,
          shopControl:
            updated?.shopControl ?? payload.shopControl ?? user?.shopControl,
          address: updated?.address ?? payload.address ?? user?.address,
          verifyEmail:
            typeof updated?.verifyEmail === "boolean"
              ? updated.verifyEmail
              : isEmailVerified,
          avatarUrl: updated?.avatarUrl ?? avatarPreview,
          idProofUrl: updated?.idProof?.url ?? updated?.idProofUrl ?? idProofUrl,
        });
      }

      setIsEmailVerified(
        typeof updated?.verifyEmail === "boolean"
          ? Boolean(updated.verifyEmail)
          : isEmailVerified
      );

      toast.success("Profile updated successfully");
      router.replace(dashboardPath);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to save profile changes"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
          <span className="text-sm font-medium text-slate-700">
            Loading profile...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 md:px-6 lg:px-8">
      <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
        <div className="premium-grid-bg premium-bg-animate opacity-40" />
        <div className="premium-bg-overlay" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
              <ShieldCheck className="h-3.5 w-3.5" />
              My Profile
            </span>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              {form.name || form.username || "Profile"}
            </h1>

            <p className="mt-2 text-sm text-white/80 md:text-base">
              Manage your personal details and save changes. After saving, you
              will move to your role-based dashboard.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => router.push(dashboardPath)}
            className="h-11 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Back to Dashboard
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-card border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {avatarPreview ? (
                <div className="relative h-32 w-32 overflow-hidden rounded-card border-4 border-slate-100 shadow-lg">
                  <Image
                    src={avatarPreview}
                    alt={form.name || "Profile"}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-card bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-4xl font-bold text-white shadow-lg">
                  {initials}
                </div>
              )}

              {apiConfig?.avatarUpload && (
                <label className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50">
                  {uploadingAvatar ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Camera className="h-4.5 w-4.5" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              {form.name || form.username || "User"}
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {roleLabel}
            </p>

            <div className="mt-6 w-full space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </div>

                <p className="break-all text-sm font-medium text-slate-800">
                  {form.email || "-"}
                </p>

                {isEmailVerified ? (
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    Verified email cannot be changed
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <Phone className="h-3.5 w-3.5" />
                  Mobile
                </div>

                <p className="text-sm font-medium text-slate-800">
                  {form.mobile || "-"}
                </p>
              </div>

              {showShopControlField && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Shop Control
                  </div>

                  <p className="text-sm font-medium text-slate-800">
                    {getShopControlLabel(form.shopControl)}
                  </p>
                </div>
              )}

              {showExtraFields && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    Address
                  </div>

                  <p className="text-sm font-medium text-slate-800">
                    {[
                      form.street,
                      form.area,
                      form.taluk,
                      form.district,
                      form.state,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </div>
              )}
            </div>

            {(apiConfig?.avatarRemove || apiConfig?.idProofRemove) && (
              <div className="mt-5 flex w-full flex-col gap-2">
                {apiConfig?.avatarRemove && avatarPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAvatarRemove}
                    disabled={removingAvatar}
                    className="h-11 rounded-2xl border-slate-200"
                  >
                    {removingAvatar ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Removing Photo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Photo
                      </>
                    )}
                  </Button>
                )}

                {apiConfig?.idProofRemove && idProofUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleIdProofRemove}
                    disabled={removingIdProof}
                    className="h-11 rounded-2xl border-slate-200"
                  >
                    {removingIdProof ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Removing ID Proof...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove ID Proof
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="rounded-card border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-7">
          <div className="mb-6">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Profile
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Update your account information and save the changes.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Full Name" icon={User}>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="h-12 rounded-2xl border-slate-200"
                />
                {errors.name ? (
                  <p className="text-xs text-rose-500">{errors.name}</p>
                ) : null}
              </Field>

              <Field label="Username" icon={UserCircle2}>
                <Input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  className="h-12 rounded-2xl border-slate-200"
                />
                {errors.username ? (
                  <p className="text-xs text-rose-500">{errors.username}</p>
                ) : null}
              </Field>

              <Field label="Email Address" icon={Mail}>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className="h-12 rounded-2xl border-slate-200"
                  readOnly={isEmailVerified}
                  disabled={isEmailVerified}
                />
                {isEmailVerified ? (
                  <p className="text-xs font-medium text-emerald-600">
                    This email is verified and locked.
                  </p>
                ) : null}
              </Field>

              <Field label="Mobile Number" icon={Phone}>
                <Input
                  name="mobile"
                  value={form.mobile}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateField("mobile", digitsOnly(e.target.value).slice(0, 10))
                  }
                  placeholder="Enter mobile number"
                  className="h-12 rounded-2xl border-slate-200"
                  maxLength={10}
                />
                {errors.mobile ? (
                  <p className="text-xs text-rose-500">{errors.mobile}</p>
                ) : null}
              </Field>

              <Field label="Additional Number" icon={Phone}>
                <Input
                  name="additionalNumber"
                  value={form.additionalNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateField(
                      "additionalNumber",
                      digitsOnly(e.target.value).slice(0, 10)
                    )
                  }
                  placeholder="Enter additional number"
                  className="h-12 rounded-2xl border-slate-200"
                  maxLength={10}
                />
                {errors.additionalNumber ? (
                  <p className="text-xs text-rose-500">
                    {errors.additionalNumber}
                  </p>
                ) : null}
              </Field>

              <Field label="Role" icon={ShieldCheck}>
                <Input
                  value={roleLabel}
                  readOnly
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 font-semibold text-slate-700"
                />
              </Field>

              {showShopControlField && (
                <Field label="Shop Control" icon={ShieldCheck}>
                  <PlainSelect
                    id="shopControl"
                    value={form.shopControl}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      const value = e.target.value;
                      const nextValue =
                        value === "ALL_IN_ONE_ECOMMERCE" ||
                        value === "INVENTORY_ONLY"
                          ? value
                          : "INVENTORY_ONLY";

                      updateField("shopControl", nextValue);
                    }}
                    options={SHOP_CONTROL_OPTIONS}
                    error={errors.shopControl}
                    required
                    placeholder="Select shop control"
                    helperText={`Current: ${getShopControlLabel(
                      form.shopControl
                    )}`}
                  />
                </Field>
              )}
            </div>

            {showExtraFields && (
              <section className="rounded-card border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-5">
                <SectionHeader
                  icon={<MapPin className="h-5 w-5" />}
                  title="Address Details"
                  description="Search loaded address options or type your own custom values."
                />

                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Search the dropdown or type a value to add it as a custom
                  address option.
                  {locationError ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Location lookup note: {locationError}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SearchableSelect
                    id="state"
                    label="State"
                    icon={MapPin}
                    value={form.state}
                    onChange={(value: string) => {
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
                    loading={loadingStates}
                    error={errors.state}
                    required
                    allowCustom
                    placeholder="Select or type state"
                    searchPlaceholder="Search or type state"
                    helperText="Choose from loaded states or enter your own."
                    onCreateOption={(value: string) =>
                      setStates((prev) => appendOption(prev, value))
                    }
                  />

                  <SearchableSelect
                    id="district"
                    label="District"
                    icon={MapPin}
                    value={form.district}
                    onChange={(value: string) => {
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
                    loading={loadingDistricts}
                    error={errors.district}
                    required
                    allowCustom
                    placeholder="Select or type district"
                    searchPlaceholder="Search or type district"
                    helperText="Select district after choosing state."
                    onCreateOption={(value: string) =>
                      setDistricts((prev) => appendOption(prev, value))
                    }
                  />

                  <SearchableSelect
                    id="taluk"
                    label="Taluk"
                    icon={MapPin}
                    value={form.taluk}
                    onChange={(value: string) => {
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
                    loading={loadingTaluks}
                    error={errors.taluk}
                    required
                    allowCustom
                    placeholder="Select or type taluk"
                    searchPlaceholder="Search or type taluk"
                    helperText="Taluk options come from backend location data."
                    onCreateOption={(value: string) =>
                      setTaluks((prev) => appendOption(prev, value))
                    }
                  />

                  <SearchableSelect
                    id="area"
                    label="Area"
                    icon={MapPin}
                    value={form.area}
                    onChange={(value: string) => {
                      setLocationError("");
                      updateField("area", value);
                      setAreas((prev) => appendOption(prev, value));
                    }}
                    options={areas}
                    disabled={!form.taluk || loadingAreas}
                    loading={loadingAreas}
                    error={errors.area}
                    required
                    allowCustom
                    placeholder="Select or type area"
                    searchPlaceholder="Search or type area"
                    helperText="Backend villageName is mapped into area."
                    onCreateOption={(value: string) =>
                      setAreas((prev) => appendOption(prev, value))
                    }
                  />

                  <FloatingInput
                    id="street"
                    label="Street"
                    value={form.street}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateField("street", e.target.value)
                    }
                    error={errors.street}
                    required
                  />

                  <FloatingInput
                    id="pincode"
                    label="Pincode"
                    type="tel"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
            )}

            {showExtraFields && apiConfig?.idProofUpload && (
              <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    <FileBadge className="h-5 w-5" />
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-900">
                      ID Proof
                    </h4>

                    <p className="text-sm text-slate-500">
                      Upload or remove your self ID proof document.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <label className="inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                    {uploadingIdProof ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FileBadge className="mr-2 h-4 w-4" />
                        Upload ID Proof
                      </>
                    )}

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.webp"
                      className="hidden"
                      onChange={handleIdProofUpload}
                      disabled={uploadingIdProof}
                    />
                  </label>

                  {idProofUrl ? (
                    <>
                      <a
                        href={idProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        View ID Proof
                      </a>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleIdProofRemove}
                        disabled={removingIdProof}
                        className="h-12 rounded-2xl border-slate-200 px-5 text-sm font-semibold"
                      >
                        {removingIdProof ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove ID Proof
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No ID proof uploaded yet.
                    </p>
                  )}
                </div>
              </section>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
              <Button
                type="submit"
                disabled={saving}
                className="h-12 rounded-2xl px-6 text-sm font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4.5 w-4.5" />
                    Save Changes
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(dashboardPath)}
                className="h-12 rounded-2xl border-slate-200 px-6 text-sm font-semibold"
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </label>

      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm">
        {icon}
      </div>

      <div>
        <h4 className="text-lg font-bold text-slate-900">{title}</h4>
        {description ? (
          <p className="text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function FloatingInput({
  id,
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <MapPin className="h-4 w-4" />
        </span>
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>

      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="h-12 rounded-2xl border-slate-200"
      />

      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function PlainSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  helperText,
  disabled,
  error,
  required,
}: {
  id: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  placeholder?: string;
  helperText?: string;
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
          aria-required={required}
          aria-invalid={Boolean(error)}
          className={`h-12 w-full appearance-none rounded-2xl border bg-white px-4 pr-10 text-sm shadow-sm outline-none transition ${
            error
              ? "border-rose-300 text-slate-900 focus:border-rose-400"
              : "border-slate-200 text-slate-700 hover:border-slate-300 focus:border-slate-300"
          } ${
            disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronsUpDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}

function SearchableSelect({
  id,
  label,
  icon: Icon,
  value,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  helperText,
  disabled,
  loading,
  error,
  required,
  allowCustom,
  onCreateOption,
  onChange,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  helperText?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  required?: boolean;
  allowCustom?: boolean;
  onCreateOption?: (value: string) => void;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    const selectedOption = options.find((option) => option.value === value);
    return selectedOption?.label || value;
  }, [options, value]);

  const normalizedQuery = normalizeOptionText(query);
  const loweredQuery = normalizedQuery.toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!loweredQuery) return options;

    return options.filter((option) => {
      const haystack = `${option.label} ${option.value}`.toLowerCase();
      return haystack.includes(loweredQuery);
    });
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
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

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
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        {loading ? `${label} (Loading...)` : label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>

      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (disabled) return;

            if (open) {
              setQuery("");
            }

            setOpen((prev) => !prev);
          }}
          disabled={disabled}
          className={`flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm shadow-sm transition ${
            error
              ? "border-rose-300"
              : "border-slate-200 hover:border-slate-300"
          } ${
            disabled
              ? "cursor-not-allowed bg-slate-50 text-slate-400"
              : "text-slate-700"
          }`}
        >
          <span className={selectedLabel ? "text-slate-700" : "text-slate-400"}>
            {selectedLabel || placeholder}
          </span>

          <ChevronsUpDown className="h-4 w-4 text-slate-400" />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id={id}
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setQuery("");
                    setOpen(false);
                    return;
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
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300"
              />
            </div>

            <div className="mt-3 max-h-56 overflow-y-auto">
              {canCreate ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="mb-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Use &quot;{normalizedQuery}&quot;
                </button>
              ) : null}

              {filteredOptions.length > 0 ? (
                <div className="space-y-1">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                        value === option.value
                          ? "bg-slate-100 font-semibold text-slate-900"
                          : "text-slate-700"
                      }`}
                    >
                      <span className="truncate">{option.label}</span>

                      {value === option.value ? (
                        <Check className="ml-auto h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  No matching options found.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
