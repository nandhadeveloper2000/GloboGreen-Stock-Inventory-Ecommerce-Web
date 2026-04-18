import type { UserRole } from "@/constants/roles";

export type LoginRole = UserRole;
export type AuthAccountType = "MASTER" | "SHOP";

export type AuthUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  roles?: string[];
  verifyEmail?: boolean | string | number;
  emailVerified?: boolean | string | number;
  isEmailVerified?: boolean | string | number;
  isVerified?: boolean | string | number;
  isActive?: boolean | string | number;
  status?: string;
  accountStatus?: string;
  [key: string]: unknown;
};

export type AuthResponse = {
  success?: boolean;
  message?: string;
  data?: {
    user?: AuthUser;
    accessToken?: string;
    refreshToken?: string;
  };
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
};
