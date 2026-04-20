"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

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

function resolveRequestEndpoint(role: ShopRole) {
  if (role === "SHOP_OWNER") {
    return SummaryApi.shopowner_request_email_otp;
  }

  return SummaryApi.shopstaff_request_email_otp;
}

function getRoleLabel(role: ShopRole) {
  switch (role) {
    case "SHOP_OWNER":
      return "Shop Owner";
    case "SHOP_MANAGER":
      return "Shop Manager";
    case "SHOP_SUPERVISOR":
      return "Shop Supervisor";
    case "EMPLOYEE":
      return "Employee";
    default:
      return role;
  }
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
        ?.message || "Failed to send OTP"
    );
  }

  if (error instanceof Error) return error.message;
  return "Failed to send OTP";
}

export default function RequestEmailOtp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = useMemo(
    () => normalizeRole(searchParams.get("role")),
    [searchParams]
  );
  const login = searchParams.get("login") || "";

  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const endpoint = resolveRequestEndpoint(role);

      await apiClient.request({
        method: endpoint.method,
        url: endpoint.url,
      });

      appToast.success(
        "OTP sent",
        "A verification OTP has been sent to your registered email."
      );

      router.replace(
        `/email/verify?role=${encodeURIComponent(role)}&login=${encodeURIComponent(
          login
        )}`
      );
    } catch (error) {
      appToast.error("Request failed", getErrorMessage(error));
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
                <Mail className="h-5 w-5" />
              </div>

              <div>
                <CardTitle className="text-2xl text-heading">
                  Request email OTP
                </CardTitle>
                <CardDescription className="text-secondary-text">
                  Verify your email to continue your shop account access.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1 text-sm text-secondary-text">
                  <p>
                    <span className="font-medium text-heading">Role:</span>{" "}
                    {getRoleLabel(role)}
                  </p>
                  <p>
                    <span className="font-medium text-heading">Login ID:</span>{" "}
                    {login || "-"}
                  </p>
                  <p>
                    Your account is authenticated but email verification is still pending.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleRequestOtp}
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-gradient-primary text-white"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "Sending OTP..." : "Send verification OTP"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}