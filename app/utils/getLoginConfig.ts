import SummaryApi from "@/constants/SummaryApi";

export type LoginRole =
  | "MASTER_ADMIN"
  | "MANAGER"
  | "SUPERVISOR"
  | "STAFF";

type LoginConfig = {
  method: string;
  url: string;
};

export function getLoginConfig(role: LoginRole): LoginConfig {
  switch (role) {
    case "MASTER_ADMIN":
      return SummaryApi.master_login;

    case "MANAGER":
      return SummaryApi.subadmin_login;

    case "SUPERVISOR":
      return SummaryApi.supervisor_login;

    case "STAFF":
      return SummaryApi.staff_login;

    default:
      return SummaryApi.master_login;
  }
}