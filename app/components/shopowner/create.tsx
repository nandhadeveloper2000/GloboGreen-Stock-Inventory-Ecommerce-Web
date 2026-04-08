"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";


type ShopControl = "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE";
type BusinessType = "Retail" | "Wholesale" | "";

type PickedFile = {
  file: File;
  preview?: string;
};

type Address = {
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
};

type OwnerResponse = {
  _id: string;
  name: string;
  username: string;
  email: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  shopControl?: ShopControl;
};

type ShopResponse = {
  _id: string;
  name?: string;
  shopName?: string;
  businessType?: string | string[];
  frontImageUrl?: string;
  shopAddress?: Partial<Address>;
  address?: Partial<Address>;
};

type ApiJson = {
  success?: boolean;
  message?: string;
  data?: unknown;
  owner?: unknown;
  shop?: unknown;
  result?: unknown;
  error?: string;
  errors?: Array<string | { message?: string }>;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
  code?: number;
};

const SHOP_CONTROL_OPTIONS: { label: string; value: ShopControl }[] = [
  { label: "Inventory Only", value: "INVENTORY_ONLY" },
  { label: "All In One Ecommerce", value: "ALL_IN_ONE_ECOMMERCE" },
];

const BUSINESS_OPTIONS: BusinessType[] = ["", "Retail", "Wholesale"];
const DOC_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

function buildApiUrl(path?: string) {
  return `${baseURL}${path || ""}`;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readResponse(res: Response) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) as ApiJson };
  } catch {
    return { text, json: null as ApiJson | null };
  }
}

function getApiErrorMessage(json: ApiJson | null, fallback = "Something went wrong") {
  if (!json) return fallback;
  if (typeof json.message === "string" && json.message.trim()) return json.message;
  if (typeof json.error === "string" && json.error.trim()) return json.error;

  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const first = json.errors[0];
    if (typeof first === "string") return first;
    if (typeof first?.message === "string") return first.message;
  }

  if (json.keyPattern) {
    const field = Object.keys(json.keyPattern)[0];
    if (field) return `${field} already exists`;
  }

  if (json.code === 11000 && json.keyValue) {
    const field = Object.keys(json.keyValue)[0];
    if (field) return `${field} already exists`;
  }

  return fallback;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPin(v: string) {
  return /^\d{4,8}$/.test(v);
}

function isValidPhone(v: string) {
  return /^\d{10}$/.test(v);
}

function getOwnerFromJson(json: ApiJson | null): OwnerResponse | null {
  const owner = json?.data || json?.owner || null;
  return owner?._id ? (owner as OwnerResponse) : null;
}

function getShopFromJson(json: ApiJson | null): ShopResponse | null {
  const shop = json?.data || json?.shop || json?.result || null;
  return shop?._id ? (shop as ShopResponse) : null;
}

function formatAddress(address?: Partial<Address>) {
  if (!address) return "-";
  return [
    address.street,
    address.area,
    address.taluk,
    address.district,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function StepBadge({ index, title, active }: { index: number; title: string; active: boolean }) {
  return (
    <div
      className={cls(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
        active
          ? "border-violet-300 bg-violet-50 shadow-sm"
          : "border-slate-200 bg-white"
      )}
    >
      <div
        className={cls(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
          active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
        )}
      >
        {index}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cls(
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-violet-400",
        className
      )}
    />
  );
}

function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cls(
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-400",
        className
      )}
    />
  );
}

function UploadCard({
  title,
  subtitle,
  file,
  accept,
  onPick,
  onClear,
  image,
}: {
  title: string;
  subtitle: string;
  file: PickedFile | null;
  accept: string;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  image?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-3">
        {image && file?.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.preview} alt={title} className="max-h-44 rounded-xl object-cover" />
        ) : (
          <div className="text-center text-xs text-slate-400">
            <p>No file selected</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
          {file ? "Replace" : "Choose File"}
          <input type="file" accept={accept} className="hidden" onChange={onPick} />
        </label>

        {file && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
          >
            Remove
          </button>
        )}
      </div>

      <p className="mt-2 truncate text-xs font-medium text-slate-600">
        {file ? file.file.name : "No file selected"}
      </p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value || "-"}</p>
    </div>
  );
}

