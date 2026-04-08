"use client";

import React, {
  ChangeEvent,
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
  Shapes,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type CategoryOption = {
  _id: string;
  name: string;
  nameKey?: string;
  isActive: boolean;
  masterCategoryId?:
    | string
    | {
        _id?: string;
        name?: string;
      };
  image?: {
    url?: string;
    publicId?: string;
  };
};

type CategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: CategoryOption[];
  categories?: CategoryOption[];
};

type SubCategoryResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id: string;
    categoryId?:
      | string
      | {
          _id?: string;
          name?: string;
        };
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
};

type UpdateSubCategoryResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id: string;
    categoryId?: string;
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
};

type ImagePreview = {
  file: File | null;
  url: string;
  isExisting?: boolean;
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

function extractCategoryId(
  value?:
    | string
    | {
        _id?: string;
        name?: string;
      }
) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || "");
}

export default function EditSubCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { role } = useAuth();

  const id = String(params?.id || "");
  const basePath = getRoleBasePath(role);

  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);

  const [initialData, setInitialData] = useState({
    categoryId: "",
    name: "",
    imageUrl: "",
  });

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

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);

      const response = await apiClient.get<CategoryListResponse>(
        SummaryApi.category_list.url,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load categories");
      }

      const list = result.data || result.categories || [];
      const safeList = Array.isArray(list) ? list : [];
      const activeOnly = safeList.filter((item) => item.isActive);

      setCategories(activeOnly);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubCategory = async () => {
    try {
      setLoading(true);

      const response = await apiClient.get<SubCategoryResponse>(
        SummaryApi.sub_category_get.url(id),
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load sub category");
      }

      const data = result.data;
      const resolvedCategoryId = extractCategoryId(data?.categoryId);
      const resolvedName = String(data?.name || "");
      const resolvedImageUrl = String(data?.image?.url || "");

      setCategoryId(resolvedCategoryId);
      setName(resolvedName);

      if (resolvedImageUrl) {
        setImagePreview({
          file: null,
          url: resolvedImageUrl,
          isExisting: true,
        });
      } else {
        setImagePreview(initialPreview);
      }

      setInitialData({
        categoryId: resolvedCategoryId,
        name: resolvedName,
        imageUrl: resolvedImageUrl,
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void Promise.all([fetchCategories(), fetchSubCategory()]);
  }, [id]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PNG, JPG, JPEG, or WEBP image");
      e.target.value = "";
      return;
    }

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image size must be less than 3MB");
      e.target.value = "";
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

  const handleRemoveImage = async () => {
    const hasExistingImage =
      !!initialData.imageUrl && imagePreview.isExisting && !imagePreview.file;

    const hasLocalSelectedImage = !!imagePreview.file && !imagePreview.isExisting;

    try {
      if (hasLocalSelectedImage) {
        setImagePreview((prev) => {
          if (prev.url && !prev.isExisting) {
            URL.revokeObjectURL(prev.url);
          }
          return initialPreview;
        });

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        toast.success("Selected image removed");
        return;
      }

      if (!hasExistingImage) {
        setImagePreview(initialPreview);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setRemovingImage(true);

      await apiClient.delete(SummaryApi.sub_category_image_remove.url(id));

      setImagePreview(initialPreview);
      setInitialData((prev) => ({
        ...prev,
        imageUrl: "",
      }));

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success("Image removed successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemovingImage(false);
    }
  };

  const resetForm = () => {
    setCategoryId(initialData.categoryId);
    setName(initialData.name);

    setImagePreview((prev) => {
      if (prev.url && !prev.isExisting) {
        URL.revokeObjectURL(prev.url);
      }

      if (initialData.imageUrl) {
        return {
          file: null,
          url: initialData.imageUrl,
          isExisting: true,
        };
      }

      return initialPreview;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    const trimmedName = name.trim();

    if (!categoryId) {
      toast.error("Please select a category");
      return false;
    }

    if (!trimmedName) {
      toast.error("Sub category name is required");
      return false;
    }

    if (trimmedName.length < 2) {
      toast.error("Sub category name must be at least 2 characters");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const updateResponse = await apiClient.put<UpdateSubCategoryResponse>(
        SummaryApi.sub_category_update.url(id),
        {
          categoryId,
          name: name.trim(),
        }
      );

      const updateResult = updateResponse.data;

      if (!updateResult?.success) {
        throw new Error(updateResult?.message || "Failed to update sub category");
      }

      if (imagePreview.file) {
        const formData = new FormData();
        formData.append("image", imagePreview.file);

        await apiClient.patch(
          SummaryApi.sub_category_image_upload.url(id),
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      toast.success("Sub category updated successfully");

      router.push(`${basePath}/sub-category/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          <span className="text-sm font-medium text-slate-700">
            Loading sub category...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Edit Sub Category
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update sub category details, change category, and manage image.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-linear-to-r from-[#082a5e] via-[#5b21b6] to-[#9116a1] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] md:p-8">
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
                Edit Sub Category
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                Modify sub category information and keep your catalog clean and
                organized.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.08)] md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Tag className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Basic Information
                </h3>
                <p className="text-sm text-slate-500">
                  Update sub category details below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <Shapes className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={loadingCategories || submitting}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="">
                      {loadingCategories
                        ? "Loading categories..."
                        : "Select category"}
                    </option>

                    {categories.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Sub Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter sub category name"
                  disabled={submitting}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50"
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
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.08)] md:p-6">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-600">
                <ImagePlus className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-[22px] font-bold tracking-tight text-slate-900">
                  Sub Category Image
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Replace or remove the current image for better catalog
                  presentation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="group flex min-h-[220px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-violet-300 hover:bg-violet-50/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white shadow-sm">
                    <ImagePlus className="h-8 w-8 text-violet-600" />
                  </div>

                  <h4 className="mt-5 text-xl font-semibold text-slate-900">
                    Click to upload image
                  </h4>

                  <p className="mt-2 text-sm text-slate-500">
                    PNG, JPG, JPEG, WEBP up to 3MB
                  </p>
                </button>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-4 text-lg font-semibold text-slate-900">
                  Preview
                </h4>

                <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  {imagePreview.url ? (
                    <Image
                      src={imagePreview.url}
                      alt="Sub category preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center px-4 text-center">
                      <ImagePlus className="mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-medium text-slate-400">
                        No image selected
                      </p>
                    </div>
                  )}
                </div>

                {imagePreview.url && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={removingImage || submitting}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Remove Image
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="sticky bottom-4 z-10 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={submitting || loadingCategories}
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
                    Update Sub Category
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