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

const SHOP_OWNER_MENU: NavItem[] = [
  { label: "Dashboard", href: "/shopowner/dashboard" },

  {
    label: "Shop Staff Management",
    children: [
      { label: "Create Shop Staff", href: "/shopowner/shopstaff/create" },
      { label: "Shop Staff List", href: "/shopowner/shopstaff/list" },
    ],
  },

  {
    label: "Shop Management",
    children: [
      { label: "Create Shop", href: "/shopowner/shopprofile/create" },
      { label: "Shop List", href: "/shopowner/shopprofile/list" },
    ],
  },

  {
    label: "Supplier / Vendor",
    children: [
      { label: "Create Vendor", href: "/shopowner/vendors/create" },
      { label: "Vendor List", href: "/shopowner/vendors/list" },
    ],
  },

  {
    label: "Expense Management",
    children: [
      { label: "Expense Entry", href: "/shopowner/expenses/create" },
      { label: "View Expenses", href: "/shopowner/expenses/list" },
    ],
  },

  {
    label: "My Category",
    children: [
      { label: "Add My Category", href: "/shopowner/categories/create" },
      { label: "My Category List", href: "/shopowner/categories/list" },
    ],
  },

  {
    label: "My Subcategory",
    children: [
      {
        label: "Add My Subcategory",
        href: "/shopowner/subcategories/create",
      },
      {
        label: "My Subcategory List",
        href: "/shopowner/subcategories/list",
      },
    ],
  },

  {
    label: "My Brand",
    children: [
      { label: "Add My Brand", href: "/shopowner/brands/create" },
      { label: "My Brand List", href: "/shopowner/brands/list" },
    ],
  },

  {
    label: "My Model",
    children: [
      { label: "Add My Model", href: "/shopowner/models/create" },
      { label: "My Model List", href: "/shopowner/models/list" },
    ],
  },

  {
    label: "My Shop Product",
    children: [
      { label: "Add Shop Product", href: "/shopowner/myshoppage/create" },
      { label: "Shop Product List", href: "/shopowner/myshoppage/list" },
    ],
  },

  {
    label: "Purchase",
    children: [
      { label: "Create Purchase", href: "/shopowner/purchase/create" },
      { label: "Purchase List", href: "/shopowner/purchase/list" },
      {
        label: "Create Purchase Return",
        href: "/shopowner/purchasereturn/create",
      },
      {
        label: "Purchase Return List",
        href: "/shopowner/purchasereturn/list",
      },
    ],
  },

  {
    label: "Sales",
    children: [
      { label: "Create Sale", href: "/shopowner/sales/create" },
      { label: "Sales List", href: "/shopowner/sales/list" },
      { label: "Sales Return List", href: "/shopowner/salesreturn/list" },
    ],
  },

  {
    label: "Inventory",
    children: [
      { label: "Stock List", href: "/shopowner/stock/list" },
      { label: "Stock Adjustment", href: "/shopowner/stock/adjustment" },
    ],
  },

  {
    label: "Physical Stock Management",
    children: [
      { label: "Stock Entry", href: "/shopowner/physical-stock/create" },
      { label: "View Stock Entry", href: "/shopowner/physical-stock/list" },
    ],
  },

  {
    label: "Barcode Printing",
    children: [
      { label: "Print Barcodes", href: "/shopowner/barcode-printing/create" },
      {
        label: "Label Settings",
        href: "/shopowner/barcode-printing/settings/label-settings",
      },
    ],
  },

  {
    label: "Customer Management",
    children: [
      { label: "Customer List", href: "/shopowner/customer/list" },
    ],
  },
];

const SHOP_MANAGER_MENU: NavItem[] = [
  { label: "Dashboard", href: "/shopmanager/dashboard" },
  {
    label: "Shop Staff Management",
    children: [
      { label: "Create Shop Staff", href: "/shopmanager/shopstaff/create" },
      { label: "Shop Staff List", href: "/shopmanager/shopstaff/list" },
    ],
  },
];

const SHOP_SUPERVISOR_MENU: NavItem[] = [
  { label: "Dashboard", href: "/shopsupervisor/dashboard" },
  {
    label: "Shop Staff Management",
    children: [
      { label: "Create Shop Staff", href: "/shopsupervisor/shopstaff/create" },
      { label: "Shop Staff List", href: "/shopsupervisor/shopstaff/list" },
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

  [ROLES.SHOP_OWNER]: SHOP_OWNER_MENU,
  [ROLES.SHOP_MANAGER]: SHOP_MANAGER_MENU,
  [ROLES.SHOP_SUPERVISOR]: SHOP_SUPERVISOR_MENU,
  [ROLES.EMPLOYEE]: buildDashboardOnlyMenu("/employee"),
};