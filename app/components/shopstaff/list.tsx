/* eslint-disable @next/next/no-img-element */
// app/components/shopstaff/list.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  UserPlus2,
  Users2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import CreateShopStaffPage from "./create";
import ShopStaffViewPage from "./view";

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

type ModalState =
  | { type: "create" }
  | { type: "edit"; id: string }
  | { type: "view"; id: string }
  | null;

type RoleFilter = "ALL" | "SHOP_MANAGER" | "SHOP_SUPERVISOR" | "EMPLOYEE";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

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

  if (value === "SHOP_MANAGER") {
    return "bg-violet-50 text-violet-700 ring-violet-100";
  }

  if (value === "SHOP_SUPERVISOR") {
    return "bg-sky-50 text-sky-700 ring-sky-100";
  }

  if (value === "EMPLOYEE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  return "bg-slate-50 text-slate-700 ring-slate-100";
}

function getStatusClass(active?: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : "bg-rose-50 text-rose-700 ring-rose-100";
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
  const candidates = [
    json.data,
    json.items,
    json.results,
    json.staff,
    json.users,
  ];

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

function StaffModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/50 px-3 py-5 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-950 md:text-lg">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-4 md:p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ShopStaffListPage() {
  const { accessToken, role } = useAuth();

  const currentRole = useMemo(
    () => String(role || "").toUpperCase(),
    [role]
  );

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffList, setStaffList] = useState<ShopStaffItem[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);

  const canCreate = useMemo(() => {
    return (
      currentRole === "SHOP_OWNER" ||
      currentRole === "SHOP_MANAGER" ||
      currentRole === "SHOP_SUPERVISOR"
    );
  }, [currentRole]);

  const closeModal = () => setModal(null);

  const loadSelectedShop = useCallback(() => {
    if (typeof window === "undefined") return;

    setSelectedShopId(window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "");
    setSelectedShopName(
      window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || ""
    );
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

        const queryUrl = `${baseURL}${
          SummaryApi.shopstaff_list.url
        }?shopId=${encodeURIComponent(selectedShopId)}`;

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
          return itemShopId
            ? String(itemShopId) === String(selectedShopId)
            : true;
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

  const refreshAfterModal = async () => {
    await fetchStaff(true);
  };

  const handleToggleActive = async (staffId: string) => {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    try {
      const response = await fetch(
        `${baseURL}${SummaryApi.shopstaff_toggle_active.url(staffId)}`,
        {
          method: SummaryApi.shopstaff_toggle_active.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(
          (json as { message?: string })?.message ||
            "Failed to update staff status"
        );
        return;
      }

      toast.success(
        (json as { message?: string })?.message || "Staff status updated"
      );
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

    const confirmed = window.confirm(
      `Are you sure you want to delete ${staffName || "this staff member"}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${baseURL}${SummaryApi.shopstaff_delete.url(staffId)}`,
        {
          method: SummaryApi.shopstaff_delete.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(
          (json as { message?: string })?.message || "Failed to delete staff"
        );
        return;
      }

      toast.success(
        (json as { message?: string })?.message ||
          "Staff deleted successfully"
      );
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

    return {
      total: staffList.length,
      managers,
      supervisors,
      employees,
    };
  }, [staffList]);

  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staffList.filter((item) => {
      const roleValue = normalizeRole(item.role);
      const activeValue = item.isActive ? "ACTIVE" : "INACTIVE";

      const matchesRole =
        roleFilter === "ALL" ? true : roleValue === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ? true : activeValue === statusFilter;

      const haystack = [
        item.name,
        item.username,
        item.email,
        item.mobile,
        item.additionalNumber,
        item.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = query ? haystack.includes(query) : true;

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [roleFilter, search, staffList, statusFilter]);

  const totalRows = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedList = filteredList.slice(startIndex, endIndex);

  const rangeStart = totalRows === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(endIndex, totalRows);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, rowsPerPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-indigo-100 border-t-[#12008b]">
              <Loader2 className="h-6 w-6 animate-spin text-[#12008b]" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-slate-500">
              Loading shop staff...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 px-5 py-5 md:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#12008b]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Staff Panel
            </span>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
              Shop Staff Management
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Manage staff records for the currently selected shop.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800">
                <Store className="h-4 w-4 text-[#12008b]" />
                {selectedShopName || "No shop selected"}
              </span>

              <span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-[#12008b]">
                Total: {stats.total}
              </span>

              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                Managers: {stats.managers}
              </span>

              <span className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">
                Supervisors: {stats.supervisors}
              </span>

              <span className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
                Employees: {stats.employees}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:pt-3">
            <button
              type="button"
              onClick={() => void fetchStaff(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#12008b] transition hover:bg-slate-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>

            {canCreate ? (
              <button
                type="button"
                onClick={() => setModal({ type: "create" })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#12008b] px-4 text-sm font-bold text-white shadow-[0_16px_34px_rgba(18,0,139,0.18)] transition hover:bg-[#0d0068]"
              >
                <UserPlus2 className="h-4 w-4" />
                Create Staff
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 px-5 py-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, mobile, role..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#12008b] focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <p className="mt-2 text-xs font-medium text-slate-500">
              Search also matches username, additional number, and role fields.
            </p>
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as RoleFilter)
              }
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#12008b] focus:ring-4 focus:ring-indigo-50"
            >
              <option value="ALL">All Roles</option>
              <option value="SHOP_MANAGER">Managers</option>
              <option value="SHOP_SUPERVISOR">Supervisors</option>
              <option value="EMPLOYEE">Employees</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#12008b] focus:ring-4 focus:ring-indigo-50"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {!selectedShopId ? (
          <div className="border-t border-slate-200 px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-[#12008b]">
              <Store className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-lg font-extrabold text-slate-950">
              No shop selected
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Select a shop from the shop switcher, then open this page to view
              shop-wise staff.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="min-w-270 w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      S.No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Staff
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Created
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <Users2 className="h-7 w-7" />
                        </div>

                        <h3 className="mt-4 text-lg font-extrabold text-slate-950">
                          No staff found
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          No staff records matched your current filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((item, index) => (
                      <tr
                        key={item._id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4 text-sm font-bold text-slate-700">
                          {startIndex + index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            {item.avatarUrl ? (
                              <img
                                src={item.avatarUrl}
                                alt={item.name || "Staff"}
                                className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#12008b] ring-1 ring-indigo-100">
                                <Users2 className="h-5 w-5" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-slate-950">
                                {item.name || "Unnamed"}
                              </p>
                              <p className="truncate text-xs font-semibold text-slate-500">
                                @{item.username || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${getRoleClass(
                              item.role
                            )}`}
                          >
                            {getRoleBadge(item.role)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="inline-flex max-w-65 items-center gap-2 truncate text-sm font-medium text-slate-700">
                            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {item.email || "—"}
                            </span>
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {item.mobile || item.additionalNumber || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${getStatusClass(
                              item.isActive
                            )}`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                          {formatDate(item.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setModal({ type: "view", id: item._id })
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-[#12008b]"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setModal({ type: "edit", id: item._id })
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-[#12008b]"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleToggleActive(item._id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-[#12008b]"
                              title={
                                item.isActive ? "Deactivate" : "Activate"
                              }
                            >
                              <Power className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(item._id, item.name)
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-end md:px-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>Rows per page:</span>

                <select
                  value={rowsPerPage}
                  onChange={(event) => setRowsPerPage(Number(event.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-[#12008b] focus:ring-4 focus:ring-indigo-50"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm font-bold text-slate-900 md:justify-start">
                <span>
                  {rangeStart}-{rangeEnd} of {totalRows}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Previous"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {modal?.type === "create" ? (
        <StaffModal title="Create Staff" onClose={closeModal}>
          <CreateShopStaffPage
            isModal
            mode="create"
            onClose={closeModal}
            onSuccess={refreshAfterModal}
          />
        </StaffModal>
      ) : null}

      {modal?.type === "edit" ? (
        <StaffModal title="Edit Staff" onClose={closeModal}>
          <CreateShopStaffPage
            isModal
            mode="edit"
            staffId={modal.id}
            onClose={closeModal}
            onSuccess={refreshAfterModal}
          />
        </StaffModal>
      ) : null}

      {modal?.type === "view" ? (
        <StaffModal title="View Staff" onClose={closeModal}>
          <ShopStaffViewPage
            isModal
            staffId={modal.id}
            onClose={closeModal}
            onEdit={(id) => setModal({ type: "edit", id })}
            onSuccess={refreshAfterModal}
          />
        </StaffModal>
      ) : null}
    </div>
  );
} 