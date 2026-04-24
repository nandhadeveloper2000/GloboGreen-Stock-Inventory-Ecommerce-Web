"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import apiClient from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import SummaryApi from "@/constants/SummaryApi";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ForgotRole =
  | "MASTER_ADMIN"
  | "MANAGER"
  | "SUPERVISOR"
  | "STAFF"
  | "SHOP_OWNER"
  | "SHOP_MANAGER"
  | "SHOP_SUPERVISOR"
  | "EMPLOYEE";

type AccountType = "MASTER" | "STAFF" | "SHOP_OWNER" | "SHOP_STAFF";

type ApiEndpoint = {
  method: string;
  url: string;
};

const ROLE_OPTIONS: {
  label: string;
  value: ForgotRole;
  accountType: AccountType;
}[] = [
  { label: "MASTER ADMIN", value: "MASTER_ADMIN", accountType: "MASTER" },
  { label: "MANAGER", value: "MANAGER", accountType: "STAFF" },
  { label: "SUPERVISOR", value: "SUPERVISOR", accountType: "STAFF" },
  { label: "STAFF", value: "STAFF", accountType: "STAFF" },
  { label: "SHOP OWNER", value: "SHOP_OWNER", accountType: "SHOP_OWNER" },
  { label: "SHOP MANAGER", value: "SHOP_MANAGER", accountType: "SHOP_STAFF" },
  {
    label: "SHOP SUPERVISOR",
    value: "SHOP_SUPERVISOR",
    accountType: "SHOP_STAFF",
  },
  { label: "EMPLOYEE", value: "EMPLOYEE", accountType: "SHOP_STAFF" },
];

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
        ?.message || "Something went wrong"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

function isForgotRole(value: string | null | undefined): value is ForgotRole {
  if (!value) return false;
  return ROLE_OPTIONS.some((item) => item.value === value.toUpperCase());
}

function getRoleLabel(role: ForgotRole) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || role;
}

function getAccountType(role: ForgotRole): AccountType {
  return (
    ROLE_OPTIONS.find((item) => item.value === role)?.accountType || "MASTER"
  );
}

function getLoginPath(role: ForgotRole) {
  const accountType = getAccountType(role);
  return accountType === "MASTER" || accountType === "STAFF"
    ? "/masterlogin"
    : "/shoplogin";
}

function getForgotPinEndpoint(role: ForgotRole): ApiEndpoint {
  const accountType = getAccountType(role);

  switch (accountType) {
    case "MASTER":
      return SummaryApi.master_forgot_pin;
    case "STAFF":
      return SummaryApi.staff_forgot_pin;
    case "SHOP_OWNER":
      return SummaryApi.shopowner_forgot_pin;
    case "SHOP_STAFF":
      return SummaryApi.shopstaff_forgot_pin;
    default:
      return SummaryApi.master_forgot_pin;
  }
}

function getVerifyOtpEndpoint(role: ForgotRole): ApiEndpoint | null {
  const accountType = getAccountType(role);

  switch (accountType) {
    case "STAFF":
      return SummaryApi.staff_verify_pin_otp;
    case "SHOP_OWNER":
      return SummaryApi.shopowner_verify_pin_otp;
    case "SHOP_STAFF":
      return SummaryApi.shopstaff_verify_pin_otp;
    case "MASTER":
    default:
      return null;
  }
}

function getResetPinEndpoint(role: ForgotRole): ApiEndpoint {
  const accountType = getAccountType(role);

  switch (accountType) {
    case "MASTER":
      return SummaryApi.master_reset_pin;
    case "STAFF":
      return SummaryApi.staff_reset_pin;
    case "SHOP_OWNER":
      return SummaryApi.shopowner_reset_pin;
    case "SHOP_STAFF":
      return SummaryApi.shopstaff_reset_pin;
    default:
      return SummaryApi.master_reset_pin;
  }
}

function StepBar({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((item) => {
        const isActive = item <= activeStep;
        return (
          <div
            key={item}
            className={`h-2 rounded-full transition-all ${
              isActive
                ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
                : "bg-slate-200"
            }`}
          />
        );
      })}
    </div>
  );
}

