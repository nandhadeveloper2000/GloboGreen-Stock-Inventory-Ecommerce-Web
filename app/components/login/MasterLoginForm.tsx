"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { useAuth } from "@/context/auth/AuthProvider";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { appToast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginRole = "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF";

type AuthUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  roles?: string[];
  [key: string]: unknown;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  data?: {
    user?: AuthUser;
    accessToken?: string;
    refreshToken?: string;
  };
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
};

function isAuthUser(value: unknown): value is AuthUser {
  return typeof value === "object" && value !== null;
}

function getLoginConfig(role: LoginRole): { method: string; url: string } {
  switch (role) {
    case "MASTER_ADMIN":
      return SummaryApi.master_login;
    case "MANAGER":
    case "SUPERVISOR":
    case "STAFF":
      return SummaryApi.staff_login;
    default:
      return SummaryApi.master_login;
  }
}

function getRoleLabel(role: LoginRole): string {
  switch (role) {
    case "MASTER_ADMIN":
      return "Master Admin";
    case "MANAGER":
      return "Manager";
    case "SUPERVISOR":
      return "Supervisor";
    case "STAFF":
      return "Staff";
    default:
      return "Master Admin";
  }
}

function pickLoginData(payload: LoginResponse) {
  return {
    accessToken: payload?.data?.accessToken || payload?.accessToken || "",
    refreshToken: payload?.data?.refreshToken || payload?.refreshToken || "",
    user: payload?.data?.user || payload?.user || null,
  };
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
        ?.message || "Unable to sign in"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to sign in";
}

export default function MasterLoginForm() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const [selectedRole, setSelectedRole] =
    useState<LoginRole>("MASTER_ADMIN");
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role?: string): void => {
    const normalizedRole = String(role ?? "").toUpperCase();

    if (normalizedRole === "MASTER_ADMIN") {
      router.push("/master/dashboard");
      return;
    }

    if (normalizedRole === "MANAGER") {
      router.push("/subadmin/dashboard");
      return;
    }

    if (normalizedRole === "SUPERVISOR") {
      router.push("/supervisor/dashboard");
      return;
    }

    if (normalizedRole === "STAFF") {
      router.push("/staff/dashboard");
      return;
    }

    router.push("/");
  };

  const validateForm = (): boolean => {
    if (!loginId.trim() && !pin.trim()) {
      appToast.warning(
        "Missing credentials",
        "Please enter your login ID and security PIN."
      );
      return false;
    }

    if (!loginId.trim()) {
      appToast.warning("Login ID required", "Please enter your login ID.");
      return false;
    }

    if (!pin.trim()) {
      appToast.warning("PIN required", "Please enter your security PIN.");
      return false;
    }

    if (!/^\d+$/.test(pin.trim())) {
      appToast.warning("Invalid PIN", "PIN must contain numbers only.");
      return false;
    }

    if (pin.trim().length < 4) {
      appToast.warning(
        "PIN too short",
        "Please enter a valid numeric PIN."
      );
      return false;
    }

    return true;
  };

  const handleLogin = async (): Promise<void> => {
    if (loading) return;
    if (!validateForm()) return;

    try {
      setLoading(true);

      const endpoint = getLoginConfig(selectedRole);

      const response = await apiClient.post<LoginResponse>(endpoint.url, {
        login: loginId.trim(),
        pin: pin.trim(),
      });

      const payload = response.data;
      const { accessToken, refreshToken, user } = pickLoginData(payload);

      if (!isAuthUser(user)) {
        throw new Error(payload?.message || "User data not found");
      }

      if (!accessToken) {
        throw new Error(payload?.message || "Access token not found");
      }

      if (!refreshToken) {
        throw new Error(payload?.message || "Refresh token not found");
      }

      await setAuth(user, accessToken, refreshToken);

      appToast.success(
        "Login successful",
        `Welcome back, ${user.name || getRoleLabel(selectedRole)}.`
      );

      redirectByRole(user.role);
    } catch (error: unknown) {
      appToast.error("Login failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleLogin();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 bg-gradient-hero">
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

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="relative mx-auto flex items-center justify-center rounded-[30px] border border-white/20 bg-white p-6 backdrop-blur-xl shadow-xl">
            <div className="absolute inset-0 rounded-[30px] bg-white/5" />

            <Image
              src="/logo.png"
              alt="GloboGreen logo"
              width={500}
              height={50}
              priority
              className="relative object-contain"
            />
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
            Welcome back
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/75">
            Sign in securely to access your GloboGreen dashboard, teams, and
            workflows with role-based control.
          </p>
        </div>

        <Card className="premium-card premium-border overflow-hidden border-0 bg-white/85 backdrop-blur-2xl">
          <div className="h-1.5 w-full bg-gradient-primary" />

          <CardHeader className="space-y-3 px-6 pb-2 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl font-semibold tracking-tight text-heading">
                  Secure login
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-secondary-text">
                  Choose your role and continue with your login ID and PIN
                </CardDescription>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-[0_14px_34px_rgba(236,6,119,0.24)]">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="role" className="premium-label">
                  Login Role
                </label>

                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as LoginRole)}
                  className="premium-select"
                  disabled={loading}
                >
                  <option value="MASTER_ADMIN">Master Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>

              <div>
                <label htmlFor="loginId" className="premium-label">
                  Login ID
                </label>

                <div className="relative">
                  <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="loginId"
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="Enter your login ID"
                    autoComplete="username"
                    disabled={loading}
                    className="premium-input pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pin" className="premium-label">
                  Security PIN
                </label>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="pin"
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter your PIN"
                    autoComplete="current-password"
                    inputMode="numeric"
                    maxLength={6}
                    disabled={loading}
                    className="premium-input pl-10 pr-12 tracking-[0.24em] placeholder:tracking-normal"
                  />

                  <button
                    type="button"
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    onClick={() => setShowPin((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {showPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group h-12 w-full rounded-2xl border-0 bg-gradient-primary text-sm font-semibold text-white shadow-[0_16px_40px_rgba(236,6,119,0.24)] transition-all duration-300 hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? "Signing in..." : "Continue"}
                  {!loading && (
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  )}
                </span>
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-5 text-center">
          <p className="text-xs text-white/65">
            © 2026 GloboGreen. Secure enterprise access.
          </p>
        </div>
      </div>
    </div>
  );
}