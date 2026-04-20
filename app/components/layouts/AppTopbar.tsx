"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, Bell, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvatarDropdown from "@/components/layouts/AvatarDropdown";
import type { UserRole } from "@/constants/navigation";

const SELECTED_SHOP_KEY = "selected_shop_id_web";

type AppTopbarProps = {
  role: UserRole;
  title?: string;
  onOpenMobileSidebar?: () => void;
};

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

export default function AppTopbar({
  role,
  title = "Dashboard",
  onOpenMobileSidebar,
}: AppTopbarProps) {
  const [selectedShopName, setSelectedShopName] = useState("");

  const isShopSide = useMemo(() => {
    const r = normalizeRole(role);
    return [
      "SHOP_OWNER",
      "SHOP_MANAGER",
      "SHOP_SUPERVISOR",
      "EMPLOYEE",
    ].includes(r);
  }, [role]);

  useEffect(() => {
    function syncShopName() {
      try {
        const storedName = window.localStorage.getItem("selected_shop_name_web");
        if (storedName) {
          setSelectedShopName(storedName);
        }
      } catch {
        setSelectedShopName("");
      }
    }

    syncShopName();

    window.addEventListener("storage", syncShopName);
    window.addEventListener(
      "shop-selection-changed",
      syncShopName as EventListener
    );

    return () => {
      window.removeEventListener("storage", syncShopName);
      window.removeEventListener(
        "shop-selection-changed",
        syncShopName as EventListener
      );
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="h-10 w-10 rounded-xl border-slate-200 bg-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {title}
          </h1>

          {isShopSide ? (
            <p className="flex items-center gap-1.5 text-xs text-slate-500 sm:text-sm">
              <Store className="h-3.5 w-3.5" />
              {selectedShopName || "Manage your selected shop efficiently."}
            </p>
          ) : (
            <p className="text-xs text-slate-500 sm:text-sm">
              Welcome back. Manage your operations efficiently.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-slate-200 bg-white"
        >
          <Bell className="h-4 w-4 text-slate-700" />
        </Button>

        <AvatarDropdown role={role} />
      </div>
    </header>
  );
}