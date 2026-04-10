/* eslint-disable react-hooks/exhaustive-deps */
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
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type ExistingImage = {
  url?: string;
  publicId?: string;
};

type MasterCategoryItem = {
  _id: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  image?: ExistingImage;
  createdAt?: string;
  updatedAt?: string;
};

type MasterCategoryGetResponse = {
  success?: boolean;
  message?: string;
  data?: MasterCategoryItem;
  category?: MasterCategoryItem;
  masterCategory?: MasterCategoryItem;
};

type MasterCategoryUpdateResponse = {
  success?: boolean;
  message?: string;
  data?: MasterCategoryItem;
};

type MasterCategoryImageResponse = {
  success?: boolean;
  message?: string;
  data?: {
    image?: ExistingImage;
  } & Partial<MasterCategoryItem>;
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

function getImageUrl(image?: ExistingImage | null) {
  return image?.url?.trim() || "";
}

export default function MasterCategoryEditPage() {
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const categoryId = typeof id === "string" ? id : "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [existingImage, setExistingImage] = useState<ExistingImage | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

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

  const fetchCategory = async () => {
    if (!categoryId) {
      toast.error("Invalid category id");
      router.push("/master/mastercategory/list");
      return;
    }

    try {
      setLoading(true);

      const getUrl =
        typeof SummaryApi.master_category_get.url === "function"
          ? SummaryApi.master_category_get.url(categoryId)
          : `${SummaryApi.master_category_get.url}/${categoryId}`;

      const response = await apiClient.get<MasterCategoryGetResponse>(getUrl);
      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load master category");
      }

      const item = result.data || result.category || result.masterCategory;

      if (!item) {
        throw new Error("Master category data not found");
      }

      setName(item.name || "");
      setIsActive(Boolean(item.isActive));
      setExistingImage(item.image || null);
      setRemoveExistingImage(false);
      setImagePreview(initialPreview);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategory();
  }, [categoryId]);

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

    setRemoveExistingImage(false);
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

  const removeSelectedNewImage = () => {
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

  const handleRemoveCurrentImage = () => {
    removeSelectedNewImage();
    setExistingImage(null);
    setRemoveExistingImage(true);
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

  const uploadNewImage = async () => {
    if (!imagePreview.file) return;

    const imageUrl =
      typeof SummaryApi.master_category_image_upload.url === "function"
        ? SummaryApi.master_category_image_upload.url(categoryId)
        : `${SummaryApi.master_category_image_upload.url}/${categoryId}`;

    const formData = new FormData();
    formData.append("image", imagePreview.file);

    const response = await apiClient.put<MasterCategoryImageResponse>(
      imageUrl,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const result = response.data;

    if (!result?.success) {
      throw new Error(result?.message || "Failed to upload image");
    }

    const nextImage =
      result?.data?.image ||
      ("image" in (result?.data || {}) ? result?.data?.image : undefined);

    if (nextImage) {
      setExistingImage(nextImage);
    }
  };

  const removeCurrentImageFromServer = async () => {
    const imageRemoveUrl =
      typeof SummaryApi.master_category_image_remove.url === "function"
        ? SummaryApi.master_category_image_remove.url(categoryId)
        : `${SummaryApi.master_category_image_remove.url}/${categoryId}`;

    const response =
      await apiClient.delete<MasterCategoryImageResponse>(imageRemoveUrl);

    const result = response.data;

    if (!result?.success) {
      throw new Error(result?.message || "Failed to remove image");
    }

    setExistingImage(null);
  };

  const updateCategory = async () => {
    const updateUrl =
      typeof SummaryApi.master_category_update.url === "function"
        ? SummaryApi.master_category_update.url(categoryId)
        : `${SummaryApi.master_category_update.url}/${categoryId}`;

    const response = await apiClient.put<MasterCategoryUpdateResponse>(updateUrl, {
      name: name.trim(),
      isActive,
    });

    const result = response.data;

    if (!result?.success) {
      throw new Error(result?.message || "Failed to update master category");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!categoryId) {
      toast.error("Invalid category id");
      return;
    }

    try {
      setSubmitting(true);

      await updateCategory();

      if (removeExistingImage) {
        await removeCurrentImageFromServer();
      }

      if (imagePreview.file) {
        await uploadNewImage();
      }

      toast.success("Master category updated successfully");
      router.push("/master/mastercategory/list");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const previewImageUrl = imagePreview.url || getImageUrl(existingImage);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center rounded-[30px] border border-slate-200 bg-white py-24 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading master category...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Edit Master Category
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update your master category details and image with the same premium
            experience.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-4xl border border-white/40 bg-linear-to-r from-[#082a5e] via-[#5b21b6] to-[#9116a1] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:p-8">
          <div className="absolute inset-0 bg-white/5" />
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
                Edit Master Category
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                Update naming, status, and category image cleanly and safely.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition duration-200 hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] md:p-7">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Tag className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Basic Information
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Update the master category name and active status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Master Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter master category name"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Name Key Preview
                </label>
                <div className="flex min-h-12 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500">
                  {nameKeyPreview || "auto-generated-from-name"}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.22)]"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Active
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition ${
                      !isActive
                        ? "bg-rose-600 text-white shadow-[0_10px_24px_rgba(225,29,72,0.22)]"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Inactive
                  </button>
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
                  Category Image
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Replace the existing image or remove it completely.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
              <div>
                <label
                  htmlFor="master-category-image"
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
                    {isDraggingImage ? "Drop image here" : "Click to upload new image"}
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
                  />
                </label>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Preview
                </p>

                <div className="relative flex h-55 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {previewImageUrl ? (
                    <Image
                      src={previewImageUrl}
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

                <div className="mt-3 space-y-2">
                  {imagePreview.url && (
                    <button
                      type="button"
                      onClick={removeSelectedNewImage}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove New Image
                    </button>
                  )}

                  {(existingImage?.url || removeExistingImage) && (
                    <button
                      type="button"
                      onClick={handleRemoveCurrentImage}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Current Image
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-4 z-10 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/master/master-category/list")}
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#082a5e] to-[#9116a1] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(145,22,161,0.28)] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Master Category
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