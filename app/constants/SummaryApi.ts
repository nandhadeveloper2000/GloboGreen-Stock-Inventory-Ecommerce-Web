// lib/summary-api.ts
// export const baseURL = "https://globogreen-server.onrender.com";
export const baseURL = "http://localhost:4000";
const API_BASE = "/api";

export const withQuery = (
  url: string,
  params?: Record<string, string | number | undefined | null>
) => {
  if (!params) return url;

  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");

  return qs ? `${url}?${qs}` : url;
};

const SummaryApi = {
  /* ===================== MASTER AUTH ===================== */
  master_login: { method: "POST", url: `${API_BASE}/master/login` },
  master_refresh: { method: "POST", url: `${API_BASE}/master/refresh` },
  master_logout: { method: "POST", url: `${API_BASE}/master/logout` },
  master_forgot_pin: { method: "POST", url: `${API_BASE}/master/forgot-pin` },
  master_reset_pin: { method: "POST", url: `${API_BASE}/master/reset-pin` },
  master_change_pin: { method: "POST", url: `${API_BASE}/master/change-pin` },

  /* ===================== MASTER SELF ===================== */
  master_me: { method: "GET", url: `${API_BASE}/master/me` },
master_update_me: { method: "PUT", url: `${API_BASE}/master/me` },
  master_avatar_upload: {
    method: "POST",
    url: `${API_BASE}/master/me/avatar`,
  },
  master_avatar_remove: {
    method: "DELETE",
    url: `${API_BASE}/master/me/avatar`,
  },

  /* ===================== MASTER CRUD ===================== */
  master_create: { method: "POST", url: `${API_BASE}/master` },
  master_list: { method: "GET", url: `${API_BASE}/master` },
  master_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/master/${id}`,
  },
  master_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/master/${id}`,
  },
  master_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/master/${id}`,
  },

  /* ===================== STAFF AUTH ===================== */
  staff_login: { method: "POST", url: `${API_BASE}/staff/login` },
  staff_forgot_pin: { method: "POST", url: `${API_BASE}/staff/forgot-pin` },
  staff_verify_pin_otp: {
    method: "POST",
    url: `${API_BASE}/staff/verify-pin-otp`,
  },
  staff_reset_pin: { method: "POST", url: `${API_BASE}/staff/reset-pin` },
  staff_change_pin: {
    method: "PUT",
    url: `${API_BASE}/staff/me/change-pin`,
  },

  /* ===================== STAFF SELF ===================== */
  staff_me: { method: "GET", url: `${API_BASE}/staff/me` },
  staff_update_me: { method: "PUT", url: `${API_BASE}/staff/me` },
  staff_avatar_upload_me: {
    method: "POST",
    url: `${API_BASE}/staff/me/avatar`,
  },
  staff_avatar_remove_me: {
    method: "DELETE",
    url: `${API_BASE}/staff/me/avatar`,
  },
  staff_idproof_upload_me: {
    method: "POST",
    url: `${API_BASE}/staff/me/idproof`,
  },
  staff_idproof_remove_me: {
    method: "DELETE",
    url: `${API_BASE}/staff/me/idproof`,
  },

  /* ===================== STAFF CRUD ===================== */
  staff_create: { method: "POST", url: `${API_BASE}/staff` },
  staff_list: { method: "GET", url: `${API_BASE}/staff` },
  staff_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/staff/${id}`,
  },
  staff_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/staff/${id}`,
  },
  staff_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/staff/${id}`,
  },
  staff_remove_avatar: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/staff/${id}/avatar`,
  },
  staff_remove_idproof: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/staff/${id}/idproof`,
  },
  staff_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/staff/${id}/activate`,
  },

  /* ===================== SHOP OWNER AUTH ===================== */
  shopowner_login: { method: "POST", url: `${API_BASE}/shopowners/login` },
  shopowner_refresh: { method: "POST", url: `${API_BASE}/shopowners/refresh` },
  shopowner_forgot_pin: {
    method: "POST",
    url: `${API_BASE}/shopowners/forgot-pin`,
  },
  shopowner_verify_pin_otp: {
    method: "POST",
    url: `${API_BASE}/shopowners/verify-pin-otp`,
  },
  shopowner_reset_pin: {
    method: "POST",
    url: `${API_BASE}/shopowners/reset-pin`,
  },
  shopowner_logout: { method: "POST", url: `${API_BASE}/shopowners/logout` },
  shopowner_change_pin: {
    method: "PUT",
    url: `${API_BASE}/shopowners/me/change-pin`,
  },

  /* ===================== SHOP OWNER SELF ===================== */
  shopowner_me: { method: "GET", url: `${API_BASE}/shopowners/me` },
  shopowner_update_me: { method: "PUT", url: `${API_BASE}/shopowners/me` },
  shopowner_avatar_upload: {
    method: "POST",
    url: `${API_BASE}/shopowners/me/avatar`,
  },
  shopowner_avatar_remove: {
    method: "DELETE",
    url: `${API_BASE}/shopowners/me/avatar`,
  },
  shopowner_docs_upload_me: {
    method: "PUT",
    url: `${API_BASE}/shopowners/me/docs`,
  },
  shopowner_docs_remove_me: {
    method: "DELETE",
    url: (key: string) => `${API_BASE}/shopowners/me/docs/${key}`,
  },
  shopowner_request_email_otp: {
    method: "POST",
    url: `${API_BASE}/shopowners/me/request-email-otp`,
  },
  shopowner_verify_email_otp: {
    method: "POST",
    url: `${API_BASE}/shopowners/me/verify-email-otp`,
  },

  /* ===================== SHOP OWNER CRUD ===================== */
  shopowner_create: { method: "POST", url: `${API_BASE}/shopowners` },
  shopowner_list: { method: "GET", url: `${API_BASE}/shopowners` },
  shopowner_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shopowners/${id}`,
  },
  shopowner_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shopowners/${id}`,
  },
  shopowner_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shopowners/${id}`,
  },
  shopowner_admin_avatar_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shopowners/${id}/avatar`,
  },
  shopowner_admin_avatar_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shopowners/${id}/avatar`,
  },
  shopowner_admin_docs_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shopowners/${id}/docs`,
  },
  shopowner_admin_docs_remove: {
    method: "DELETE",
    url: (id: string, key: string) => `${API_BASE}/shopowners/${id}/docs/${key}`,
  },
  shopowner_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shopowners/${id}/activate`,
  },

  /* ===================== SHOP STAFF AUTH ===================== */
  shopstaff_login: { method: "POST", url: `${API_BASE}/shopstaff/login` },
  shopstaff_refresh: { method: "POST", url: `${API_BASE}/shopstaff/refresh` },
  shopstaff_forgot_pin: {
    method: "POST",
    url: `${API_BASE}/shopstaff/forgot-pin`,
  },
  shopstaff_verify_pin_otp: {
    method: "POST",
    url: `${API_BASE}/shopstaff/verify-pin-otp`,
  },
  shopstaff_reset_pin: {
    method: "POST",
    url: `${API_BASE}/shopstaff/reset-pin`,
  },
  shopstaff_logout: { method: "POST", url: `${API_BASE}/shopstaff/logout` },
  shopstaff_change_pin: {
    method: "PUT",
    url: `${API_BASE}/shopstaff/me/change-pin`,
  },
