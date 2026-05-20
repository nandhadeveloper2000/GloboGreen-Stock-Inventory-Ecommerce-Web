"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type ProductApprovalItem = {
  _id: string;
  itemName?: string;
  itemKey?: string;
  sku?: string;
  approvalStatus?: string;
  createdAt?: string;
  createdByRole?: string;
};

type ProductApprovalResponse = {
  success?: boolean;
  message?: string;
  data?: ProductApprovalItem[];
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function ProductApprovalsPage() {
  const { accessToken } = useAuth();

  const [rows, setRows] = useState<ProductApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    if (!accessToken) {
      setRows([]);
      return;
    }

    setLoading(true);

    try {
      const url =
        typeof SummaryApi.product_pending_approvals.url === "function"
          ? SummaryApi.product_pending_approvals.url(
              query ? { q: query } : undefined
            )
          : SummaryApi.product_pending_approvals.url;

      const res = await fetch(`${baseURL}${url}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = (await res.json()) as ProductApprovalResponse;

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to load pending approvals");
      }

      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load pending approvals"));
    } finally {
      setLoading(false);
    }
  }, [accessToken, query]);

  useEffect(() => {
    void fetchApprovals();
  }, [fetchApprovals]);

  function handleSearch() {
    setQuery(searchInput.trim());
  }

  async function handleApprove(id: string) {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    setActionLoading(`${id}_approve`);

    try {
      const url =
        typeof SummaryApi.product_approve.url === "function"
          ? SummaryApi.product_approve.url(id)
          : SummaryApi.product_approve.url;

      const res = await fetch(`${baseURL}${url}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = await res.json();

      if (json?.success) {
        toast.success("Product approved");
        setRows((prev) => prev.filter((row) => row._id !== id));
      } else {
        toast.error(json?.message || "Approval failed");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Approval failed"));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    setActionLoading(`${id}_reject`);

    try {
      const url =
        typeof SummaryApi.product_reject.url === "function"
          ? SummaryApi.product_reject.url(id)
          : SummaryApi.product_reject.url;

      const res = await fetch(`${baseURL}${url}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      const json = await res.json();

      if (json?.success) {
        toast.success("Product rejected");
        setRows((prev) => prev.filter((row) => row._id !== id));
        setRejectId(null);
        setRejectReason("");
      } else {
        toast.error(json?.message || "Rejection failed");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Rejection failed"));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-6xl">
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                      Product Approvals
                    </h1>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Review shop-side product requests here. After master approval,
                      those approved products become available in the shop product
                      workflow and can be used from My Shop Product.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => void fetchApprovals()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-700">
                  Pending:
                  <span className="ml-1 text-[#00008b]">{rows.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
                  placeholder="Search by product name, product key, or SKU"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSearch();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f]"
              >
                Search
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Store className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-black text-slate-950">
                No pending product approvals
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                New shop-side product submissions will appear here for master review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/80 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Product Key
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Submitted By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {row.itemName || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.itemKey || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.sku || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.createdByRole || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleDateString("en-IN")
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApprove(row._id)}
                            disabled={actionLoading === `${row._id}_approve`}
                            className="flex items-center gap-1 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === `${row._id}_approve` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectId(row._id);
                              setRejectReason("");
                            }}
                            className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">
              Reject Product
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Provide a reason for rejection if needed.
            </p>

            <textarea
              className="mt-4 h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#00008b]/40 focus:ring-4 focus:ring-[#00008b]/10"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleReject(rejectId)}
                disabled={actionLoading === `${rejectId}_reject`}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === `${rejectId}_reject`
                  ? "Rejecting..."
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
