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
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  Save,
  Search,
  Shapes,
  Trash2,
  UploadCloud,
  X,
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

type SubCategoryItem = {
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

type SubCategoryResponse = {
  success?: boolean;
  message?: string;
  data?: SubCategoryItem;
};

type ImagePreview = {
  file: File | null;
  url: string;
  isExisting?: boolean;
};

type CreateSubCategoryPageProps = {
  mode?: "create" | "edit";
  subCategoryId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const initialPreview: ImagePreview = {
  file: null,
  url: "",
  isExisting: false,
};

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

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

  if (error instanceof Error && error.message) return error.message;

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
        type="text"
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

export default function CreateSubCategoryPage({
  mode = "create",
  subCategoryId = "",
  isModal = false,
  onClose,
  onSuccess,
}: CreateSubCategoryPageProps) {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);
  const listPath = `${basePath}/subcategory/list`;
  const isEditMode = mode === "edit";

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] =
    useState<ImagePreview>(initialPreview);

  const [submitting, setSubmitting] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const [initialData, setInitialData] = useState({
    categoryId: "",
    name: "",
    imageUrl: "",
  });

  const pageTitle = isEditMode ? "Edit Sub Category" : "Create Sub Category";
  const pageDescription = isEditMode
    ? "Update sub category details, parent category, and image."
    : "Complete sub category details inside this popup.";

  const submitLabel = isEditMode ? "Update Sub Category" : "Save Sub Category";
  const disabled = submitting || removingImage;

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
      if (imagePreview.url && !imagePreview.isExisting) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview.url, imagePreview.isExisting]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!dropdownRef.current) return;

      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isDropdownOpen]);

  useEffect(() => {
    async function fetchCategories() {
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

        setCategories(safeList.filter((item) => item.isActive));
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    }

    void fetchCategories();
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setLoadingExisting(false);
      return;
    }

    if (!subCategoryId.trim()) {
      toast.error("Invalid sub category id");
      setLoadingExisting(false);
      return;
    }

    let active = true;

    async function fetchSubCategory() {
      try {
        setLoadingExisting(true);

        const response = await apiClient.get<SubCategoryResponse>(
          SummaryApi.sub_category_get.url(subCategoryId),
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = response.data;

        if (!result?.success || !result.data) {
          throw new Error(result?.message || "Failed to load sub category");
        }

        if (!active) return;

        const resolvedCategoryId = extractCategoryId(result.data.categoryId);
        const resolvedName = String(result.data.name || "");
        const resolvedImageUrl = String(result.data.image?.url || "").trim();

        setCategoryId(resolvedCategoryId);
        setName(resolvedName);

        setInitialData({
          categoryId: resolvedCategoryId,
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
        if (active) setLoadingExisting(false);
      }
    }

    void fetchSubCategory();

    return () => {
      active = false;
    };
  }, [isEditMode, subCategoryId]);

  async function handleSuccess() {
    if (isModal && onSuccess) {
      await onSuccess();
      return;
    }

    router.push(listPath);
  }

  function handleClose() {
    if (isModal && onClose) {
      onClose();
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

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please upload PNG, JPG, JPEG, or WEBP image");
      clearFileInput();
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
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

    if (disabled) return;

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
        SummaryApi.sub_category_image_remove.url(subCategoryId)
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
    setIsDraggingImage(false);
    setCategorySearch("");
    setIsDropdownOpen(false);

    setImagePreview((prev) => {
      if (prev.url && !prev.isExisting) {
        URL.revokeObjectURL(prev.url);
      }

      return isEditMode ? buildInitialPreview() : initialPreview;
    });

    setCategoryId(isEditMode ? initialData.categoryId : "");
    setName(isEditMode ? initialData.name : "");
    clearFileInput();
  }

  function validateForm() {
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
  }

  function handleSelectCategory(selectedId: string) {
    setCategoryId(selectedId);
    setIsDropdownOpen(false);
    setCategorySearch("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      if (isEditMode) {
        const updateResponse = await apiClient.put<SubCategoryResponse>(
          SummaryApi.sub_category_update.url(subCategoryId),
          {
            categoryId,
            name: name.trim(),
          },
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!updateResponse.data?.success) {
          throw new Error(
            updateResponse.data?.message || "Failed to update sub category"
          );
        }

        if (imagePreview.file) {
          const formData = new FormData();
          formData.append("image", imagePreview.file);

          const imageResponse = await apiClient.put<SubCategoryResponse>(
            SummaryApi.sub_category_image_upload.url(subCategoryId),
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          if (imageResponse.data?.success === false) {
            throw new Error(
              imageResponse.data?.message ||
                "Failed to upload sub category image"
            );
          }
        }

        toast.success("Sub category updated successfully");
        await handleSuccess();
        return;
      }

      const formData = new FormData();
      formData.append("categoryId", categoryId);
      formData.append("name", name.trim());

      if (imagePreview.file) {
        formData.append("image", imagePreview.file);
      }

      const response = await apiClient.post<SubCategoryResponse>(
        SummaryApi.sub_category_create.url,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to create sub category");
      }

      toast.success(result?.message || "Sub category created successfully");
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
            ? "flex w-full items-center justify-center bg-white px-4 py-8"
            : "min-h-screen bg-slate-50 px-3 py-4 sm:px-4 lg:px-6"
        }
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-[26px] border border-slate-200 bg-white py-14 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-black">Loading sub category...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isModal
          ? "w-full bg-white"
          : "min-h-screen bg-slate-50 px-3 py-4 sm:px-4 lg:px-6"
      }
    >
      <div className={isModal ? "w-full" : "mx-auto w-full max-w-5xl"}>
        <form
          onSubmit={handleSubmit}
          className={
            isModal
              ? "flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-white"
              : "flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]"
          }
        >
          {isModal ? (
            <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black text-slate-950">
                  {pageTitle}
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Complete sub category details inside this popup.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={disabled}
                title="Close"
                aria-label="Close"
                className="ml-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <section className="shrink-0 border-b border-slate-200 bg-white p-4 md:p-5">
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={disabled}
                  className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
                </button>

                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                    {pageTitle}
                  </h1>

                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    {pageDescription}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-4 sm:p-5">
              <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] md:p-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-4">
                    <div ref={dropdownRef} className="relative">
                      <button
                        type="button"
                        disabled={loadingCategories || disabled}
                        onClick={() => {
                          if (loadingCategories || disabled) return;
                          setIsDropdownOpen((prev) => !prev);
                        }}
                        className={[
                          "relative flex h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 pb-1.5 pt-5 text-left text-sm font-semibold outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
                          isDropdownOpen
                            ? "border-[#00008b] ring-4 ring-[#00008b]/10"
                            : "border-slate-200 hover:border-[#00008b]",
                        ].join(" ")}
                      >
                        <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          Category <span className="text-rose-500">*</span>
                        </label>

                        <span className="flex min-w-0 items-center gap-2">
                          <Shapes className="h-4 w-4 shrink-0 text-slate-400" />

                          <span
                            className={
                              selectedCategory?.name
                                ? "truncate text-slate-900"
                                : "truncate text-slate-400"
                            }
                          >
                            {loadingCategories
                              ? "Loading categories..."
                              : selectedCategory?.name || "Select category"}
                          </span>
                        </span>

                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isDropdownOpen && !loadingCategories ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
                          <div className="border-b border-slate-100 p-3">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                              <input
                                ref={searchInputRef}
                                type="text"
                                value={categorySearch}
                                onChange={(event) =>
                                  setCategorySearch(event.target.value)
                                }
                                placeholder="Search category..."
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:bg-white focus:ring-4 focus:ring-[#00008b]/10"
                              />
                            </div>
                          </div>

                          <div className="max-h-64 overflow-y-auto p-2">
                            {filteredCategories.length > 0 ? (
                              filteredCategories.map((item) => {
                                const isSelected = categoryId === item._id;

                                return (
                                  <button
                                    key={item._id}
                                    type="button"
                                    onClick={() =>
                                      handleSelectCategory(item._id)
                                    }
                                    className={[
                                      "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition",
                                      isSelected
                                        ? "bg-[#00008b]/5 text-[#00008b]"
                                        : "text-slate-700 hover:bg-slate-50",
                                    ].join(" ")}
                                  >
                                    <span className="truncate">
                                      {item.name}
                                    </span>

                                    {isSelected ? (
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00008b] text-white">
                                        <Check className="h-3.5 w-3.5" />
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-400">
                                No category found
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <TopLabelInput
                      label="Sub Category Name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter sub category name"
                      disabled={disabled}
                      required
                    />

                    <label
                      htmlFor="subcategory-image"
                      onDragEnter={handleImageDragEnter}
                      onDragOver={handleImageDragOver}
                      onDragLeave={handleImageDragLeave}
                      onDrop={handleImageDrop}
                      className={[
                        "group flex min-h-52.5 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-5 text-center transition",
                        isDraggingImage
                          ? "border-[#00008b] bg-[#00008b]/5"
                          : "border-slate-300 bg-slate-50 hover:border-[#00008b] hover:bg-[#00008b]/5",
                        disabled ? "pointer-events-none opacity-70" : "",
                      ].join(" ")}
                    >
                      <input
                        ref={fileInputRef}
                        id="subcategory-image"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={disabled}
                      />

                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#00008b] shadow-sm ring-1 ring-slate-100 transition group-hover:scale-105">
                        {isDraggingImage ? (
                          <UploadCloud className="h-7 w-7" />
                        ) : (
                          <ImagePlus className="h-7 w-7" />
                        )}
                      </div>

                      <p className="text-base font-black text-slate-900">
                        {isDraggingImage
                          ? "Drop image here"
                          : isEditMode
                            ? "Click to replace image"
                            : "Click to upload image"}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        PNG, JPG, JPEG, WEBP up to 3MB
                      </p>
                    </label>
                  </div>

                  <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Preview
                    </p>

                    <div className="relative flex h-71.25 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      {imagePreview.url ? (
                        <Image
                          src={imagePreview.url}
                          alt="Sub category preview"
                          fill
                          sizes="280px"
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
                        onClick={() => void removeImage()}
                        disabled={disabled}
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
                            Remove Image
                          </>
                        )}
                      </button>
                    ) : null}
                  </aside>
                </div>
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={disabled}
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
