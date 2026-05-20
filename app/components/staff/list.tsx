/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CircleOff,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import CreateStaffPage from "./create";

type TeamMember = {
  _id: string;
  name: string;
  username: string;
  email?: string;
  role: string;
  avatarUrl?: string;
  avatar?: string;
  isActive?: boolean;
};

type AppRole = "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF";

type ApiListResponse = {
  success?: boolean;
  message?: string;
  data?: TeamMember[];
};

type ApiActionResponse = {
  success?: boolean;
  message?: string;
  data?: TeamMember;
};

type ConfirmState =
  | {
      type: "delete";
      item: TeamMember;
    }
  | {
      type: "status";
      item: TeamMember;
    }
  | null;

type StaffModalState =
  | {
      mode: "create";
      staffId?: string;
    }
  | {
      mode: "edit";
      staffId: string;
    }
  | null;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ROWS_PER_PAGE = 10;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeRole(role?: string | null): AppRole {
  const value = String(role || "").trim().toUpperCase();

  if (value === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (value === "MANAGER") return "MANAGER";
  if (value === "SUPERVISOR") return "SUPERVISOR";

  return "STAFF";
}

function normalizeItemRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

function getRoleBadgeClass(role: string) {
  const value = normalizeItemRole(role);

  if (value === "MANAGER") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "SUPERVISOR") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (value === "STAFF") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getAvatarSrc(item: TeamMember) {
  const uploadedAvatar = String(item.avatarUrl || item.avatar || "").trim();

  if (uploadedAvatar) return uploadedAvatar;

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    item.name || "User"
  )}&background=00008b&color=ffffff`;
}

function getPageTitle(role: AppRole) {
  if (role === "STAFF") return "My Profile";
  return "Staff List";
}

function getPageDescription(role: AppRole) {
  if (role === "MASTER_ADMIN") {
    return "Manage managers, supervisors, and staff records.";
  }

  if (role === "MANAGER") {
    return "Manage supervisor and staff records under your access.";
  }

  if (role === "SUPERVISOR") {
    return "Manage staff records under your supervision.";
  }

  return "View your staff profile details.";
}

function getAllowedVisibleRoles(role: AppRole) {
  if (role === "MASTER_ADMIN") return ["MANAGER", "SUPERVISOR", "STAFF"];
  if (role === "MANAGER") return ["SUPERVISOR", "STAFF"];
  if (role === "SUPERVISOR") return ["STAFF"];

  return ["STAFF"];
}

function normalizeList(items?: TeamMember[]) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    role: normalizeItemRole(item.role),
  }));
}

async function readJsonSafe<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  const err = error as any;

  if (err?.response?.data?.message) return String(err.response.data.message);
  if (err?.message) return String(err.message);

  return fallback;
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
      <ShieldCheck className="h-3.5 w-3.5" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
      <CircleOff className="h-3.5 w-3.5" />
      Inactive
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: "edit" | "delete" | "toggleActive" | "toggleInactive";
  children: ReactNode;
}) {
  const className =
    variant === "edit"
      ? "border-slate-200 bg-white text-slate-700 hover:border-[#00008b]/25 hover:bg-[#00008b]/5 hover:text-[#00008b]"
      : variant === "delete"
        ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
        : variant === "toggleActive"
          ? "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
          : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function ConfirmModal({
  state,
  loading,
  onClose,
  onConfirm,
}: {
  state: ConfirmState;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!state) return null;

  const isDelete = state.type === "delete";
  const isActive = state.item.isActive ?? true;

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-bold text-slate-900">
            {isDelete ? "Delete Staff" : "Change Status"}
          </h3>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm leading-6 text-slate-600">
            {isDelete
              ? "Are you sure you want to delete this staff record?"
              : `Are you sure you want to ${
                  isActive ? "deactivate" : "activate"
                } this staff record?`}
          </p>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Staff
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {state.item.name || "-"}
            </p>
            <p className="text-xs text-slate-500">
              {normalizeItemRole(state.item.role)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60",
              isDelete ? "bg-rose-600 hover:bg-rose-700" : "bg-[#00008b] hover:bg-[#000070]"
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isDelete ? "Delete" : isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffListPage() {
  const auth = useAuth();
  const accessToken = (auth as any)?.accessToken ?? null;

  const currentRole = normalizeRole(
    (auth as any)?.role || (auth as any)?.user?.role
  );

  const canManageStaff = currentRole !== "STAFF";

  const [data, setData] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [staffModal, setStaffModal] = useState<StaffModalState>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    DEFAULT_ROWS_PER_PAGE
  );

  const allowedRoles = useMemo(
    () => getAllowedVisibleRoles(currentRole),
    [currentRole]
  );

  const fetchTeam = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setData([]);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${baseURL}${SummaryApi.staff_list.url}`, {
        method: SummaryApi.staff_list.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await readJsonSafe<ApiListResponse>(res);

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load staff records");
      }

      setData(normalizeList(result.data));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load records"));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchTeam();
  }, [fetchTeam]);

  const visibleRoleFilteredData = useMemo(() => {
    return data.filter((item) =>
      allowedRoles.includes(normalizeItemRole(item.role))
    );
  }, [data, allowedRoles]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return visibleRoleFilteredData;

    return visibleRoleFilteredData.filter((item) => {
      const searchableText = [item.name, item.username, item.email, item.role]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchableText.includes(term);
    });
  }, [visibleRoleFilteredData, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, rowsPerPage]);

  const totalCount = visibleRoleFilteredData.length;

  const activeCount = visibleRoleFilteredData.filter(
    (item) => item.isActive ?? true
  ).length;

  const inactiveCount = totalCount - activeCount;

  const totalEntries = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * rowsPerPage;

  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, startIndex, rowsPerPage]);

  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry =
    totalEntries === 0 ? 0 : Math.min(startIndex + rowsPerPage, totalEntries);

  async function handleToggleStatus(item: TeamMember) {
    if (!accessToken) {
      toast.error("Unauthorized");
      return;
    }

    const currentStatus = item.isActive ?? true;

    try {
      setActionLoading(true);

      const endpoint = SummaryApi.staff_toggle_active.url(item._id);

      const res = await fetch(`${baseURL}${endpoint}`, {
        method: SummaryApi.staff_toggle_active.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const result = await readJsonSafe<ApiActionResponse>(res);

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Status update failed");
      }

      const nextIsActive = result?.data?.isActive ?? !currentStatus;

      setData((prev) =>
        prev.map((row) =>
          row._id === item._id ? { ...row, isActive: nextIsActive } : row
        )
      );

      toast.success(
        nextIsActive
          ? "Staff activated successfully"
          : "Staff deactivated successfully"
      );

      setConfirmState(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Status update failed"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(item: TeamMember) {
    if (!accessToken) {
      toast.error("Unauthorized");
      return;
    }

    try {
      setActionLoading(true);

      const endpoint = SummaryApi.staff_delete.url(item._id);

      const res = await fetch(`${baseURL}${endpoint}`, {
        method: SummaryApi.staff_delete.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await readJsonSafe<ApiActionResponse>(res);

      if (!res.ok || !result?.success) {
        throw new Error(result?.message || "Delete failed");
      }

      toast.success("Deleted successfully");
      setConfirmState(null);
      await fetchTeam();
    } catch (error) {
      toast.error(getErrorMessage(error, "Delete failed"));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmState) return;

    if (confirmState.type === "delete") {
      await handleDelete(confirmState.item);
      return;
    }

    await handleToggleStatus(confirmState.item);
  }

  async function handleStaffModalSuccess() {
    await fetchTeam();
    setStaffModal(null);
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-9xl">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#00008b]/5 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#00008b]">
                  <Users className="h-3.5 w-3.5" />
                  {canManageStaff ? "Team Management" : "Profile Overview"}
                </span>

                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                    {getPageTitle(currentRole)}
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {getPageDescription(currentRole)}
                  </p>
                </div>
              </div>

              {canManageStaff ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void fetchTeam()}
                    disabled={loading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={cn("h-4 w-4", loading && "animate-spin")}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => setStaffModal({ mode: "create" })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f]"
                  >
                    <Plus className="h-4 w-4" />
                    Add Staff
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700">
                Total: <span className="ml-1 text-[#00008b]">{totalCount}</span>
              </span>

              <span className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">
                Active: <span className="ml-1">{activeCount}</span>
              </span>

              <span className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700">
                Inactive: <span className="ml-1">{inactiveCount}</span>
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  placeholder="Search by name, username, email, or role"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                />
              </div>

              <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-700">
                Total:
                <span className="ml-1 text-[#00008b]">{totalEntries}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading records...
              </div>
            </div>
          ) : totalEntries === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CircleOff className="h-7 w-7" />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                No records found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No records match your current search.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="w-20 px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          S.No
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Name
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Role
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Status
                        </th>
                        {canManageStaff ? (
                          <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            Actions
                          </th>
                        ) : null}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {paginatedData.map((item, index) => {
                        const isActive = item.isActive ?? true;

                        return (
                          <tr key={item._id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-4 font-semibold text-slate-600">
                              {startIndex + index + 1}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={getAvatarSrc(item)}
                                    alt={item.name || "Avatar"}
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-bold text-slate-900">
                                    {item.name || "-"}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">
                                    @{item.username || "-"}
                                  </p>
                                  {item.email ? (
                                    <p className="truncate text-xs text-slate-400">
                                      {item.email}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
                                  getRoleBadgeClass(item.role)
                                )}
                              >
                                {normalizeItemRole(item.role)}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <StatusBadge active={isActive} />
                            </td>

                            {canManageStaff ? (
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <ActionButton
                                    label="Edit"
                                    variant="edit"
                                    onClick={() =>
                                      setStaffModal({
                                        mode: "edit",
                                        staffId: item._id,
                                      })
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </ActionButton>

                                  <ActionButton
                                    label={
                                      isActive ? "Deactivate" : "Activate"
                                    }
                                    variant={
                                      isActive
                                        ? "toggleActive"
                                        : "toggleInactive"
                                    }
                                    disabled={actionLoading}
                                    onClick={() =>
                                      setConfirmState({
                                        type: "status",
                                        item,
                                      })
                                    }
                                  >
                                    <Power className="h-4 w-4" />
                                  </ActionButton>

                                  <ActionButton
                                    label="Delete"
                                    variant="delete"
                                    disabled={actionLoading}
                                    onClick={() =>
                                      setConfirmState({
                                        type: "delete",
                                        item,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </ActionButton>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
                {paginatedData.map((item, index) => {
                  const isActive = item.isActive ?? true;

                  return (
                    <div
                      key={item._id}
                      className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getAvatarSrc(item)}
                            alt={item.name || "Avatar"}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-500">
                                #{startIndex + index + 1}
                              </p>
                              <h3 className="truncate text-sm font-bold text-slate-900">
                                {item.name || "-"}
                              </h3>
                              <p className="truncate text-xs text-slate-500">
                                @{item.username || "-"}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {item.email || "-"}
                              </p>
                            </div>

                            <StatusBadge active={isActive} />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold",
                                getRoleBadgeClass(item.role)
                              )}
                            >
                              {normalizeItemRole(item.role)}
                            </span>

                            {canManageStaff ? (
                              <div className="ml-auto flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStaffModal({
                                      mode: "edit",
                                      staffId: item._id,
                                    })
                                  }
                                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmState({
                                      type: "status",
                                      item,
                                    })
                                  }
                                  disabled={actionLoading}
                                  className={cn(
                                    "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border bg-white px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60",
                                    isActive
                                      ? "border-amber-200 text-amber-700"
                                      : "border-emerald-200 text-emerald-700"
                                  )}
                                >
                                  <Power className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmState({
                                      type: "delete",
                                      item,
                                    })
                                  }
                                  disabled={actionLoading}
                                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <label className="inline-flex items-center justify-end gap-2 text-sm font-semibold text-slate-700">
                    Rows per page:
                    <select
                      value={rowsPerPage}
                      onChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center justify-end gap-3">
                    <p className="min-w-21.5 text-right text-sm font-bold text-slate-800">
                      {startEntry}-{endEntry} of {totalEntries}
                    </p>

                    <button
                      type="button"
                      aria-label="Previous page"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1 || totalEntries === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      &lt;
                    </button>

                    <button
                      type="button"
                      aria-label="Next page"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={
                        currentPage === totalPages || totalEntries === 0
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmModal
        state={confirmState}
        loading={actionLoading}
        onClose={() => setConfirmState(null)}
        onConfirm={() => void handleConfirmAction()}
      />

      {staffModal ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={() => {
            if (!actionLoading) setStaffModal(null);
          }}
        >
          <div
            className="relative my-2 w-full max-w-5xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <CreateStaffPage
              key={`${staffModal.mode}-${staffModal.staffId || "new"}`}
              mode={staffModal.mode}
              staffId={staffModal.staffId || ""}
              asModal
              onClose={() => setStaffModal(null)}
              onSuccess={handleStaffModalSuccess}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}