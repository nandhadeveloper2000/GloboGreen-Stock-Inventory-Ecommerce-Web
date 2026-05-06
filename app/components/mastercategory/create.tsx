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
  ImagePlus,
  Loader2,
  Save,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type ImagePreview = {
  file: File | null;
  url: string;
  isExisting?: boolean;
};

type MasterCategoryItem = {
  _id: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
  image?: {
    url?: string;
    publicId?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

type MasterCategoryResponse = {
  success?: boolean;
  message?: string;
  data?: MasterCategoryItem;
};

type CreateMasterCategoryPageProps = {
  mode?: "create" | "edit";
  masterCategoryId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const initialPreview: ImagePreview = {
  file: null,
  url: "",
  isExisting: false,
};

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

function TopLabelInput({
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
    <div className="relative">
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />

      <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
    </div>
  );
}

function PreviewField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

export default function CreateMasterCategoryPage({
  mode = "create",
  masterCategoryId = "",
  isModal = false,
  onClose,
  onSuccess,
}: CreateMasterCategoryPageProps) {
  const router = useRouter();
  const { role } = useAuth();
  const basePath = getRoleBasePath(role);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEditMode = mode === "edit";
  const listPath = `${basePath}/mastercategory/list`;

  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] =
    useState<ImagePreview>(initialPreview);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [removingImage, setRemovingImage] = useState(false);
  const [initialData, setInitialData] = useState({
    name: "",
    imageUrl: "",
  });

  const pageTitle = isEditMode
    ? "Edit Master Category"
    : "Create Master Category";

  const pageDescription = isEditMode
    ? "Update master category details, image, and catalog identity."
    : "Add a new master category for your inventory catalog structure.";

  const basicInfoDescription = isEditMode
    ? "Update the master category name. The name key preview updates automatically."
    : "Enter the master category name. The name key preview will be generated automatically.";

  const imageDescription = isEditMode
    ? "Replace or remove the current category image."
    : "Upload or drag and drop an optional category image.";

  const submitLabel = isEditMode
    ? "Update Master Category"
    : "Create Master Category";

  const nameKeyPreview = useMemo(() => {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }, [name]);

  useEffect(() => {
    return () => {
      if (imagePreview.url && !imagePreview.isExisting) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview.url, imagePreview.isExisting]);

  useEffect(() => {
    if (!isEditMode) {
      setLoadingExisting(false);
      return;
    }

    if (!masterCategoryId.trim()) {
      toast.error("Invalid master category id");
      setLoadingExisting(false);
      return;
    }

    let active = true;

    async function loadMasterCategory() {
      try {
        setLoadingExisting(true);

        const response = await apiClient.get<MasterCategoryResponse>(
          SummaryApi.master_category_get.url(masterCategoryId),
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = response.data;

        if (!result?.success || !result.data) {
          throw new Error(result?.message || "Failed to load master category");
        }

        if (!active) return;

        const resolvedName = String(result.data.name || "");
        const resolvedImageUrl = String(result.data.image?.url || "").trim();

        setName(resolvedName);
        setInitialData({
          name: resolvedName,
          imageUrl: resolvedImageUrl,
        });

        setImagePreview(
          resolvedImageUrl
            ? {
                file: null,
                url: resolvedImageUrl,
                isExisting: true,
              }
            : initialPreview
        );
      } catch (error: unknown) {
        if (!active) return;
        toast.error(getErrorMessage(error));
      } finally {
        if (active) {
          setLoadingExisting(false);
        }
      }
    }

    void loadMasterCategory();

    return () => {
      active = false;
    };
  }, [isEditMode, masterCategoryId]);

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

  function buildInitialPreview(): ImagePreview {
    if (initialData.imageUrl) {
      return {
        file: null,
        url: initialData.imageUrl,
        isExisting: true,
      };
    }

    return initialPreview;
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
      if (prev.url && !prev.isExisting) {
        URL.revokeObjectURL(prev.url);
      }

      return {
        file,
        url: URL.createObjectURL(file),
        isExisting: false,
      };
    });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    validateAndSetImage(file);
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (submitting || removingImage) return;

    const file = event.dataTransfer.files?.[0] || null;
    validateAndSetImage(file);
  }

  async function removeImage() {
    const hasSelectedLocalImage = Boolean(
      imagePreview.file && !imagePreview.isExisting
    );

    const hasExistingImage = Boolean(
      isEditMode && imagePreview.isExisting && initialData.imageUrl
    );

    if (hasSelectedLocalImage) {
      setImagePreview((prev) => {
        if (prev.url && !prev.isExisting) {
          URL.revokeObjectURL(prev.url);
        }

        return buildInitialPreview();
      });

      clearFileInput();
      toast.success(
        initialData.imageUrl ? "Selected image cleared" : "Image removed"
      );
      return;
    }

    if (!hasExistingImage) {
      setImagePreview(initialPreview);
      clearFileInput();
      return;
    }

    try {
      setRemovingImage(true);

      await apiClient.delete(
        SummaryApi.master_category_image_remove.url(masterCategoryId)
      );

      setImagePreview(initialPreview);
      setInitialData((prev) => ({
        ...prev,
        imageUrl: "",
      }));

      clearFileInput();
      toast.success("Image removed successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemovingImage(false);
    }
  }

  function resetForm() {
    setDragActive(false);

    setImagePreview((prev) => {
      if (prev.url && !prev.isExisting) {
        URL.revokeObjectURL(prev.url);
      }

      return isEditMode ? buildInitialPreview() : initialPreview;
    });

    setName(isEditMode ? initialData.name : "");
    clearFileInput();
  }

  function validateForm() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Master category name is required");
      return false;
    }

    if (trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters");
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      if (isEditMode) {
        const updateResponse = await apiClient.put<MasterCategoryResponse>(
          SummaryApi.master_category_update.url(masterCategoryId),
          {
            name: name.trim(),
          }
        );

        if (!updateResponse.data?.success) {
          throw new Error(
            updateResponse.data?.message || "Failed to update master category"
          );
        }

        if (imagePreview.file) {
          const formData = new FormData();
          formData.append("image", imagePreview.file);

          const imageResponse = await apiClient.put<MasterCategoryResponse>(
            SummaryApi.master_category_image_upload.url(masterCategoryId),
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          if (!imageResponse.data?.success) {
            throw new Error(
              imageResponse.data?.message || "Failed to upload category image"
            );
          }
        }

        toast.success("Master category updated successfully");
        await handleSuccess();
        return;
      }

      const formData = new FormData();
      formData.append("name", name.trim());

      if (imagePreview.file) {
        formData.append("image", imagePreview.file);
      }

      const response = await apiClient.post<MasterCategoryResponse>(
        SummaryApi.master_category_create.url,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to create master category"
        );
      }

      toast.success("Master category created successfully");
      resetForm();
      await handleSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingExisting) {
    return (
      <div
        className={
          isModal
            ? "bg-slate-50 px-3 py-4 sm:px-4"
            : "min-h-screen bg-[radial-gradient(circle_at_top_left,#e8ecff_0,#f7f8fc_34%,#f8fafc_100%)] px-3 py-4 sm:px-4 lg:px-6"
        }
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-[26px] border border-slate-200 bg-white py-14 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-black">
              Loading master category...
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
          ? "max-h-[90vh] overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4 lg:px-5"
          : "min-h-screen bg-[radial-gradient(circle_at_top_left,#e8ecff_0,#f7f8fc_34%,#f8fafc_100%)] px-3 py-4 sm:px-4 lg:px-6"
      }
    >
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-card border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-5">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#00008b]/10 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-[#ec0677]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting || removingImage}
              className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isModal ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {isModal ? "Close" : "Back to List"}
            </button>

            <div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#00008b]">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </span>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {pageTitle}
              </h1>

              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                {pageDescription}
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] md:p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
                <Tag className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-950">
                  Basic Information
                </h2>
                <p className="mt-0.5 text-sm font-semibold leading-6 text-slate-500">
                  {basicInfoDescription}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
              <TopLabelInput
                label="Master Category Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter master category name"
                disabled={submitting || removingImage}
                required
              />

              <PreviewField
                label="Name Key Preview"
                value={nameKeyPreview || "auto-generated-from-name"}
              />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] md:p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
                <ImagePlus className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-950">
                  Category Image
                </h2>
                <p className="mt-0.5 text-sm font-semibold leading-6 text-slate-500">
                  {imageDescription}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
              <label
                htmlFor="master-category-image"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={[
                  "group flex min-h-45 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-5 text-center transition",
                  dragActive
                    ? "border-[#00008b] bg-[#00008b]/5"
                    : "border-slate-300 bg-slate-50 hover:border-[#00008b] hover:bg-[#00008b]/5",
                  submitting || removingImage
                    ? "pointer-events-none opacity-70"
                    : "",
                ].join(" ")}
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#00008b] shadow-sm ring-1 ring-slate-100 transition group-hover:scale-105">
                  {dragActive ? (
                    <UploadCloud className="h-7 w-7" />
                  ) : (
                    <ImagePlus className="h-7 w-7" />
                  )}
                </div>

                <p className="text-base font-black text-slate-900">
                  {dragActive
                    ? "Drop image here"
                    : isEditMode
                      ? "Click to replace image"
                      : "Click to upload image"}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  PNG, JPG, JPEG, WEBP up to 3MB
                </p>

                <input
                  ref={fileInputRef}
                  id="master-category-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={submitting || removingImage}
                />
              </label>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Preview
                </p>

                <div className="relative flex h-45 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {imagePreview.url ? (
                    <Image
                      src={imagePreview.url}
                      alt="Preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="px-3 text-center text-sm font-semibold text-slate-400">
                      No image selected
                    </div>
                  )}
                </div>

                {imagePreview.url ? (
                  <button
                    type="button"
                    onClick={() => {
                      void removeImage();
                    }}
                    disabled={submitting || removingImage}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        {imagePreview.file && !imagePreview.isExisting
                          ? initialData.imageUrl
                            ? "Clear Selected"
                            : "Remove Image"
                          : "Remove Image"}
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <div className="sticky bottom-3 z-10 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting || removingImage}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={submitting || removingImage}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || removingImage}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,139,0.22)] transition hover:bg-[#000070] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {submitLabel}
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