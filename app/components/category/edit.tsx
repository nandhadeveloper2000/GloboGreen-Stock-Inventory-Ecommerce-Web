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
  Shapes,
  Search,
  ChevronDown,
  Check,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type ExistingImage = {
  url?: string;
  publicId?: string;
};

type MasterCategoryOption = {
  _id: string;
  name: string;
  nameKey: string;
  isActive: boolean;
};

type CategoryItem = {
  _id: string;
  masterCategoryId:
    | string
    | {
        _id?: string;
        name?: string;
        nameKey?: string;
        isActive?: boolean;
      };
  name: string;
  nameKey: string;
  isActive: boolean;
  image?: ExistingImage;
  createdAt?: string;
  updatedAt?: string;
};

type MasterCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: MasterCategoryOption[];
  categories?: MasterCategoryOption[];
  masterCategories?: MasterCategoryOption[];
};

type CategoryGetResponse = {
  success?: boolean;
  message?: string;
  data?: CategoryItem;
};

type CategoryUpdateResponse = {
  success?: boolean;
  message?: string;
  data?: CategoryItem;
};

type CategoryImageResponse = {
  success?: boolean;
  message?: string;
  data?: {
    image?: ExistingImage;
  } & Partial<CategoryItem>;
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

  if (error instanceof Error) return error.message;
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

function getMasterCategoryId(
  value:
    | string
    | {
        _id?: string;
      }
    | undefined
) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || "";
}

function getImageUrl(image?: ExistingImage | null) {
  return image?.url?.trim() || "";
}

