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
  ImagePlus,
  Loader2,
  Save,
  Search,
  Shapes,
  Tag,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type ApiConfig = {
  url: string | ((id: string) => string);
  method?: string;
};

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
  image?: {
    url?: string;
    publicId?: string;
  };
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

type CategoryResponse = {
  success?: boolean;
  message?: string;
  data?: CategoryItem;
};

type ImagePreview = {
  file: File | null;
  url: string;
  isExisting?: boolean;
};

type CreateCategoryPageProps = {
  mode?: "create" | "edit";
  categoryId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

const initialPreview: ImagePreview = {
  file: null,
  url: "",
  isExisting: false,
};

function getApiUrl(key: string, id = "") {
  const apiMap = SummaryApi as unknown as Record<string, ApiConfig | undefined>;
  const config = apiMap[key];

  if (!config?.url) {
    throw new Error(`${key} endpoint missing in SummaryApi`);
  }

  if (typeof config.url === "function") {
    return config.url(id);
  }

  return id ? `${config.url}/${id}` : config.url;
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

export default function CreateCategoryPage({
  mode = "create",
  categoryId = "",
  isModal = false,
  onClose,
  onSuccess,
}: CreateCategoryPageProps) {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);
  const listPath = `${basePath}/category/list`;
  const isEditMode = mode === "edit";

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [masterCategories, setMasterCategories] = useState<
    MasterCategoryOption[]
  >([]);
  const [loadingMasterCategories, setLoadingMasterCategories] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  const [masterCategoryId, setMasterCategoryId] = useState("");
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<ImagePreview>(initialPreview);

  const [submitting, setSubmitting] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [isMasterDropdownOpen, setIsMasterDropdownOpen] = useState(false);
  const [masterCategorySearch, setMasterCategorySearch] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const [initialData, setInitialData] = useState({
    masterCategoryId: "",
    name: "",
    imageUrl: "",
  });

  const pageTitle = isEditMode ? "Edit Category" : "Create Category";
  const pageDescription = isEditMode
    ? "Update category details in compact popup form."
    : "Create category under a master category with optional image.";

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
      if (imagePreview.url && !imagePreview.isExisting) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview.url, imagePreview.isExisting]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!dropdownRef.current) return;

      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsMasterDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMasterDropdownOpen) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isMasterDropdownOpen]);

  useEffect(() => {
    async function fetchMasterCategories() {
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
        setMasterCategories(safeList.filter((item) => item.isActive));
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
        setMasterCategories([]);
      } finally {
        setLoadingMasterCategories(false);
      }
    }

    void fetchMasterCategories();
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setLoadingExisting(false);
      return;
    }

    if (!categoryId.trim()) {
      toast.error("Invalid category id");
      setLoadingExisting(false);
      return;
    }

    let active = true;

    async function loadCategory() {
      try {
        setLoadingExisting(true);

        const response = await apiClient.get<CategoryResponse>(
          getApiUrl("category_get", categoryId),
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = response.data;

        if (!result?.success || !result.data) {
          throw new Error(result?.message || "Failed to load category");
        }

        if (!active) return;

        const resolvedName = String(result.data.name || "");
        const resolvedImageUrl = String(result.data.image?.url || "").trim();

        const rawMasterCategoryId = result.data.masterCategoryId;
        const resolvedMasterCategoryId =
          typeof rawMasterCategoryId === "string"
            ? rawMasterCategoryId
            : String(rawMasterCategoryId?._id || "");

        setName(resolvedName);
        setMasterCategoryId(resolvedMasterCategoryId);

        setInitialData({
          name: resolvedName,
          masterCategoryId: resolvedMasterCategoryId,
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

    void loadCategory();

    return () => {
      active = false;
    };
  }, [isEditMode, categoryId]);

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

      await apiClient.delete(getApiUrl("category_image_remove", categoryId));

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
    setMasterCategorySearch("");
    setIsMasterDropdownOpen(false);

    setImagePreview((prev) => {
      if (prev.url && !prev.isExisting) {
        URL.revokeObjectURL(prev.url);
      }

      return isEditMode ? buildInitialPreview() : initialPreview;
    });

    setName(isEditMode ? initialData.name : "");
    setMasterCategoryId(isEditMode ? initialData.masterCategoryId : "");
    clearFileInput();
  }

  function validateForm() {
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
  }

  function handleSelectMasterCategory(id: string) {
    setMasterCategoryId(id);
    setIsMasterDropdownOpen(false);
    setMasterCategorySearch("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      if (isEditMode) {
        const updateResponse = await apiClient.put<CategoryResponse>(
          getApiUrl("category_update", categoryId),
          {
            masterCategoryId,
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
            updateResponse.data?.message || "Failed to update category"
          );
        }

        if (imagePreview.file) {
          const formData = new FormData();
          formData.append("image", imagePreview.file);

          const imageResponse = await apiClient.put<CategoryResponse>(
            getApiUrl("category_image_upload", categoryId),
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

        toast.success("Category updated successfully");
        await handleSuccess();
        return;
      }

      const formData = new FormData();
      formData.append("masterCategoryId", masterCategoryId);
      formData.append("name", name.trim());

      if (imagePreview.file) {
        formData.append("image", imagePreview.file);
      }

      const response = await apiClient.post<CategoryResponse>(
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
            ? "bg-slate-50 px-3 py-3"
            : "min-h-screen bg-slate-50 px-3 py-3 sm:px-4"
        }
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-semibold">Loading category...</span>
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
            disabled={submitting || removingImage}
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
                <Tag className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950">
                  Basic Information
                </h2>
                <p className="text-xs leading-5 text-slate-500">
                  Select master category and enter category name.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div ref={dropdownRef} className="relative md:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                  Master Category <span className="text-rose-500">*</span>
                </span>

                <button
                  type="button"
                  disabled={loadingMasterCategories || submitting || removingImage}
                  onClick={() => {
                    if (loadingMasterCategories || submitting || removingImage) return;
                    setIsMasterDropdownOpen((prev) => !prev);
                  }}
                  className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium text-slate-800 outline-none transition hover:border-[#00008b] focus:border-[#00008b] focus:ring-2 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Shapes className="h-4 w-4 shrink-0 text-slate-400" />
                    <span
                      className={
                        selectedMasterCategory?.name
                          ? "truncate text-slate-900"
                          : "truncate text-slate-400"
                      }
                    >
                      {loadingMasterCategories
                        ? "Loading..."
                        : selectedMasterCategory?.name || "Select master category"}
                    </span>
                  </span>

                  <span className="text-xs text-slate-400">
                    {isMasterDropdownOpen ? "Close" : "Open"}
                  </span>
                </button>

                {isMasterDropdownOpen && !loadingMasterCategories ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-200 p-3">
                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3">
                        <Search className="mr-2 h-4 w-4 text-slate-400" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={masterCategorySearch}
                          onChange={(event) =>
                            setMasterCategorySearch(event.target.value)
                          }
                          placeholder="Search master category"
                          className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto p-2">
                      {filteredMasterCategories.length > 0 ? (
                        filteredMasterCategories.map((item) => {
                          const isSelected = masterCategoryId === item._id;

                          return (
                            <button
                              key={item._id}
                              type="button"
                              onClick={() => handleSelectMasterCategory(item._id)}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                isSelected
                                  ? "bg-[#00008b]/5 text-[#00008b]"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span className="truncate font-semibold">
                                {item.name}
                              </span>
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

              <CompactTextField
                label="Category Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter category name"
                disabled={submitting || removingImage}
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
                  Category Image
                </h2>
                <p className="text-xs leading-5 text-slate-500">
                  Upload or drag and drop an optional image.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_210px]">
              <label
                htmlFor="category-image"
                onDragEnter={handleImageDragEnter}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                className={`group flex min-h-29.5 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-4 text-center transition ${
                  isDraggingImage
                    ? "border-[#00008b] bg-[#00008b]/5"
                    : "border-slate-300 bg-slate-50 hover:border-[#00008b] hover:bg-[#00008b]/5"
                } ${
                  submitting || removingImage
                    ? "pointer-events-none opacity-70"
                    : ""
                }`}
              >
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

                <input
                  ref={fileInputRef}
                  id="category-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={submitting || removingImage}
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-bold text-slate-700">Preview</p>

                <div className="relative flex h-29.5 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {imagePreview.url ? (
                    <Image
                      src={imagePreview.url}
                      alt="Category preview"
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

                {imagePreview.url ? (
                  <button
                    type="button"
                    onClick={() => void removeImage()}
                    disabled={submitting || removingImage}
                    className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingImage ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove Image
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting || removingImage}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={submitting || removingImage}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || removingImage}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#000070] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {isEditMode ? "Update Category" : "Save Category"}
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