/* ===================== SHOP STAFF SELF ===================== */
shopstaff_me: { method: "GET", url: `${API_BASE}/shopstaff/me` },
shopstaff_update_me: { method: "PUT", url: `${API_BASE}/shopstaff/me` },

shopstaff_avatar_upload_me: {
  method: "PUT",
  url: `${API_BASE}/shopstaff/me/avatar`,
},
shopstaff_avatar_remove_me: {
  method: "DELETE",
  url: `${API_BASE}/shopstaff/me/avatar`,
},

shopstaff_docs_upload_me: {
  method: "PUT",
  url: `${API_BASE}/shopstaff/me/docs`,
},
shopstaff_docs_remove_me: {
  method: "DELETE",
  url: (key: string) => `${API_BASE}/shopstaff/me/docs/${key}`,
},

shopstaff_request_email_otp: {
  method: "POST",
  url: `${API_BASE}/shopstaff/me/request-email-otp`,
},
shopstaff_verify_email_otp: {
  method: "POST",
  url: `${API_BASE}/shopstaff/me/verify-email-otp`,
},

/* ===================== SHOP STAFF CRUD ===================== */
shopstaff_create: { method: "POST", url: `${API_BASE}/shopstaff` },
shopstaff_list: { method: "GET", url: `${API_BASE}/shopstaff` },

