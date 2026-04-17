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
  Pencil,
  ArrowLeft,
  Trash2,
  Save,
  UploadCloud,
  Sparkles,
  Shapes,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  TopLabelInput,
  TopLabelNativeSelect,
  TopLabelPanel,
} from "@/components/ui/top-label-fields";

type SubCategoryOption = {
  _id: string;
  name: string;
  nameKey?: string;
  isActive?: boolean;
  image?: {
    url?: string;
    publicId?: string;
  };
};

type SubCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: SubCategoryOption[];
  subCategories?: SubCategoryOption[];
};

type ProductTypeResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id: string;
    subCategoryId?:
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

type UpdateProductTypeResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id: string;
    subCategoryId?: string;
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

function extractSubCategoryId(
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

export default function EditProductTypePage() {
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { role } = useAuth();

  const rawId = params?.id;
  const id = Array.isArray(rawId) ? String(rawId[0] || "") : String(rawId || "");
  const basePath = getRoleBasePath(role);

  const [loading, setLoading] = useState(true);
  const [loadingSubCategories, setLoadingSubCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
  const [subCategoryId, setSubCategoryId] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);

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

  const fetchSubCategories = async () => {
    try {
      setLoadingSubCategories(true);

      const response = await apiClient.get<SubCategoryListResponse>(
        SummaryApi.sub_category_list.url,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load sub categories");
      }

      const list = result.data || result.subCategories || [];
      const safeList = Array.isArray(list) ? list : [];
      const activeOnly = safeList.filter((item) => item.isActive !== false);

      setSubCategories(activeOnly);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const fetchProductType = async () => {
    try {
      setLoading(true);

      const response = await apiClient.get<ProductTypeResponse>(
        SummaryApi.product_type_get.url(id),
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load product type");
      }

      const data = result.data;
      const resolvedSubCategoryId = extractSubCategoryId(data?.subCategoryId);
      const resolvedName = String(data?.name || "");
      const resolvedImageUrl = String(data?.image?.url || "");
      const resolvedIsActive = Boolean(data?.isActive);

      setSubCategoryId(resolvedSubCategoryId);
      setName(resolvedName);
      setIsActive(resolvedIsActive);

      if (resolvedImageUrl) {
        setImagePreview({
          file: null,
          url: resolvedImageUrl,
          isExisting: true,
        });
      } else {
        setImagePreview(initialPreview);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void Promise.all([fetchSubCategories(), fetchProductType()]);
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

    if (submitting || removingImage) return;

    const file = e.dataTransfer.files?.[0] || null;
    validateAndSetImage(file);
  };

  const handleRemoveImage = async () => {
    const hasExistingImage =
      !!imagePreview.url && imagePreview.isExisting && !imagePreview.file;

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

      await apiClient.delete(SummaryApi.product_type_image_remove.url(id));

      setImagePreview(initialPreview);

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

  const validateForm = () => {
    const trimmedName = name.trim();

    if (!subCategoryId) {
      toast.error("Please select a sub category");
      return false;
    }

    if (!trimmedName) {
      toast.error("Product type name is required");
      return false;
    }

    if (trimmedName.length < 2) {
      toast.error("Product type name must be at least 2 characters");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const updateResponse = await apiClient.put<UpdateProductTypeResponse>(
        SummaryApi.product_type_update.url(id),
        {
          subCategoryId,
          name: name.trim(),
        }
      );

      const updateResult = updateResponse.data;

      if (!updateResult?.success) {
        throw new Error(updateResult?.message || "Failed to update product type");
      }

      if (imagePreview.file) {
        const formData = new FormData();
        formData.append("image", imagePreview.file);

        await apiClient.patch(
          SummaryApi.product_type_image_upload.url(id),
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      toast.success("Product type updated successfully");
      router.push(`${basePath}/producttype/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-[28px] border border-slate-200 bg-white py-24 shadow-sm">
          <div className="inline-flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            <span className="text-sm font-medium">Loading product type...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-4xl px-5 py-5 md:px-7 md:py-7">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Catalog Management
              </span>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                  Edit Product Type
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-medium text-white/90 md:text-base">
                  Update product type information, change image, and keep catalog
                  data clean.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Pencil className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="text-sm text-slate-500">
                  Edit product type details below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <TopLabelNativeSelect
                  label="Sub Category"
                  value={subCategoryId}
                  onChange={(e) => setSubCategoryId(e.target.value)}
                  disabled={loadingSubCategories || submitting}
                  icon={Shapes}
                  required
                >
                  <option value="">
                    {loadingSubCategories
                      ? "Loading sub categories..."
                      : "Select sub category"}
                  </option>

                  {subCategories.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </TopLabelNativeSelect>
              </div>

              <TopLabelInput
                label="Product Type Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product type name"
                disabled={submitting}
                required
              />

              <TopLabelPanel
                label="Name Key Preview"
                className="border-dashed border-slate-300 bg-slate-50"
                contentClassName="text-sm text-slate-500"
              >
                <span>{nameKeyPreview || "auto-generated-from-name"}</span>
              </TopLabelPanel>

              <div className="md:col-span-2">
                <TopLabelPanel label="Status">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </TopLabelPanel>
              </div>
            </div>
          </section>

          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-600">
                <ImagePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Product Type Image
                </h2>
                <p className="text-sm text-slate-500">
                  Update or remove product type image.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <label
                  htmlFor="product-type-image"
                  onDragEnter={handleImageDragEnter}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                  className={`flex min-h-47.5 w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 text-center transition ${
                    isDraggingImage
                      ? "border-violet-500 bg-violet-50 shadow-sm"
                      : "border-slate-300 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    id="product-type-image"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={submitting}
                  />

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {isDraggingImage ? (
                      <UploadCloud className="h-6 w-6 text-violet-600" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-violet-600" />
                    )}
                  </div>

                  <h3 className="mt-4 text-lg font-extrabold text-slate-900 md:text-xl">
                    {isDraggingImage ? "Drop image here" : "Click to choose image"}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Or drag and drop PNG, JPG, JPEG, WEBP up to 3MB
                  </p>
                </label>

                <div className="mt-4 flex flex-wrap gap-3">
                  {imagePreview.url ? (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={removingImage || submitting}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="mb-3 text-base font-bold text-slate-900">
                  Preview
                </h3>

                <div className="relative h-40 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                  {imagePreview.url ? (
                    <Image
                      src={imagePreview.url}
                      alt="Product type preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <ImagePlus className="mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-xs font-medium text-slate-400">
                        No image selected
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || loadingSubCategories}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#4f46e5] to-[#e50087] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(145,22,161,0.28)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
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
