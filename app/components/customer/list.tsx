"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  Store,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type CustomerRecord,
  money,
  readSelectedShop,
} from "../sales/shared";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "WALK_IN";
type ModalMode = "create" | "edit";

type CustomerFormState = {
  name: string;
  mobile: string;
  email: string;
  gstNumber: string;
  state: string;
  address: string;
  openingBalance: string;
  isActive: boolean;
};

type FieldErrors = Partial<Record<keyof CustomerFormState, string>>;

type GstStateOption = {
  code: string;
  name: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const GST_STATE_OPTIONS: GstStateOption[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

const INITIAL_FORM: CustomerFormState = {
  name: "",
  mobile: "",
  email: "",
  gstNumber: "",
  state: "",
  address: "",
  openingBalance: "0",
  isActive: true,
};

function customerName(customer?: CustomerRecord | null) {
  return String(customer?.name || customer?.mobile || "Walk-in Customer").trim();
}

function statusLabel(customer?: CustomerRecord | null) {
  if (customer?.isWalkIn) return "Walk-in";
  return customer?.isActive !== false ? "Active" : "Inactive";
}

function statusClasses(customer?: CustomerRecord | null) {
  if (customer?.isWalkIn) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return customer?.isActive !== false
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-100 text-slate-700";
}

function dueBalanceClasses(amount?: number | null) {
  return Number(amount || 0) > 0
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function formatShopType(shopType: string) {
  return shopType ? shopType.replace(/_/g, " ") : "";
}

function gstStateLabel(stateName?: string | null) {
  const value = String(stateName || "").trim();

  if (!value) return "-";

  const selected = GST_STATE_OPTIONS.find(
    (state) => state.name.toLowerCase() === value.toLowerCase()
  );

  return selected ? `${selected.code} – ${selected.name}` : value;
}

function toForm(customer: CustomerRecord): CustomerFormState {
  return {
    name: customer.name || "",
    mobile: customer.mobile || "",
    email: customer.email || "",
    gstNumber: customer.gstNumber || "",
    state: customer.state || "",
    address: customer.address || "",
    openingBalance: String(Number(customer.openingBalance || 0)),
    isActive: customer.isActive !== false,
  };
}

export default function CustomerListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");

  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(
    null
  );
  const [form, setForm] = useState<CustomerFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  const syncSelectedShop = useCallback(() => {
    const selectedShop = readSelectedShop();

    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const fetchCustomers = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId) {
        setRows([]);
        setErrorMessage("");
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

        setErrorMessage("");

        const response = await fetch(
          `${baseURL}${SummaryApi.shop_customer_list.url({
            shopId: selectedShopId,
            limit: 500,
          })}`,
          {
            method: SummaryApi.shop_customer_list.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        );

        const result = (await response
          .json()
          .catch(() => ({}))) as ApiResponse<CustomerRecord[]>;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load customers");
        }

        setRows(Array.isArray(result.data) ? result.data : []);
        setPage(1);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load customers"
        );
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedShopId]
  );

  useEffect(() => {
    syncSelectedShop();

    function handleShopChange() {
      syncSelectedShop();
    }

    window.addEventListener("shop-selection-changed", handleShopChange);
    window.addEventListener("storage", handleShopChange);

    return () => {
      window.removeEventListener("shop-selection-changed", handleShopChange);
      window.removeEventListener("storage", handleShopChange);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  useEffect(() => {
    if (!modalOpen) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [modalOpen]);

  const filteredGstStates = useMemo(() => {
    const query = stateSearch.trim().toLowerCase();

    if (!query) return GST_STATE_OPTIONS;

    return GST_STATE_OPTIONS.filter((state) =>
      `${state.code} ${state.name}`.toLowerCase().includes(query)
    );
  }, [stateSearch]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((customer) => {
      if (statusFilter === "ACTIVE" && customer.isActive === false) {
        return false;
      }

      if (statusFilter === "INACTIVE" && customer.isActive !== false) {
        return false;
      }

      if (statusFilter === "WALK_IN" && !customer.isWalkIn) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        customer.name,
        customer.mobile,
        customer.email,
        customer.gstNumber,
        customer.state,
        gstStateLabel(customer.state),
        customer.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, search, statusFilter]);

  const maxPage = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;

  const paginatedRows = useMemo(
    () => filteredRows.slice(pageStartIndex, pageEndIndex),
    [filteredRows, pageStartIndex, pageEndIndex]
  );

  const shownStart = filteredRows.length === 0 ? 0 : pageStartIndex + 1;
  const shownEnd = Math.min(pageEndIndex, filteredRows.length);

  useEffect(() => {
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, maxPage]);

  function openCreateModal() {
    if (!selectedShopId) {
      toast.error("Please select shop first");
      return;
    }

    setModalMode("create");
    setEditingCustomer(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setStateSearch("");
    setStateDropdownOpen(false);
    setModalOpen(true);
  }

  function openEditModal(customer: CustomerRecord) {
    if (!selectedShopId) {
      toast.error("Please select shop first");
      return;
    }

    setModalMode("edit");
    setEditingCustomer(customer);
    setForm(toForm(customer));
    setErrors({});
    setStateSearch("");
    setStateDropdownOpen(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingCustomer(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setStateSearch("");
    setStateDropdownOpen(false);
  }

  function updateForm<K extends keyof CustomerFormState>(
    field: K,
    value: CustomerFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const mobile = form.mobile.trim();
    const email = form.email.trim();
    const openingBalance = Number(form.openingBalance || 0);

    if (!form.name.trim()) {
      nextErrors.name = "Customer name is required";
    }

    if (!mobile) {
      nextErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(mobile)) {
      nextErrors.mobile = "Mobile number must be 10 digits";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Invalid email format";
    }

    if (Number.isNaN(openingBalance)) {
      nextErrors.openingBalance = "Opening balance must be a valid amount";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    if (!accessToken || !selectedShopId) {
      toast.error("Authentication or shop selection missing");
      return;
    }

    if (modalMode === "edit" && !editingCustomer?._id) {
      toast.error("Customer id missing");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        gstNumber: form.gstNumber.trim().toUpperCase(),
        state: form.state.trim(),
        address: form.address.trim(),
        openingBalance: Number(form.openingBalance || 0),
        isActive: form.isActive,
        shopId: selectedShopId,
      };

      const api =
        modalMode === "create"
          ? SummaryApi.shop_customer_create
          : {
              method: SummaryApi.shop_customer_update.method,
              url: SummaryApi.shop_customer_update.url(editingCustomer!._id),
            };

      const response = await fetch(`${baseURL}${api.url}`, {
        method: api.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<CustomerRecord>;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (modalMode === "create"
              ? "Failed to create customer"
              : "Failed to update customer")
        );
      }

      if (result.data) {
        setRows((prev) => {
          if (modalMode === "create") {
            return [result.data!, ...prev];
          }

          return prev.map((row) =>
            row._id === result.data!._id ? result.data! : row
          );
        });
      } else {
        await fetchCustomers(true);
      }

      toast.success(
        modalMode === "create"
          ? "Customer created successfully"
          : "Customer updated successfully"
      );

      closeModal();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : modalMode === "create"
            ? "Failed to create customer"
            : "Failed to update customer"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleCustomerStatus(customer: CustomerRecord) {
    if (!accessToken) {
      toast.error("Authentication token missing");
      return;
    }

    try {
      setActionLoadingId(customer._id);

      const response = await fetch(
        `${baseURL}${SummaryApi.shop_customer_update.url(customer._id)}`,
        {
          method: SummaryApi.shop_customer_update.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            isActive: customer.isActive === false,
          }),
        }
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<CustomerRecord>;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Failed to update customer status");
      }

      setRows((prev) =>
        prev.map((row) => (row._id === customer._id ? result.data! : row))
      );

      toast.success(
        result.data.isActive === false
          ? "Customer deactivated"
          : "Customer activated"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update customer status"
      );
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-7 sm:px-5 lg:px-8">
      <div className="mx-auto w-full max-w-[1420px]">
        <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#00008b]">
                  <UserRound className="h-3.5 w-3.5" />
                  Customer Register
                </div>

                <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                  Customers Management
                </h1>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Manage customer contacts, ledger balances, points, and active
                  status for the currently selected shop.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700">
                    <Store className="h-3.5 w-3.5 text-[#00008b]" />
                    {selectedShopName || "No shop selected"}
                  </span>

                  {selectedShopType ? (
                    <span className="inline-flex h-8 items-center rounded-lg bg-indigo-50 px-3 text-xs font-bold capitalize text-[#00008b]">
                      {formatShopType(selectedShopType).toLowerCase()}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => void fetchCustomers(true)}
                  disabled={refreshing || loading || !selectedShopId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-[#00008b] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#00008b] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f]"
                >
                  <Plus className="h-4 w-4" />
                  Add Customer
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, mobile, email, GST, GST state or address"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
              >
                <option value="ALL">All Customers</option>
                <option value="ACTIVE">Active Customers</option>
                <option value="INACTIVE">Inactive Customers</option>
                <option value="WALK_IN">Walk-in Customers</option>
              </select>

              <div className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-600">
                Showing {filteredRows.length} of {rows.length}
              </div>
            </div>

            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              Search also matches mobile number, GST number, GST state code,
              state name, and address.
            </p>
          </div>

          {!selectedShopId ? (
            <div className="border-t border-slate-200 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Store className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-2xl font-black text-slate-950">
                No shop selected
              </h3>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Select a shop from the dashboard switcher first, then reopen
                this page to manage customers for that shop.
              </p>
            </div>
          ) : loading ? (
            <div className="border-t border-slate-200 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-[#00008b]">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Loading customers...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="border-t border-slate-200 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle className="h-8 w-8" />
              </div>

              <h3 className="mt-5 text-2xl font-black text-rose-900">
                Unable to load customers
              </h3>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-rose-700">
                {errorMessage}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="border-t border-slate-200 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Search className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-2xl font-black text-slate-950">
                No customers found
              </h3>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {search.trim() || statusFilter !== "ALL"
                  ? "Try another search or clear the current filter."
                  : "Add your first customer for the selected shop."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full min-w-[1120px] border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-3 text-left text-[11px] font-black text-slate-950">
                        S.No
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-left text-[11px] font-black text-slate-950">
                        Customer
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-left text-[11px] font-black text-slate-950">
                        Contact
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-left text-[11px] font-black text-slate-950">
                        GST / GST State
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-left text-[11px] font-black text-slate-950">
                        Address
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right text-[11px] font-black text-slate-950">
                        Opening
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right text-[11px] font-black text-slate-950">
                        Points
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right text-[11px] font-black text-slate-950">
                        Due Balance
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-center text-[11px] font-black text-slate-950">
                        Status
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-center text-[11px] font-black text-slate-950">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedRows.map((customer, index) => (
                      <tr
                        key={customer._id}
                        className="bg-white transition hover:bg-slate-50"
                      >
                        <td className="px-3 py-3 text-sm font-bold text-slate-600">
                          {pageStartIndex + index + 1}
                        </td>

                        <td className="px-3 py-3">
                          <div className="min-w-[160px]">
                            <p className="text-sm font-black text-slate-950">
                              {customerName(customer)}
                            </p>

                            {customer.isWalkIn ? (
                              <p className="mt-1 text-xs font-semibold text-sky-700">
                                Walk-in customer
                              </p>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="min-w-[210px] space-y-1.5 text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="max-w-[190px] truncate">
                                {customer.email || "-"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>{customer.mobile || "-"}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="min-w-[150px] space-y-1 text-xs text-slate-600">
                            <p className="font-bold text-slate-800">
                              {customer.gstNumber || "-"}
                            </p>
                            <p className="font-semibold text-slate-500">
                              {gstStateLabel(customer.state)}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex max-w-[230px] items-start gap-2 text-xs font-semibold text-slate-600">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="line-clamp-2 break-words">
                              {customer.address || "-"}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right text-sm font-black text-slate-950">
                          {money(customer.openingBalance)}
                        </td>

                        <td className="px-3 py-3 text-right text-sm font-bold text-slate-700">
                          {Number(customer.points || 0)}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-black ${dueBalanceClasses(
                              customer.dueBalance
                            )}`}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            {money(customer.dueBalance)}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClasses(
                              customer
                            )}`}
                          >
                            {statusLabel(customer)}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/shopowner/customer/ledger/${customer._id}`}
                              title="View ledger"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#00008b]/30 hover:bg-indigo-50 hover:text-[#00008b]"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => openEditModal(customer)}
                              title="Edit customer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#00008b]/30 hover:bg-indigo-50 hover:text-[#00008b]"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              title={
                                customer.isActive === false
                                  ? "Activate customer"
                                  : "Deactivate customer"
                              }
                              onClick={() =>
                                void handleToggleCustomerStatus(customer)
                              }
                              disabled={actionLoadingId === customer._id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#00008b] text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionLoadingId === customer._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-slate-600">
                  Showing {shownStart}-{shownEnd} of {filteredRows.length}{" "}
                  customers
                </p>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      Rows per page:
                    </span>

                    <select
                      value={pageSize}
                      onChange={(event) =>
                        setPageSize(Number(event.target.value))
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                    >
                      {PAGE_SIZE_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="min-w-[54px] text-center text-sm font-black text-slate-700">
                    {currentPage} / {maxPage}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((prev) => Math.min(maxPage, prev + 1))
                    }
                    disabled={currentPage >= maxPage}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                    <Store className="h-4 w-4 text-[#00008b]" />
                    {selectedShopName || "No shop selected"}
                  </div>

                  <h2 className="mt-3 text-xl font-black text-slate-950">
                    {modalMode === "create"
                      ? "Create Customer"
                      : "Edit Customer"}
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {modalMode === "create"
                      ? "Add new customer details for the selected shop."
                      : "Update customer details without leaving this page."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitCustomer} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                    placeholder="Enter customer name"
                  />
                  {errors.name ? (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      {errors.name}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(event) =>
                      updateForm(
                        "mobile",
                        event.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                    placeholder="Enter 10-digit mobile number"
                  />
                  {errors.mobile ? (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      {errors.mobile}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                    placeholder="Enter email address"
                  />
                  {errors.email ? (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      {errors.email}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={form.gstNumber}
                    onChange={(event) =>
                      updateForm("gstNumber", event.target.value.toUpperCase())
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                    placeholder="Enter GST number"
                  />
                </div>

                <div className="relative md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    GST State
                  </label>

                  <button
                    type="button"
                    onClick={() => setStateDropdownOpen((prev) => !prev)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                  >
                    <span
                      className={
                        form.state ? "text-slate-800" : "text-slate-400"
                      }
                    >
                      {form.state ? gstStateLabel(form.state) : "Select GST state"}
                    </span>

                    <ChevronsUpDown className="h-4 w-4 text-slate-400" />
                  </button>

                  {stateDropdownOpen ? (
                    <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
                      <div className="border-b border-slate-100 p-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            value={stateSearch}
                            onChange={(event) =>
                              setStateSearch(event.target.value)
                            }
                            placeholder="Search GST code or state"
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#00008b] focus:bg-white focus:ring-4 focus:ring-indigo-50"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-1">
                        {filteredGstStates.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm font-semibold text-slate-500">
                            No GST state found
                          </div>
                        ) : (
                          filteredGstStates.map((state) => {
                            const selected = form.state === state.name;

                            return (
                              <button
                                key={`${state.code}-${state.name}`}
                                type="button"
                                onClick={() => {
                                  updateForm("state", state.name);
                                  setStateSearch("");
                                  setStateDropdownOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                  selected
                                    ? "bg-indigo-50 font-black text-[#00008b]"
                                    : "font-semibold text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span>
                                  <span className="font-black">
                                    {state.code}
                                  </span>
                                  <span className="px-1 text-slate-400">–</span>
                                  {state.name}
                                </span>

                                {selected ? <Check className="h-4 w-4" /> : null}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Dropdown shows GST code + state. Saved value is state name
                    only.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.openingBalance}
                    onChange={(event) =>
                      updateForm("openingBalance", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                    placeholder="0"
                  />
                  {errors.openingBalance ? (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      {errors.openingBalance}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="customerIsActive"
                    checked={form.isActive}
                    onChange={(event) =>
                      updateForm("isActive", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                  />
                  <label
                    htmlFor="customerIsActive"
                    className="text-sm font-bold text-slate-700"
                  >
                    Active Customer
                  </label>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateForm("address", event.target.value)
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-indigo-50"
                  placeholder="Enter customer address"
                />
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {modalMode === "create" ? "Create Customer" : "Update Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}