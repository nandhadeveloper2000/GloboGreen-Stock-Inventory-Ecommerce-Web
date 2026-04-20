/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import SummaryApi from "@/constants/SummaryApi";
import { appToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Step = 1 | 2 | 3;

const ROLES = {
  MASTER_ADMIN: "MASTER_ADMIN",
  MANAGER: "MANAGER",
  SUPERVISOR: "SUPERVISOR",
  STAFF: "STAFF",
  SHOP_OWNER: "SHOP_OWNER",
  SHOP_MANAGER: "SHOP_MANAGER",
  SHOP_SUPERVISOR: "SHOP_SUPERVISOR",
  EMPLOYEE: "EMPLOYEE",
} as const;

type LoginRole = (typeof ROLES)[keyof typeof ROLES];

type ApiConfig = {
  method: string;
  url: string;
};

function normalizeRole(role?: string | null): string {
  return String(role || "").trim().toUpperCase();
}

function getRoleLabel(role?: string | null): string {
  switch (normalizeRole(role)) {
    case ROLES.MASTER_ADMIN:
      return "Master Admin";
    case ROLES.MANAGER:
      return "Manager";
    case ROLES.SUPERVISOR:
      return "Supervisor";
    case ROLES.STAFF:
      return "Staff";
    case ROLES.SHOP_OWNER:
      return "Shop Owner";
    case ROLES.SHOP_MANAGER:
      return "Shop Manager";
    case ROLES.SHOP_SUPERVISOR:
      return "Shop Supervisor";
    case ROLES.EMPLOYEE:
      return "Employee";
    default:
      return "User";
  }
}

function getAllRoles(): LoginRole[] {
  return [
    ROLES.MASTER_ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.STAFF,
    ROLES.SHOP_OWNER,
    ROLES.SHOP_MANAGER,
    ROLES.SHOP_SUPERVISOR,
    ROLES.EMPLOYEE,
  ];
}

function getForgotPinApi(role?: string | null): ApiConfig | null {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
    case ROLES.MANAGER:
    case ROLES.SUPERVISOR:
    case ROLES.STAFF:
      return SummaryApi.master_forgot_pin;

    case ROLES.SHOP_OWNER:
      return SummaryApi.shopowner_forgot_pin;

    case ROLES.SHOP_MANAGER:
    case ROLES.SHOP_SUPERVISOR:
    case ROLES.EMPLOYEE:
      return SummaryApi.shopstaff_forgot_pin;

    default:
      return null;
  }
}

function getVerifyPinOtpApi(role?: string | null): ApiConfig | null {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
    case ROLES.MANAGER:
    case ROLES.SUPERVISOR:
    case ROLES.STAFF:
      // IMPORTANT:
      // Add this in SummaryApi if missing:
      // master_verify_pin_otp: { method: "POST", url: `${API_BASE}/master/verify-pin-otp` }
      return (
        (SummaryApi as any).master_verify_pin_otp || {
          method: "POST",
          url: "/api/master/verify-pin-otp",
        }
      );

    case ROLES.SHOP_OWNER:
      return SummaryApi.shopowner_verify_pin_otp;

    case ROLES.SHOP_MANAGER:
    case ROLES.SHOP_SUPERVISOR:
    case ROLES.EMPLOYEE:
      return SummaryApi.shopstaff_verify_pin_otp;

    default:
      return null;
  }
}

function getResetPinApi(role?: string | null): ApiConfig | null {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
    case ROLES.MANAGER:
    case ROLES.SUPERVISOR:
    case ROLES.STAFF:
      return SummaryApi.master_reset_pin;

    case ROLES.SHOP_OWNER:
      return SummaryApi.shopowner_reset_pin;

    case ROLES.SHOP_MANAGER:
    case ROLES.SHOP_SUPERVISOR:
    case ROLES.EMPLOYEE:
      return SummaryApi.shopstaff_reset_pin;

    default:
      return null;
  }
}

