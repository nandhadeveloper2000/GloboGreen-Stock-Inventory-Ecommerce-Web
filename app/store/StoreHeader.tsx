"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShoppingCart, User, LogOut, Leaf } from "lucide-react";
import { useStore } from "./StoreProvider";

export default function StoreHeader() {
  const { cartCount, customer, logout } = useStore();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId") ?? "";

  const qs = shopId ? `?shopId=${shopId}` : "";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-green-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href={`/store/products${qs}`}
          className="flex items-center gap-2 text-green-700 hover:text-green-800"
        >
          <Leaf className="h-6 w-6" />
          <span className="text-lg font-bold tracking-tight">GloboGreen</span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          {/* Cart */}
          <Link
            href={`/store/cart${qs}`}
            className="relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-700"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
            <span className="hidden sm:inline">Cart</span>
          </Link>

          {/* Auth */}
          {customer ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/store/account/orders${qs}`}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-700"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {customer.name}
                </span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href={`/store/login${qs}`}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