shopstaff_get: {
  method: "GET",
  url: (id: string) => `${API_BASE}/shopstaff/${id}`,
},
shopstaff_update: {
  method: "PUT",
  url: (id: string) => `${API_BASE}/shopstaff/${id}`,
},
shopstaff_delete: {
  method: "DELETE",
  url: (id: string) => `${API_BASE}/shopstaff/${id}`,
},
shopstaff_toggle_active: {
  method: "PUT",
  url: (id: string) => `${API_BASE}/shopstaff/${id}/activate`,
},

  /* ===================== MASTER CATEGORY ===================== */
  master_category_create: { method: "POST", url: `${API_BASE}/master-categories` },
  master_category_list: { method: "GET", url: `${API_BASE}/master-categories` },
  master_category_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/master-categories/${id}`,
  },
  master_category_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/master-categories/${id}`,
  },
  master_category_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/master-categories/${id}`,
  },
  master_category_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/master-categories/${id}/active`,
  },
  master_category_image_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/master-categories/${id}/image`,
  },
  master_category_image_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/master-categories/${id}/image`,
  },

  /* ===================== CATEGORY ===================== */
  category_create: { method: "POST", url: `${API_BASE}/categories` },
  category_list: { method: "GET", url: `${API_BASE}/categories` },
  category_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/categories/${id}`,
  },
  category_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/categories/${id}`,
  },
  category_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/categories/${id}`,
  },
  category_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/categories/${id}/active`,
  },
  category_image_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/categories/${id}/image`,
  },
  category_image_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/categories/${id}/image`,
  },

  /* ===================== SUB CATEGORY ===================== */
  sub_category_create: { method: "POST", url: `${API_BASE}/sub-categories` },
  sub_category_list: { method: "GET", url: `${API_BASE}/sub-categories` },
  sub_category_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/sub-categories/${id}`,
  },
  sub_category_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/sub-categories/${id}`,
  },
  sub_category_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/sub-categories/${id}`,
  },
  sub_category_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/sub-categories/${id}/active`,
  },
  sub_category_image_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/sub-categories/${id}/image`,
  },
  sub_category_image_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/sub-categories/${id}/image`,
  },

  /* ===================== BRAND ===================== */
  brand_create: { method: "POST", url: `${API_BASE}/brands` },
  brand_list: { method: "GET", url: `${API_BASE}/brands` },
  brand_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/brands/${id}`,
  },
  brand_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/brands/${id}`,
  },
  brand_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/brands/${id}`,
  },
  brand_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/brands/${id}/active`,
  },
  brand_image_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/brands/${id}/image`,
  },
  brand_image_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/brands/${id}/image`,
  },

  /* ===================== MODEL ===================== */
  model_create: { method: "POST", url: `${API_BASE}/models` },
  model_list: { method: "GET", url: `${API_BASE}/models` },
  model_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/models/${id}`,
  },
  model_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/models/${id}`,
  },
  model_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/models/${id}`,
  },
  model_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/models/${id}/active`,
  },

  /* ===================== PRODUCT COMPATIBILITY ===================== */
  product_compatibility_create: {
    method: "POST",
    url: `${API_BASE}/productcompatibility`,
  },
  product_compatibility_list: {
    method: "GET",
    url: `${API_BASE}/productcompatibility`,
  },
  product_compatibility_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/productcompatibility/${id}`,
  },
  product_compatibility_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/productcompatibility/${id}`,
  },
  product_compatibility_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/productcompatibility/${id}`,
  },
  product_compatibility_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/productcompatibility/${id}/active`,
  },

  /* ===================== PRODUCT ===================== */
  product_create: {
    method: "POST",
    url: `${API_BASE}/product`,
  },
  product_list: {
    method: "GET",
    url: `${API_BASE}/product`,
  },
  product_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/product/${id}`,
  },
  product_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/product/${id}`,
  },
  product_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/product/${id}`,
  },

  /* ===================== SHOPS ===================== */
  master_list_shops: { method: "GET", url: `${API_BASE}/shops` },
  shop_create: {
    method: "POST",
    url: `${API_BASE}/shops`,
  },
  shop_list: {
    method: "GET",
    url: `${API_BASE}/shops`,
  },
  master_create_shop: {
    method: "POST",
    url: `${API_BASE}/shops`,
  },
  shop_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  master_get_shop: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  shop_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  master_update_shop: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  shop_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  master_delete_shop: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  shop_front_upload: {
    method: "POST",
    url: (id: string) => `${API_BASE}/shops/${id}/front`,
  },
  shop_front_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}/front`,
  },
  admin_shop_front_upload: {
    method: "POST",
    url: (id: string) => `${API_BASE}/shops/${id}/front/admin`,
  },
  shop_front_upload_admin: {
    method: "POST",
    url: (id: string) => `${API_BASE}/shops/${id}/front/admin`,
  },
  admin_shop_front_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}/front/admin`,
  },
  shop_front_remove_admin: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}/front/admin`,
  },
  shop_docs_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}/docs`,
  },
  shop_docs_remove: {
    method: "DELETE",
    url: (id: string, key: string) => `${API_BASE}/shops/${id}/docs/${key}`,
  },
  admin_shop_docs_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}/docs/admin`,
  },
  shop_docs_upload_admin: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}/docs/admin`,
  },
  admin_shop_docs_remove: {
    method: "DELETE",
    url: (id: string, key: string) =>
      `${API_BASE}/shops/${id}/docs/${key}/admin`,
  },
  shop_docs_remove_admin: {
    method: "DELETE",
    url: (id: string, key: string) =>
      `${API_BASE}/shops/${id}/docs/${key}/admin`,
  },

  /* ===================== SHOP PRODUCTS ===================== */
  shop_product_available_list: {
    method: "GET",
    url: (
      shopId: string,
      params?: Record<string, string | number | undefined | null>
    ) =>
      withQuery(`${API_BASE}/shop-products/${shopId}/available-products`, params),
  },
  shop_product_list: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-products/${shopId}/products`,
  },
  shop_product_create: {
    method: "POST",
    url: (shopId: string) => `${API_BASE}/shop-products/${shopId}/products`,
  },
  shop_product_update: {
    method: "PUT",
    url: (shopId: string, productId: string) =>
      `${API_BASE}/shop-products/${shopId}/products/${productId}`,
  },
  shop_product_delete: {
    method: "DELETE",
    url: (shopId: string, productId: string) =>
      `${API_BASE}/shop-products/${shopId}/products/${productId}`,
  },

  /* ===================== LOCATIONS ===================== */
  location_all: { method: "GET", url: `${API_BASE}/locations/all` },
  location_states: { method: "GET", url: `${API_BASE}/locations/states` },
  location_districts: { method: "GET", url: `${API_BASE}/locations/districts` },
  location_taluks: { method: "GET", url: `${API_BASE}/locations/taluks` },
  location_villages: { method: "GET", url: `${API_BASE}/locations/villages` },

 /* ===================== VENDORS ===================== */