function getLoginRouteByRole(role?: string | null): string {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
    case ROLES.MANAGER:
    case ROLES.SUPERVISOR:
    case ROLES.STAFF:
      return "/masterlogin";

    case ROLES.SHOP_OWNER:
    case ROLES.SHOP_MANAGER:
    case ROLES.SHOP_SUPERVISOR:
    case ROLES.EMPLOYEE:
      return "/shoplogin";

    default:
      return "/masterlogin";
  }
}

function getRoleBadge(role?: string | null): string {
  switch (normalizeRole(role)) {
    case ROLES.MASTER_ADMIN:
      return "MASTER ADMIN";
    case ROLES.MANAGER:
      return "MANAGER";
    case ROLES.SUPERVISOR:
      return "SUPERVISOR";
    case ROLES.STAFF:
      return "STAFF";
    case ROLES.SHOP_OWNER:
      return "SHOP OWNER";
    case ROLES.SHOP_MANAGER:
      return "SHOP MANAGER";
    case ROLES.SHOP_SUPERVISOR:
      return "SHOP SUPERVISOR";
    case ROLES.EMPLOYEE:
      return "EMPLOYEE";
    default:
      return "ACCOUNT";
  }
}

function getStepTitle(step: Step): string {
  if (step === 1) return "Forgot PIN";
  if (step === 2) return "Verify OTP";
  return "Reset PIN";
}

function getStepSubtitle(step: Step, roleLabel: string): string {
  if (step === 1) {
    return `Choose your role and enter your registered email or username to recover your ${roleLabel.toLowerCase()} account PIN.`;
  }

  if (step === 2) {
    return "Enter the 6-digit OTP sent to your registered email address.";
  }

  return `Create a new secure PIN for your ${roleLabel.toLowerCase()} account and confirm it below.`;
}

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
        ?.message || "Request failed"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed";
}

