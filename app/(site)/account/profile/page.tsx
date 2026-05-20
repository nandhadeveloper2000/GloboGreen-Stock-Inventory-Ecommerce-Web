"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Save, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { baseURL } from "@/constants/SummaryApi";
import { useSite } from "../../SiteContext";

export default function ProfilePage() {
  const router = useRouter();
  const { customer, customerToken, login } = useSite();

  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customer) {
      router.replace("/login?redirect=/account/profile");
    }
  }, [customer, router]);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setEmail(customer.email ?? "");
    }
  }, [customer]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!customerToken || !customer) return;
    setSaving(true);
    try {
      const res = await axios.put(
        `${baseURL}/api/customer/me`,
        { name: name.trim(), email: email.trim() },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      const updated = res.data?.data ?? res.data?.customer ?? null;
      if (updated) {
        login(customerToken, {
          _id: customer._id,
          name: updated.name ?? name,
          mobile: customer.mobile,
          email: updated.email ?? email,
        });
      }
      toast.success("Profile updated");
    } catch (err) {
      toast.error(
        axios.isAxiosError(err)
          ? (err.response?.data?.message as string) ?? "Failed to update"
          : "Failed to update"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!customer) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-20">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/account"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Avatar */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl font-bold text-green-700">
            {name.charAt(0).toUpperCase() || <User className="h-10 w-10" />}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Mobile Number
            </label>
            <input
              type="text"
              value={`+91 ${customer.mobile}`}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Mobile number cannot be changed
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:bg-green-400"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
