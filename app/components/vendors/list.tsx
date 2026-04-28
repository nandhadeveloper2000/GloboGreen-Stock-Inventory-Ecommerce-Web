"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Eye,
  Loader2,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Store,
  Trash2,
  UserPlus2,
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
  gstState?: string;
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
  count?: number;
  data?: VendorItem[];
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "" };
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
  };
}

function getStatusClass(status?: string) {
  return String(status || "").toUpperCase() === "INACTIVE"
    ? "premium-badge-inactive"
    : "premium-badge-active";
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
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

function getVendorAddressText(vendor?: VendorItem | null) {
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

  return parts.join(" ");
}

export default function VendorListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | VendorStatus>("ALL");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const syncSelectedShop = useCallback(() => {
    const shop = readSelectedShop();
    setSelectedShopId(shop.id);
    setSelectedShopName(shop.name);
  }, []);

  const fetchVendors = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId) {
        setVendors([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const endpoint = SummaryApi.vendors.listByShop(selectedShopId);

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

        if (!response.ok || !Array.isArray(result?.data)) {
          toast.error(result?.message || "Failed to load vendors");
          setVendors([]);
          return;
        }

        setVendors(result.data);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load vendors");
        setVendors([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShopId]
  );

  useEffect(() => {
    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  const filteredVendors = useMemo(() => {
    const query = normalizeText(search);

    return vendors.filter((vendor) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        String(vendor.status || "ACTIVE").toUpperCase() === statusFilter;

      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [
        vendor.code,
        vendor.vendorName,
        vendor.contactPerson,
        vendor.email,
        vendor.mobile,
        vendor.gstNumber,
        vendor.gstState,
        getVendorState(vendor),
        getVendorAddressText(vendor),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, statusFilter, vendors]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVendors.length / rowsPerPage)
  );

  const paginatedVendors = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredVendors.slice(start, start + rowsPerPage);
  }, [filteredVendors, page, rowsPerPage]);

  const paginationStart =
    filteredVendors.length === 0 ? 0 : page * rowsPerPage + 1;

  const paginationEnd = Math.min(
    filteredVendors.length,
    page * rowsPerPage + rowsPerPage
  );

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, selectedShopId]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const active = vendors.filter(
      (vendor) => String(vendor.status || "ACTIVE").toUpperCase() === "ACTIVE"
    ).length;

    const inactive = vendors.length - active;

    return {
      total: vendors.length,
      active,
      inactive,
    };
  }, [vendors]);

  async function handleStatusToggle(vendor: VendorItem) {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    const nextStatus =
      String(vendor.status || "ACTIVE").toUpperCase() === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    try {
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
      await fetchVendors(true);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update vendor status");
    }
  }

  async function handleDelete(vendor: VendorItem) {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    const confirmed = window.confirm(
      `Deactivate ${vendor.vendorName || "this vendor"}?`
    );

    if (!confirmed) return;

    try {
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
      await fetchVendors(true);
    } catch (error) {
      console.error(error);
      toast.error("Unable to deactivate vendor");
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="premium-card-solid w-full px-8 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-[var(--primary-soft-2)] border-t-[var(--primary)]">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
            </div>

            <p className="mt-4 text-sm font-semibold text-secondary-text">
              Loading vendors...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="w-full">
        <section className="premium-card-solid overflow-hidden rounded-[20px]">
          <div className="border-b border-token px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(46,49,146,0.14)] bg-[var(--primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                  <Building2 className="h-3.5 w-3.5" />
                  Vendor Panel
                </div>

                <h1 className="mt-3 text-[24px] font-bold tracking-tight text-heading md:text-[26px]">
                  Suppliers / Vendor Management
                </h1>

                <p className="mt-1.5 text-[13px] text-secondary-text">
                  Manage supplier and vendor records for the currently selected
                  shop.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-token bg-soft-token px-3 text-[12px] font-semibold text-primary-text">
                    <Store className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {selectedShopName || "No shop selected"}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-[var(--primary-soft)] px-3 text-[12px] font-semibold text-[var(--primary)]">
                    Total: {stats.total}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-[var(--success-soft)] px-3 text-[12px] font-semibold text-[var(--success-dark)]">
                    Active: {stats.active}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-[var(--danger-soft)] px-3 text-[12px] font-semibold text-[var(--danger)]">
                    Inactive: {stats.inactive}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchVendors(true)}
                  className="premium-btn-secondary h-10 rounded-lg px-4 py-0 text-[13px]"
                >
                  <RefreshCw
                    className={classNames(
                      "h-4 w-4",
                      refreshing && "animate-spin"
                    )}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <Link
                  href="/shopowner/vendors/create"
                  className="premium-btn h-10 rounded-lg px-4 py-0 text-[13px]"
                >
                  <UserPlus2 className="h-4 w-4" />
                  Add Supplier
                </Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_160px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, GST, GST state, phone, email"
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                />
              </div>

              <div className="flex h-10 flex-col items-center justify-center rounded-lg border border-[rgba(46,49,146,0.18)] bg-[var(--primary-soft)] px-3 text-center">
                <span className="text-[10px] font-semibold text-secondary-text">
                  Search by
                </span>

                <span className="text-[12px] font-bold text-[var(--primary)]">
                  GST / State
                </span>
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | VendorStatus)
                }
                className="premium-select h-10 rounded-lg px-3 text-[13px]"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <p className="mt-2.5 text-[11px] text-secondary-text">
              Search also matches contact person, email, phone, GST number, GST
              state, and address fields.
            </p>
          </div>

          {!selectedShopId ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <Store className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No shop selected
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Select a shop first to view vendor records linked to that shop.
              </p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <Building2 className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No vendors found
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Add a supplier or adjust the search and status filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse">
                  <thead className="bg-soft-token">
                    <tr>
                      {[
                        "S.No",
                        "Code",
                        "Name",
                        "Contact",
                        "Email",
                        "Phone",
                        "GST",
                        "GST State",
                        "Status",
                        "Address",
                        "Notes",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={classNames(
                            "border-b border-token px-3 py-3 text-[11px] font-bold text-primary-text",
                            heading === "Actions" ? "text-center" : "text-left"
                          )}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--divider)] bg-card-token">
                    {paginatedVendors.map((vendor, index) => {
                      const addressText = getVendorAddressText(vendor);

                      return (
                        <tr
                          key={vendor._id}
                          className="transition hover:bg-[var(--primary-soft)]/60"
                        >
                          <td className="px-3 py-3 text-[12px] text-secondary-text">
                            {page * rowsPerPage + index + 1}
                          </td>

                          <td className="px-3 py-3 text-[12px] font-medium text-primary-text">
                            {vendor.code || "-"}
                          </td>

                          <td className="px-3 py-3 text-[12px] font-semibold text-heading">
                            {vendor.vendorName || "-"}
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            {vendor.contactPerson || "-"}
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            {vendor.email || "-"}
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            {vendor.mobile || "-"}
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            {vendor.gstNumber || "-"}
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            <p className="max-w-[110px] whitespace-normal leading-4">
                              {vendor.gstState || "-"}
                            </p>
                          </td>

                          <td className="px-3 py-3">
                            <span className={getStatusClass(vendor.status)}>
                              {String(vendor.status || "ACTIVE")
                                .toLowerCase()
                                .replace(/^./, (value) =>
                                  value.toUpperCase()
                                )}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            <p
                              className="max-w-[240px] truncate"
                              title={addressText || "-"}
                            >
                              {addressText || "-"}
                            </p>
                          </td>

                          <td className="px-3 py-3 text-[12px] text-primary-text">
                            <p
                              className="max-w-[120px] truncate"
                              title={vendor.notes || "-"}
                            >
                              {vendor.notes || "-"}
                            </p>
                          </td>

                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/shopowner/vendors/view?id=${vendor._id}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-secondary-text transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                                title="View"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Link>

                              <Link
                                href={`/shopowner/vendors/edit/${vendor._id}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-secondary-text transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>

                              <button
                                type="button"
                                onClick={() => void handleStatusToggle(vendor)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-secondary-text transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                                title={
                                  String(
                                    vendor.status || "ACTIVE"
                                  ).toUpperCase() === "ACTIVE"
                                    ? "Deactivate"
                                    : "Activate"
                                }
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDelete(vendor)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-[var(--danger)] transition hover:bg-[var(--danger-soft)]"
                                title="Deactivate vendor"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-token bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex flex-wrap items-center justify-end gap-3 text-[12px] text-secondary-text">
                  <span className="font-medium text-primary-text">
                    Rows per page:
                  </span>

                  <select
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setPage(0);
                    }}
                    className="h-8 rounded-md border border-token bg-white px-2 text-[12px] font-semibold text-primary-text outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>

                  <span className="min-w-[78px] text-right font-semibold text-primary-text">
                    {paginationStart}-{paginationEnd} of{" "}
                    {filteredVendors.length}
                  </span>

                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[18px] font-bold text-secondary-text transition hover:bg-soft-token disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages - 1, current + 1)
                      )
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[18px] font-bold text-secondary-text transition hover:bg-soft-token disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}