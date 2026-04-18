import { ROLES, type UserRole } from "@/constants/roles";

export { ROLES };
export type { UserRole };

export type NavChildItem = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href?: string;
  children?: NavChildItem[];
};

const MASTER_ADMIN_MENU: NavItem[] = [
  { label: "Dashboard", href: "/master/dashboard" },
  {
    label: "Staff Management",
    children: [
      { label: "Create Staff", href: "/master/staff/create" },
      { label: "Staff List", href: "/master/staff/list" },
    ],
  },
  {
    label: "Shop Owner Management",
    children: [
      { label: "Create Shop Owner", href: "/master/shopowner/create" },
      { label: "Shop Owner List", href: "/master/shopowner/list" },
    ],
  },
  {
    label: "Shop Management",
    children: [
      { label: "Create Shop", href: "/master/shop/create" },
      { label: "Shop List", href: "/master/shop/list" },
    ],
  },
  {
    label: "Master Category",
    children: [
      { label: "Create Master Category", href: "/master/mastercategory/create" },
      { label: "Master Category List", href: "/master/mastercategory/list" },
    ],
  },
  {
    label: "Category",
    children: [
      { label: "Create Category", href: "/master/category/create" },
      { label: "Category List", href: "/master/category/list" },
    ],
  },
  {
    label: "Subcategory",
    children: [
      { label: "Create Subcategory", href: "/master/subcategory/create" },
      { label: "Subcategory List", href: "/master/subcategory/list" },
    ],
  },
  {
    label: "Product Type",
    children: [
      { label: "Create ProductType", href: "/master/producttype/create" },
      { label: "ProductType List", href: "/master/producttype/list" },
    ],
  },
  {
    label: "Brand",
    children: [
      { label: "Create Brand", href: "/master/brand/create" },
      { label: "Brand List", href: "/master/brand/list" },
    ],
  },
  {
    label: "Model",
    children: [
      { label: "Create Model", href: "/master/model/create" },
      { label: "Model List", href: "/master/model/list" },
    ],
  },
  {
    label: "Compatibility",
    children: [
      { label: "Create Compatibility", href: "/master/compatibility/create" },
      { label: "Compatibility List", href: "/master/compatibility/list" },
    ],
  },
  {
    label: "Product",
    children: [
      { label: "Create Product", href: "/master/product/create" },
      { label: "Product List", href: "/master/product/list" },
    ],
  },
];

function buildDashboardOnlyMenu(basePath: string): NavItem[] {
  return [{ label: "Dashboard", href: `${basePath}/dashboard` }];
}

export const SIDEBAR_MENU: Record<UserRole, NavItem[]> = {
  [ROLES.MASTER_ADMIN]: MASTER_ADMIN_MENU,
  [ROLES.MANAGER]: buildDashboardOnlyMenu("/manager"),
  [ROLES.SUPERVISOR]: buildDashboardOnlyMenu("/supervisor"),
  [ROLES.STAFF]: buildDashboardOnlyMenu("/staff"),
  [ROLES.SHOP_OWNER]: buildDashboardOnlyMenu("/shopowner"),
  [ROLES.SHOP_MANAGER]: buildDashboardOnlyMenu("/shopmanager"),
  [ROLES.SHOP_SUPERVISOR]: buildDashboardOnlyMenu("/shopsupervisor"),
  [ROLES.EMPLOYEE]: buildDashboardOnlyMenu("/employee"),
};