function PinRule({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          active
            ? "bg-[var(--primary)] text-white"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {active ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </div>
      <p
        className={`text-xs font-medium ${
          active ? "text-slate-800" : "text-slate-500"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

export default function ForgotPin() {
  const [step, setStep] = useState<Step>(1);
  const [selectedRole, setSelectedRole] = useState<LoginRole>(ROLES.MASTER_ADMIN);
  const [login, setLogin] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleLabel = useMemo(() => getRoleLabel(selectedRole), [selectedRole]);
  const availableRoles = useMemo(() => getAllRoles(), []);

  const forgotApi = useMemo(() => getForgotPinApi(selectedRole), [selectedRole]);
  const verifyOtpApi = useMemo(
    () => getVerifyPinOtpApi(selectedRole),
    [selectedRole]
  );
  const resetApi = useMemo(() => getResetPinApi(selectedRole), [selectedRole]);
  const loginRoute = useMemo(
    () => getLoginRouteByRole(selectedRole),
    [selectedRole]
  );

  const pinHasLength = useMemo(() => /^\d{4,6}$/.test(newPin.trim()), [newPin]);

  const pinMatched = useMemo(() => {
    return (
      !!newPin.trim() &&
      !!confirmPin.trim() &&
      newPin.trim() === confirmPin.trim() &&
      /^\d{4,6}$/.test(confirmPin.trim())
    );
  }, [newPin, confirmPin]);

  const isValidPin = useCallback((value: string) => /^\d{4,6}$/.test(value), []);

  const handleSendOtp = useCallback(async () => {
    if (loading) return;

    try {
      if (!forgotApi?.url) {
        throw new Error("Forgot PIN API is not configured for this role");
      }

      if (!login.trim()) {
        appToast.warning(
          "Missing account",
          "Please enter your registered email or username."
        );
        return;
      }

      setLoading(true);

      const response = await fetch(forgotApi.url, {
        method: forgotApi.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim().toLowerCase(),
          role: selectedRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to send OTP");
      }

      setOtp("");
      setResetToken("");
      setStep(2);

      appToast.success(
        "OTP sent",
        data?.message || "Verification code sent successfully."
      );
    } catch (error) {
      appToast.error("Send OTP failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [forgotApi, loading, login, selectedRole]);

  const handleVerifyOtp = useCallback(async () => {
    if (loading) return;

    try {
      if (!verifyOtpApi?.url) {
        throw new Error("Verify OTP API is not configured for this role");
      }

      if (!login.trim()) {
        appToast.warning(
          "Missing account",
          "Please enter your email or username."
        );
        return;
      }

      if (otp.trim().length !== 6) {
        appToast.warning("Invalid OTP", "Please enter the 6-digit OTP.");
        return;
      }

      setLoading(true);

      const response = await fetch(verifyOtpApi.url, {
        method: verifyOtpApi.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim().toLowerCase(),
          otp: otp.trim(),
          role: selectedRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "OTP verification failed");
      }

      const token =
        data?.resetToken || data?.data?.resetToken || data?.token || "";

      if (!token) {
        throw new Error("Reset token not received from server");
      }

      setResetToken(String(token));
      setStep(3);

      appToast.success(
        "OTP verified",
        data?.message || "OTP verified successfully."
      );
    } catch (error) {
      appToast.error("Verification failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [loading, login, otp, selectedRole, verifyOtpApi]);

  const handleResetPin = useCallback(async () => {
    if (loading) return;

    try {
      if (!resetApi?.url) {
        throw new Error("Reset PIN API is not configured for this role");
      }

      if (!login.trim()) {
        appToast.warning(
          "Missing account",
          "Please enter your email or username."
        );
        return;
      }

      if (!resetToken.trim()) {
        appToast.warning(
          "Session expired",
          "Please verify OTP again before resetting your PIN."
        );
        return;
      }

      if (!isValidPin(newPin.trim())) {
        appToast.warning("Invalid PIN", "New PIN must be 4 to 6 digits.");
        return;
      }

      if (!isValidPin(confirmPin.trim())) {
        appToast.warning("Invalid PIN", "Confirm PIN must be 4 to 6 digits.");
        return;
      }

      if (newPin.trim() !== confirmPin.trim()) {
        appToast.warning("PIN mismatch", "Confirm PIN does not match.");
        return;
      }

      setLoading(true);

      const response = await fetch(resetApi.url, {
        method: resetApi.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim().toLowerCase(),
          resetToken: resetToken.trim(),
          newPin: newPin.trim(),
          role: selectedRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to reset PIN");
      }

      appToast.success(
        "PIN reset successful",
        data?.message || "Your PIN has been reset successfully."
      );

      setTimeout(() => {
        window.location.href = loginRoute;
      }, 500);
    } catch (error) {
      appToast.error("Reset failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [
    confirmPin,
    isValidPin,
    loading,
    login,
    loginRoute,
    newPin,
    resetApi,
    resetToken,
    selectedRole,
  ]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero px-4 py-8">
      <div className="premium-grid-bg absolute inset-0 opacity-50" />
      <div className="absolute inset-0 bg-black/10" />

      <div
        className="absolute -left-28 -top-28 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "rgba(46, 49, 146, 0.30)" }}
      />
      <div
        className="absolute -right-28 top-[8%] h-96 w-[24rem] rounded-full blur-3xl"
        style={{ background: "rgba(236, 6, 119, 0.25)" }}
      />
      <div
        className="absolute -bottom-28 left-[8%] h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(255, 255, 255, 0.10)" }}
      />
      <div
        className="absolute -bottom-28 right-[10%] h-80 w-80 rounded-full blur-3xl"
        style={{ background: "rgba(236, 6, 119, 0.20)" }}
      />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5" />
            {getRoleBadge(selectedRole)}
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-[2.15rem]">
            {getStepTitle(step)}
          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/75">
            {getStepSubtitle(step, roleLabel)}
          </p>
        </div>

        <Card className="premium-card premium-border overflow-hidden border-0 bg-white/90 backdrop-blur-2xl">
          <div className="h-1.5 w-full bg-gradient-primary" />

          <CardHeader className="space-y-4 px-6 pb-2 pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold tracking-tight text-heading">
                  PIN recovery
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-secondary-text">
                  All roles supported: master and shop panel accounts.
                </CardDescription>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-[0_14px_34px_rgba(236,6,119,0.24)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((item) => {
                const active = step >= item;

                return (
                  <div
                    key={item}
                    className={`rounded-2xl border px-4 py-3 text-center transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        active
                          ? "bg-[var(--primary)] text-white"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {item}
                    </div>
                    <p
                      className={`mt-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                        active ? "text-[var(--primary)]" : "text-slate-500"
                      }`}
                    >
                      {item === 1 ? "Account" : item === 2 ? "OTP" : "PIN"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-4">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="role" className="premium-label">
                    Role
                  </label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      id="role"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as LoginRole)}
                      disabled={loading}
                      className="premium-select pl-10"
                    >
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="login" className="premium-label">
                    Email or Username
                  </label>
                  <div className="relative">
                    <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login"
                      type="text"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="Enter your registered email or username"
                      autoComplete="username"
                      disabled={loading}
                      className="premium-input pl-10"
                    />
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        OTP verification
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        A one-time password will be sent to the registered email
                        address linked to this role account.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="group h-12 w-full rounded-2xl border-0 bg-gradient-primary text-sm font-semibold text-white shadow-[0_16px_40px_rgba(236,6,119,0.24)] transition-all duration-300 hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? "Sending OTP..." : "Send OTP"}
                    {!loading && (
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    )}
                  </span>
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="otp" className="premium-label">
                    6-Digit OTP
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="Enter OTP"
                      inputMode="numeric"
                      maxLength={6}
                      disabled={loading}
                      className="premium-input pl-10 tracking-[0.35em] placeholder:tracking-normal"
                    />
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Secure verification
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Enter the exact OTP received in your email to continue
                        the PIN recovery process.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="h-12 rounded-2xl border-0 bg-gradient-primary text-sm font-semibold text-white shadow-[0_16px_40px_rgba(236,6,119,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    variant="outline"
                    className="h-12 rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4" />
                      Resend OTP
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="newPin" className="premium-label">
                    New PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="newPin"
                      type={showNewPin ? "text" : "password"}
                      value={newPin}
                      onChange={(e) =>
                        setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="Enter new PIN"
                      inputMode="numeric"
                      maxLength={6}
                      disabled={loading}
                      className="premium-input pl-10 pr-12 tracking-[0.24em] placeholder:tracking-normal"
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
                  <label htmlFor="confirmPin" className="premium-label">
                    Confirm PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirmPin"
                      type={showConfirmPin ? "text" : "password"}
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Re-enter new PIN"
                      inputMode="numeric"
                      maxLength={6}
                      disabled={loading}
                      className="premium-input pl-10 pr-12 tracking-[0.24em] placeholder:tracking-normal"
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

                <div className="space-y-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    PIN guidelines
                  </p>
                  <PinRule label="PIN must be 4 to 6 digits" active={pinHasLength} />
                  <PinRule
                    label="Confirm PIN must match new PIN"
                    active={pinMatched}
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleResetPin}
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border-0 bg-gradient-primary text-sm font-semibold text-white shadow-[0_16px_40px_rgba(236,6,119,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Resetting..." : "Reset PIN"}
                </Button>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={loginRoute}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>

              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : 1))}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition hover:opacity-80"
                >
                  Previous step
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 text-center">
          <p className="text-xs text-white/65">
            (c) 2026 GloboGreen. Secure enterprise access.
          </p>
        </div>
      </div>
    </div>
  );
}