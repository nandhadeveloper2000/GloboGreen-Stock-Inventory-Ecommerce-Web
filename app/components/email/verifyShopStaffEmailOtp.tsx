"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BadgeCheck, Shield } from "lucide-react";

import apiClient from "@/lib/api-client";
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

type ShopRole =
  | "SHOP_OWNER"
  | "SHOP_MANAGER"
  | "SHOP_SUPERVISOR"
  | "EMPLOYEE";

function resolveVerifyEndpoint(role: ShopRole) {
  if (role === "SHOP_OWNER") {
    return SummaryApi.shopowner_verify_email_otp;
  }

  return SummaryApi.shopstaff_verify_email_otp;
}

function normalizeRole(value: string | null): ShopRole {
  const role = String(value || "").trim().toUpperCase();

  if (
    role === "SHOP_OWNER" ||
    role === "SHOP_MANAGER" ||
    role === "SHOP_SUPERVISOR" ||
    role === "EMPLOYEE"
  ) {
    return role;
  }

  return "SHOP_OWNER";
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
        ?.message || "Failed to verify OTP"
    );
  }

  if (error instanceof Error) return error.message;
  return "Failed to verify OTP";
}

export default function VerifyShopStaffEmailOtp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = useMemo(
    () => normalizeRole(searchParams.get("role")),
    [searchParams]
  );
  const login = searchParams.get("login") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    if (loading) return;

    if (!otp.trim()) {
      appToast.warning("OTP required", "Please enter the OTP.");
      return;
    }

    if (!/^\d+$/.test(otp.trim())) {
      appToast.warning("Invalid OTP", "OTP must contain numbers only.");
      return;
    }

    try {
      setLoading(true);

      const endpoint = resolveVerifyEndpoint(role);

      await apiClient.request({
        method: endpoint.method,
        url: endpoint.url,
        data: {
          otp: otp.trim(),
        },
      });

      appToast.success(
        "Email verified",
        "Your email has been verified successfully."
      );

      router.replace("/shoplogin");
    } catch (error) {
      appToast.error("Verification failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <Card className="premium-card premium-border overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-primary" />

          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BadgeCheck className="h-5 w-5" />
              </div>

              <div>
                <CardTitle className="text-2xl text-heading">
                  Verify email OTP
                </CardTitle>
                <CardDescription className="text-secondary-text">
                  Enter the OTP sent to your registered email address.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-secondary-text">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1">
                  <p>
                    <span className="font-medium text-heading">Role:</span> {role}
                  </p>
                  <p>
                    <span className="font-medium text-heading">Login ID:</span>{" "}
                    {login || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="otp" className="premium-label">
                Email OTP
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP"
                className="premium-input"
              />
            </div>

            <Button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-gradient-primary text-white"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "Verifying..." : "Verify OTP"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}