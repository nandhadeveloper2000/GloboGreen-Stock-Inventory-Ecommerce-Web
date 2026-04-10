"use client";

import React, {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ImagePlus,
  Tag,
  ArrowLeft,
  Trash2,
  Save,
  Sparkles,
  BadgePlus,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type BrandItem = {
  _id?: string;
  name?: string;
  nameKey?: string;
  isActive?: boolean;
  image?: {
    url?: string;
    publicId?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type BrandGetResponse = {
  success?: boolean;
  message?: string;
  data?: BrandItem;
};

type BrandUpdateResponse = {
  success?: boolean;
  message?: string;
  data?: BrandItem;
};

type BrandImageResponse = {
  success?: boolean;
  message?: string;
  data?: BrandItem;
};

type ImagePreview = {
  file: File | null;
  url: string;
};

const initialPreview: ImagePreview = {
  file: null,
  url: "",
};

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message
  ) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message || "Something went wrong"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

function isValidMongoId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
}

function normalizeRole(role?: string | null) {
  return String(role ?? "").trim().toUpperCase();
}

function getRoleBasePath(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "MASTER_ADMIN") return "/master";
  if (normalizedRole === "MANAGER") return "/manager";
  if (normalizedRole === "SUPERVISOR") return "/supervisor";
  if (normalizedRole === "STAFF") return "/staff";

  return "/master";
}

