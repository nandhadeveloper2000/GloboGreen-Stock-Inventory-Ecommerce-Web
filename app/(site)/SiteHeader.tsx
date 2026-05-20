"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  User,
  LogOut,
  Search,
  Leaf,
  Package,
  ChevronDown,
} from "lucide-react";
import { useSite } from "./SiteContext";

export default function SiteHeader() {
  const router = useRouter();
  const { cartCount, customer, logout } = useSite();
  const [searchQ, setSearchQ] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQ.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-green-800 text-white shadow-lg">
      {/* Main header row */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:block">
            GloboGreen
          </span>
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex flex-1 max-w-2xl">
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search shops, products, brands..."
            className="h-10 flex-1 rounded-l-lg border-0 px-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          <button
            type="submit"
            className="flex h-10 items-center gap-1 rounded-r-lg bg-green-500 px-4 text-sm font-semibold hover:bg-green-400"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 hover:bg-white/10"
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-400 text-xs font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </div>
            <span className="text-xs hidden sm:block">Cart</span>
          </Link>

          {/* Account */}
          {customer ? (
            <div className="relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 hover:bg-white/10"
              >
                <User className="h-6 w-6" />
                <span className="flex items-center gap-0.5 text-xs hidden sm:flex">
                  <span className="max-w-[80px] truncate">{customer.name}</span>
                  <ChevronDown className="h-3 w-3" />
                </span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  <Link
                    href="/account"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    My Account
                  </Link>
                  <Link
                    href="/account/orders"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Package className="h-4 w-4 text-slate-400" />
                    My Orders
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      logout();
                      setAccountOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 hover:bg-white/10"
            >
              <User className="h-6 w-6" />
              <span className="text-xs hidden sm:block">Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Sub-nav */}
      <div className="bg-green-700">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-1.5 text-sm">
          <Link href="/" className="whitespace-nowrap hover:text-green-200">
            Home
          </Link>
          <Link href="/?category=Solar" className="whitespace-nowrap hover:text-green-200">
            Solar
          </Link>
          <Link href="/?category=Bamboo" className="whitespace-nowrap hover:text-green-200">
            Bamboo
          </Link>
          <Link href="/?category=Organic" className="whitespace-nowrap hover:text-green-200">
            Organic
          </Link>
          <Link href="/?category=Recycled" className="whitespace-nowrap hover:text-green-200">
            Recycled
          </Link>
          <Link href="/?category=Water" className="whitespace-nowrap hover:text-green-200">
            Water Saving
          </Link>
          <Link href="/?category=Energy" className="whitespace-nowrap hover:text-green-200">
            Energy Efficient
          </Link>
        </div>
      </div>
    </header>
  );
}
