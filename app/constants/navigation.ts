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
    label: "Catalog",
    children: [
      { label: "Categories", href: "/master/category/list" },
      { label: "Subcategories", href: "/master/subcategory/list" },
      { label: "Brand", href: "/master/brand/list" },
      { label: "Model", href: "/master/model/list" },
      { label: "Product Type", href: "/master/producttype/list" },
      {
        label: "Product Type Fields",
        href: "/master/product-type-fields/list",
      },
      { label: "Compatibility", href: "/master/compatibility/list" },
    ],
  },
  {
    label: "Product",
    children: [
      { label: "Product List", href: "/master/product/list" },
      { label: "Product Approvals", href: "/master/product/approvals" },
    ],
  },
  {
    label: "Reports",
    children: [
      { label: "Sales Report", href: "/master/reports/sales" },
      { label: "Purchase Report", href: "/master/reports/purchases" },
      { label: "Expense Report", href: "/master/reports/expenses" },
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
      { label: "Add Shop Product", href: "/shopowner/product/create" },
      { label: "Shop Product List", href: "/shopowner/product/list" },
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
    label: "Stock Transfers",
    children: [
      { label: "New Transfer", href: "/shopowner/stock-transfers/create" },
      { label: "Transfer List", href: "/shopowner/stock-transfers/list" },
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
      { label: "Customer Orders", href: "/shopowner/orders/list" },
    ],
  },

  {
    label: "Party Accounts",
    children: [
      { label: "New Account", href: "/shopowner/accounts/create" },
      { label: "Account List", href: "/shopowner/accounts/list" },
    ],
  },

  {
    label: "Payments",
    children: [
      { label: "Payment Entry", href: "/shopowner/payments/create" },
      { label: "Payment List", href: "/shopowner/payments/list" },
    ],
  },

  {
    label: "Discounts & Coupons",
    children: [
      { label: "Create Discount", href: "/shopowner/discounts/create" },
      { label: "Discount List", href: "/shopowner/discounts/list" },
    ],
  },

  {
    label: "Price Lists",
    children: [
      { label: "Product Price List", href: "/shopowner/price-lists/list" },
    ],
  },

  {
    label: "Loyalty Points",
    children: [
      { label: "Loyalty Report", href: "/shopowner/loyalty/report" },
    ],
  },

  {
    label: "Reports",
    children: [
      { label: "Sales Report", href: "/shopowner/reports/sales" },
      { label: "Purchase Report", href: "/shopowner/reports/purchases" },
      { label: "Expense Report", href: "/shopowner/reports/expenses" },
      { label: "GST Report", href: "/shopowner/reports/gst" },
    ],
  },
];

const MANAGER_MENU: NavItem[] = [
  { label: "Dashboard", href: "/manager/dashboard" },
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
    label: "Catalog",
    children: [
      { label: "Categories", href: "/master/category/list" },
      { label: "Subcategories", href: "/master/subcategory/list" },
      { label: "Brand List", href: "/master/brand/list" },
      { label: "Model List", href: "/master/model/list" },
      { label: "Product Type", href: "/master/producttype/list" },
      {
        label: "Product Type Fields",
        href: "/master/product-type-fields/list",
      },
      { label: "Compatibility", href: "/master/compatibility/list" },
    ],
  },
  {
    label: "Product",
    children: [
      { label: "Product List", href: "/master/product/list" },
      { label: "Product Approvals", href: "/master/product/approvals" },
    ],
  },
  {
    label: "Reports",
    children: [
      { label: "Sales Report", href: "/master/reports/sales" },
      { label: "Purchase Report", href: "/master/reports/purchases" },
      { label: "Expense Report", href: "/master/reports/expenses" },
    ],
  },
];

const SUPERVISOR_MENU: NavItem[] = [
  { label: "Dashboard", href: "/supervisor/dashboard" },
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
      { label: "Shop List", href: "/master/shop/list" },
    ],
  },
];

const STAFF_MENU: NavItem[] = [
  { label: "Dashboard", href: "/staff/dashboard" },
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
      { label: "Shop List", href: "/master/shop/list" },
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
  {
    label: "Sales",
    children: [
      { label: "Create Sale", href: "/shopowner/sales/create" },
      { label: "Sales List", href: "/shopowner/sales/list" },
      { label: "Sales Return List", href: "/shopowner/salesreturn/list" },
    ],
  },
  {
    label: "Purchase",
    children: [
      { label: "Create Purchase", href: "/shopowner/purchase/create" },
      { label: "Purchase List", href: "/shopowner/purchase/list" },
    ],
  },
  {
    label: "Inventory",
    children: [
      { label: "Stock List", href: "/shopowner/stock/list" },
    ],
  },
  {
    label: "Stock Transfers",
    children: [
      { label: "New Transfer", href: "/shopmanager/stock-transfers/create" },
      { label: "Transfer List", href: "/shopmanager/stock-transfers/list" },
    ],
  },
  {
    label: "Customer Management",
    children: [
      { label: "Customer List", href: "/shopowner/customer/list" },
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
  {
    label: "Sales",
    children: [
      { label: "Create Sale", href: "/shopowner/sales/create" },
      { label: "Sales List", href: "/shopowner/sales/list" },
    ],
  },
  {
    label: "Inventory",
    children: [
      { label: "Stock List", href: "/shopowner/stock/list" },
    ],
  },
  {
    label: "Stock Transfers",
    children: [
      { label: "New Transfer", href: "/shopsupervisor/stock-transfers/create" },
      { label: "Transfer List", href: "/shopsupervisor/stock-transfers/list" },
    ],
  },
  {
    label: "Customer Management",
    children: [
      { label: "Customer List", href: "/shopowner/customer/list" },
    ],
  },
];

const EMPLOYEE_MENU: NavItem[] = [
  { label: "Dashboard", href: "/employee/dashboard" },
  {
    label: "Sales",
    children: [
      { label: "Create Sale", href: "/shopowner/sales/create" },
      { label: "Sales List", href: "/shopowner/sales/list" },
    ],
  },
  {
    label: "Customer Management",
    children: [
      { label: "Customer List", href: "/shopowner/customer/list" },
    ],
  },
];

export const SIDEBAR_MENU: Record<UserRole, NavItem[]> = {
  [ROLES.MASTER_ADMIN]: MASTER_ADMIN_MENU,
  [ROLES.MANAGER]: MANAGER_MENU,
  [ROLES.SUPERVISOR]: SUPERVISOR_MENU,
  [ROLES.STAFF]: STAFF_MENU,

  [ROLES.SHOP_OWNER]: SHOP_OWNER_MENU,
  [ROLES.SHOP_MANAGER]: SHOP_MANAGER_MENU,
  [ROLES.SHOP_SUPERVISOR]: SHOP_SUPERVISOR_MENU,
  [ROLES.EMPLOYEE]: EMPLOYEE_MENU,
};
