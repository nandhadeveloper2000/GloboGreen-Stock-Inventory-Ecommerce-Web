"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  MailCheck,
  UserCircle2,
} from "lucide-react";

import { useAuth } from "@/context/auth/AuthProvider";
import apiClient from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import type { AuthResponse, LoginRole } from "@/types/auth";
import {
  getActiveState,
  getAuthUserRole,
  getEmailVerificationState,
  isAuthUser,
  pickAuthPayload,
} from "@/utils/authUser";
import {
  getDefaultLoginRole,
  getLoginConfig,
  getLoginRoles,
  getRoleAccountType,
  getRoleLabel,
} from "@/utils/getLoginConfig";
import { normalizeRole } from "@/utils/permissions";
import { getDashboardRouteByRole } from "@/utils/redirect";

const REMEMBER_STORAGE_KEY = "globogreen_shop_login_remember";

type RememberLoginData = {
  rememberMe: boolean;
  loginId: string;
  selectedRole: LoginRole;
};

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

function getBlockedAccountMessage(
  emailVerified: boolean | null,
  isActive: boolean | null
) {
  if (emailVerified === false) {
    return "EMAIL_NOT_VERIFIED";
  }

  if (isActive === false) {
    return "ACCOUNT_INACTIVE";
  }

  return "";
}

function readRememberedLogin(): RememberLoginData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(REMEMBER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RememberLoginData>;

    if (!parsed.rememberMe || !parsed.loginId || !parsed.selectedRole) {
      return null;
    }

    return {
      rememberMe: true,
      loginId: String(parsed.loginId),
      selectedRole: parsed.selectedRole,
    };
  } catch {
    return null;
  }
}

function saveRememberedLogin(data: RememberLoginData) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    REMEMBER_STORAGE_KEY,
    JSON.stringify({
      rememberMe: data.rememberMe,
      loginId: data.loginId,
      selectedRole: data.selectedRole,
    })
  );
}

function clearRememberedLogin() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
}

export default function ShopLoginForm() {
  const router = useRouter();
  const { setAuth, isReady, isAuthenticated, role } = useAuth();

  const [selectedRole, setSelectedRole] = useState<LoginRole>(
    getDefaultLoginRole("SHOP")
  );
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const availableRoles = getLoginRoles("SHOP");
  const authenticatedRole = normalizeRole(role);

  useEffect(() => {
    const remembered = readRememberedLogin();

    if (!remembered) return;

    setRememberMe(true);
    setLoginId(remembered.loginId);
    setSelectedRole(remembered.selectedRole);
  }, []);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !authenticatedRole) {
      return;
    }

    router.replace(getDashboardRouteByRole(authenticatedRole));
  }, [authenticatedRole, isAuthenticated, isReady, router]);

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
      appToast.warning("PIN too short", "Please enter a valid numeric PIN.");
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

      const response = await apiClient.request<AuthResponse>({
        method: endpoint.method,
        url: endpoint.url,
        data: {
          login: loginId.trim(),
          pin: pin.trim(),
        },
      });

      const payload = response.data;
      const { accessToken, refreshToken, user } = pickAuthPayload(payload);

      if (!isAuthUser(user)) {
        throw new Error(payload?.message || "User data not found");
      }

      if (!accessToken) {
        throw new Error(payload?.message || "Access token not found");
      }

      if (!refreshToken) {
        throw new Error(payload?.message || "Refresh token not found");
      }

      const resolvedRole = getAuthUserRole(user) || selectedRole;
      const resolvedAccountType = getRoleAccountType(resolvedRole);

      if (!resolvedAccountType || resolvedAccountType !== "SHOP") {
        throw new Error("This account does not belong to the shop login area");
      }

      const emailVerified = getEmailVerificationState(user);
      const isActive = getActiveState(user);
      const blockedState = getBlockedAccountMessage(emailVerified, isActive);

      if (blockedState === "EMAIL_NOT_VERIFIED") {
        await setAuth(user, accessToken, refreshToken, resolvedRole);

        appToast.warning(
          "Email verification required",
          "Your email is not verified yet. Please verify your email to continue."
        );

        router.replace(
          `/email/request?role=${encodeURIComponent(
            resolvedRole
          )}&login=${encodeURIComponent(loginId.trim())}`
        );
        return;
      }

      if (blockedState === "ACCOUNT_INACTIVE") {
        throw new Error(
          "Your account is inactive or deactivated. Please contact support."
        );
      }

      if (rememberMe) {
        saveRememberedLogin({
          rememberMe: true,
          loginId: loginId.trim(),
          selectedRole,
        });
      } else {
        clearRememberedLogin();
      }

      await setAuth(user, accessToken, refreshToken, resolvedRole);

      appToast.success(
        "Login successful",
        `Welcome back, ${user.name || getRoleLabel(resolvedRole)}.`
      );

      router.replace(getDashboardRouteByRole(resolvedRole));
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

  if (!isReady || (isAuthenticated && authenticatedRole)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            {!isReady ? "Loading session..." : "Opening your dashboard..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8"
      style={{ backgroundImage: "url('/image.png')" }}
    >
      <div className="absolute inset-0  bg-black/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_35%)]" />

      <section className="relative z-10 flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/25 bg-white shadow-2xl">
              <Image
                src="/favicon.png"
                alt="Logo"
                width={52}
                height={52}
                priority
                className="h-auto w-auto object-contain"
                style={{ width: "auto", height: "auto" }}
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Shop Access
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/80">
              Login for shop owner and shop staff daily store operations.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-card border border-white/25 bg-white/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6"
          >
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Welcome Back
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Please login to your shop account.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="role"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Login Role <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <MailCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) =>
                      setSelectedRole(e.target.value as LoginRole)
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    disabled={loading}
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
                <label
                  htmlFor="loginId"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Login ID <span className="text-red-500">*</span>
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
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="pin"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Security PIN <span className="text-red-500">*</span>
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
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    onClick={() => setShowPin((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {showPin ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="group inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="sr-only"
                  />

                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-md border transition ${
                      rememberMe
                        ? "border-[#00008b] bg-[#00008b] text-white"
                        : "border-slate-300 bg-white text-transparent group-hover:border-[#00008b]"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>

                  <span className="select-none transition group-hover:text-[#00008b]">
                    Remember me
                  </span>
                </label>

                <Link
                  href={`/forgot-pin?role=${encodeURIComponent(selectedRole)}`}
                  className="text-sm font-semibold text-[#00008b] transition hover:text-[#00006f]"
                >
                  Forgot PIN?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white shadow-[0_14px_35px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Login"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-white/70">
            © 2026 GloboGreen. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}