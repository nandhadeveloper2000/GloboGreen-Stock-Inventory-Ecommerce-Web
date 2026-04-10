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

  /* ===================== MASTER ME ===================== */
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
  master_list: { method: "GET", url: `${API_BASE}/master` },
  master_get_by_id: {
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
  shopowner_avatar_upload: {
    method: "POST",
    url: `${API_BASE}/shopowners/me/avatar`,
  },
  shopowner_avatar_remove: {
    method: "DELETE",
    url: `${API_BASE}/shopowners/me/avatar`,
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
    method: "POST",
    url: (id: string) => `${API_BASE}/shopowners/${id}/avatar`,
  },
  shopowner_admin_avatar_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shopowners/${id}/avatar`,
  },
  shopowner_admin_docs_upload: {
    method: "POST",
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

  /* ===================== SHOPS ===================== */
  master_create_shop: { method: "POST", url: `${API_BASE}/shops` },
  master_list_shops: { method: "GET", url: `${API_BASE}/shops` },
  master_get_shop: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  master_update_shop: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  master_delete_shop: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },

  shop_docs_upload_admin: {
    method: "POST",
    url: (id: string) => `${API_BASE}/shops/${id}/docs`,
  },
  shop_docs_remove_admin: {
    method: "DELETE",
    url: (id: string, key: "gstCertificate" | "udyamCertificate") =>
      `${API_BASE}/shops/${id}/docs/${key}/admin`,
  },
  shop_front_upload_owner: {
    method: "POST",
    url: (id: string) => `${API_BASE}/shops/${id}/front`,
  },
  shop_front_remove_owner: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}/front`,
  },
  shop_front_upload_admin: {
    method: "POST",
    url: (id: string) => `${API_BASE}/shops/${id}/front/admin`,
  },
  shop_front_remove_admin: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}/front/admin`,
  },

  /* ===================== LOCATIONS ===================== */
  location_all: { method: "GET", url: `${API_BASE}/locations/all` },
  location_states: { method: "GET", url: `${API_BASE}/locations/states` },
  location_districts: { method: "GET", url: `${API_BASE}/locations/districts` },
  location_taluks: { method: "GET", url: `${API_BASE}/locations/taluks` },
  location_villages: { method: "GET", url: `${API_BASE}/locations/villages` },

  /* ===================== MASTER CATALOG ===================== */
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

/* ---------- CATEGORY ---------- */
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

/* ---------- SUB CATEGORY ---------- */
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

/* ---------- PRODUCT TYPE ---------- */
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
product_type_image_upload: {
  method: "PUT",
  url: (id: string) => `${API_BASE}/product-types/${id}/image`,
},
product_type_image_remove: {
  method: "DELETE",
  url: (id: string) => `${API_BASE}/product-types/${id}/image`,
},

/* ---------- BRAND ---------- */
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


/* ---------- COMPATIBLE ---------- */
compatible_create: { method: "POST", url: `${API_BASE}/compatibles` },
compatible_list: { method: "GET", url: `${API_BASE}/compatibles` },

compatible_get: {
  method: "GET",
  url: (id: string) => `${API_BASE}/compatibles/${id}`,
},

compatible_update: {
  method: "PUT",
  url: (id: string) => `${API_BASE}/compatibles/${id}`,
},

compatible_delete: {
  method: "DELETE",
  url: (id: string) => `${API_BASE}/compatibles/${id}`,
},

compatible_toggle_active: {
  method: "PUT",
  url: (id: string) => `${API_BASE}/compatibles/${id}/active`,
},


 /* ---------------- CREATE ---------------- */
  product_compatibility_create: {
    method: "POST",
    url: `${API_BASE}/productcompatibility`,
  },

  /* ---------------- LIST ---------------- */
  product_compatibility_list: {
    method: "GET",
    url: `${API_BASE}/productcompatibility`,
  },

  /* ---------------- GET ---------------- */
  product_compatibility_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/productcompatibility/${id}`,
  },

  /* ---------------- UPDATE ---------------- */
  product_compatibility_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/productcompatibility/${id}`,
  },

  /* ---------------- DELETE ---------------- */
  product_compatibility_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/productcompatibility/${id}`,
  },

  /* ---------------- TOGGLE ACTIVE ---------------- */
  product_compatibility_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/productcompatibility/${id}/active`,
  },

// /* ---------- SERIES ---------- */
// series_create: { method: "POST", url: `${API_BASE}/series` },

// series_list: { method: "GET", url: `${API_BASE}/series` },

// series_get: {
//   method: "GET",
//   url: (id: string) => `${API_BASE}/series/${id}`,
// },

// series_update: {
//   method: "PUT",
//   url: (id: string) => `${API_BASE}/series/${id}`,
// },

// series_delete: {
//   method: "DELETE",
//   url: (id: string) => `${API_BASE}/series/${id}`,
// },

// series_toggle_active: {
//   method: "PUT",
//   url: (id: string) => `${API_BASE}/series/${id}/active`,
// },
};

export default SummaryApi;