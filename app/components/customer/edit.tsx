"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Save, Store } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import { type ApiResponse, type CustomerRecord } from "../sales/shared";

type CustomerFormState = {
  name: string;
  mobile: string;
  email: string;
  gstNumber: string;
  state: string;
  address: string;
  openingBalance: number;
  dueBalance: number;
  points: number;
  isActive: boolean;
  isWalkIn: boolean;
};

type FieldErrors = Partial<Record<keyof CustomerFormState, string>>;

const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";

const INITIAL_FORM: CustomerFormState = {
  name: "",
  mobile: "",
  email: "",
  gstNumber: "",
  state: "",
  address: "",
  openingBalance: 0,
  dueBalance: 0,
  points: 0,
  isActive: true,
  isWalkIn: false,
};

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

export default function EditCustomerPage() {
  const { accessToken } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const customerId = useMemo(() => String(params?.id || "").trim(), [params]);

  const [selectedShopName, setSelectedShopName] = useState("");
  const [form, setForm] = useState<CustomerFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setSelectedShopName(
      window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || ""
    );
  }, []);

  useEffect(() => {
    async function loadCustomer() {
      if (!accessToken || !customerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${baseURL}${SummaryApi.shop_customer_get.url(customerId)}`,
          {
            method: SummaryApi.shop_customer_get.method,
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
          .catch(() => ({}))) as ApiResponse<CustomerRecord>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Failed to load customer");
        }

        const customer = result.data;

        setForm({
          name: customer.name || "",
          mobile: customer.mobile || "",
          email: customer.email || "",
          gstNumber: customer.gstNumber || "",
          state: customer.state || "",
          address: customer.address || "",
          openingBalance: toNumber(customer.openingBalance, 0),
          dueBalance: toNumber(customer.dueBalance, 0),
          points: Math.max(0, Math.floor(toNumber(customer.points, 0))),
          isActive: customer.isActive !== false,
          isWalkIn: Boolean(customer.isWalkIn),
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load customer"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCustomer();
  }, [accessToken, customerId]);

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Customer name is required";
    }

    if (!form.mobile.trim()) {
      nextErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(form.mobile.trim())) {
      nextErrors.mobile = "Mobile number must be 10 digits";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Invalid email format";
    }

    if (toNumber(form.openingBalance, 0) < 0) {
      nextErrors.openingBalance = "Opening balance cannot be negative";
    }

    if (toNumber(form.dueBalance, 0) < 0) {
      nextErrors.dueBalance = "Due balance cannot be negative";
    }

    if (toNumber(form.points, 0) < 0) {
      nextErrors.points = "Points cannot be negative";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateForm = <K extends keyof CustomerFormState>(
    field: K,
    value: CustomerFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!accessToken || !customerId) {
      toast.error("Customer session is missing");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${baseURL}${SummaryApi.shop_customer_update.url(customerId)}`,
        {
          method: SummaryApi.shop_customer_update.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            ...form,
            openingBalance: toNumber(form.openingBalance, 0),
            dueBalance: toNumber(form.dueBalance, 0),
            points: Math.max(0, Math.floor(toNumber(form.points, 0))),
          }),
        }
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as ApiResponse<unknown>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update customer");
      }

      toast.success("Customer updated successfully");
      router.push("/shopowner/customer/list");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update customer"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-[320px] max-w-4xl items-center justify-center rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Loading customer details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-4xl rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-14 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-rose-900">
            Unable to load customer
          </h2>
          <p className="mt-2 text-sm text-rose-700">{errorMessage}</p>
          <div className="mt-6">
            <Link
              href="/shopowner/customer/list"
              className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Back to Customers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/shopowner/customer/list"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Edit Customer</h1>
            <p className="text-sm text-slate-600">
              Update customer details, balances, and profile status
            </p>
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <Store className="h-4 w-4" />
              <span>{selectedShopName || "No shop selected"}</span>
            </div>

            {form.isWalkIn ? (
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                Walk-in customer
              </span>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter customer name"
                />
                {errors.name ? (
                  <p className="mt-1 text-sm text-rose-600">{errors.name}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(event) => updateForm("mobile", event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter 10-digit mobile number"
                />
                {errors.mobile ? (
                  <p className="mt-1 text-sm text-rose-600">{errors.mobile}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter email address"
                />
                {errors.email ? (
                  <p className="mt-1 text-sm text-rose-600">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  GST Number
                </label>
                <input
                  type="text"
                  value={form.gstNumber}
                  onChange={(event) => updateForm("gstNumber", event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter GST number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(event) => updateForm("state", event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter state"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Opening Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={(event) =>
                    updateForm("openingBalance", toNumber(event.target.value, 0))
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="0.00"
                />
                {errors.openingBalance ? (
                  <p className="mt-1 text-sm text-rose-600">
                    {errors.openingBalance}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Due Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.dueBalance}
                  onChange={(event) =>
                    updateForm("dueBalance", toNumber(event.target.value, 0))
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="0.00"
                />
                {errors.dueBalance ? (
                  <p className="mt-1 text-sm text-rose-600">{errors.dueBalance}</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Reward Points
                </label>
                <input
                  type="number"
                  step="1"
                  value={form.points}
                  onChange={(event) =>
                    updateForm("points", Math.max(0, Math.floor(toNumber(event.target.value, 0))))
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="0"
                />
                {errors.points ? (
                  <p className="mt-1 text-sm text-rose-600">{errors.points}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={(event) => updateForm("address", event.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Enter customer address"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateForm("isActive", event.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Active customer
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isWalkIn}
                  onChange={(event) => updateForm("isWalkIn", event.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Walk-in customer
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Link
                href="/shopowner/customer/list"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#00008b] to-[#9116a1] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Customer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
