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
  Trash2,
  Save,
  Sparkles,
  Shapes,
  Search,
  Check,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  TopLabelInput,
  TopLabelPanel,
  TopLabelSelectButton,
} from "@/components/ui/top-label-fields";

type CategoryOption = {
  _id: string;
  name: string;
  nameKey: string;
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

type CreateSubCategoryResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id: string;
    categoryId: string;
    name: string;
    nameKey: string;
    isActive: boolean;
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

function normalizeRole(role?: string | null) {
  return String(role ?? "")
    .trim()
    .toUpperCase();
}

function getRoleBasePath(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "MASTER_ADMIN") return "/master";
  if (normalizedRole === "MANAGER") return "/manager";
  if (normalizedRole === "SUPERVISOR") return "/supervisor";
  if (normalizedRole === "STAFF") return "/staff";

  return "/master";
}

export default function CreateSubCategoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);
  const [submitting, setSubmitting] = useState(false);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const nameKeyPreview = useMemo(() => {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }, [name]);

  const selectedCategory = useMemo(() => {
    return categories.find((item) => item._id === categoryId) || null;
  }, [categories, categoryId]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [categories, categorySearch]);

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
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isCategoryDropdownOpen) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);

      return () => window.clearTimeout(timer);
    }
  }, [isCategoryDropdownOpen]);

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
      setCategoryId("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
      setCategories([]);
      setCategoryId("");
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

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

  const removeImage = () => {
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

  const resetForm = () => {
    setName("");
    setCategorySearch("");
    setIsCategoryDropdownOpen(false);
    setCategoryId("");
    removeImage();
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

  const handleSelectCategory = (id: string) => {
    setCategoryId(id);
    setIsCategoryDropdownOpen(false);
    setCategorySearch("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("categoryId", categoryId);
      formData.append("name", name.trim());

      if (imagePreview.file) {
        formData.append("image", imagePreview.file);
      }

      const response = await apiClient.post<CreateSubCategoryResponse>(
        SummaryApi.sub_category_create.url,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = response.data;

      if (!data?.success) {
        throw new Error(data?.message || "Failed to create sub category");
      }

      toast.success(data?.message || "Sub category created successfully");
      router.push(`${basePath}/subcategory/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

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
                  Create Sub Category
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  Select a category, enter the sub category name, and upload an
                  optional image.
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
                <p className="text-sm text-slate-500">
                  Fill in sub category details below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <div ref={dropdownRef} className="relative z-30">
                  <TopLabelSelectButton
                    label="Category"
                    text={
                      loadingCategories
                        ? "Loading..."
                        : selectedCategory?.name || "Select category"
                    }
                    muted={!loadingCategories && !selectedCategory?.name}
                    icon={Shapes}
                    open={isCategoryDropdownOpen}
                    disabled={loadingCategories || submitting}
                    required
                    onClick={() => {
                      if (loadingCategories || submitting) return;
                      setIsCategoryDropdownOpen((prev) => !prev);
                    }}
                  />

                  {isCategoryDropdownOpen && !loadingCategories ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-100 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                      <div className="border-b border-slate-100 p-3">
                        <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-violet-400 focus-within:bg-white">
                          <Search className="mr-2 h-4 w-4 text-slate-400" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            placeholder="Search category"
                            className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto px-2 pb-2">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((item) => {
                            const isSelected = categoryId === item._id;

                            return (
                              <button
                                key={item._id}
                                type="button"
                                onClick={() => handleSelectCategory(item._id)}
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
                            No category found
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <TopLabelInput
                label="Sub Category Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter sub category name"
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
                  Sub Category Image
                </h2>
                <p className="text-sm text-slate-500">
                  Upload or drag and drop an optional image for better catalog
                  presentation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
              <div>
                <label
                  htmlFor="subcategory-image"
                  onDragEnter={handleImageDragEnter}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                  className={`group flex min-h-55 w-full cursor-pointer flex-col items-center justify-center rounded-[26px] border-2 border-dashed px-6 py-8 text-center transition duration-200 ${
                    isDraggingImage
                      ? "border-violet-500 bg-violet-50 shadow-sm"
                      : "border-slate-200 bg-linear-to-br from-slate-50 to-violet-50/60 hover:border-violet-400 hover:shadow-sm"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    id="subcategory-image"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={submitting}
                  />

                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-100">
                    {isDraggingImage ? (
                      <UploadCloud className="h-7 w-7" />
                    ) : (
                      <ImagePlus className="h-7 w-7" />
                    )}
                  </div>

                  <p className="text-base font-semibold text-slate-800">
                    {isDraggingImage ? "Drop image here" : "Click to upload image"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Or drag and drop PNG, JPG, JPEG, WEBP up to 3MB
                  </p>
                </label>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Preview
                </p>

                <div className="relative flex h-55 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
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

                {imagePreview.url ? (
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={submitting}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Image
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
                disabled={submitting}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={submitting || loadingCategories}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2e3192] to-[#9116a1] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(145,22,161,0.28)] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Sub Category
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