// app/components/shopstaff/view.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  ShieldCheck,
  Trash2,
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
function DetailCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">{icon}</div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <h3 className="mt-1 wrap-break-word text-base font-bold tracking-tight text-slate-900">{value || "—"}</h3>
    </div>
  );
}

export default function ShopStaffViewPage() {
  const router = useRouter();
  const params = useParams();
  const { accessToken, role } = useAuth();

  const staffId = String(params?.id || "");
  const currentRole = useMemo(() => String(role || "").toUpperCase() as Role, [role]);
  const appBasePath = useMemo(() => getAppBasePath(currentRole), [currentRole]);

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<ShopStaffItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleToggleActive = async () => {
    if (!accessToken || !staffId) return;
    try {
      setActionLoading(true);
      const response = await fetch(`${baseURL}${SummaryApi.shopstaff_toggle_active.url(staffId)}`, {
        method: SummaryApi.shopstaff_toggle_active.method,
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        credentials: "include",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error((json as { message?: string })?.message || "Failed to update status");
        return;
      }
      toast.success((json as { message?: string })?.message || "Status updated");
      await fetchStaff();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !staffId || !staff) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${staff.name || "this staff member"}?`);
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const response = await fetch(`${baseURL}${SummaryApi.shopstaff_delete.url(staffId)}`, {
        method: SummaryApi.shopstaff_delete.method,
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        credentials: "include",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error((json as { message?: string })?.message || "Failed to delete staff");
        return;
      }
      toast.success((json as { message?: string })?.message || "Staff deleted successfully");
      router.replace(`${appBasePath}/shopstaff/list`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete staff");
    } finally {
      setActionLoading(false);
    }
  };

  const idProofSrc = staff?.idProofUrl || staff?.idProof?.url || "";

  if (loading) {
    return <div className="page-shell"><div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center"><div className="rounded-[30px] border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-violet-100 border-t-violet-700"><Loader2 className="h-6 w-6 animate-spin text-violet-700" /></div><p className="mt-4 text-center text-sm font-semibold text-slate-500">Loading staff details...</p></div></div></div>;
  }

  if (!staff) {
    return <div className="page-shell"><div className="mx-auto max-w-7xl"><div className="rounded-card border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center"><h2 className="text-2xl font-bold text-slate-900">Staff not found</h2><p className="mt-2 text-sm text-slate-500">The requested staff record could not be loaded.</p><div className="mt-5"><Link href={`${appBasePath}/shopstaff/list`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Back to List</Link></div></div></div></div>;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95"><BadgeCheck className="h-3.5 w-3.5" />Shop Staff Details</span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">{staff.name || "Unnamed Staff"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">View complete account, contact, role, address, and status details.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`${appBasePath}/shopstaff/list`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"><ArrowLeft className="h-4 w-4" />Back</Link>
              <Link href={`${appBasePath}/shopstaff/edit/${staff._id}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"><Pencil className="h-4 w-4" />Edit</Link>
              <button type="button" disabled={actionLoading} onClick={() => void handleToggleActive()} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"><Power className="h-4 w-4" />{staff.isActive ? "Deactivate" : "Activate"}</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleDelete()} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"><Trash2 className="h-4 w-4" />Delete</button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
            <div className="flex flex-col items-center text-center">
              {staff.avatarUrl ? <img src={staff.avatarUrl} alt={staff.name || "Staff"} className="h-32 w-32 rounded-card object-cover shadow-sm" /> : <div className="flex h-32 w-32 items-center justify-center rounded-card bg-violet-100 text-violet-700"><User2 className="h-12 w-12" /></div>}
              <h2 className="mt-5 text-2xl font-bold text-slate-900">{staff.name || "Unnamed"}</h2>
              <p className="mt-1 text-sm text-slate-500">@{staff.username || "—"}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getRoleClass(staff.role)}`}>{getRoleBadge(staff.role)}</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(staff.isActive)}`}>{staff.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <DetailCard icon={<Mail className="h-5 w-5" />} label="Email" value={staff.email || "—"} />
              <DetailCard icon={<Phone className="h-5 w-5" />} label="Mobile" value={staff.mobile || "—"} />
              <DetailCard icon={<ShieldCheck className="h-5 w-5" />} label="Role" value={getRoleBadge(staff.role)} />
              <DetailCard icon={<CalendarDays className="h-5 w-5" />} label="Created On" value={formatDate(staff.createdAt)} />
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
              <div className="mb-5 flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><MapPin className="h-5 w-5" /></div><div><h3 className="text-xl font-bold text-slate-900">Address Information</h3><p className="text-sm text-slate-500">Full shop staff location details.</p></div></div>
              <p className="text-sm leading-7 text-slate-700">{buildAddress(staff.address)}</p>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
              <div className="mb-5 flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><BadgeCheck className="h-5 w-5" /></div><div><h3 className="text-xl font-bold text-slate-900">ID Proof</h3><p className="text-sm text-slate-500">Uploaded identity proof preview.</p></div></div>
              {idProofSrc ? (
                <a href={idProofSrc} target="_blank" rel="noreferrer" className="block">
                  <img src={idProofSrc} alt="ID Proof" className="max-h-[420px] w-full rounded-[22px] border border-slate-200 object-contain bg-slate-50" />
                </a>
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No ID proof uploaded</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