export default function ShopOwnerCreatePage() {
  const router = useRouter();
  const shopSectionRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [mobile, setMobile] = useState("");
  const [additionalNumber, setAdditionalNumber] = useState("");
  const [shopControl, setShopControl] = useState<ShopControl>("INVENTORY_ONLY");

  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [pincode, setPincode] = useState("");

  const [avatar, setAvatar] = useState<PickedFile | null>(null);
  const [idProof, setIdProof] = useState<PickedFile | null>(null);

  const [createdOwner, setCreatedOwner] = useState<OwnerResponse | null>(null);
  const [shopName, setShopName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("");
  const [shopState, setShopState] = useState("");
  const [shopDistrict, setShopDistrict] = useState("");
  const [shopTaluk, setShopTaluk] = useState("");
  const [shopArea, setShopArea] = useState("");
  const [shopStreet, setShopStreet] = useState("");
  const [shopPincode, setShopPincode] = useState("");
  const [shopFrontImage, setShopFrontImage] = useState<PickedFile | null>(null);
  const [shopGstCertificate, setShopGstCertificate] = useState<PickedFile | null>(null);
  const [shopUdyamCertificate, setShopUdyamCertificate] = useState<PickedFile | null>(null);
  const [shops, setShops] = useState<ShopResponse[]>([]);

  const [savingOwner, setSavingOwner] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const busy = savingOwner || savingShop;

  const ownerAddress = useMemo(
    () => ({
      state: stateName,
      district,
      taluk,
      area,
      street,
      pincode,
    }),
    [stateName, district, taluk, area, street, pincode]
  );

  const shopAddress = useMemo(
    () => ({
      state: shopState,
      district: shopDistrict,
      taluk: shopTaluk,
      area: shopArea,
      street: shopStreet,
      pincode: shopPincode,
    }),
    [shopState, shopDistrict, shopTaluk, shopArea, shopStreet, shopPincode]
  );

  const resetOwnerForm = () => {
    setName("");
    setUsername("");
    setEmail("");
    setPin("");
    setMobile("");
    setAdditionalNumber("");
    setShopControl("INVENTORY_ONLY");
    setStateName("");
    setDistrict("");
    setTaluk("");
    setArea("");
    setStreet("");
    setPincode("");
    setAvatar(null);
    setIdProof(null);
    setStep(1);
  };

  const resetShopForm = () => {
    setShopName("");
    setBusinessType("");
    setShopState("");
    setShopDistrict("");
    setShopTaluk("");
    setShopArea("");
    setShopStreet("");
    setShopPincode("");
    setShopFrontImage(null);
    setShopGstCertificate(null);
    setShopUdyamCertificate(null);
  };

  const pickImage = (
    setter: (value: PickedFile | null) => void,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setter({ file, preview: URL.createObjectURL(file) });
  };

  const pickDoc = (
    setter: (value: PickedFile | null) => void,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setter({ file });
  };

  const generateUsername = () => {
    const clean = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 10);

    if (!clean) return;
    setUsername(`${clean}${Math.floor(100 + Math.random() * 900)}`);
  };

  const validateOwnerStep1 = () => {
    const n = name.trim();
    const u = username.trim().toLowerCase();
    const e = email.trim().toLowerCase();
    const p = pin.trim();
    const m = mobile.trim();
    const a2 = additionalNumber.trim();

    if (!n || !u || !e || !p) return "Enter name, username, email and PIN";
    if (!isValidEmail(e)) return "Enter valid email";
    if (!isValidPin(p)) return "PIN must be 4 to 8 digits";
    if (!m) return "Enter primary mobile";
    if (!isValidPhone(m)) return "Enter valid 10-digit primary mobile";
    if (a2 && !isValidPhone(a2)) return "Enter valid 10-digit secondary mobile";
    if (a2 && a2 === m) return "Primary and secondary mobile cannot be same";
    return "";
  };

  const goToStep2 = () => {
    const msg = validateOwnerStep1();
    setError(msg);
    setSuccess("");
    if (!msg) setStep(2);
  };

  const goToStep3 = () => {
    setError("");
    setSuccess("");
    setStep(3);
  };

  const uploadOwnerAvatarById = async (ownerId: string) => {
    if (!avatar?.file) return null;

    const endpoint = SummaryApi?.shopowner_admin_avatar_upload;
    if (!endpoint?.url) return null;

    const form = new FormData();
    form.append("avatar", avatar.file);

    const res = await fetch(buildApiUrl(endpoint.url(ownerId)), {
      method: endpoint.method || "PUT",
      headers: authHeaders(),
      body: form,
    });

    const rr = await readResponse(res);
    if (!res.ok || !rr.json?.success) return null;
    return getOwnerFromJson(rr.json);
  };

  const uploadOwnerDocsById = async (ownerId: string) => {
    if (!idProof?.file) return true;

    const endpoint = SummaryApi?.shopowner_admin_docs_upload;
    if (!endpoint?.url) return false;

    const form = new FormData();
    form.append("idProof", idProof.file);

    const res = await fetch(buildApiUrl(endpoint.url(ownerId)), {
      method: endpoint.method || "PUT",
      headers: authHeaders(),
      body: form,
    });

    const rr = await readResponse(res);
    return !!(res.ok && rr.json?.success);
  };

  const uploadShopFrontById = async (shopId: string) => {
    if (!shopFrontImage?.file) return true;

    const endpoint = SummaryApi?.shop_front_upload_admin;
    if (!endpoint?.url) return false;

    const form = new FormData();
    form.append("front", shopFrontImage.file);

    const res = await fetch(buildApiUrl(endpoint.url(shopId)), {
      method: endpoint.method || "POST",
      headers: authHeaders(),
      body: form,
    });

    const rr = await readResponse(res);
    return !!(res.ok && rr.json?.success);
  };

  const uploadShopDocsById = async (shopId: string) => {
    if (!shopGstCertificate?.file && !shopUdyamCertificate?.file) return true;

    const endpoint = SummaryApi?.shop_docs_upload_admin;
    if (!endpoint?.url) return false;

    const form = new FormData();
    if (shopGstCertificate?.file) form.append("gstCertificate", shopGstCertificate.file);
    if (shopUdyamCertificate?.file) form.append("udyamCertificate", shopUdyamCertificate.file);

    const res = await fetch(buildApiUrl(endpoint.url(shopId)), {
      method: endpoint.method || "PUT",
      headers: authHeaders(),
      body: form,
    });

    const rr = await readResponse(res);
    return !!(res.ok && rr.json?.success);
  };

  const submitOwner = async () => {
    setError("");
    setSuccess("");

    const validationMessage = validateOwnerStep1();
    if (validationMessage) {
      setError(validationMessage);
      setStep(1);
      return;
    }

    const endpoint = SummaryApi?.shopowner_create;
    if (!endpoint?.url) {
      setError("ShopOwner create API missing in SummaryApi");
      return;
    }

    try {
      setSavingOwner(true);

      const res = await fetch(buildApiUrl(endpoint.url), {
        method: endpoint.method || "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          pin: pin.trim(),
          mobile: mobile.trim(),
          additionalNumber: additionalNumber.trim() || undefined,
          shopControl,
          state: stateName.trim() || undefined,
          district: district.trim() || undefined,
          taluk: taluk.trim() || undefined,
          area: area.trim() || undefined,
          street: street.trim() || undefined,
          pincode: pincode.trim() || undefined,
        }),
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        setError(
          getApiErrorMessage(
            json,
            res.status === 409 ? "Duplicate data found" : `Create ShopOwner failed (HTTP ${res.status})`
          )
        );
        return;
      }

      const created = getOwnerFromJson(json);
      if (!created?._id) {
        setError("Owner created but missing _id");
        return;
      }

      const avatarUpdatedOwner = await uploadOwnerAvatarById(created._id);
      await uploadOwnerDocsById(created._id);

      const finalOwner = avatarUpdatedOwner || created;
      setCreatedOwner(finalOwner);
      setSuccess("Shop owner created successfully. Now add shop details below.");
      resetOwnerForm();
      setStep(1);

      setTimeout(() => {
        shopSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error: any) {
      setError(error?.message || "Network error");
    } finally {
      setSavingOwner(false);
    }
  };

  const submitShop = async () => {
    if (!createdOwner?._id) {
      setError("Create ShopOwner first");
      return;
    }

    if (!shopName.trim()) {
      setError("Enter shop name");
      return;
    }

    const endpoint = SummaryApi?.master_create_shop;
    if (!endpoint?.url) {
      setError("Shop create API missing in SummaryApi");
      return;
    }

    try {
      setSavingShop(true);
      setError("");
      setSuccess("");

      const form = new FormData();
      form.append("name", shopName.trim());
      form.append("shopName", shopName.trim());
      form.append("ownerId", createdOwner._id);
      form.append("shopOwnerAccountId", createdOwner._id);
      if (businessType) form.append("businessType", businessType);
      if (shopState.trim()) form.append("state", shopState.trim());
      if (shopDistrict.trim()) form.append("district", shopDistrict.trim());
      if (shopTaluk.trim()) form.append("taluk", shopTaluk.trim());
      if (shopArea.trim()) form.append("area", shopArea.trim());
      if (shopStreet.trim()) form.append("street", shopStreet.trim());
      if (shopPincode.trim()) form.append("pincode", shopPincode.trim());
      if (shopFrontImage?.file) form.append("frontImage", shopFrontImage.file);

      const res = await fetch(buildApiUrl(endpoint.url), {
        method: endpoint.method || "POST",
        headers: authHeaders(),
        body: form,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        setError(getApiErrorMessage(json, `Create Shop failed (HTTP ${res.status})`));
        return;
      }

      const createdShop = getShopFromJson(json);
      if (!createdShop?._id) {
        setError("Shop created but missing _id");
        return;
      }

      if (!shopFrontImage?.file && (shopGstCertificate?.file || shopUdyamCertificate?.file)) {
        await uploadShopDocsById(createdShop._id);
      } else if (shopFrontImage?.file) {
        await uploadShopFrontById(createdShop._id);
        await uploadShopDocsById(createdShop._id);
      }

      setShops((prev) => [createdShop, ...prev]);
      setSuccess("Shop created successfully");
      resetShopForm();
    } catch (error: any) {
      setError(error?.message || "Network error");
    } finally {
      setSavingShop(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Create ShopOwner & Shop</h1>
              <p className="mt-1 text-sm text-slate-500">
                Step 1 basic information, step 2 address details, step 3 uploads, then create shop for that owner.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StepBadge index={1} title="Basic Information" active={step === 1} />
              <StepBadge index={2} title="Address Details" active={step === 2} />
              <StepBadge index={3} title="Profile Uploads" active={step === 3} />
            </div>
          </div>
        </div>

        {(error || success) && (
          <div
            className={cls(
              "rounded-2xl border px-4 py-3 text-sm font-medium",
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {error || success}
          </div>
        )}

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Basic Information</h2>
                <p className="mt-1 text-sm text-slate-500">Enter role, identity, login details, and contact information.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Role">
                  <TextInput value="SHOP_OWNER" disabled />
                </Field>

                <Field label="Full Name">
                  <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" />
                </Field>

                <div className="md:col-span-2 xl:col-span-2">
                  <Field label="Username">
                    <div className="flex gap-2">
                      <TextInput
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                        placeholder="Enter username"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={generateUsername}
                        className="h-11 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white"
                      >
                        Auto Generate
                      </button>
                    </div>
                  </Field>
                </div>

                <Field label="Email Address">
                  <TextInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="Enter email"
                  />
                </Field>

                <Field label="PIN">
                  <TextInput
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter PIN"
                    maxLength={8}
                  />
                </Field>

                <Field label="Primary Mobile">
                  <TextInput
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter primary mobile"
                    maxLength={10}
                  />
                </Field>

                <Field label="Secondary Mobile">
                  <TextInput
                    value={additionalNumber}
                    onChange={(e) => setAdditionalNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter secondary mobile"
                    maxLength={10}
                  />
                </Field>

                <Field label="Shop Control">
                  <Select value={shopControl} onChange={(e) => setShopControl(e.target.value as ShopControl)}>
                    {SHOP_CONTROL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={goToStep2}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Next: Address Details
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Address Details</h2>
                <p className="mt-1 text-sm text-slate-500">Enter mapped location and full address.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="State">
                  <TextInput value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="Enter state" />
                </Field>
                <Field label="District">
                  <TextInput value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Enter district" />
                </Field>
                <Field label="Taluk">
                  <TextInput value={taluk} onChange={(e) => setTaluk(e.target.value)} placeholder="Enter taluk" />
                </Field>
                <Field label="Area">
                  <TextInput value={area} onChange={(e) => setArea(e.target.value)} placeholder="Enter area" />
                </Field>
                <Field label="Street / Door No">
                  <TextInput value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Enter street / door no" />
                </Field>
                <Field label="Pincode">
                  <TextInput value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} placeholder="Enter pincode" maxLength={6} />
                </Field>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={goToStep3}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Next: Profile Uploads
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Profile Uploads</h2>
                <p className="mt-1 text-sm text-slate-500">Upload avatar and ID proof, then review before final submit.</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
                <div className="space-y-4">
                  <UploadCard
                    title="Avatar"
                    subtitle="Upload profile image"
                    file={avatar}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    image
                    onPick={(e) => pickImage(setAvatar, e)}
                    onClear={() => setAvatar(null)}
                  />

                  <UploadCard
                    title="ID Proof"
                    subtitle="Upload Aadhaar, PAN, or valid ID proof image/PDF"
                    file={idProof}
                    accept={DOC_ACCEPT}
                    onPick={(e) => pickDoc(setIdProof, e)}
                    onClear={() => setIdProof(null)}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-bold text-slate-900">Review Summary</h3>
                  <p className="mt-1 text-sm text-slate-500">Confirm all details before creating the shop owner account.</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryItem label="Role" value="SHOP_OWNER" />
                    <SummaryItem label="Full Name" value={name} />
                    <SummaryItem label="Username" value={username} />
                    <SummaryItem label="Email" value={email} />
                    <SummaryItem label="Primary Mobile" value={mobile} />
                    <SummaryItem label="Secondary Mobile" value={additionalNumber || "-"} />
                    <SummaryItem label="Shop Control" value={shopControl} />
                    <SummaryItem label="Address" value={formatAddress(ownerAddress)} />
                    <SummaryItem label="Avatar" value={avatar?.file.name || "Not uploaded"} />
                    <SummaryItem label="ID Proof" value={idProof?.file.name || "Not uploaded"} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetOwnerForm}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Clear Form
                  </button>
                  <button
                    type="button"
                    onClick={submitOwner}
                    disabled={busy}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingOwner ? "Creating..." : "Create ShopOwner"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={shopSectionRef} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Shop</h2>
              <p className="mt-1 text-sm text-slate-500">
                {createdOwner?._id
                  ? `Owner: ${createdOwner.name} (${createdOwner.username})`
                  : "Create shop owner first, then add shop."}
              </p>
            </div>

            {createdOwner?._id && (
              <button
                type="button"
                onClick={() => router.push("/master/shopowner/list")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Go to Owner List
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Shop Name">
              <TextInput value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Enter shop name" />
            </Field>

            <Field label="Business Type">
              <Select value={businessType} onChange={(e) => setBusinessType(e.target.value as BusinessType)}>
                {BUSINESS_OPTIONS.map((item) => (
                  <option key={item || "empty"} value={item}>
                    {item || "Select business type"}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="State">
              <TextInput value={shopState} onChange={(e) => setShopState(e.target.value)} placeholder="Enter state" />
            </Field>
            <Field label="District">
              <TextInput value={shopDistrict} onChange={(e) => setShopDistrict(e.target.value)} placeholder="Enter district" />
            </Field>
            <Field label="Taluk">
              <TextInput value={shopTaluk} onChange={(e) => setShopTaluk(e.target.value)} placeholder="Enter taluk" />
            </Field>
            <Field label="Area">
              <TextInput value={shopArea} onChange={(e) => setShopArea(e.target.value)} placeholder="Enter area" />
            </Field>
            <Field label="Street / Door No">
              <TextInput value={shopStreet} onChange={(e) => setShopStreet(e.target.value)} placeholder="Enter street / door no" />
            </Field>
            <Field label="Pincode">
              <TextInput value={shopPincode} onChange={(e) => setShopPincode(e.target.value.replace(/\D/g, ""))} placeholder="Enter pincode" maxLength={6} />
            </Field>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <UploadCard
              title="Front Image"
              subtitle="Select shop front image"
              file={shopFrontImage}
              image
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onPick={(e) => pickImage(setShopFrontImage, e)}
              onClear={() => setShopFrontImage(null)}
            />

            <UploadCard
              title="GST Certificate"
              subtitle="Upload GST certificate image or PDF"
              file={shopGstCertificate}
              accept={DOC_ACCEPT}
              onPick={(e) => pickDoc(setShopGstCertificate, e)}
              onClear={() => setShopGstCertificate(null)}
            />

            <UploadCard
              title="Udyam Certificate"
              subtitle="Upload Udyam certificate image or PDF"
              file={shopUdyamCertificate}
              accept={DOC_ACCEPT}
              onPick={(e) => pickDoc(setShopUdyamCertificate, e)}
              onClear={() => setShopUdyamCertificate(null)}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetShopForm}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
            >
              Clear Shop Form
            </button>
            <button
              type="button"
              onClick={submitShop}
              disabled={!createdOwner?._id || busy}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingShop ? "Creating Shop..." : "Create Shop"}
            </button>
          </div>

          {!!shops.length && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-bold text-slate-900">Added Shops</h3>
              <div className="mt-4 grid gap-3">
                {shops.map((shop, index) => (
                  <div key={shop._id || `${shop.name}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-bold text-slate-900">
                      {index + 1}. {shop.name || shop.shopName || "Shop"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Business Type: {Array.isArray(shop.businessType) ? shop.businessType.join(", ") : shop.businessType || "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Address: {formatAddress((shop.shopAddress || shop.address) as Partial<Address>)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}