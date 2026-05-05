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
import { useRouter } from "next/navigation";
import {
  Loader2,
  ImagePlus,
  Tag,
  ArrowLeft,
  Trash2,
  Save,
  Sparkles,
  BadgePlus,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";
import { TopLabelInput, TopLabelPanel } from "@/components/ui/top-label-fields";

type PageMode = "create" | "edit";

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

type BrandResponse = {
  success?: boolean;
  message?: string;
  data?: BrandItem;
};

type ImagePreview = {
  file: File | null;
  url: string;
};

type CreateBrandsPageProps = {
  mode?: PageMode;
  brandId?: string;
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

function getApiUrl(
  apiUrl: string | ((id: string) => string),
  id: string,
  fallbackSuffix = ""
) {
  if (typeof apiUrl === "function") {
    return apiUrl(id);
  }

  return `${apiUrl}/${id}${fallbackSuffix}`;
}

export default function CreateBrandsPage({
  mode = "create",
  brandId = "",
}: CreateBrandsPageProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { role } = useAuth();

  const isEditMode = mode === "edit";
  const basePath = getRoleBasePath(role);

  const [name, setName] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const pageTitle = isEditMode ? "Edit Brand" : "Create Brand";
  const pageDescription = isEditMode
    ? "Update brand details and manage brand image."
    : "Create a new brand with optional image.";

  const buttonText = isEditMode ? "Save Changes" : "Save Brand";
  const submittingText = isEditMode ? "Updating..." : "Creating...";

  const nameKeyPreview = useMemo(() => {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }, [name]);

  const previewImageUrl = imagePreview.url || existingImageUrl;

  useEffect(() => {
    return () => {
      if (imagePreview.url) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview.url]);

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      return;
    }

    const fetchBrand = async () => {
      try {
        if (!isValidMongoId(brandId)) {
          toast.error("Invalid brand id");
          router.push(`${basePath}/brand/list`);
          return;
        }

        setLoading(true);

        const getUrl = getApiUrl(SummaryApi.brand_get.url, brandId);

        const response = await apiClient.get<BrandResponse>(getUrl, {
          headers: {
            Accept: "application/json",
          },
        });

        const result = response.data;

        if (!result?.success || !result?.data) {
          throw new Error(result?.message || "Failed to fetch brand");
        }

        setName(result.data.name || "");
        setExistingImageUrl(result.data.image?.url?.trim() || "");
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
        router.push(`${basePath}/brand/list`);
      } finally {
        setLoading(false);
      }
    };

    void fetchBrand();
  }, [isEditMode, brandId, basePath, router]);

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

    if (submitting) return;

    const file = e.dataTransfer.files?.[0] || null;
    validateAndSetImage(file);
  };

  const removeSelectedImage = () => {
    setImagePreview((prev) => {
      if (prev.url) {
        URL.revokeObjectURL(prev.url);
      }

      return initialPreview;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    toast.success("Selected image removed");
  };

  const removeExistingImage = async () => {
    if (!isEditMode) return;

    if (!isValidMongoId(brandId)) {
      toast.error("Invalid brand id");
      return;
    }

    try {
      setSubmitting(true);

      const removeUrl = getApiUrl(
        SummaryApi.brand_image_remove.url,
        brandId,
        "/image"
      );

      const response = await apiClient.delete<BrandResponse>(removeUrl, {
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
      setSubmitting(false);
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (isEditMode && !isValidMongoId(brandId)) {
      toast.error("Invalid brand id");
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode) {
        const updateUrl = getApiUrl(SummaryApi.brand_update.url, brandId);

        const response = await apiClient.put<BrandResponse>(
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

        if (imagePreview.file) {
          const imageUrl = getApiUrl(
            SummaryApi.brand_image_upload.url,
            brandId,
            "/image"
          );

          const formData = new FormData();
          formData.append("image", imagePreview.file);

          const imageResponse = await apiClient.post<BrandResponse>(
            imageUrl,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          const imageResult = imageResponse.data;

          if (!imageResult?.success) {
            throw new Error(
              imageResult?.message || "Brand updated but image upload failed"
            );
          }

          setExistingImageUrl(imageResult.data?.image?.url?.trim() || "");
        }

        toast.success(result?.message || "Brand updated successfully");
        router.push(`${basePath}/brand/list`);
        return;
      }

      const formData = new FormData();
      formData.append("name", name.trim());

      if (imagePreview.file) {
        formData.append("image", imagePreview.file);
      }

      const response = await apiClient.post<BrandResponse>(
        SummaryApi.brand_create.url,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to create brand");
      }

      toast.success(result?.message || "Brand created successfully");
      router.push(`${basePath}/brand/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto w-full max-w-7xl">
          <div className="premium-card-solid rounded-[30px] p-10">
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
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`${basePath}/brand/list`)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </button>
        </div>

        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
              <Sparkles className="h-3.5 w-3.5" />
              Catalog Management
            </span>

            <div className="mt-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                {pageTitle}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                {isEditMode
                  ? "Update the brand name and replace or remove its image with a clean catalog management flow."
                  : "Add the brand name and upload an optional brand image for a clean catalog management experience."}
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="premium-card-solid rounded-card p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <BadgePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="text-sm text-slate-500">
                  {isEditMode
                    ? "Update the brand name. Name key will update automatically."
                    : "Enter the brand name. Name key will be auto-generated."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TopLabelInput
                label="Brand Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter brand name"
                icon={Tag}
                disabled={submitting}
                required
              />

              <TopLabelPanel
                label="Name Key Preview"
                className="border-dashed border-slate-200 bg-slate-50"
                contentClassName="text-sm font-medium text-slate-500"
              >
                <span>{nameKeyPreview || "auto-generated-from-name"}</span>
              </TopLabelPanel>
            </div>
          </section>

          <section className="premium-card-solid rounded-card p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                <ImagePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Brand Image
                </h2>
                <p className="text-sm text-slate-500">
                  {isEditMode
                    ? "Replace the current brand image or remove it completely."
                    : "Upload or drag and drop an optional image for better brand presentation."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
              <div>
                <label
                  htmlFor="brand-image"
                  onDragEnter={handleImageDragEnter}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                  className={`group flex min-h-55 cursor-pointer flex-col items-center justify-center rounded-[26px] border-2 border-dashed px-6 py-8 text-center transition duration-200 ${
                    isDraggingImage
                      ? "border-violet-500 bg-violet-50 shadow-sm"
                      : "border-slate-200 bg-linear-to-br from-slate-50 to-violet-50/60 hover:border-violet-400 hover:shadow-sm"
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
                    {isDraggingImage
                      ? "Drop image here"
                      : isEditMode
                      ? "Click to select new image"
                      : "Click to upload image"}
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
                    disabled={submitting}
                  />
                </label>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  {imagePreview.url ? (
                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      disabled={submitting}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Selected
                    </button>
                  ) : null}

                  {isEditMode && existingImageUrl ? (
                    <button
                      type="button"
                      onClick={removeExistingImage}
                      disabled={submitting}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Existing Image
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Preview
                </p>

                <div className="relative flex h-55 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                      <p className="mt-2 text-sm font-medium">
                        No image selected
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {imagePreview.url
                    ? "Previewing newly selected image. Save to upload it."
                    : existingImageUrl
                    ? "Showing current saved brand image."
                    : "No image available for this brand."}
                </p>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-card border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push(`${basePath}/brand/list`)}
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,33,182,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {submittingText}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {buttonText}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}