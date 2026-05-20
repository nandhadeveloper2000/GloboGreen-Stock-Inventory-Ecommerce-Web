"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Leaf, Phone, KeyRound, Loader2 } from "lucide-react";
import { baseURL } from "@/constants/SummaryApi";
import { useStore } from "../StoreProvider";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId") ?? "";
  const redirect = searchParams.get("redirect") ?? "";

  const { login } = useStore();

  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const qs = shopId ? `?shopId=${shopId}` : "";

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
      toast.success("OTP sent to your mobile");
      setStep("otp");
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? (err.response?.data?.message as string) ?? "Failed to send OTP"
          : "Failed to send OTP";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.trim().length < 4) {
      toast.error("Enter the OTP sent to your mobile");
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
      toast.success(`Welcome, ${customer.name ?? "Customer"}!`);
      router.replace(redirect || `/store/products${qs}`);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err)
          ? (err.response?.data?.message as string) ?? "Invalid OTP"
          : "Invalid OTP";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Leaf className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            Customer Login
          </h1>
          <p className="text-sm text-slate-500">
            {step === "mobile"
              ? "Enter your mobile number to continue"
              : `Enter the OTP sent to +91 ${mobile}`}
          </p>
        </div>

        {step === "mobile" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-green-400"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                One-Time Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm tracking-widest focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                  autoFocus
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-green-400"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify & Login
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("mobile");
                setOtp("");
              }}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
            >
              Change mobile number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function StoreLoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
