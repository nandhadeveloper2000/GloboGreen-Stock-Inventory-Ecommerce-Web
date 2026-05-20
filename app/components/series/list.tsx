"use client";

import {
  useCallback, useEffect, useMemo, useState, type ReactNode,
} from "react";
import {
  CalendarDays, CheckCircle2, Loader2, Pencil, Plus, Power,
  RefreshCw, Search, Trash2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import CreateSeriesPage from "./create";

type BrandRef = { _id?: string; name?: string };
type SeriesItem = {
  _id?: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  brandId?: string | BrandRef;
  createdAt?: string;
  updatedAt?: string;
};

type ListResponse = { success?: boolean; message?: string; data?: SeriesItem[]; series?: SeriesItem[] };
type ActionResponse = { success?: boolean; message?: string; data?: SeriesItem };

type ModalState = { open: boolean; mode: "create" | "edit"; id: string };

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ROWS_PER_PAGE = 10;

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getBrandName(brandId?: string | BrandRef): string {
  if (!brandId) return "-";
  if (typeof brandId === "object") return brandId.name || "-";
  return String(brandId);
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const msg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function isValidMongoId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
      <XCircle className="h-3.5 w-3.5" /> Inactive
    </span>
  );
}

function ActionButton({ label, onClick, disabled, variant, children }: {
  label: string; onClick: () => void; disabled?: boolean;
  variant: "edit" | "delete" | "toggleActive" | "toggleInactive"; children: ReactNode;
}) {
  const cls = variant === "edit"
    ? "border-[#00008b]/15 bg-[#00008b]/5 text-[#00008b] hover:border-[#00008b]/25 hover:bg-[#00008b]/10"
    : variant === "delete"
      ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
      : variant === "toggleActive"
        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}>
      {children}
    </button>
  );
}

