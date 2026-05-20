// lib/summary-api.ts
export const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
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

  /* ===================== PRODUCT TYPE ===================== */
  product_type_create: { method: "POST", url: `${API_BASE}/product-types` },
  product_type_list: { method: "GET", url: `${API_BASE}/product-types` },
  product_type_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/product-types/${id}`,
  },
  product_type_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/product-types/${id}`,
  },
  product_type_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/product-types/${id}`,
  },
  product_type_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/product-types/${id}/active`,
  },

  /* ===================== PRODUCT TYPE FIELDS ===================== */
  product_type_fields_create: {
    method: "POST",
    url: `${API_BASE}/product-type-fields`,
  },
  product_type_fields_list: {
    method: "GET",
    url: `${API_BASE}/product-type-fields`,
  },
  product_type_fields_by_product_type: {
    method: "GET",
    url: (productTypeId: string) =>
      `${API_BASE}/product-type-fields/${productTypeId}`,
  },
  product_type_fields_update: {
    method: "PUT",
    url: (productTypeId: string) =>
      `${API_BASE}/product-type-fields/${productTypeId}`,
  },
  product_type_fields_delete: {
    method: "DELETE",
    url: (productTypeId: string) =>
      `${API_BASE}/product-type-fields/${productTypeId}`,
  },
  product_type_fields_status: {
    method: "PATCH",
    url: (productTypeId: string) =>
      `${API_BASE}/product-type-fields/${productTypeId}/status`,
  },

  /* ===================== SERIES ===================== */
  series_create: { method: "POST", url: `${API_BASE}/series` },
  series_list: { method: "GET", url: `${API_BASE}/series` },
  series_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/series/${id}`,
  },
  series_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/series/${id}`,
  },
  series_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/series/${id}`,
  },
  series_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/series/${id}/active`,
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
  product_pending_approvals: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/product/pending-approvals`, params),
  },
  product_approve: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/product/${id}/approve`,
  },
  product_reject: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/product/${id}/reject`,
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

  /* ===================== PUBLIC MARKETPLACE ===================== */
  public_shop_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/public/shops`, params),
  },
  public_shop_get: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/public/shops/${shopId}`,
  },

  /* ===================== PUBLIC STORE ===================== */
  store_product_list: {
    method: "GET",
    url: (
      shopId: string,
      params?: Record<string, string | number | undefined | null>
    ) =>
      withQuery(`${API_BASE}/shop-products/${shopId}/store/products`, params),
  },
  store_product_get: {
    method: "GET",
    url: (shopId: string, id: string) =>
      `${API_BASE}/shop-products/${shopId}/store/products/${id}`,
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
  physical_stock_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/physical-stock`, params),
  },
  physical_stock_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/physical-stock/${id}`,
  },
  physical_stock_create: {
    method: "POST",
    url: `${API_BASE}/physical-stock`,
  },
  physical_stock_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/physical-stock/${id}`,
  },
  stock_transfer_create: {
    method: "POST",
    url: `${API_BASE}/stock-transfers`,
  },
  stock_transfer_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/stock-transfers`, params),
  },
  stock_transfer_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/stock-transfers/${id}`,
  },
  party_account_list: {
    method: "GET",
    url: (shopId: string, q = "") =>
      withQuery(`${API_BASE}/party-accounts`, { shopId, q }),
  },
  party_account_create: {
    method: "POST",
    url: `${API_BASE}/party-accounts`,
  },
  party_account_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/party-accounts/${id}`,
  },
  expense_list: {
    method: "GET",
    url: (
      paramsOrShopId?: string | Record<string, string | number | undefined | null>,
      q = ""
    ) => {
      if (typeof paramsOrShopId === "string") {
        return withQuery(`${API_BASE}/expenses`, {
          shopId: paramsOrShopId,
          q,
        });
      }

      return withQuery(`${API_BASE}/expenses`, paramsOrShopId);
    },
  },

  expense_create: {
    method: "POST",
    url: `${API_BASE}/expenses`,
  },

  expense_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/expenses/${id}`,
  },
  payment_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/payments`, params),
  },
  payment_summary: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/payments/summary`, params),
  },
  payment_create: {
    method: "POST",
    url: `${API_BASE}/payments`,
  },
  payment_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/payments/${id}`,
  },
  payment_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/payments/${id}`,
  },
  payment_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/payments/${id}`,
  },

  /* ===================== DASHBOARD ===================== */
  dashboard_master: {
    method: "GET",
    url: `${API_BASE}/dashboard/master`,
  },
  dashboard_shop: {
    method: "GET",
    url: (shopId?: string) =>
      withQuery(`${API_BASE}/dashboard/shop`, shopId ? { shopId } : undefined),
  },

  /* ===================== DISCOUNTS ===================== */
  discount_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/discounts`, params),
  },
  discount_create: {
    method: "POST",
    url: `${API_BASE}/discounts`,
  },
  discount_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/discounts/${id}`,
  },
  discount_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/discounts/${id}`,
  },
  discount_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/discounts/${id}`,
  },
  discount_validate: {
    method: "GET",
    url: (shopId: string, code: string) =>
      withQuery(`${API_BASE}/discounts/validate`, { shopId, code }),
  },

  /* ===================== PRICE LISTS ===================== */
  price_list_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/price-lists`, params),
  },
  price_list_create: {
    method: "POST",
    url: `${API_BASE}/price-lists`,
  },
  price_list_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/price-lists/${id}`,
  },
  price_list_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/price-lists/${id}`,
  },
  price_list_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/price-lists/${id}`,
  },

  /* ===================== NOTIFICATIONS ===================== */
  notification_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/notifications`, params),
  },
  notification_unread_count: {
    method: "GET",
    url: `${API_BASE}/notifications/unread-count`,
  },
  notification_mark_read: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/notifications/${id}/read`,
  },
  notification_mark_all_read: {
    method: "PATCH",
    url: `${API_BASE}/notifications/read-all`,
  },
  notification_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/notifications/${id}`,
  },

  /* ===================== REPORTS ===================== */
  report_master_sales: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/reports/master/sales`, params),
  },
  report_master_purchases: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/reports/master/purchases`, params),
  },
  report_master_expenses: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/reports/master/expenses`, params),
  },
  report_shop_sales: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/reports/shop/sales`, params),
  },
  report_shop_purchases: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/reports/shop/purchases`, params),
  },
  report_shop_expenses: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/reports/shop/expenses`, params),
  },
  report_shop_gst: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/reports/shop/gst`, params),
  },
  report_shop_loyalty: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/reports/shop/loyalty`, params),
  },
  barcode_label_formats: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/barcode/label-formats`, params),
  },
  barcode_label_format_create: {
    method: "POST",
    url: `${API_BASE}/barcode/label-formats`,
  },
  barcode_label_format_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/barcode/label-formats/${id}`,
  },
  barcode_label_format_set_use: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/barcode/label-formats/${id}/use`,
  },
  barcode_label_format_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/barcode/label-formats/${id}`,
  },
  barcode_products: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/barcode/barcode-products`, params),
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
      `${API_BASE}/shop-vendors/${shopId}/vendors${q ? `?q=${encodeURIComponent(q)}` : ""
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
  purchase_list: {
    method: "GET",
    url: (shopId: string) => `/api/purchase/${shopId}`,
  },

  purchase_detail: {
    method: "GET",
    url: (shopId: string, id: string) => `/api/purchase/${shopId}/${id}`,
  },

  purchase_create: {
    method: "POST",
    url: (shopId: string) => `/api/purchase/${shopId}`,
  },

  purchase_update: {
    method: "PUT",
    url: (shopId: string, id: string) => `/api/purchase/${shopId}/${id}`,
  },

  purchase_cancel: {
    method: "PATCH",
    url: (shopId: string, id: string) =>
      `/api/purchase/${shopId}/${id}/cancel`,
  },

  purchase_return_eligible: {
    method: "GET",
    url: (
      shopId: string,
      params?: Record<string, string | number | undefined | null>
    ) =>
      withQuery(`/api/purchase-returns/${shopId}/eligible-purchases`, params),
  },

  purchase_return_list: {
    method: "GET",
    url: (
      shopId: string,
      params?: Record<string, string | number | undefined | null>
    ) => withQuery(`/api/purchase-returns/${shopId}`, params),
  },

  purchase_return_detail: {
    method: "GET",
    url: (shopId: string, id: string) => `/api/purchase-returns/${shopId}/${id}`,
  },

  purchase_return_create: {
    method: "POST",
    url: (shopId: string) => `/api/purchase-returns/${shopId}`,
  },

  purchase_return_update: {
    method: "PUT",
    url: (shopId: string, id: string) => `/api/purchase-returns/${shopId}/${id}`,
  },

  /* ===================== CUSTOMER STOREFRONT AUTH ===================== */
  customer_request_otp: {
    method: "POST",
    url: `${API_BASE}/customer/auth/request-otp`,
  },
  customer_verify_otp: {
    method: "POST",
    url: `${API_BASE}/customer/auth/verify-otp`,
  },
  customer_refresh: {
    method: "POST",
    url: `${API_BASE}/customer/auth/refresh`,
  },
  customer_logout: {
    method: "POST",
    url: `${API_BASE}/customer/auth/logout`,
  },
  customer_me: {
    method: "GET",
    url: `${API_BASE}/customer/me`,
  },
  customer_update_me: {
    method: "PUT",
    url: `${API_BASE}/customer/me`,
  },

  /* ===================== CUSTOMER ORDERS ===================== */
  customer_order_create: {
    method: "POST",
    url: `${API_BASE}/orders`,
  },
  customer_order_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/orders/my`, params),
  },
  customer_order_cancel: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/orders/${id}/cancel`,
  },

  shop_customer_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/customer/shops`, params),
  },

  shop_customer_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/customer/shops/${id}`,
  },

  shop_customer_ledger: {
    method: "GET",
    url: (id: string, params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/customer/shops/${id}/ledger`, params),
  },

  shop_customer_create: {
    method: "POST",
    url: `${API_BASE}/customer/shops`,
  },

  shop_customer_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/customer/shops/${id}`,
  },

  shop_customer_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/customer/shops/${id}`,
  },

  sales_create: {
    method: "POST",
    url: `${API_BASE}/invoices/direct-purchase`,
  },

  sales_list: {
    method: "GET",
    url: (params?: Record<string, string | number | undefined | null>) =>
      withQuery(`${API_BASE}/orders`, params),
  },

  sales_detail: {
    method: "GET",
    url: (id: string) => `${API_BASE}/orders/${id}`,
  },

  sales_invoice_detail: {
    method: "GET",
    url: (id: string) => `${API_BASE}/invoices/${id}`,
  },

  sales_return_eligible: {
    method: "GET",
    url: (
      shopId: string,
      params?: Record<string, string | number | undefined | null>
    ) => withQuery(`/api/sales-returns/${shopId}/eligible-orders`, params),
  },

  sales_return_list: {
    method: "GET",
    url: (
      shopId: string,
      params?: Record<string, string | number | undefined | null>
    ) => withQuery(`/api/sales-returns/${shopId}`, params),
  },

  sales_return_detail: {
    method: "GET",
    url: (shopId: string, id: string) => `/api/sales-returns/${shopId}/${id}`,
  },

  sales_return_create: {
    method: "POST",
    url: (shopId: string) => `/api/sales-returns/${shopId}`,
  },

  sales_return_update: {
    method: "PUT",
    url: (shopId: string, id: string) => `/api/sales-returns/${shopId}/${id}`,
  },


  /* ===================== SHOP CATEGORY MAPS ===================== */
  shopCategoryMapList: {
    method: "GET",
    url: `${API_BASE}/shop-category-maps`,
  },

  shopCategoryMapCreate: {
    method: "POST",
    url: `${API_BASE}/shop-category-maps`,
  },

  shopCategoryMapBulkCreate: {
    method: "POST",
    url: `${API_BASE}/shop-category-maps/bulk`,
  },

  shopCategoryMapByShop: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-category-maps/shop/${shopId}`,
  },

  shopCategoryMapById: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shop-category-maps/${id}`,
  },

  shopCategoryMapUpdate: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/shop-category-maps/${id}`,
  },

  shopCategoryMapToggleActive: {
    method: "PATCH",
    url: (id: string) =>
      `${API_BASE}/shop-category-maps/${id}/toggle-active`,
  },

  shopCategoryMapDelete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shop-category-maps/${id}`,
  },

  shopCategoriesByShop: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-category-maps/shop/${shopId}`,
  },

  /* ===================== SHOP SUB CATEGORY MAPS ===================== */
  shopSubCategoryMapList: {
    method: "GET",
    url: `${API_BASE}/shop-sub-category-maps`,
  },

  shopSubCategoryMapCreate: {
    method: "POST",
    url: `${API_BASE}/shop-sub-category-maps`,
  },

  shopSubCategoryMapBulkCreate: {
    method: "POST",
    url: `${API_BASE}/shop-sub-category-maps/bulk`,
  },

  shopSubCategoryMapByShop: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-sub-category-maps/shop/${shopId}`,
  },

  shopSubCategoryMapById: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shop-sub-category-maps/${id}`,
  },

  shopSubCategoryMapUpdate: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/shop-sub-category-maps/${id}`,
  },

  shopSubCategoryMapToggleActive: {
    method: "PATCH",
    url: (id: string) =>
      `${API_BASE}/shop-sub-category-maps/${id}/toggle-active`,
  },

  shopSubCategoryMapDelete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shop-sub-category-maps/${id}`,
  },

  shopSubCategoriesByShop: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-sub-category-maps/shop/${shopId}`,
  },

  /* ===================== SHOP BRAND MAPS ===================== */
  shopBrandMapList: {
    method: "GET",
    url: `${API_BASE}/shop-brand-maps`,
  },

  shopBrandMapCreate: {
    method: "POST",
    url: `${API_BASE}/shop-brand-maps`,
  },

  shopBrandMapBulkCreate: {
    method: "POST",
    url: `${API_BASE}/shop-brand-maps/bulk`,
  },

  shopBrandMapByShop: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-brand-maps/shop/${shopId}`,
  },

  shopBrandMapById: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shop-brand-maps/${id}`,
  },

  shopBrandMapUpdate: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/shop-brand-maps/${id}`,
  },

  shopBrandMapToggleActive: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/shop-brand-maps/${id}/toggle-active`,
  },

  shopBrandMapDelete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shop-brand-maps/${id}`,
  },

  shopBrandsByShop: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-brand-maps/shop/${shopId}`,
  },

  /* ===================== SHOP MODEL MAPS ===================== */
  shopModelMapList: {
    method: "GET",
    url: `${API_BASE}/shop-model-maps`,
  },

  shopModelMapCreate: {
    method: "POST",
    url: `${API_BASE}/shop-model-maps`,
  },

  shopModelMapBulkCreate: {
    method: "POST",
    url: `${API_BASE}/shop-model-maps/bulk`,
  },

  shopModelMapByShop: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-model-maps/shop/${shopId}`,
  },

  shopModelMapById: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shop-model-maps/${id}`,
  },

  shopModelMapUpdate: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/shop-model-maps/${id}`,
  },

  shopModelMapToggleActive: {
    method: "PATCH",
    url: (id: string) => `${API_BASE}/shop-model-maps/${id}/toggle-active`,
  },

  shopModelMapDelete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shop-model-maps/${id}`,
  },

  shopModelsByShop: {
    method: "GET",
    url: (shopId: string) => `${API_BASE}/shop-model-maps/shop/${shopId}`,
  },
};

export default SummaryApi;
