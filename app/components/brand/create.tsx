"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePlus,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

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
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
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
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const message = (error as { response?: { data?: { message?: string } } })
      .response?.data?.message;

    if (message) return message;
  }

  if (error instanceof Error && error.message) {
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

function CompactTextField({
  label,
  value,
  placeholder,
  required,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>

      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-2 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function CompactPreviewField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="mb-1 text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="truncate text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

export default function CreateBrandsPage({
  mode = "create",
  brandId = "",
  isModal = false,
  onClose,
  onSuccess,
}: CreateBrandsPageProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { role } = useAuth();

  const isEditMode = mode === "edit";
  const basePath = getRoleBasePath(role);
  const listPath = `${basePath}/brand/list`;

  const [name, setName] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [imagePreview, setImagePreview] =
    useState<ImagePreview>(initialPreview);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const pageTitle = isEditMode ? "Edit Brand" : "Create Brand";
  const pageDescription = isEditMode
    ? "Update brand details and manage brand image."
    : "Create a new brand with optional image.";

  const buttonText = isEditMode ? "Update Brand" : "Save Brand";
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

    let active = true;

    async function fetchBrand() {
      try {
        if (!isValidMongoId(brandId)) {
          toast.error("Invalid brand id");
          if (isModal) {
            onClose?.();
          } else {
            router.push(listPath);
          }
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

        if (!active) return;

        setName(result.data.name || "");
        setExistingImageUrl(result.data.image?.url?.trim() || "");
      } catch (error: unknown) {
        if (!active) return;

        toast.error(getErrorMessage(error));

        if (isModal) {
          onClose?.();
        } else {
          router.push(listPath);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchBrand();

    return () => {
      active = false;
    };
  }, [isEditMode, brandId, isModal, listPath, onClose, router]);

  function handleClose() {
    if (isModal && onClose) {
      onClose();
      return;
    }

    router.push(listPath);
  }

  async function handleSuccess() {
    if (isModal && onSuccess) {
      await onSuccess();
      return;
    }

    router.push(listPath);
  }

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function validateAndSetImage(file: File | null) {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PNG, JPG, JPEG, or WEBP image");
      clearFileInput();
      return;
    }

    const maxSize = 3 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("Image size must be less than 3MB");
      clearFileInput();
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
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    validateAndSetImage(file);
  }

  function handleImageDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingImage(true);
  }

  function handleImageDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingImage(true);
  }

  function handleImageDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingImage(false);
  }

  function handleImageDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingImage(false);

    if (submitting) return;

    const file = event.dataTransfer.files?.[0] || null;
    validateAndSetImage(file);
  }

  function removeSelectedImage() {
    setImagePreview((prev) => {
      if (prev.url) {
        URL.revokeObjectURL(prev.url);
      }

      return initialPreview;
    });

    clearFileInput();
    toast.success("Selected image removed");
  }

  async function removeExistingImage() {
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
  }

  function resetForm() {
    setName("");
    setIsDraggingImage(false);

    setImagePreview((prev) => {
      if (prev.url) {
        URL.revokeObjectURL(prev.url);
      }

      return initialPreview;
    });

    clearFileInput();
  }

  function validateForm() {
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        await handleSuccess();
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
      resetForm();
      await handleSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div
        className={
          isModal
            ? "bg-slate-50 px-3 py-3"
            : "min-h-screen bg-slate-50 px-3 py-3 sm:px-4"
        }
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-semibold">
              Loading brand details...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isModal
          ? "max-h-[90vh] overflow-y-auto bg-slate-50 px-3 py-3 sm:px-4"
          : "min-h-screen bg-slate-50 px-3 py-3 sm:px-4 lg:px-5"
      }
    >
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="mb-3 inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isModal ? "Close" : "Back to List"}
          </button>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
              {pageTitle}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{pageDescription}</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00008b]/10 text-[#00008b]">
                <BadgePlus className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950">
                  Basic Information
                </h2>
                <p className="text-xs leading-5 text-slate-500">
                  Enter brand name. Name key will be generated automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <CompactTextField
                label="Brand Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter brand name"
                disabled={submitting}
                required
              />

              <CompactPreviewField
                label="Name Key Preview"
                value={nameKeyPreview || "auto-generated-from-name"}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00008b]/10 text-[#00008b]">
                <ImagePlus className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950">
                  Brand Image
                </h2>
                <p className="text-xs leading-5 text-slate-500">
                  Upload or drag and drop an optional image.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px]">
              <label
                htmlFor="brand-image"
                onDragEnter={handleImageDragEnter}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                className={`group flex min-h-29.5 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-4 text-center transition ${
                  isDraggingImage
                    ? "border-[#00008b] bg-[#00008b]/5"
                    : "border-slate-300 bg-slate-50 hover:border-[#00008b] hover:bg-[#00008b]/5"
                } ${submitting ? "pointer-events-none opacity-70" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  id="brand-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={submitting}
                />

                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#00008b] shadow-sm ring-1 ring-slate-100">
                  {isDraggingImage ? (
                    <UploadCloud className="h-5 w-5" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </div>

                <p className="text-sm font-bold text-slate-800">
                  {isDraggingImage
                    ? "Drop image here"
                    : isEditMode
                      ? "Click to replace image"
                      : "Click to upload image"}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  PNG, JPG, JPEG, WEBP up to 3MB
                </p>
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-bold text-slate-700">
                  Preview
                </p>

                <div className="relative flex h-29.5 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {previewImageUrl ? (
                    <Image
                      src={previewImageUrl}
                      alt="Brand preview"
                      fill
                      sizes="210px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="px-3 text-center text-xs font-medium text-slate-400">
                      No image selected
                    </div>
                  )}
                </div>

                <div className="mt-2 space-y-2">
                  {imagePreview.url ? (
                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      disabled={submitting}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Selected
                    </button>
                  ) : null}

                  {isEditMode && existingImageUrl && !imagePreview.url ? (
                    <button
                      type="button"
                      onClick={() => void removeExistingImage()}
                      disabled={submitting}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Existing
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#000070] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {submittingText}
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
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