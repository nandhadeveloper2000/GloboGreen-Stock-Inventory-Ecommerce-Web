"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Package, Phone, Mail, LogOut, ChevronRight } from "lucide-react";
import { useSite } from "../SiteContext";

export default function AccountPage() {
  const router = useRouter();
  const { customer, logout } = useSite();

  useEffect(() => {
    if (!customer) {
      router.replace("/login?redirect=/account");
    }
  }, [customer, router]);

  if (!customer) return null;

  const menuItems = [
    {
      href: "/account/orders",
      icon: <Package className="h-5 w-5 text-green-600" />,
      label: "My Orders",
      sub: "Track, return or buy again",
    },
    {
      href: "/account/profile",
      icon: <User className="h-5 w-5 text-blue-600" />,
      label: "My Profile",
      sub: "Name, mobile, email",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-20">
      {/* Profile card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold">{customer.name}</p>
            <div className="mt-1 flex flex-col gap-0.5 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                +91 {customer.mobile}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="space-y-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>
        ))}

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-red-100 bg-white p-4 shadow-sm hover:bg-red-50 transition"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <LogOut className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-red-600">Logout</p>
              <p className="text-xs text-slate-400">Sign out of your account</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-red-300" />
        </button>
      </div>
    </div>
  );
}
