"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Store,
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


type VendorViewPageProps = {
  embedded?: boolean;
  vendorId?: string;
  onClose?: () => void;
};

export default function VendorViewPage({
  embedded = false,
  vendorId: propVendorId = "",
  onClose,
}: VendorViewPageProps) {
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const vendorId = String(propVendorId || searchParams.get("id") || "").trim();

  const [vendor, setVendor] = useState<VendorItem | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className={embedded ? "w-full" : "page-shell"}>
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
      <div className={embedded ? "w-full" : "page-shell"}>
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
              {embedded ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Close
                </button>
              ) : (
                <Link
                  href="/shopowner/vendors/list"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Vendor List
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "w-full" : "page-shell"}>
      <div className={embedded ? "w-full space-y-5" : "mx-auto w-full max-w-7xl space-y-5"}>


        {/* ── Body ── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">

          {/* Left — icon, name, contact person, status */}
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-[22px] bg-violet-100 text-violet-700">
                <Building2 className="h-10 w-10" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900">{vendor.vendorName || "Unnamed"}</h2>
              <p className="mt-1 text-sm text-slate-500">{vendor.contactPerson || "No contact person"}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(vendor.status)}`}>
                  {String(vendor.status || "ACTIVE").toLowerCase().replace(/^./, (v) => v.toUpperCase())}
                </span>
              </div>
            </div>
          </div>

          {/* Right — single compact card */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">

            {/* 3×2 info grid */}
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><User2 className="h-3.5 w-3.5" /></div>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Contact</p><p className="mt-0.5 truncate text-[13px] font-semibold text-slate-900">{vendor.contactPerson || "-"}</p></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Phone className="h-3.5 w-3.5" /></div>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Mobile</p><p className="mt-0.5 truncate text-[13px] font-semibold text-slate-900">{vendor.mobile || "-"}</p></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Mail className="h-3.5 w-3.5" /></div>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Email</p><p className="mt-0.5 truncate text-[13px] font-semibold text-slate-900">{vendor.email || "-"}</p></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><CalendarDays className="h-3.5 w-3.5" /></div>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Updated On</p><p className="mt-0.5 text-[13px] font-semibold text-slate-900">{formatDate(vendor.updatedAt || vendor.createdAt)}</p></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Building2 className="h-3.5 w-3.5" /></div>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Vendor Code</p><p className="mt-0.5 text-[13px] font-semibold text-slate-900">{vendor.code || "-"}</p></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><MapPin className="h-3.5 w-3.5" /></div>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">State</p><p className="mt-0.5 text-[13px] font-semibold text-slate-900">{getVendorState(vendor) || "-"}</p></div>
              </div>
            </div>

            {/* GST */}
            <div className="border-t border-slate-100 px-4 py-3.5">
              <div className="mb-1.5 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-violet-600" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">GST Number</p>
              </div>
              <p className="text-[13px] font-semibold text-slate-900">{vendor.gstNumber || "No GST number added"}</p>
            </div>

            {/* Address */}
            <div className="border-t border-slate-100 px-4 py-3.5">
              <div className="mb-1.5 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-violet-600" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Address</p>
              </div>
              <p className="text-[13px] leading-6 text-slate-700">{formatVendorAddress(vendor)}</p>
            </div>

            {/* Notes */}
            <div className="border-t border-slate-100 px-4 py-3.5">
              <div className="mb-1.5 flex items-center gap-2">
                <Store className="h-3.5 w-3.5 text-violet-600" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Notes</p>
              </div>
              <p className="text-[13px] leading-6 text-slate-700">{vendor.notes || "No internal notes added"}</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
