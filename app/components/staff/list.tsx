"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  Pencil,
  Trash2,
  Loader2,
  Search,
  Users,
  ShieldCheck,
  CircleOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type TeamMember = {
  _id: string;
  name: string;
  username: string;
  email?: string;
  role: string;
  avatarUrl?: string;
  isActive?: boolean;
};

type AppRole = "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF";

function normalizeRole(role?: string | null): AppRole {
  const value = String(role || "").toUpperCase();

  if (value === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (value === "MANAGER") return "MANAGER";
  if (value === "SUPERVISOR") return "SUPERVISOR";
  return "STAFF";
}

function normalizeItemRole(role?: string | null) {
  return String(role || "").toUpperCase();
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
  if (item.avatarUrl && item.avatarUrl.trim() !== "") {
    return item.avatarUrl;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    item.name || "User"
  )}&background=082a5e&color=ffffff`;
}

function getPanelBasePath(role: AppRole) {
  if (role === "MASTER_ADMIN") return "/master";
  if (role === "MANAGER") return "/subadmin";
  if (role === "SUPERVISOR") return "/supervisor";
  return "/staff";
}

function getPageTitle(role: AppRole) {
  if (role === "MASTER_ADMIN") return "Team List";
  if (role === "MANAGER") return "Supervisor & Staff List";
  if (role === "SUPERVISOR") return "Staff List";
  return "My Team";
}

function getPageDescription(role: AppRole) {
  if (role === "MASTER_ADMIN") {
    return "Manage managers, supervisors, and staff from one clean dashboard.";
  }

  if (role === "MANAGER") {
    return "Manage supervisors and staff created under your account.";
  }

  if (role === "SUPERVISOR") {
    return "Manage staff created under your supervision.";
  }

  return "View your accessible team records.";
}

function getAllowedVisibleRoles(role: AppRole) {
  if (role === "MASTER_ADMIN") return ["MANAGER", "SUPERVISOR", "STAFF"];
  if (role === "MANAGER") return ["SUPERVISOR", "STAFF"];
  if (role === "SUPERVISOR") return ["STAFF"];
  return ["STAFF"];
}

function buildRoleAwareEditHref(panelBasePath: string, item: TeamMember) {
  const itemRole = normalizeItemRole(item.role);

  if (itemRole === "MANAGER") {
    return `${panelBasePath}/subadmin/edit/${item._id}`;
  }

  if (itemRole === "SUPERVISOR") {
    return `${panelBasePath}/supervisor/edit/${item._id}`;
  }

  return `${panelBasePath}/staff/edit/${item._id}`;
}

export default function StaffListPage() {
  const auth = useAuth();
  const accessToken = auth?.accessToken ?? null;

  const currentRole = normalizeRole(
    (auth as { role?: string | null; user?: { role?: string | null } })?.role ||
      (auth as { user?: { role?: string | null } })?.user?.role
  );

  const [data, setData] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const panelBasePath = useMemo(() => getPanelBasePath(currentRole), [currentRole]);
  const allowedRoles = useMemo(
    () => getAllowedVisibleRoles(currentRole),
    [currentRole]
  );

  const fetchJson = useCallback(
    async (url: string) => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      return res.json();
    },
    [accessToken]
  );

  const fetchTeam = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);

      let combined: TeamMember[] = [];

      if (currentRole === "MASTER_ADMIN") {
        const [subadminsRes, supervisorsRes, staffRes] = await Promise.all([
          fetchJson(`${baseURL}${SummaryApi.master_all_subadmin.url}`),
          fetchJson(`${baseURL}${SummaryApi.supervisor_list.url}`),
          fetchJson(`${baseURL}${SummaryApi.staff_list.url}`),
        ]);

        combined = [
          ...(Array.isArray(subadminsRes?.data) ? subadminsRes.data : []).map(
            (item: TeamMember) => ({
              ...item,
              role: normalizeItemRole(item.role || "MANAGER"),
            })
          ),
          ...(Array.isArray(supervisorsRes?.data) ? supervisorsRes.data : []).map(
            (item: TeamMember) => ({
              ...item,
              role: normalizeItemRole(item.role || "SUPERVISOR"),
            })
          ),
          ...(Array.isArray(staffRes?.data) ? staffRes.data : []).map(
            (item: TeamMember) => ({
              ...item,
              role: normalizeItemRole(item.role || "STAFF"),
            })
          ),
        ];
      } else if (currentRole === "MANAGER") {
        const [supervisorsRes, staffRes] = await Promise.all([
          fetchJson(`${baseURL}${SummaryApi.supervisor_list.url}`),
          fetchJson(`${baseURL}${SummaryApi.staff_list.url}`),
        ]);

        combined = [
          ...(Array.isArray(supervisorsRes?.data) ? supervisorsRes.data : []).map(
            (item: TeamMember) => ({
              ...item,
              role: normalizeItemRole(item.role || "SUPERVISOR"),
            })
          ),
          ...(Array.isArray(staffRes?.data) ? staffRes.data : []).map(
            (item: TeamMember) => ({
              ...item,
              role: normalizeItemRole(item.role || "STAFF"),
            })
          ),
        ];
      } else if (currentRole === "SUPERVISOR") {
        const staffRes = await fetchJson(`${baseURL}${SummaryApi.staff_list.url}`);

        combined = (Array.isArray(staffRes?.data) ? staffRes.data : []).map(
          (item: TeamMember) => ({
            ...item,
            role: normalizeItemRole(item.role || "STAFF"),
          })
        );
      } else {
        const selfRes = await fetchJson(`${baseURL}${SummaryApi.staff_me.url}`);

        combined = selfRes?.data
          ? [
              {
                ...selfRes.data,
                role: normalizeItemRole(selfRes.data.role || "STAFF"),
              },
            ]
          : [];
      }

      setData(combined);
    } catch {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentRole, fetchJson]);

  useEffect(() => {
    if (accessToken) {
      fetchTeam();
    }
  }, [accessToken, fetchTeam]);

  const handleDelete = async (item: TeamMember) => {
    const confirmed = window.confirm(`Delete this ${item.role.toLowerCase()}?`);
    if (!confirmed) return;

    try {
      setActionLoading(item._id);

      const itemRole = normalizeItemRole(item.role);

      let url = "";
      if (itemRole === "MANAGER") {
        url = `${baseURL}${SummaryApi.master_delete_subadmin.url(item._id)}`;
      } else if (itemRole === "SUPERVISOR") {
        url = `${baseURL}${SummaryApi.supervisor_delete.url(item._id)}`;
      } else {
        url = `${baseURL}${SummaryApi.staff_delete.url(item._id)}`;
      }

      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Deleted successfully");
        fetchTeam();
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async (item: TeamMember) => {
    try {
      setActionLoading(item._id);

      const itemRole = normalizeItemRole(item.role);
      const current = item.isActive ?? true;

      let url = "";
      if (itemRole === "MANAGER") {
        url = `${baseURL}/api/subadmins/${item._id}/activate`;
      } else if (itemRole === "SUPERVISOR") {
        url = `${baseURL}/api/supervisors/${item._id}/activate`;
      } else {
        url = `${baseURL}/api/staff/${item._id}/activate`;
      }

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !current }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Status updated");
        fetchTeam();
      } else {
        toast.error(result.message || "Status update failed");
      }
    } catch {
      toast.error("Status update failed");
    } finally {
      setActionLoading(null);
    }
  };

  const visibleRoleFilteredData = useMemo(() => {
    return data.filter((item) =>
      allowedRoles.includes(normalizeItemRole(item.role))
    );
  }, [data, allowedRoles]);

  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return visibleRoleFilteredData;

    return visibleRoleFilteredData.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const username = item.username?.toLowerCase() || "";
      const role = item.role?.toLowerCase() || "";
      const email = item.email?.toLowerCase() || "";

      return (
        name.includes(term) ||
        username.includes(term) ||
        role.includes(term) ||
        email.includes(term)
      );
    });
  }, [visibleRoleFilteredData, search]);

  const totalCount = visibleRoleFilteredData.length;
  const activeCount = visibleRoleFilteredData.filter(
    (item) => item.isActive ?? true
  ).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-r from-[#082a5e] to-[#9116a1] text-white shadow-[0_20px_60px_rgba(8,42,94,0.25)]">
          <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" />
                Team Management
              </div>

              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {getPageTitle(currentRole)}
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
                {getPageDescription(currentRole)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Total</p>
                <p className="mt-2 text-2xl font-bold">{totalCount}</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Active</p>
                <p className="mt-2 text-2xl font-bold">{activeCount}</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-xs text-white/70">Inactive</p>
                <p className="mt-2 text-2xl font-bold">{inactiveCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Directory</h2>
              <p className="text-sm text-slate-500">
                Search by name, username, email, or role.
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#9116a1] focus:bg-white focus:ring-4 focus:ring-fuchsia-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading records...
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <CircleOff className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                No records found
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                No records match your current search.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-5 py-4 font-semibold">S.No</th>
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredData.map((item, index) => {
                    const isBusy = actionLoading === item._id;
                    const isActive = item.isActive ?? true;

                    return (
                      <tr
                        key={`${item.role}-${item._id}`}
                        className="border-b border-slate-100 transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 font-medium text-slate-700">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-slate-100">
                              <Image
                                src={getAvatarSrc(item)}
                                alt={item.name || "Avatar"}
                                fill
                                sizes="44px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {item.name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                @{item.username}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                              item.role
                            )}`}
                          >
                            {normalizeItemRole(item.role)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleStatus(item)}
                              disabled={isBusy}
                              className={`relative h-7 w-12 rounded-full transition ${
                                isActive ? "bg-emerald-500" : "bg-slate-300"
                              } ${isBusy ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              <span
                                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                                  isActive ? "left-6" : "left-1"
                                }`}
                              />
                            </button>

                            <span
                              className={`text-xs font-semibold ${
                                isActive ? "text-emerald-600" : "text-slate-500"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={buildRoleAwareEditHref(panelBasePath, item)}>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-xl border-slate-200 px-3"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>

                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item)}
                              disabled={isBusy}
                              className="h-9 rounded-xl px-3"
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!loading && filteredData.length > 0 && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                <Users className="h-5 w-5 text-slate-700" />
              </div>
              <p className="text-sm text-slate-500">Visible records</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {filteredData.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-500">Currently active</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {filteredData.filter((item) => item.isActive ?? true).length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                <CircleOff className="h-5 w-5 text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">Currently inactive</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {filteredData.filter((item) => !(item.isActive ?? true)).length}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}