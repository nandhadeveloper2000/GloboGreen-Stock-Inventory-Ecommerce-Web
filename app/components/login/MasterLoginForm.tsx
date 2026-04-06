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
import { postJson, pickAuthData, type ApiResponse } from "@/lib/api";
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
  role?: string;
  roles?: string[];
  [key: string]: unknown;
};

type LoginResponse = ApiResponse<{
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
}> & {
  user?: AuthUser;
};

function isAuthUser(value: unknown): value is AuthUser {
  return typeof value === "object" && value !== null;
}

function getLoginConfig(role: LoginRole): { method: string; url: string } {
  switch (role) {
    case "MASTER_ADMIN":
      return SummaryApi.master_login;
    case "MANAGER":
      return SummaryApi.subadmin_login;
    case "SUPERVISOR":
      return SummaryApi.supervisor_login;
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

      const result = await postJson<LoginResponse>(endpoint.url, {
        login: loginId.trim(),
        pin: pin.trim(),
      });

      if (!result.ok || !result.data) {
        throw new Error(result.error || result.data?.message || "Login failed");
      }

      const { accessToken, refreshToken, user } = pickAuthData(result.data);

      if (!isAuthUser(user) || !accessToken || !refreshToken) {
        throw new Error(result.data.message || "Invalid login response");
      }

      await setAuth(user, accessToken, refreshToken);

      appToast.success(
        "Login successful",
        `Welcome back, ${user.name || getRoleLabel(selectedRole)}.`
      );

      redirectByRole(user.role);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in";

      appToast.error("Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 bg-linear-hero">
      <div className="premium-grid-bg absolute inset-1 opacity-50" />

      <div className="absolute inset-0 bg-black/10" />

      <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-(--primary)/30 blur-3xl" />
      <div className="absolute -right-28 top-[8%] h-96 w-[24rem] rounded-full bg-(--accent)/25 blur-3xl" />
      <div className="absolute -bottom-28 left-[8%] h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-28 right-[10%] h-80 w-80 rounded-full bg-(--accent)/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="relative mx-auto flex items-center justify-center rounded-[30px] border border-white/20 bg-white backdrop-blur-xl p-6 shadow-xl">

            {/* Glass overlay */}
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
          <div className="h-1.5 w-full bg-linear-primary" />

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

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-primary text-white shadow-[0_14px_34px_rgba(236,6,119,0.24)]">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-6 pt-4">
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
                <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />
                <input
                  id="loginId"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter your login ID"
                  autoComplete="username"
                  disabled={loading}
                  className="premium-input pl-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleLogin();
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="premium-label">
                Security PIN
              </label>

              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />

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
                  className="premium-input pr-12 pl-10 tracking-[0.24em] placeholder:tracking-normal"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleLogin();
                    }
                  }}
                />

                <button
                  type="button"
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  onClick={() => setShowPin((prev) => !prev)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-(--slate) transition hover:bg-black/5 hover:text-(--heading) disabled:cursor-not-allowed disabled:opacity-60"
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
              type="button"
              onClick={() => void handleLogin()}
              disabled={loading}
              className="group h-12 w-full rounded-2xl border-0 bg-linear-primary text-sm font-semibold text-white shadow-[0_16px_40px_rgba(236,6,119,0.24)] transition-all duration-300 hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "Signing in..." : "Continue"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                )}
              </span>
            </Button>
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