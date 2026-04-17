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

type MasterCategoryOption = {
  _id: string;
  name: string;
  nameKey: string;
  isActive: boolean;
  image?: {
    url?: string;
    publicId?: string;
  };
};

type MasterCategoryListResponse = {
  success?: boolean;
  message?: string;
  data?: MasterCategoryOption[];
  categories?: MasterCategoryOption[];
  masterCategories?: MasterCategoryOption[];
};

type CreateCategoryResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id: string;
    masterCategoryId: string;
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

export default function CreateCategoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);

  const [masterCategories, setMasterCategories] = useState<
    MasterCategoryOption[]
  >([]);
  const [loadingMasterCategories, setLoadingMasterCategories] = useState(true);

  const [masterCategoryId, setMasterCategoryId] = useState("");
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);
  const [submitting, setSubmitting] = useState(false);

  const [isMasterDropdownOpen, setIsMasterDropdownOpen] = useState(false);
  const [masterCategorySearch, setMasterCategorySearch] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);

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
    const query = masterCategorySearch.trim().toLowerCase();

    if (!query) return masterCategories;

    return masterCategories.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [masterCategories, masterCategorySearch]);

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
        setIsMasterDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isMasterDropdownOpen) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      return () => window.clearTimeout(timer);
    }
  }, [isMasterDropdownOpen]);

  const fetchMasterCategories = async () => {
    try {
      setLoadingMasterCategories(true);

      const response = await apiClient.get<MasterCategoryListResponse>(
        SummaryApi.master_category_list.url,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load master categories");
      }

      const list =
        result.data || result.categories || result.masterCategories || [];

      const safeList = Array.isArray(list) ? list : [];
      const activeOnly = safeList.filter((item) => item.isActive);

      setMasterCategories(activeOnly);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
      setMasterCategories([]);
    } finally {
      setLoadingMasterCategories(false);
    }
  };

  useEffect(() => {
    void fetchMasterCategories();
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

  const handleSelectMasterCategory = (id: string) => {
    setMasterCategoryId(id);
    setIsMasterDropdownOpen(false);
    setMasterCategorySearch("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("masterCategoryId", masterCategoryId);
      formData.append("name", name.trim());

      if (imagePreview.file) {
        formData.append("image", imagePreview.file);
      }

      const response = await apiClient.post<CreateCategoryResponse>(
        SummaryApi.category_create.url,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to create category");
      }

      toast.success(result?.message || "Category created successfully");
      router.push(`${basePath}/category/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
            <div className="mx-auto w-full max-w-7xl space-y-5">


        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Create Category
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create a category under a master category with optional image.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push(`${basePath}/category/list`)}
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
                Create Category
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                Select the parent master category, add the category name, and
                upload an optional image for a premium catalog experience.
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Tag className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="text-sm text-slate-500">
                  Choose the parent master category and enter the category name.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <div ref={dropdownRef} className="relative">
                  <TopLabelSelectButton
                    label="Master Category"
                    text={
                      loadingMasterCategories
                        ? "Loading..."
                        : selectedMasterCategory?.name || "Select master category"
                    }
                    muted={!loadingMasterCategories && !selectedMasterCategory?.name}
                    icon={Shapes}
                    open={isMasterDropdownOpen}
                    disabled={loadingMasterCategories || submitting}
                    required
                    onClick={() => {
                      if (loadingMasterCategories || submitting) return;
                      setIsMasterDropdownOpen((prev) => !prev);
                    }}
                  />

                  {isMasterDropdownOpen && !loadingMasterCategories ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                      <div className="border-b border-slate-200 p-3">
                        <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3">
                          <Search className="mr-2 h-4 w-4 text-slate-400" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={masterCategorySearch}
                            onChange={(e) =>
                              setMasterCategorySearch(e.target.value)
                            }
                            placeholder="Search master category"
                            className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-2">
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

              <TopLabelInput
                label="Category Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter category name"
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
                  Upload or drag and drop an optional image for better catalog
                  presentation.
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
                    {isDraggingImage ? "Drop image here" : "Click to upload image"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Or drag and drop PNG, JPG, JPEG, WEBP up to 3MB
                  </p>

                  <input
                    ref={fileInputRef}
                    id="category-image"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={submitting}
                  />
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
                      alt="Category preview"
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

                {imagePreview.url ? (
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={submitting}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Image
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push(`${basePath}/category/list`)}
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Category
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
