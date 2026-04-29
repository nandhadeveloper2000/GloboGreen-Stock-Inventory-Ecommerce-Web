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
  ImagePlus,
  Loader2,
  Save,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { TopLabelInput, TopLabelPanel } from "@/components/ui/top-label-fields";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

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

const initialPreview: ImagePreview = {
  file: null,
  url: "",
  isExisting: false,
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

export default function CreateMasterCategoryPage({
  mode = "create",
  masterCategoryId = "",
}: {
  mode?: "create" | "edit";
  masterCategoryId?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEditMode = mode === "edit";

  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);
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
    ? "Update your master category details and keep the catalog naming and image clean."
    : "Add a premium, well-structured master category for your catalog. Keep naming clean and upload an optional category image.";
  const basicInfoDescription = isEditMode
    ? "Update the master category name. The key preview updates automatically."
    : "Enter the master category name. The key preview will be generated automatically.";
  const imageDescription = isEditMode
    ? "Replace or remove the current category image."
    : "Upload or drag and drop an optional category image.";
  const submitLabel = isEditMode ? "Update Master Category" : "Create Master Category";

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

    const loadMasterCategory = async () => {
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
    };

    void loadMasterCategory();

    return () => {
      active = false;
    };
  }, [isEditMode, masterCategoryId]);

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const buildInitialPreview = (): ImagePreview => {
    if (initialData.imageUrl) {
      return {
        file: null,
        url: initialData.imageUrl,
        isExisting: true,
      };
    }

    return initialPreview;
  };

  const validateAndSetImage = (file: File | null) => {
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
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    validateAndSetImage(file);
  };

  const handleDragEnter = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (submitting || removingImage) return;

    const file = e.dataTransfer.files?.[0] || null;
    validateAndSetImage(file);
  };

  const removeImage = async () => {
    const hasSelectedLocalImage = Boolean(imagePreview.file && !imagePreview.isExisting);
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
      toast.success(initialData.imageUrl ? "Selected image cleared" : "Image removed");
      return;
    }

    if (!hasExistingImage) {
      setImagePreview(initialPreview);
      clearFileInput();
      return;
    }

    try {
      setRemovingImage(true);

      await apiClient.delete(SummaryApi.master_category_image_remove.url(masterCategoryId));

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
  };

  const resetForm = () => {
    setDragActive(false);

    setImagePreview((prev) => {
      if (prev.url && !prev.isExisting) {
        URL.revokeObjectURL(prev.url);
      }

      return isEditMode ? buildInitialPreview() : initialPreview;
    });

    setName(isEditMode ? initialData.name : "");
    clearFileInput();
  };

  const validateForm = () => {
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
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
        router.push("/master/mastercategory/list");
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
        throw new Error(response.data?.message || "Failed to create master category");
      }

      toast.success("Master category created successfully");
      resetForm();

      setTimeout(() => {
        router.push("/master/mastercategory/list");
      }, 700);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center rounded-card border border-slate-200 bg-white py-24 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            <span className="text-sm font-medium">Loading master category...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  {pageTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  {pageDescription}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="premium-card-solid rounded-card p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Tag className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="text-sm text-slate-500">{basicInfoDescription}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <TopLabelInput
                label="Master Category Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter master category name"
                disabled={submitting || removingImage}
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
                  Category Image
                </h2>
                <p className="text-sm text-slate-500">{imageDescription}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
              <div>
                <label
                  htmlFor="master-category-image"
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`group flex min-h-55 cursor-pointer flex-col items-center justify-center rounded-[26px] border-2 border-dashed px-6 py-8 text-center transition duration-200 ${
                    dragActive
                      ? "border-violet-500 bg-violet-50 shadow-sm"
                      : "border-slate-200 bg-linear-to-br from-slate-50 to-violet-50/60 hover:border-violet-400 hover:shadow-sm"
                  } ${submitting || removingImage ? "pointer-events-none opacity-70" : ""}`}
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-100">
                    {dragActive ? (
                      <UploadCloud className="h-7 w-7" />
                    ) : (
                      <ImagePlus className="h-7 w-7" />
                    )}
                  </div>

                  <p className="text-base font-semibold text-slate-800">
                    {dragActive
                      ? "Drop image here"
                      : isEditMode
                        ? "Click to replace image"
                        : "Click to upload image"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Or drag and drop PNG, JPG, JPEG, WEBP up to 3MB
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
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Preview</p>

                <div className="relative flex h-55 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {imagePreview.url ? (
                    <Image
                      src={imagePreview.url}
                      alt="Preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="px-4 text-center text-sm text-slate-400">
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
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                            ? "Clear Selected Image"
                            : "Remove Image"
                          : "Remove Image"}
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-card border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting || removingImage}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={submitting || removingImage}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(145,22,161,0.28)] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
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
