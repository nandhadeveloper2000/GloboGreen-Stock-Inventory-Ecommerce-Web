"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Leaf, Phone, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { baseURL } from "@/constants/SummaryApi";
import { useSite } from "../SiteContext";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/account";

  const { login } = useSite();

  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    const m = mobile.trim();
    if (!/^[6-9]\d{9}$/.test(m)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${baseURL}/api/customer/auth/request-otp`, {
        mobile: m,
      });
      toast.success("OTP sent successfully");
      setStep("otp");
    } catch (err: unknown) {
      toast.error(
        axios.isAxiosError(err)
          ? (err.response?.data?.message as string) ?? "Failed to send OTP"
          : "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.trim().length < 4) {
      toast.error("Enter the OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${baseURL}/api/customer/auth/verify-otp`, {
        mobile: mobile.trim(),
        otp: otp.trim(),
      });
      const { accessToken, customer } = res.data?.data ?? res.data ?? {};
      if (!accessToken || !customer) {
        toast.error("Login failed. Please try again.");
        return;
      }
      login(accessToken, {
        _id: customer._id ?? customer.id ?? "",
        name: customer.name ?? "Customer",
        mobile: customer.mobile ?? mobile,
        email: customer.email,
      });
      toast.success(`Welcome back, ${customer.name ?? "Customer"}!`);
      router.replace(redirect);
    } catch (err: unknown) {
      toast.error(
        axios.isAxiosError(err)
          ? (err.response?.data?.message as string) ?? "Invalid OTP"
          : "Invalid OTP"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Leaf className="h-7 w-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Sign In</h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === "mobile"
                ? "Enter your mobile number to continue"
                : `OTP sent to +91 ${mobile}`}
            </p>
          </div>

          {step === "mobile" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mobile Number
                </label>
                <div className="flex">
                  <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                    +91
                  </span>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit number"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full rounded-r-xl border border-slate-300 py-3 pl-9 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || mobile.length < 10}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:bg-slate-300"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Enter OTP
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-slate-300 py-3 pl-9 pr-4 text-center text-lg font-bold tracking-widest focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:bg-slate-300"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("mobile");
                  setOtp("");
                }}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                ← Change mobile number
              </button>
            </form>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            Your data is secure and never shared
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          New to GloboGreen?{" "}
          <span className="text-green-700 font-medium">
            Register with your mobile number above
          </span>
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-green-700">
            ← Continue browsing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SiteLoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
