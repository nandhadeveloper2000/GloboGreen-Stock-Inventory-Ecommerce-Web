"use client";

import { MailCheck, ShieldCheck, Store, UserCircle2 } from "lucide-react";

import { useAuth } from "@/context/auth/AuthProvider";
import { getActiveState, getEmailVerificationState } from "@/utils/authUser";
import { getRoleLabel } from "@/utils/getLoginConfig";

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-token bg-card-token p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-text">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold text-heading">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function ShopDashboard() {
  const { user, role } = useAuth();

  const displayName =
    typeof user?.name === "string" && user.name.trim()
      ? user.name
      : typeof user?.username === "string" && user.username.trim()
      ? user.username
      : "Shop User";

  const displayEmail =
    typeof user?.email === "string" && user.email.trim()
      ? user.email
      : "No email available";

  const emailVerified = getEmailVerificationState(user);
  const isActive = getActiveState(user);

  return (
    <main className="page-premium">
      <div className="mx-auto max-w-400 space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-token bg-card-token shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-primary px-6 py-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
              Shop Panel
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
              Welcome, {displayName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
              Your shop account is signed in successfully. This dashboard confirms
              your role, email verification state, and current account status.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            <DetailCard
              icon={UserCircle2}
              label="Role"
              value={getRoleLabel(role)}
            />
            <DetailCard icon={Store} label="Email" value={displayEmail} />
            <DetailCard
              icon={MailCheck}
              label="Email Check"
              value={emailVerified === false ? "Pending" : "Verified"}
            />
            <DetailCard
              icon={ShieldCheck}
              label="Account Status"
              value={isActive === false ? "Inactive" : "Active"}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
