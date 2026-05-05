"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  KeyRound,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/constants/navigation";

type AvatarDropdownProps = {
  role: UserRole;
};

function getRolePaths(role: UserRole) {
  switch (role) {
    case "MASTER_ADMIN":
      return {
        appBasePath: "/master",
        loginPath: "/masterlogin",
        changePinPath: "/master/change-pin",
      };
    case "MANAGER":
      return {
        appBasePath: "/manager",
        loginPath: "/masterlogin",
        changePinPath: "/manager/change-pin",
      };
    case "SUPERVISOR":
      return {
        appBasePath: "/supervisor",
        loginPath: "/masterlogin",
        changePinPath: "/supervisor/change-pin",
      };
    case "STAFF":
      return {
        appBasePath: "/staff",
        loginPath: "/masterlogin",
        changePinPath: "/staff/change-pin",
      };
    case "SHOP_OWNER":
      return {
        appBasePath: "/shopowner",
        loginPath: "/shoplogin",
        changePinPath: "/shopowner/change-pin",
      };
    case "SHOP_MANAGER":
      return {
        appBasePath: "/shopmanager",
        loginPath: "/shoplogin",
        changePinPath: "/shopmanager/change-pin",
      };
    case "SHOP_SUPERVISOR":
      return {
        appBasePath: "/shopsupervisor",
        loginPath: "/shoplogin",
        changePinPath: "/shopsupervisor/change-pin",
      };
    case "EMPLOYEE":
      return {
        appBasePath: "/employee",
        loginPath: "/shoplogin",
        changePinPath: "/employee/change-pin",
      };
    default:
      return {
        appBasePath: "/",
        loginPath: "/",
        changePinPath: "/",
      };
  }
}

export default function AvatarDropdown({ role }: AvatarDropdownProps) {
  const router = useRouter();
  const { user, clearAuth } = useAuth();

  const paths = useMemo(() => getRolePaths(role), [role]);

  const displayName =
    typeof user?.name === "string" && user.name.trim()
      ? user.name
      : typeof user?.username === "string" && user.username.trim()
      ? user.username
      : "User";

  const displayEmail =
    typeof user?.email === "string" && user.email.trim() ? user.email : role;

  const avatarUrl =
    typeof user?.avatarUrl === "string" && user.avatarUrl.trim()
      ? user.avatarUrl
      : "";

  const initials = displayName.slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await clearAuth();
    toast.success("Logged out successfully");
    router.replace(paths.loginPath);
  };

  const handleProfile = () => {
    router.push(`${paths.appBasePath}/profile`);
  };

  const handleChangePin = () => {
    router.push(paths.changePinPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-2xl border-slate-200 bg-white px-2.5 shadow-sm"
        >
          {avatarUrl ? (
            <div className="relative h-9 w-9 overflow-hidden rounded-xl">
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="36px"
              />
            </div>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-green-700 text-sm font-semibold text-white">
              {initials}
            </span>
          )}

          <span className="hidden px-2 text-left sm:block">
            <span className="block text-sm font-semibold text-slate-900">
              {displayName}
            </span>
            <span className="block text-xs text-slate-500">{displayEmail}</span>
          </span>

          <ChevronDown className="ml-1 h-4 w-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.15)]"
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="text-sm font-semibold text-slate-900">
            {displayName}
          </div>
          <div className="text-xs text-slate-500">{displayEmail}</div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleProfile}
          className="cursor-pointer rounded-xl px-3 py-2.5"
        >
          <UserCircle2 className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleChangePin}
          className="cursor-pointer rounded-xl px-3 py-2.5"
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Change PIN
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}