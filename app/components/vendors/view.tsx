"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  Sparkles,
  Store,
  Trash2,
  User2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type VendorStatus = "ACTIVE" | "INACTIVE";

type VendorAddress = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type VendorItem = {
  _id: string;
  code?: string;
  vendorName?: string;
  vendorKey?: string;
  contactPerson?: string;
  email?: string;
  mobile?: string;
  gstNumber?: string;
  state?: string;
  address?: VendorAddress | string;
  notes?: string;
  status?: VendorStatus;
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: VendorItem;
};

const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusClass(status?: string) {
  return String(status || "").toUpperCase() === "INACTIVE"
    ? "bg-rose-100 text-rose-700"
    : "bg-emerald-100 text-emerald-700";
}

function getAddressObject(vendor?: VendorItem | null): VendorAddress {
  const source = vendor?.address;

  if (source && typeof source === "object") {
    return source;
  }

  return {
    state: String(vendor?.state || ""),
    street: typeof source === "string" ? source : "",
  };
}

function getVendorState(vendor?: VendorItem | null) {
  const address = getAddressObject(vendor);
  return String(address.state || vendor?.state || "").trim();
}

function formatVendorAddress(vendor?: VendorItem | null) {
  const address = getAddressObject(vendor);

  const parts = [
    address.area,
    address.street,
    address.taluk,
    address.district,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim());

  if (!parts.length) {
    return "No address added";
  }

  return parts.join(", ");
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
        {icon}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <h3 className="mt-1 break-words text-base font-bold tracking-tight text-slate-900">
        {value || "-"}
      </h3>
    </div>
  );
}

export default function VendorViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const vendorId = searchParams.get("id") || "";

  const [selectedShopName, setSelectedShopName] = useState("");
  const [vendor, setVendor] = useState<VendorItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setSelectedShopName(
      window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || ""
    );
  }, []);

  useEffect(() => {
    async function fetchVendor() {
      if (!vendorId) {
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
          toast.error(result?.message || "Failed to load vendor details");
          setVendor(null);
          return;
        }

        setVendor(result.data);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load vendor details");
        setVendor(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchVendor();
  }, [accessToken, vendorId]);

  async function handleToggleStatus() {
    if (!accessToken || !vendor) return;

    const nextStatus =
      String(vendor.status || "ACTIVE").toUpperCase() === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    try {
      setActionLoading(true);

      const endpoint = SummaryApi.vendors.updateStatus(vendor._id);
      const response = await fetch(`${baseURL}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error(result?.message || "Failed to update vendor status");
        return;
      }

      toast.success(result?.message || "Vendor status updated");
      setVendor((prev) =>
        prev
          ? {
              ...prev,
              status: nextStatus,
            }
          : prev
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to update vendor status");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !vendor) return;

    const confirmed = window.confirm(
      `Deactivate ${vendor.vendorName || "this vendor"}?`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);

      const endpoint = SummaryApi.vendors.delete(vendor._id);
      const response = await fetch(`${baseURL}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        credentials: "include",
      });

      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error(result?.message || "Failed to deactivate vendor");
        return;
      }

      toast.success(result?.message || "Vendor deactivated successfully");
      router.replace("/shopowner/vendors/list");
    } catch (error) {
      console.error(error);
      toast.error("Unable to deactivate vendor");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="rounded-[30px] border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-violet-100 border-t-violet-700">
              <Loader2 className="h-6 w-6 animate-spin text-violet-700" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-slate-500">
              Loading vendor details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!vendorId || !vendor) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Vendor not found
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              The requested vendor record could not be loaded. It may have been
              removed or the link is incomplete.
            </p>
            <div className="mt-6">
              <Link
                href="/shopowner/vendors/list"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Vendor List
              </Link>
            </div>
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

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Supplier / Vendor
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                {vendor.vendorName || "Unnamed vendor"}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                View full supplier identity, contact details, GST information,
                address, and current activation status.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-md">
                  <Store className="h-4 w-4" />
                  Shop: {selectedShopName || "Current selection retained"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-md">
                  <Building2 className="h-4 w-4" />
                  Code: {vendor.code || "-"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/shopowner/vendors/list"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>

              <Link
                href={`/shopowner/vendors/edit/${vendor._id}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleToggleStatus()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                <Power className="h-4 w-4" />
                {String(vendor.status || "ACTIVE").toUpperCase() === "ACTIVE"
                  ? "Deactivate"
                  : "Activate"}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleDelete()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Deactivate
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-[28px] bg-violet-100 text-violet-700">
                <Building2 className="h-12 w-12" />
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                {vendor.vendorName || "Unnamed vendor"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {vendor.contactPerson || "No contact person added"}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                    vendor.status
                  )}`}
                >
                  {String(vendor.status || "ACTIVE")
                    .toLowerCase()
                    .replace(/^./, (value) => value.toUpperCase())}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <DetailCard
                icon={<User2 className="h-5 w-5" />}
                label="Contact Person"
                value={vendor.contactPerson || "-"}
              />
              <DetailCard
                icon={<Phone className="h-5 w-5" />}
                label="Mobile"
                value={vendor.mobile || "-"}
              />
              <DetailCard
                icon={<Mail className="h-5 w-5" />}
                label="Email"
                value={vendor.email || "-"}
              />
              <DetailCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Updated On"
                value={formatDate(vendor.updatedAt || vendor.createdAt)}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <DetailCard
                icon={<Building2 className="h-5 w-5" />}
                label="Vendor Code"
                value={vendor.code || "-"}
              />
              <DetailCard
                icon={<MapPin className="h-5 w-5" />}
                label="State"
                value={getVendorState(vendor) || "-"}
              />
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    GST Information
                  </h3>
                  <p className="text-sm text-slate-500">
                    Tax registration linked to this supplier.
                  </p>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-900">
                {vendor.gstNumber || "No GST number added"}
              </p>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Address</h3>
                  <p className="text-sm text-slate-500">
                    Full supplier address for purchase or delivery reference.
                  </p>
                </div>
              </div>

              <p className="text-sm leading-7 text-slate-700">
                {formatVendorAddress(vendor)}
              </p>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Notes</h3>
                  <p className="text-sm text-slate-500">
                    Internal remarks for the shop team.
                  </p>
                </div>
              </div>

              <p className="text-sm leading-7 text-slate-700">
                {vendor.notes || "No internal notes added"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
