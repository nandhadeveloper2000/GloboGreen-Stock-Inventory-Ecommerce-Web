export const ROLES = {
  MASTER_ADMIN: "MASTER_ADMIN",
  MANAGER: "MANAGER",
  SUPERVISOR: "SUPERVISOR",
  STAFF: "STAFF",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export type NavChildItem = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href?: string;
  children?: NavChildItem[];
};

export const SIDEBAR_MENU: Record<UserRole, NavItem[]> = {
  MASTER_ADMIN: [
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
  ],

  MANAGER: [
    { label: "Dashboard", href: "/manager/dashboard" },

    {
      label: "Staff Management",
      children: [
        { label: "Create Staff", href: "/manager/staff/create" },
        { label: "Staff List", href: "/manager/staff/list" },
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
        { label: "Create Shop", href: "/manager/shop/create" },
        { label: "Shop List", href: "/manager/shop/list" },
      ],
    },
    {
      label: "Master Category",
      children: [
        { label: "Create Master Category", href: "/manager/mastercategory/create" },
        { label: "Master Category List", href: "/manager/mastercategory/list" },
      ],
    },
    {
      label: "Category",
      children: [
        { label: "Create Category", href: "/manager/category/create" },
        { label: "Category List", href: "/manager/category/list" },
      ],
    },
    {
      label: "Subcategory",
      children: [
        { label: "Create Subcategory", href: "/manager/subcategory/create" },
        { label: "Subcategory List", href: "/manager/subcategory/list" },
      ],
    },
    {
      label: "Brand",
      children: [
        { label: "Create Brand", href: "/manager/brand/create" },
        { label: "Brand List", href: "/manager/brand/list" },
      ],
    },
    {
      label: "Model",
      children: [
        { label: "Create Model", href: "/manager/model/create" },
        { label: "Model List", href: "/manager/model/list" },
      ],
    },
    {
      label: "Complaint",
      children: [
        { label: "Create Complaint", href: "/manager/complaint/create" },
        { label: "Complaint List", href: "/manager/complaint/list" },
      ],
    },
    {
      label: "Product",
      children: [
        { label: "Create Product", href: "/manager/product/create" },
        { label: "Product List", href: "/manager/product/list" },
      ],
    },
  ],

  SUPERVISOR: [
    { label: "Dashboard", href: "/supervisor/dashboard" },

    {
      label: "Staff Management",
      children: [
        { label: "Create Staff", href: "/supervisor/staff/create" },
        { label: "Staff List", href: "/supervisor/staff/list" },
      ],
    },
    {
      label: "Shop Management",
      children: [
        { label: "Create Shop", href: "/supervisor/shop/create" },
        { label: "Shop List", href: "/supervisor/shop/list" },
      ],
    },
    {
      label: "Master Category",
      children: [
        { label: "Create Master Category", href: "/supervisor/mastercategory/create" },
        { label: "Master Category List", href: "/supervisor/mastercategory/list" },
      ],
    },
    {
      label: "Category",
      children: [
        { label: "Create Category", href: "/supervisor/category/create" },
        { label: "Category List", href: "/supervisor/category/list" },
      ],
    },
    {
      label: "Subcategory",
      children: [
        { label: "Create Subcategory", href: "/supervisor/subcategory/create" },
        { label: "Subcategory List", href: "/supervisor/subcategory/list" },
      ],
    },
    {
      label: "Brand",
      children: [
        { label: "Create Brand", href: "/supervisor/brand/create" },
        { label: "Brand List", href: "/supervisor/brand/list" },
      ],
    },
    {
      label: "Model",
      children: [
        { label: "Create Model", href: "/supervisor/model/create" },
        { label: "Model List", href: "/supervisor/model/list" },
      ],
    },
    {
      label: "Complaint",
      children: [
        { label: "Create Complaint", href: "/supervisor/complaint/create" },
        { label: "Complaint List", href: "/supervisor/complaint/list" },
      ],
    },
    {
      label: "Product",
      children: [
        { label: "Create Product", href: "/supervisor/product/create" },
        { label: "Product List", href: "/supervisor/product/list" },
      ],
    },
  ],

  STAFF: [
    { label: "Dashboard", href: "/staff/dashboard" },

    {
      label: "Shop Management",
      children: [
        { label: "Create Shop", href: "/staff/shop/create" },
        { label: "Shop List", href: "/staff/shop/list" },
      ],
    },
    {
      label: "Master Category",
      children: [{ label: "Master Category List", href: "/staff/mastercategory/list" }],
    },
    {
      label: "Category",
      children: [{ label: "Category List", href: "/staff/category/list" }],
    },
    {
      label: "Subcategory",
      children: [{ label: "Subcategory List", href: "/staff/subcategory/list" }],
    },
    {
      label: "Brand",
      children: [{ label: "Brand List", href: "/staff/brand/list" }],
    },
    {
      label: "Model",
      children: [{ label: "Model List", href: "/staff/model/list" }],
    },
    {
      label: "Complaint",
      children: [{ label: "Complaint List", href: "/staff/complaint/list" }],
    },
    {
      label: "Product",
      children: [{ label: "Product List", href: "/staff/product/list" }],
    },
  ],
};