export default function CategoryEditPage() {
  const router = useRouter();
  const params = useParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { role } = useAuth();
  const basePath = getRoleBasePath(role);

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const categoryId = typeof id === "string" ? id : "";

  const [loading, setLoading] = useState(true);
  const [loadingMasterCategories, setLoadingMasterCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [masterCategories, setMasterCategories] = useState<
    MasterCategoryOption[]
  >([]);
  const [masterCategoryId, setMasterCategoryId] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [existingImage, setExistingImage] = useState<ExistingImage | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");

  const nameKeyPreview = useMemo(() => {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }, [name]);

  const selectedMasterCategory = useMemo(() => {
    return (
      masterCategories.find((item) => item._id === masterCategoryId) || null
    );
  }, [masterCategories, masterCategoryId]);

  const filteredMasterCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return masterCategories;

    return masterCategories.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [masterCategories, search]);

  useEffect(() => {
    return () => {
      if (imagePreview.url) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview.url]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;

      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isDropdownOpen) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      return () => window.clearTimeout(timer);
    }
  }, [isDropdownOpen]);

  const fetchMasterCategories = async () => {
    try {
      setLoadingMasterCategories(true);

      const response = await apiClient.get<MasterCategoryListResponse>(
        SummaryApi.master_category_list.url
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load master categories");
      }

      const list =
        result.data || result.categories || result.masterCategories || [];

      setMasterCategories(
        Array.isArray(list) ? list.filter((item) => item.isActive) : []
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingMasterCategories(false);
    }
  };

  const fetchCategory = async () => {
    if (!categoryId) {
      toast.error("Invalid category id");
      router.push(`${basePath}/category/list`);
      return;
    }

    try {
      setLoading(true);

      const getUrl =
        typeof SummaryApi.category_get.url === "function"
          ? SummaryApi.category_get.url(categoryId)
          : `${SummaryApi.category_get.url}/${categoryId}`;

      const response = await apiClient.get<CategoryGetResponse>(getUrl);
      const result = response.data;

      if (!result?.success || !result.data) {
        throw new Error(result?.message || "Failed to load category");
      }

      const item = result.data;

      setName(item.name || "");
      setIsActive(Boolean(item.isActive));
      setMasterCategoryId(getMasterCategoryId(item.masterCategoryId));
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
    void fetchMasterCategories();
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

  const handleSelectMasterCategory = (id: string) => {
    setMasterCategoryId(id);
    setIsDropdownOpen(false);
    setSearch("");
  };

  const validateForm = () => {
    const trimmedName = name.trim();

    if (!masterCategoryId) {
      toast.error("Please select a master category");
      return false;
    }

    if (!trimmedName) {
      toast.error("Category name is required");
      return false;
    }

    if (trimmedName.length < 2) {
      toast.error("Category name must be at least 2 characters");
      return false;
    }

    return true;
  };

  const updateCategory = async () => {
    const updateUrl =
      typeof SummaryApi.category_update.url === "function"
        ? SummaryApi.category_update.url(categoryId)
        : `${SummaryApi.category_update.url}/${categoryId}`;

    const response = await apiClient.put<CategoryUpdateResponse>(updateUrl, {
      masterCategoryId,
      name: name.trim(),
      isActive,
    });

    const result = response.data;

    if (!result?.success) {
      throw new Error(result?.message || "Failed to update category");
    }
  };

  const uploadNewImage = async () => {
    if (!imagePreview.file) return;

    const imageUrl =
      typeof SummaryApi.category_image_upload.url === "function"
        ? SummaryApi.category_image_upload.url(categoryId)
        : `${SummaryApi.category_image_upload.url}/${categoryId}`;

    const formData = new FormData();
    formData.append("image", imagePreview.file);

    const response = await apiClient.put<CategoryImageResponse>(
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

    if (result?.data?.image) {
      setExistingImage(result.data.image);
    }
  };

  const removeCurrentImageFromServer = async () => {
    const imageRemoveUrl =
      typeof SummaryApi.category_image_remove.url === "function"
        ? SummaryApi.category_image_remove.url(categoryId)
        : `${SummaryApi.category_image_remove.url}/${categoryId}`;

    const response =
      await apiClient.delete<CategoryImageResponse>(imageRemoveUrl);
    const result = response.data;

    if (!result?.success) {
      throw new Error(result?.message || "Failed to remove image");
    }

    setExistingImage(null);
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

      toast.success("Category updated successfully");
      router.push(`${basePath}/category/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const previewImageUrl = imagePreview.url || getImageUrl(existingImage);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-[28px] border border-slate-200 bg-white py-24 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading category...
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
                  Edit Category
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  Update category details, parent master category, status, and
                  image.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(`${basePath}/category/list`)}
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
                <Tag className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="text-sm text-slate-500">
                  Update the parent master category, category name, and active
                  status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="premium-label">
                  Master Category <span className="text-rose-500">*</span>
                </label>

                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (loadingMasterCategories || submitting) return;
                      setIsDropdownOpen((prev) => !prev);
                    }}
                    disabled={loadingMasterCategories || submitting}
                    className="premium-select flex items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Shapes className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {loadingMasterCategories
                          ? "Loading master categories..."
                          : selectedMasterCategory?.name ||
                            "Select master category"}
                      </span>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isDropdownOpen && !loadingMasterCategories ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[22px] border border-slate-300 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                      <div className="border-b border-slate-200 p-3">
                        <div className="flex h-11 items-center rounded-xl border border-slate-300 bg-white px-3">
                          <Search className="mr-2 h-4 w-4 text-slate-500" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search master category"
                            className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto px-2 py-2">
                        {filteredMasterCategories.length > 0 ? (
                          filteredMasterCategories.map((item) => {
                            const isSelected = masterCategoryId === item._id;

                            return (
                              <button
                                key={item._id}
                                type="button"
                                onClick={() =>
                                  handleSelectMasterCategory(item._id)
                                }
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                  isSelected
                                    ? "bg-violet-50 text-violet-700"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span className="truncate">{item.name}</span>

                                {isSelected ? (
                                  <Check className="h-4 w-4 shrink-0" />
                                ) : null}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-3 text-sm text-slate-400">
                            No master category found
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="premium-label">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter category name"
                  className="premium-input"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="premium-label">Name Key Preview</label>
                <div className="flex min-h-12 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500">
                  {nameKeyPreview || "auto-generated-from-name"}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="premium-label">Status</label>

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
          </section>

          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                <ImagePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Category Image
                </h2>
                <p className="text-sm text-slate-500">
                  Replace the current image or remove it completely.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
              <div>
                <label
                  htmlFor="category-image"
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
                    id="category-image"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={submitting}
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
                  {imagePreview.url ? (
                    <button
                      type="button"
                      onClick={removeSelectedNewImage}
                      disabled={submitting}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove New Image
                    </button>
                  ) : null}

                  {(existingImage?.url || removeExistingImage) ? (
                    <button
                      type="button"
                      onClick={handleRemoveCurrentImage}
                      disabled={submitting}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Current Image
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => router.push(`${basePath}/category/list`)}
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || loadingMasterCategories}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(145,22,161,0.28)] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Category
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