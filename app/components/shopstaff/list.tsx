//app/components/shopstaff/list.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UserPlus2,
  Users2,
  Mail,
  Phone,
  RefreshCw,
  Eye,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";

type Role = "SHOP_OWNER" | "SHOP_MANAGER" | "SHOP_SUPERVISOR" | "EMPLOYEE";

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
  shopId?: string | { _id?: string; id?: string; $oid?: string };
  shop?: {
    _id?: string;
    name?: string;
  };
  createdAt?: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  items?: unknown[];
  results?: unknown[];
  staff?: unknown[];
  users?: unknown[];
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

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
  return active
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-700";
}

function getId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj._id === "string") return obj._id;
    if (typeof obj.id === "string") return obj.id;
    if (typeof obj.$oid === "string") return obj.$oid;
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readList(json: ApiResponse): ShopStaffItem[] {
  const candidates = [json.data, json.items, json.results, json.staff, json.users];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord) as ShopStaffItem[];
    }

    if (isRecord(candidate)) {
      const nested = [
        candidate.items,
        candidate.results,
        candidate.staff,
        candidate.users,
        candidate.rows,
        candidate.docs,
        candidate.list,
      ];

      for (const sub of nested) {
        if (Array.isArray(sub)) {
          return sub.filter(isRecord) as ShopStaffItem[];
        }
      }
    }
  }

  return [];
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getAppBasePath(role: Role) {
  if (role === "SHOP_OWNER") return "/shopowner";
  if (role === "SHOP_MANAGER") return "/shopmanager";
  if (role === "SHOP_SUPERVISOR") return "/shopsupervisor";
  return "/employee";
}