function InputShell({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/10">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function ForgotPin() {
  const searchParams = useSearchParams();

  const [selectedRole, setSelectedRole] = useState<ForgotRole>("MASTER_ADMIN");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [login, setLogin] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  useEffect(() => {
    const roleFromQuery = searchParams.get("role");
    const normalized = roleFromQuery?.trim().toUpperCase();

    if (isForgotRole(normalized)) {
      setSelectedRole(normalized);
    }
  }, [searchParams]);

  const accountType = useMemo(
    () => getAccountType(selectedRole),
    [selectedRole]
  );

  const requiresSeparateOtpVerify = accountType !== "MASTER";
  const loginPath = useMemo(() => getLoginPath(selectedRole), [selectedRole]);

  const resetFlowAfterRoleChange = () => {
    setStep(1);
    setOtp("");
    setResetToken("");
    setNewPin("");
    setConfirmPin("");
  };

  const validateLogin = () => {
    if (!login.trim()) {
      appToast.warning(
        "Login required",
        "Please enter your login ID, email, or username."
      );
      return false;
    }
    return true;
  };

  const validateOtp = () => {
    if (!otp.trim()) {
      appToast.warning("OTP required", "Please enter the OTP.");
      return false;
    }

    if (!/^\d+$/.test(otp.trim())) {
      appToast.warning("Invalid OTP", "OTP must contain numbers only.");
      return false;
    }

    if (otp.trim().length < 4) {
      appToast.warning("Invalid OTP", "Please enter a valid OTP.");
      return false;
    }

    return true;
  };

  const validatePins = () => {
    if (!newPin.trim()) {
      appToast.warning("New PIN required", "Please enter your new PIN.");
      return false;
    }

    if (!confirmPin.trim()) {
      appToast.warning("Confirm PIN required", "Please confirm your new PIN.");
      return false;
    }

    if (!/^\d+$/.test(newPin.trim()) || !/^\d+$/.test(confirmPin.trim())) {
      appToast.warning("Invalid PIN", "PIN must contain numbers only.");
      return false;
    }

    if (newPin.trim().length < 4 || newPin.trim().length > 8) {
      appToast.warning("Invalid PIN", "PIN must be 4 to 8 digits.");
      return false;
    }

    if (newPin.trim() !== confirmPin.trim()) {
      appToast.warning(
        "PIN mismatch",
        "New PIN and confirm PIN do not match."
      );
      return false;
    }

    return true;
  };

  const handleSendOtp = async () => {
    if (loading) return;
    if (!validateLogin()) return;

    try {
      setLoading(true);

      const endpoint = getForgotPinEndpoint(selectedRole);

      const payload =
        accountType === "MASTER"
          ? {
              login: login.trim(),
              role: selectedRole,
            }
          : {
              login: login.trim(),
            };

      const response = await apiClient.request({
        method: endpoint.method,
        url: endpoint.url,
        data: payload,
      });

      appToast.success(
        "OTP sent",
        response?.data?.message || "OTP sent successfully."
      );

      setOtp("");
      setResetToken("");
      setNewPin("");
      setConfirmPin("");
      setStep(2);
    } catch (error) {
      appToast.error("Request failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loading) return;
    if (!validateOtp()) return;

    if (!requiresSeparateOtpVerify) {
      setStep(3);
      return;
    }

    try {
      setLoading(true);

      const endpoint = getVerifyOtpEndpoint(selectedRole);

      if (!endpoint) {
        setStep(3);
        return;
      }

      const response = await apiClient.request({
        method: endpoint.method,
        url: endpoint.url,
        data: {
          login: login.trim(),
          otp: otp.trim(),
        },
      });

      const token =
        response?.data?.resetToken || response?.data?.data?.resetToken || "";

      if (!token) {
        appToast.error(
          "OTP verification failed",
          "Reset token not received from server."
        );
        return;
      }

      setResetToken(token);
      appToast.success("OTP verified", "Now set your new PIN.");
      setStep(3);
    } catch (error) {
      appToast.error("OTP verification failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (loading) return;
    if (accountType === "MASTER" && !validateOtp()) return;
    if (!validatePins()) return;

    if (accountType !== "MASTER" && !resetToken.trim()) {
      appToast.error(
        "Reset failed",
        "Reset token missing. Please verify OTP again."
      );
      return;
    }

    try {
      setLoading(true);

      const endpoint = getResetPinEndpoint(selectedRole);

      const payload =
        accountType === "MASTER"
          ? {
              login: login.trim(),
              role: selectedRole,
              otp: otp.trim(),
              newPin: newPin.trim(),
            }
          : {
              login: login.trim(),
              resetToken: resetToken.trim(),
              newPin: newPin.trim(),
            };

      const response = await apiClient.request({
        method: endpoint.method,
        url: endpoint.url,
        data: payload,
      });

      appToast.success(
        "PIN reset successful",
        response?.data?.message || "Your PIN has been reset successfully."
      );

      setLogin("");
      setOtp("");
      setResetToken("");
      setNewPin("");
      setConfirmPin("");
      setStep(1);
    } catch (error) {
      appToast.error("Reset failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#111c7a_0%,#292c8f_55%,#c10773_100%)] px-4 py-8">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-black/10" />

      <div
        className="absolute -left-20 -top-20 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(46,49,146,0.35)" }}
      />
      <div
        className="absolute -right-20 top-10 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "rgba(236,6,119,0.25)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "rgba(255,255,255,0.10)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-5 text-center text-white">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Forgot PIN Component
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight">
            Reset secure access
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Use your role, login ID, and OTP to reset your PIN for master, shop
            owner, and staff accounts.
          </p>
        </div>

        <Card className="overflow-hidden rounded-[28px] border-0 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur">
          <div className="h-2 w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />

          <CardHeader className="space-y-4 px-6 pb-2 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {step === 1 && "Forgot your PIN?"}
                  {step === 2 && "Verify OTP"}
                  {step === 3 && "Reset your PIN"}
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-slate-500">
                  Step {step} of 3 · {getRoleLabel(selectedRole)}
                </CardDescription>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white shadow-lg">
                {step === 1 && <UserCircle2 className="h-6 w-6" />}
                {step === 2 && <ShieldCheck className="h-6 w-6" />}
                {step === 3 && <KeyRound className="h-6 w-6" />}
              </div>
            </div>

            <StepBar activeStep={step} />
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-6 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">
                Account Role
              </label>
              <InputShell icon={ShieldCheck}>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as ForgotRole;
                    setSelectedRole(nextRole);
                    resetFlowAfterRoleChange();
                  }}
                  className="h-full w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
                  disabled={loading}
                >
                  {ROLE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </InputShell>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">
                Login ID / Email / Username
              </label>
              <InputShell icon={UserCircle2}>
                <input
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Enter login, email or username"
                  className="h-full w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  disabled={loading || step > 1}
                />
              </InputShell>
            </div>

            {step >= 2 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">
                  OTP
                </label>
                <InputShell icon={ShieldCheck}>
                  <input
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                    placeholder="Enter OTP"
                    className="h-full w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    disabled={loading || (step === 3 && accountType !== "MASTER")}
                  />
                </InputShell>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">
                    New PIN
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/10">
                    <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={newPin}
                      onChange={(e) =>
                        setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))
                      }
                      type={showNewPin ? "text" : "password"}
                      placeholder="Enter new PIN"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin((prev) => !prev)}
                      className="text-slate-400 transition hover:text-slate-700"
                      aria-label={showNewPin ? "Hide new PIN" : "Show new PIN"}
                    >
                      {showNewPin ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600">
                    Confirm PIN
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/10">
                    <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(
                          e.target.value.replace(/\D/g, "").slice(0, 8)
                        )
                      }
                      type={showConfirmPin ? "text" : "password"}
                      placeholder="Confirm new PIN"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin((prev) => !prev)}
                      className="text-slate-400 transition hover:text-slate-700"
                      aria-label={
                        showConfirmPin ? "Hide confirm PIN" : "Show confirm PIN"
                      }
                    >
                      {showConfirmPin ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              {step === 1 ? (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="col-span-1 h-12 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-sm font-semibold text-white shadow-lg hover:opacity-95 sm:col-span-2"
                >
                  {loading ? "Sending..." : "Send OTP"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              ) : step === 2 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="h-12 rounded-2xl border-slate-200 text-sm font-semibold"
                  >
                    Back
                  </Button>

                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="h-12 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-sm font-semibold text-white shadow-lg hover:opacity-95"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="h-12 rounded-2xl border-slate-200 text-sm font-semibold"
                  >
                    Back
                  </Button>

                  <Button
                    type="button"
                    onClick={handleResetPin}
                    disabled={loading}
                    className="h-12 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-sm font-semibold text-white shadow-lg hover:opacity-95"
                  >
                    {loading ? "Resetting..." : "Reset PIN"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center justify-center pt-1">
              <Link
                href={loginPath}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--accent)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/75">
          (c) 2026 GloboGreen. Secure enterprise access.
        </p>
      </div>
    </div>
  );
}