export default function SeriesListPage() {
  const [items, setItems] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_ROWS_PER_PAGE);
  const [modalState, setModalState] = useState<ModalState>({ open: false, mode: "create", id: "" });

  const fetchSeries = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true); else setRefreshing(true);
      const res = await apiClient.get<ListResponse>(SummaryApi.series_list.url);
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to fetch series");
      const list = res.data.data || res.data.series || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Unable to load series");
      setItems([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchSeries(true); }, [fetchSeries]);
  useEffect(() => { setCurrentPage(1); }, [search, rowsPerPage]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const bn = getBrandName(item.brandId).toLowerCase();
      return item.name?.toLowerCase().includes(q) || item.nameKey?.toLowerCase().includes(q) || bn.includes(q);
    });
  }, [items, search]);

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = useMemo(() => filteredItems.slice(startIndex, startIndex + rowsPerPage), [filteredItems, rowsPerPage, startIndex]);
  const startEntry = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntry = totalEntries === 0 ? 0 : Math.min(startIndex + rowsPerPage, totalEntries);

  function openCreateModal() { setModalState({ open: true, mode: "create", id: "" }); }
  function openEditModal(id?: string) {
    if (!isValidMongoId(id)) { toast.error("Invalid series id"); return; }
    setModalState({ open: true, mode: "edit", id });
  }
  function closeModal() { setModalState({ open: false, mode: "create", id: "" }); }
  async function handleSaved() { closeModal(); await fetchSeries(false); }

  function handleDelete(id?: string) {
    if (!isValidMongoId(id)) { toast.error("Invalid series id"); return; }
    toast("Delete series?", {
      description: "This action will permanently remove the selected record.",
      action: { label: deletingId === id ? "Deleting..." : "Delete", onClick: () => { void performDelete(id); } },
      cancel: { label: "Cancel", onClick: () => undefined },
      duration: 5000,
    });
  }

  async function performDelete(id: string) {
    try {
      setDeletingId(id);
      const url = typeof SummaryApi.series_delete.url === "function" ? SummaryApi.series_delete.url(id) : `${SummaryApi.series_delete.url}/${id}`;
      const res = await apiClient.delete<ActionResponse>(url);
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to delete series");
      toast.success(res.data?.message || "Series deleted successfully");
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err) || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(id?: string, currentStatus?: boolean) {
    if (!isValidMongoId(id)) { toast.error("Invalid series id"); return; }
    try {
      setTogglingId(id);
      const nextStatus = !currentStatus;
      const url = typeof SummaryApi.series_toggle_active.url === "function" ? SummaryApi.series_toggle_active.url(id) : `${SummaryApi.series_toggle_active.url}/${id}`;
      const res = await apiClient.put<ActionResponse>(url, { isActive: nextStatus });
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to update status");
      toast.success(res.data?.message || `Series ${nextStatus ? "activated" : "deactivated"} successfully`);
      setItems((prev) => prev.map((item) => item._id === id ? { ...item, isActive: nextStatus } : item));
    } catch (err) {
      toast.error(getErrorMessage(err) || "Status update failed");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-450">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">Series</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-500">All product series linked to brands. Search, edit, or delete any series.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void fetchSeries(false)} disabled={refreshing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
                </button>
                <button type="button" onClick={openCreateModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f]">
                  <Plus className="h-4 w-4" /> Create Series
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by series name or brand" value={search} onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10" />
              </div>
              <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-700">
                Total: <span className="ml-1 text-[#00008b]">{filteredItems.length}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50/80">
                  <tr>
                    {["S.No", "Series", "Brand", "Name Key", "Status", "Updated", "Actions"].map((h) => (
                      <th key={h} className={`px-4 py-4 text-${h === "Actions" ? "right" : "left"} text-xs font-black uppercase tracking-[0.12em] text-slate-500`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-4 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Search className="h-7 w-7" /></div>
                        <h3 className="mt-4 text-base font-black text-slate-950">No series found</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{search.trim() ? "Try another search keyword." : "Start by creating your first series."}</p>
                      </div>
                    </td></tr>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const itemId = item._id;
                      const isToggling = togglingId === itemId;
                      const isDeleting = deletingId === itemId;
                      return (
                        <tr key={itemId || `row-${index}`} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                          <td className="px-4 py-4 text-sm font-black text-slate-700">{startIndex + index + 1}</td>
                          <td className="px-4 py-4"><p className="text-sm font-black text-slate-950">{item.name}</p></td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">{getBrandName(item.brandId)}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex max-w-45 items-center rounded-full border border-[#00008b]/10 bg-[#00008b]/5 px-2.5 py-1 text-xs font-black text-[#00008b]"><span className="truncate">{item.nameKey || "-"}</span></span>
                          </td>
                          <td className="px-4 py-4"><StatusBadge active={item.isActive} /></td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                            <div className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDate(item.updatedAt || item.createdAt)}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <ActionButton label={item.isActive ? "Deactivate" : "Activate"} variant={item.isActive ? "toggleActive" : "toggleInactive"} disabled={isToggling} onClick={() => void handleToggleStatus(itemId, item.isActive)}>
                                {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                              </ActionButton>
                              <ActionButton label="Edit" variant="edit" onClick={() => openEditModal(itemId)}>
                                <Pencil className="h-4 w-4" />
                              </ActionButton>
                              <ActionButton label="Delete" variant="delete" disabled={isDeleting} onClick={() => handleDelete(itemId)}>
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loading && (
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <label className="inline-flex items-center justify-end gap-2 text-sm font-semibold text-slate-700">
                  Rows per page:
                  <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10">
                    {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                <div className="flex items-center justify-end gap-3">
                  <p className="min-w-21.5 text-right text-sm font-bold text-slate-800">{startEntry}-{endEntry} of {totalEntries}</p>
                  <button type="button" aria-label="Previous page" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1 || totalEntries === 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30">&lt;</button>
                  <button type="button" aria-label="Next page" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalEntries === 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-lg font-black text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-30">&gt;</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {modalState.open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-4" onMouseDown={closeModal}>
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <CreateSeriesPage
              key={`${modalState.mode}-${modalState.id || "new"}`}
              mode={modalState.mode} seriesId={modalState.id}
              isModal onClose={closeModal} onSuccess={handleSaved}
            />
          </div>
        </div>
      )}
    </div>
  );
}