export default function ShopStaffListPage() {
  const { accessToken, role } = useAuth();

  const currentRole = useMemo(() => String(role || "").toUpperCase() as Role, [role]);
  const appBasePath = useMemo(() => getAppBasePath(currentRole), [currentRole]);

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffList, setStaffList] = useState<ShopStaffItem[]>([]);
  const [search, setSearch] = useState("");

  const canCreate = useMemo(() => {
    return (
      currentRole === "SHOP_OWNER" ||
      currentRole === "SHOP_MANAGER" ||
      currentRole === "SHOP_SUPERVISOR"
    );
  }, [currentRole]);

  const loadSelectedShop = useCallback(() => {
    if (typeof window === "undefined") return;
    setSelectedShopId(window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "");
    setSelectedShopName(window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "");
  }, []);

  const fetchStaff = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      if (!selectedShopId) {
        setStaffList([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const queryUrl = `${baseURL}${SummaryApi.shopstaff_list.url}?shopId=${encodeURIComponent(selectedShopId)}`;

        const response = await fetch(queryUrl, {
          method: SummaryApi.shopstaff_list.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        });

        const json = (await response.json().catch(() => ({}))) as ApiResponse;

        if (!response.ok) {
          toast.error(json?.message || "Failed to load shop staff list");
          setStaffList([]);
          return;
        }

        const rawList = readList(json);
        const normalized = rawList.filter((item) => {
          const itemShopId = getId(item.shopId) || getId(item.shop?._id) || "";
          return itemShopId ? String(itemShopId) === String(selectedShopId) : true;
        });

        setStaffList(normalized);
      } catch (error) {
        console.error(error);
        toast.error("Unable to fetch shop staff list");
        setStaffList([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShopId]
  );

  const handleToggleActive = async (staffId: string) => {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    try {
      const response = await fetch(`${baseURL}${SummaryApi.shopstaff_toggle_active.url(staffId)}`, {
        method: SummaryApi.shopstaff_toggle_active.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        credentials: "include",
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error((json as { message?: string })?.message || "Failed to update staff status");
        return;
      }

      toast.success((json as { message?: string })?.message || "Staff status updated");
      await fetchStaff(true);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update active status");
    }
  };

  const handleDelete = async (staffId: string, staffName?: string) => {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${staffName || "this staff member"}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${baseURL}${SummaryApi.shopstaff_delete.url(staffId)}`, {
        method: SummaryApi.shopstaff_delete.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        credentials: "include",
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error((json as { message?: string })?.message || "Failed to delete staff");
        return;
      }

      toast.success((json as { message?: string })?.message || "Staff deleted successfully");
      await fetchStaff(true);
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete staff");
    }
  };

  useEffect(() => {
    loadSelectedShop();

    const onShopChange = () => loadSelectedShop();
    window.addEventListener("shop-selection-changed", onShopChange);
    window.addEventListener("storage", onShopChange);

    return () => {
      window.removeEventListener("shop-selection-changed", onShopChange);
      window.removeEventListener("storage", onShopChange);
    };
  }, [loadSelectedShop]);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return staffList;

    return staffList.filter((item) => {
      const haystack = [item.name, item.username, item.email, item.mobile, item.additionalNumber, item.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, staffList]);

  const stats = useMemo(() => {
    let managers = 0;
    let supervisors = 0;
    let employees = 0;

    for (const item of staffList) {
      const roleValue = normalizeRole(item.role);
      if (roleValue === "SHOP_MANAGER") managers += 1;
      else if (roleValue === "SHOP_SUPERVISOR") supervisors += 1;
      else if (roleValue === "EMPLOYEE") employees += 1;
    }

    return { total: staffList.length, managers, supervisors, employees };
  }, [staffList]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="rounded-[30px] border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-violet-100 border-t-violet-700">
              <Loader2 className="h-6 w-6 animate-spin text-violet-700" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-slate-500">Loading shop staff...</p>
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

          <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Shop Staff Management
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">Shop Staff List</h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                View staff only for the currently selected shop and manage team members with shop-wise visibility.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-md">
                <Store className="h-4 w-4" />
                Current shop:
                <span className="font-bold text-white">{selectedShopName || "No shop selected"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Total Staff</p><p className="mt-1 text-sm font-semibold text-white">{stats.total}</p></div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Managers</p><p className="mt-1 text-sm font-semibold text-white">{stats.managers}</p></div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Supervisors</p><p className="mt-1 text-sm font-semibold text-white">{stats.supervisors}</p></div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Employees</p><p className="mt-1 text-sm font-semibold text-white">{stats.employees}</p></div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <ShieldCheck className="h-4 w-4 text-violet-700" />
                Staff Directory
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Selected Shop Team</h2>
              <p className="mt-2 text-sm text-slate-500">Only team members linked to the currently selected shop are shown.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, mobile, role..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <button
                type="button"
                onClick={() => void fetchStaff(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              {canCreate ? (
                <Link
                  href={`${appBasePath}/shopstaff/create`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01]"
                >
                  <UserPlus2 className="h-4 w-4" />
                  Create Staff
                </Link>
              ) : null}
            </div>
          </div>

          {!selectedShopId ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Store className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">No shop selected</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Select a shop first from the dashboard switcher, then open this list page to see shop-wise staff.
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Users2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">No staff found</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                There are no staff members for this shop yet, or your search did not match any records.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[26px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">S.No</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Staff</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Role</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contact</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Status</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Created</th>
                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredList.map((item, index) => (
                      <tr key={item._id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">{index + 1}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} alt={item.name || "Staff"} className="h-11 w-11 rounded-2xl object-cover" />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                                <Users2 className="h-5 w-5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{item.name || "Unnamed"}</p>
                              <p className="truncate text-xs text-slate-500">@{item.username || "—"}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getRoleClass(item.role)}`}>
                            {getRoleBadge(item.role)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p className="inline-flex items-center gap-2 text-sm text-slate-700"><Mail className="h-4 w-4 text-slate-400" />{item.email || "—"}</p>
                            <p className="inline-flex items-center gap-2 text-sm text-slate-700"><Phone className="h-4 w-4 text-slate-400" />{item.mobile || "—"}</p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(item.isActive)}`}>
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">{formatDate(item.createdAt)}</td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`${appBasePath}/shopstaff/view/${item._id}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            <Link
                              href={`${appBasePath}/shopstaff/edit/${item._id}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => void handleToggleActive(item._id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              title={item.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDelete(item._id, item.name)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


