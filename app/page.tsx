// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth/AuthProvider";
import { normalizeRole } from "@/utils/permissions";
import { getDashboardRouteByRole } from "@/utils/redirect";

type PortalItem = {
  title: string;
  description: string;
  href: string;
  icon: "master" | "shop";
};

const portals: PortalItem[] = [
  {
    title: "Master Login",
    description:
      "Master Admin Portal",
    href: "/masterlogin",
    icon: "master",
  },
  {
    title: "Shop Login",
    description: "Shop Admin Portal",
    href: "/shoplogin",
    icon: "shop",
  },
];

function PortalIcon({ icon }: { icon: PortalItem["icon"] }) {
  if (icon === "shop") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8"
      >
        <path d="M3 10l2-5h14l2 5" />
        <path d="M5 10v8a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-8" />
        <path d="M8 19v-5h8v5" />
        <path d="M9 10v1" />
        <path d="M15 10v1" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
    >
      <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
      <path d="M9.4 12.4l1.7 1.7 3.8-4.2" />
    </svg>
  );
}

function PageBackground() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />

      {/* Light black overlay only */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/35" />

      {/* Center light effect for better image visibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_46%,rgba(0,0,0,0.10)_100%)]"
      />
    </>
  );
}

function LoadingScreen({ isReady }: { isReady: boolean }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <PageBackground />

      <div className="relative rounded-3xl border border-white/50 bg-white/95 px-8 py-7 text-center shadow-2xl backdrop-blur-md">
        <Image
          src="/favicon.png"
          alt="Tiya Inventory logo"
          width={56}
          height={56}
          priority
          className="mx-auto h-auto w-auto object-contain"
          style={{ width: "auto", height: "auto" }}
        />

        <p className="mt-4 text-sm font-bold text-slate-900">
          {!isReady ? "Loading session..." : "Opening your dashboard..."}
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  const router = useRouter();
  const { isReady, isAuthenticated, role } = useAuth();

  const authenticatedRole = normalizeRole(role);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !authenticatedRole) return;

    router.replace(getDashboardRouteByRole(authenticatedRole));
  }, [authenticatedRole, isAuthenticated, isReady, router]);

  if (!isReady || (isAuthenticated && authenticatedRole)) {
    return <LoadingScreen isReady={isReady} />;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-6 sm:px-6 lg:py-8">
      <PageBackground />

      <section className="relative w-full max-w-5xl rounded-[32px] border border-white/60 bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.28)] backdrop-blur-md sm:p-7 lg:p-9">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.14)] sm:h-24 sm:w-24 sm:rounded-[28px]">
            <Image
              src="/favicon.png"
              alt="Tiya Inventory logo"
              width={68}
              height={68}
              priority
              className="h-auto w-auto object-contain"
              style={{ width: "auto", height: "auto" }}
            />
          </div>

          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-[#00008b] sm:text-xs">
            Tiya Inventory
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Choose Login Portal
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Select your correct login panel to continue.
          </p>
        </div>

        <div className="mx-auto mt-7 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-9">
          {portals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              aria-label={`Continue to ${portal.title}`}
              className="group rounded-[26px] border border-slate-200 bg-white/95 p-6 text-center shadow-[0_16px_38px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-[#00008b]/50 hover:shadow-[0_24px_55px_rgba(15,23,42,0.16)] sm:p-8"
            >
              <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-[#00008b]/10 text-[#00008b] transition duration-300 group-hover:bg-[#00008b] group-hover:text-white sm:h-20 sm:w-20">
                <PortalIcon icon={portal.icon} />
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 sm:text-2xl">
                {portal.title}
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-600">
                {portal.description}
              </p>

              <div className="mt-6 inline-flex h-11 min-w-36 items-center justify-center rounded-2xl bg-[#00008b] px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,139,0.25)] transition group-hover:bg-[#00006f]">
                Continue
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs font-medium text-slate-500">
          © 2026 Tiya Inventory. All rights reserved.
        </p>
      </section>
    </main>
  );
}