vendor_list: {
  method: "GET",
  url: (q = "") =>
    `${API_BASE}/vendors${q ? `?q=${encodeURIComponent(q)}` : ""}`,
},

vendor_create: {
  method: "POST",
  url: `${API_BASE}/vendors`,
},

/* ===================== SHOP VENDORS ===================== */
shop_vendor_list: {
  method: "GET",
  url: (shopId: string, q = "") =>
    `${API_BASE}/shop-vendors/${shopId}/vendors${
      q ? `?q=${encodeURIComponent(q)}` : ""
    }`,
},

shop_vendor_create: {
  method: "POST",
  url: (shopId: string) => `${API_BASE}/shop-vendors/${shopId}/vendors`,
},

shop_vendor_update: {
  method: "PUT",
  url: (shopId: string, vendorId: string) =>
    `${API_BASE}/shop-vendors/${shopId}/vendors/${vendorId}`,
},

shop_vendor_delete: {
  method: "DELETE",
  url: (shopId: string, vendorId: string) =>
    `${API_BASE}/shop-vendors/${shopId}/vendors/${vendorId}`,
},
vendors: {
  list: {
    url: "/api/vendors",
    method: "get",
  },
  create: {
    url: "/api/vendors",
    method: "post",
  },
  getById: (id: string) => ({
    url: `/api/vendors/${id}`,
    method: "get",
  }),
  update: (id: string) => ({
    url: `/api/vendors/${id}`,
    method: "put",
  }),
  updateStatus: (id: string) => ({
    url: `/api/vendors/${id}/status`,
    method: "patch",
  }),
  delete: (id: string) => ({
    url: `/api/vendors/${id}`,
    method: "delete",
  }),
  listByShop: (shopId: string) => ({
    url: `/api/vendors/shop/${shopId}`,
    method: "get",
  }),
},
};

export default SummaryApi;
