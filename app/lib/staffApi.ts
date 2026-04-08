import SummaryApi, { baseURL } from "@/constants/SummaryApi";

type ApiResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

type StaffFileResponse = ApiResult<{
  _id?: string;
  avatarUrl?: string;
  idProofUrl?: string;
}>;

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : ({} as T);
  } catch {
    return {} as T;
  }
}

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image file");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image size must be under 2MB");
  }
}

async function uploadFile(
  url: string,
  method: string,
  token: string,
  fieldName: "avatar" | "idproof",
  file: File
): Promise<StaffFileResponse> {
  validateImageFile(file);

  const formData = new FormData();
  formData.append(fieldName, file);

  const response = await fetch(`${baseURL}${url}`, {
    method,
    headers: getAuthHeaders(token),
    body: formData,
  });

  const result = await parseResponse<StaffFileResponse>(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "File upload failed");
  }

  return result;
}

async function removeFile(
  url: string | ((id: string) => string),
  method: string,
  token: string,
  id?: string
): Promise<StaffFileResponse> {
  const finalUrl = typeof url === "function" ? url(id || "") : url;

  const response = await fetch(`${baseURL}${finalUrl}`, {
    method,
    headers: {
      ...getAuthHeaders(token),
      Accept: "application/json",
    },
  });

  const result = await parseResponse<StaffFileResponse>(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "File remove failed");
  }

  return result;
}

/* ===================== SELF APIs ===================== */

export async function uploadMyStaffAvatar(token: string, file: File) {
  return uploadFile(
    SummaryApi.staff_avatar_upload_me.url,
    SummaryApi.staff_avatar_upload_me.method,
    token,
    "avatar",
    file
  );
}

export async function removeMyStaffAvatar(token: string) {
  return removeFile(
    SummaryApi.staff_avatar_remove_me.url,
    SummaryApi.staff_avatar_remove_me.method,
    token
  );
}

export async function uploadMyStaffIdProof(token: string, file: File) {
  return uploadFile(
    SummaryApi.staff_idproof_upload_me.url,
    SummaryApi.staff_idproof_upload_me.method,
    token,
    "idproof",
    file
  );
}

export async function removeMyStaffIdProof(token: string) {
  return removeFile(
    SummaryApi.staff_idproof_remove_me.url,
    SummaryApi.staff_idproof_remove_me.method,
    token
  );
}

/* ===================== ADMIN / CRUD APIs ===================== */

export async function removeStaffAvatarById(token: string, staffId: string) {
  return removeFile(
    SummaryApi.staff_remove_avatar.url,
    SummaryApi.staff_remove_avatar.method,
    token,
    staffId
  );
}

export async function removeStaffIdProofById(token: string, staffId: string) {
  return removeFile(
    SummaryApi.staff_remove_idproof.url,
    SummaryApi.staff_remove_idproof.method,
    token,
    staffId
  );
}

export async function updateStaffWithFiles(
  token: string,
  staffId: string,
  payload: FormData
) {
  const response = await fetch(
    `${baseURL}${SummaryApi.staff_update.url(staffId)}`,
    {
      method: SummaryApi.staff_update.method,
      headers: getAuthHeaders(token),
      body: payload,
    }
  );

  const result = await parseResponse<ApiResult>(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to update staff");
  }

  return result;
}