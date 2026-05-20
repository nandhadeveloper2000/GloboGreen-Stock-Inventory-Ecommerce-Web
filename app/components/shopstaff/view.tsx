/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
// app/components/shopstaff/view.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";

type Role = "SHOP_OWNER" | "SHOP_MANAGER" | "SHOP_SUPERVISOR" | "EMPLOYEE";

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
  createdAt?: string;
};

type ApiResponse = { success?: boolean; message?: string; data?: unknown };

function normalizeRole(role?: string | null) { return String(role || "").trim().toUpperCase(); }
function getRoleBadge(role?: string | null) {
  const value = normalizeRole(role);
  if (value === "SHOP_OWNER") return "Shop Owner";
  if (value === "SHOP_MANAGER") return "Shop Manager";
  if (value === "SHOP_SUPERVISOR") return "Shop Supervisor";
  if (value === "EMPLOYEE") return "Employee";
  return "Unknown";
}
function getRoleClass(role?: string | null) {
  const value = normalizeRole(role);
  if (value === "SHOP_MANAGER") return "bg-violet-100 text-violet-700";
  if (value === "SHOP_SUPERVISOR") return "bg-sky-100 text-sky-700";
  if (value === "EMPLOYEE") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}
function getStatusClass(active?: boolean) {
  return active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function readSingle(json: ApiResponse): ShopStaffItem | null {
  if (isRecord(json.data) && isRecord((json.data as Record<string, unknown>).staff)) {
    return (json.data as Record<string, unknown>).staff as ShopStaffItem;
  }
  if (isRecord(json.data)) return json.data as ShopStaffItem;
  return null;
}
function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function buildAddress(address?: Address) {
  if (!address) return "Address not available";
  const parts = [address.area, address.street, address.taluk, address.district, address.state, address.pincode].filter(Boolean);
  return parts.length ? parts.join(", ") : "Address not available";
}
function getAppBasePath(role: Role) {
  if (role === "SHOP_OWNER") return "/shopowner";
  if (role === "SHOP_MANAGER") return "/shopmanager";
  if (role === "SHOP_SUPERVISOR") return "/shopsupervisor";
  return "/employee";
}

type ShopStaffViewPageProps = {
  staffId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onEdit?: (id: string) => void;
  onSuccess?: () => void | Promise<void>;
};


export default function ShopStaffViewPage({
  staffId: propStaffId = "",
  isModal = false,
  onClose,
}: ShopStaffViewPageProps) {
  const params = useParams();
  const { accessToken, role } = useAuth();

  const rawId = params?.id;
  const paramId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");
  const staffId = String(propStaffId || paramId || "").trim();
  const currentRole = useMemo(() => String(role || "").toUpperCase() as Role, [role]);
  const appBasePath = useMemo(() => getAppBasePath(currentRole), [currentRole]);

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<ShopStaffItem | null>(null);

  const fetchStaff = async () => {
    if (!accessToken || !staffId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${baseURL}${SummaryApi.shopstaff_get.url(staffId)}`, {
        method: SummaryApi.shopstaff_get.method,
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        credentials: "include",
        cache: "no-store",
      });

      const json = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok) {
        toast.error(json?.message || "Failed to load staff details");
        setStaff(null);
        return;
      }

      setStaff(readSingle(json));
    } catch (error) {
      console.error(error);
      toast.error("Unable to load staff details");
      setStaff(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchStaff(); }, [staffId, accessToken]);

  const idProofSrc = staff?.idProofUrl || staff?.idProof?.url || "";

  if (loading) {
    return <div className={isModal ? "w-full" : "page-shell"}><div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center"><div className="rounded-[30px] border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-100 border-t-slate-900"><Loader2 className="h-6 w-6 animate-spin text-slate-900" /></div><p className="mt-4 text-center text-sm font-semibold text-slate-500">Loading staff details...</p></div></div></div>;
  }

  if (!staff) {
    return <div className={isModal ? "w-full" : "page-shell"}><div className="mx-auto max-w-7xl"><div className="rounded-card border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center"><h2 className="text-2xl font-bold text-slate-900">Staff not found</h2><p className="mt-2 text-sm text-slate-500">The requested staff record could not be loaded.</p><div className="mt-5">{isModal ? <button type="button" onClick={onClose} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Close</button> : <Link href={`${appBasePath}/shopstaff/list`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Back to List</Link>}</div></div></div></div>;
  }

  return (
    <div className={isModal ? "w-full" : "page-shell"}>
      <div className={isModal ? "w-full" : "mx-auto w-full max-w-7xl"}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">

          {/* Left — avatar, name, username, role, status */}
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col items-center text-center">
              {staff.avatarUrl ? (
                <img src={staff.avatarUrl} alt={staff.name || "Staff"} className="h-32 w-32 rounded-[22px] object-cover shadow-sm" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-[22px] bg-violet-100 text-violet-700">
                  <User2 className="h-12 w-12" />
                </div>
              )}
              <h2 className="mt-5 text-2xl font-bold text-slate-900">{staff.name || "Unnamed"}</h2>
              <p className="mt-1 text-sm text-slate-500">@{staff.username || "—"}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getRoleClass(staff.role)}`}>{getRoleBadge(staff.role)}</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(staff.isActive)}`}>{staff.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>

          {/* Right — single compact card */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">

            {/* 2×2 info grid */}
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Mail className="h-3.5 w-3.5" /></div>
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Email</p><p className="mt-0.5 truncate text-[13px] font-semibold text-slate-900">{staff.email || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Phone className="h-3.5 w-3.5" /></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Mobile</p><p className="mt-0.5 text-[13px] font-semibold text-slate-900">{staff.mobile || "—"}</p></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><ShieldCheck className="h-3.5 w-3.5" /></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Role</p><p className="mt-0.5 text-[13px] font-semibold text-slate-900">{getRoleBadge(staff.role)}</p></div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><CalendarDays className="h-3.5 w-3.5" /></div>
                <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Created On</p><p className="mt-0.5 text-[13px] font-semibold text-slate-900">{formatDate(staff.createdAt)}</p></div>
              </div>
            </div>

            {/* Address */}
            <div className="border-t border-slate-100 px-4 py-3.5">
              <div className="mb-1.5 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-violet-600" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Address</p>
              </div>
              <p className="text-[13px] leading-6 text-slate-700">{buildAddress(staff.address)}</p>
            </div>

            {/* ID Proof */}
            <div className="border-t border-slate-100 px-4 py-3.5">
              <div className="mb-2 flex items-center gap-2">
                <BadgeCheck className="h-3.5 w-3.5 text-violet-600" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">ID Proof</p>
              </div>
              {idProofSrc ? (
                <a href={idProofSrc} target="_blank" rel="noreferrer" className="block">
                  <img src={idProofSrc} alt="ID Proof" className="max-h-52 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />
                </a>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-[13px] text-slate-400">No ID proof uploaded</div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