export default function BrandEditPage() {
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { role } = useAuth();

  const id = String(params?.id ?? "");
  const basePath = getRoleBasePath(role);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [name, setName] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);

  const nameKeyPreview = useMemo(() => {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }, [name]);

  useEffect(() => {
    return () => {
      if (imagePreview.url) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview.url]);

  const fetchBrand = async () => {
    try {
      if (!isValidMongoId(id)) {
        toast.error("Invalid brand id");
        router.push(`${basePath}/brand/list`);
        return;
      }

      setLoading(true);

      const getUrl =
        typeof SummaryApi.brand_get.url === "function"
          ? SummaryApi.brand_get.url(id)
          : `${SummaryApi.brand_get.url}/${id}`;

      const response = await apiClient.get<BrandGetResponse>(getUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      const result = response.data;

      if (!result?.success || !result?.data) {
        throw new Error(result?.message || "Failed to fetch brand");
      }

      const brand = result.data;

      setName(brand.name || "");
      setExistingImageUrl(brand.image?.url?.trim() || "");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Unable to load brand");
      router.push(`${basePath}/brand/list`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBrand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const validateAndSetImage = (file: File | null) => {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PNG, JPG, JPEG, or WEBP image");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image size must be less than 3MB");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setImagePreview((prev) => {
      if (prev.url) {
        URL.revokeObjectURL(prev.url);
      }

      return {
        file,
        url: URL.createObjectURL(file),
      };
    });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    validateAndSetImage(file);
  };

  const handleImageDragEnter = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  };

  const handleImageDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  };

  const handleImageDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
  };

  const handleImageDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);

    if (uploadingImage || removingImage) return;

    const file = e.dataTransfer.files?.[0] || null;
    validateAndSetImage(file);
  };

  const removeSelectedPreview = () => {
    setImagePreview((prev) => {
      if (prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return initialPreview;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Brand name is required");
      return false;
    }

    if (trimmedName.length < 2) {
      toast.error("Brand name must be at least 2 characters");
      return false;
    }

    return true;
  };

  const handleUpdateBrand = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!isValidMongoId(id)) {
      toast.error("Invalid brand id");
      return;
    }

    try {
      setSubmitting(true);

      const updateUrl =
        typeof SummaryApi.brand_update.url === "function"
          ? SummaryApi.brand_update.url(id)
          : `${SummaryApi.brand_update.url}/${id}`;

      const response = await apiClient.put<BrandUpdateResponse>(
        updateUrl,
        {
          name: name.trim(),
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to update brand");
      }

      toast.success(result?.message || "Brand updated successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadImage = async () => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid brand id");
      return;
    }

    if (!imagePreview.file) {
      toast.error("Please select an image first");
      return;
    }

    try {
      setUploadingImage(true);

      const imageUrl =
        typeof SummaryApi.brand_image_upload.url === "function"
          ? SummaryApi.brand_image_upload.url(id)
          : `${SummaryApi.brand_image_upload.url}/${id}/image`;

      const formData = new FormData();
      formData.append("image", imagePreview.file);

      const response = await apiClient.post<BrandImageResponse>(imageUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to update brand image");
      }

      const updatedImage = result.data?.image?.url?.trim() || "";
      setExistingImageUrl(updatedImage);

      setImagePreview((prev) => {
        if (prev.url) {
          URL.revokeObjectURL(prev.url);
        }
        return initialPreview;
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success(result?.message || "Brand image updated successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveExistingImage = async () => {
    if (!isValidMongoId(id)) {
      toast.error("Invalid brand id");
      return;
    }

    try {
      setRemovingImage(true);

      const removeUrl =
        typeof SummaryApi.brand_image_remove.url === "function"
          ? SummaryApi.brand_image_remove.url(id)
          : `${SummaryApi.brand_image_remove.url}/${id}/image`;

      const response = await apiClient.delete<BrandImageResponse>(removeUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to remove brand image");
      }

      setExistingImageUrl("");
      toast.success(result?.message || "Brand image removed successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemovingImage(false);
    }
  };

  const previewImageUrl = imagePreview.url || existingImageUrl;

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(145,22,161,0.08),_transparent_24%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff)] p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[30px] border border-slate-200 bg-white p-10 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading brand details...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(145,22,161,0.08),_transparent_24%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff)] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Edit Brand
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Update brand details and manage brand image.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`${basePath}/brand/list`)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-r from-[#082a5e] via-[#5b21b6] to-[#9116a1] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:p-8">
          <div className="absolute inset-0 bg-white/5" />
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Catalog Management
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
              Edit Brand
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
              Update the brand name and manage its image with the same premium
              catalog experience used across your admin module.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateBrand} className="mt-6 space-y-6">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] md:p-7">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <BadgePlus className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Basic Information
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Update the brand name. Name key preview updates automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter brand name"
                    disabled={submitting}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Name Key Preview
                </label>
                <div className="flex min-h-12 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500">
                  {nameKeyPreview || "auto-generated-from-name"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] md:p-7">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                <ImagePlus className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Brand Image
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Replace the current brand image or remove it completely.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
              <div className="space-y-4">
                <label
                  htmlFor="brand-image"
                  onDragEnter={handleImageDragEnter}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                  className={`group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[26px] border-2 border-dashed px-6 py-8 text-center transition duration-200 ${
                    isDraggingImage
                      ? "border-violet-500 bg-violet-50 shadow-sm"
                      : "border-slate-200 bg-gradient-to-br from-slate-50 to-violet-50/60 hover:border-violet-400 hover:shadow-sm"
                  }`}
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-100">
                    {isDraggingImage ? (
                      <UploadCloud className="h-7 w-7" />
                    ) : (
                      <ImagePlus className="h-7 w-7" />
                    )}
                  </div>

                  <p className="text-base font-semibold text-slate-800">
                    {isDraggingImage ? "Drop image here" : "Click to select new image"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Or drag and drop PNG, JPG, JPEG, WEBP up to 3MB
                  </p>

                  <input
                    ref={fileInputRef}
                    id="brand-image"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={uploadingImage || removingImage}
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleUploadImage}
                    disabled={!imagePreview.file || uploadingImage}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#082a5e] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Update Image
                      </>
                    )}
                  </button>

                  {imagePreview.url ? (
                    <button
                      type="button"
                      onClick={removeSelectedPreview}
                      disabled={uploadingImage}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Selected
                    </button>
                  ) : null}

                  {existingImageUrl ? (
                    <button
                      type="button"
                      onClick={handleRemoveExistingImage}
                      disabled={removingImage}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {removingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Remove Existing Image
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Preview
                </p>

                <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {previewImageUrl ? (
                    <Image
                      src={previewImageUrl}
                      alt="Brand preview"
                      fill
                      className="object-cover"
                      sizes="260px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center px-4 text-center text-slate-400">
                      <ImagePlus className="h-10 w-10" />
                      <p className="mt-2 text-sm font-medium">No image selected</p>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {imagePreview.url
                    ? "Previewing newly selected image. Click “Update Image” to save it."
                    : existingImageUrl
                    ? "Showing current saved brand image."
                    : "No image available for this brand."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push(`${basePath}/brand/list`)}
              disabled={submitting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#082a5e] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}