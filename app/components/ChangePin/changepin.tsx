"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

import apiClient from "@/lib/api-client";
import SummaryApi from "@/constants/SummaryApi";
import { appToast } from "@/lib/toast";
import { useAuth } from "@/context/auth/AuthProvider";
import { getRoleLabel } from "@/utils/getLoginConfig";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message
  ) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message || "Unable to change PIN"
    );
  }

  if (error instanceof Error) return error.message;
  return "Unable to change PIN";
}

function getChangePinEndpoint(role?: string | null) {
  const normalized = String(role || "").trim().toUpperCase();

  if (
    ["MASTER_ADMIN", "MANAGER", "SUPERVISOR"].includes(normalized) &&
    SummaryApi.master_change_pin
  ) {
    return SummaryApi.master_change_pin;
  }

  if (normalized === "STAFF" && SummaryApi.staff_change_pin) {
    return SummaryApi.staff_change_pin;
  }

  if (normalized === "SHOP_OWNER" && SummaryApi.shopowner_change_pin) {
    return SummaryApi.shopowner_change_pin;
  }

  if (
    ["SHOP_MANAGER", "SHOP_SUPERVISOR", "EMPLOYEE"].includes(normalized) &&
    SummaryApi.shopstaff_change_pin
  ) {
    return SummaryApi.shopstaff_change_pin;
  }

  return null;
}

function getDashboardPath(role?: string | null) {
  const normalized = String(role || "").trim().toUpperCase();

  switch (normalized) {
    case "MASTER_ADMIN":
      return "/master/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "SUPERVISOR":
      return "/supervisor/dashboard";
    case "STAFF":
      return "/staff/dashboard";
    case "SHOP_OWNER":
      return "/shopowner/dashboard";
    case "SHOP_MANAGER":
      return "/shopmanager/dashboard";
    case "SHOP_SUPERVISOR":
      return "/shopsupervisor/dashboard";
    case "EMPLOYEE":
      return "/employee/dashboard";
    default:
      return "/";
  }
}

export default function ChangePin() {
  const { user, role } = useAuth();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentRole = role || user?.role || "";
  const backPath = useMemo(() => getDashboardPath(currentRole), [currentRole]);

  const validateForm = () => {
    if (!currentPin.trim()) {
      appToast.warning("Current PIN required", "Please enter your current PIN.");
      return false;
    }

    if (!newPin.trim()) {
      appToast.warning("New PIN required", "Please enter your new PIN.");
      return false;
    }

    if (!confirmPin.trim()) {
      appToast.warning("Confirm PIN required", "Please confirm your new PIN.");
      return false;
    }

    if (
      !/^\d+$/.test(currentPin.trim()) ||
      !/^\d+$/.test(newPin.trim()) ||
      !/^\d+$/.test(confirmPin.trim())
    ) {
      appToast.warning("Invalid PIN", "PIN must contain numbers only.");
      return false;
    }

    if (newPin.trim().length < 4) {
      appToast.warning("PIN too short", "New PIN must be at least 4 digits.");
      return false;
    }

    if (newPin.trim() !== confirmPin.trim()) {
      appToast.warning("PIN mismatch", "New PIN and confirm PIN do not match.");
      return false;
    }

    if (currentPin.trim() === newPin.trim()) {
      appToast.warning("Same PIN", "New PIN must be different from current PIN.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!validateForm()) return;

    try {
      setLoading(true);

      const endpoint = getChangePinEndpoint(currentRole);

      if (!endpoint) {
        throw new Error("Change PIN endpoint not configured for this role.");
      }

      const response = await apiClient.request({
        method: endpoint.method,
        url: endpoint.url,
        data: {
          currentPin: currentPin.trim(),
          newPin: newPin.trim(),
          confirmPin: confirmPin.trim(),
        },
      });

      appToast.success(
        "PIN changed",
        response?.data?.message || "Your PIN has been updated successfully."
      );

      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (error) {
      appToast.error("Change PIN failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />

          <CardHeader className="space-y-3 px-6 pb-2 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
                  Change PIN
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-slate-500">
                  Update your secure PIN for {getRoleLabel(currentRole || "STAFF")}.
                </CardDescription>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-[0_14px_34px_rgba(236,6,119,0.24)]">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="currentPin" className="mb-2 block text-sm font-medium text-slate-700">
                  Current PIN
                </label>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="currentPin"
                    type={showCurrentPin ? "text" : "password"}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter current PIN"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-12 text-sm tracking-[0.24em] text-slate-900 outline-none transition placeholder:tracking-normal focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPin((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 hover:text-slate-900"
                  >
                    {showCurrentPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPin" className="mb-2 block text-sm font-medium text-slate-700">
                  New PIN
                </label>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="newPin"
                    type={showNewPin ? "text" : "password"}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter new PIN"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-12 text-sm tracking-[0.24em] text-slate-900 outline-none transition placeholder:tracking-normal focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 hover:text-slate-900"
                  >
                    {showNewPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPin" className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm PIN
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirmPin"
                    type={showConfirmPin ? "text" : "password"}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Confirm new PIN"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-12 text-sm tracking-[0.24em] text-slate-900 outline-none transition placeholder:tracking-normal focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 hover:text-slate-900"
                  >
                    {showConfirmPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-start">
                <Link
                  href={backPath}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] transition hover:text-[var(--accent)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group h-12 w-full rounded-2xl border-0 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-sm font-semibold text-white shadow-[0_16px_40px_rgba(236,6,119,0.24)] transition-all duration-300 hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? "Updating..." : "Change PIN"}
                  {!loading && (
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  )}
                </span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}