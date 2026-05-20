"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  Save,
  Shapes,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type ApiConfig = {
  url: string | ((id: string) => string);
};

type CategoryItem = {
  _id: string;
  name?: string;
  image?: {
    url?: string;
    publicId?: string;
  };
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

const EMPTY_PREVIEW: ImagePreview = {
  file: null,
  url: "",
  isExisting: false,
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

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
  const message = (
    error as { response?: { data?: { message?: string } } }
  )?.response?.data?.message;

  if (message) return message;
  if (error instanceof Error && error.message) return error.message;

  return "Something went wrong";
}

function getRoleBasePath(role?: string | null) {
  const value = String(role ?? "").trim().toUpperCase();

  if (value === "MANAGER") return "/manager";
  if (value === "SUPERVISOR") return "/supervisor";
  if (value === "STAFF") return "/staff";

  return "/master";
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pb-1 pt-5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />

      <label className="pointer-events-none absolute left-3 top-1.5 bg-white px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
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

  const isEditMode = mode === "edit";
  const listPath = `${getRoleBasePath(role)}/category/list`;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<ImagePreview>(EMPTY_PREVIEW);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);
  const [initialData, setInitialData] = useState({
    name: "",
    imageUrl: "",
  });

  const disabled = submitting || removingImage;
  const title = isEditMode ? "Edit Category" : "Create Category";
  const submitLabel = isEditMode ? "Update Category" : "Save Category";

  useEffect(() => {
    return () => {
      if (imagePreview.url && !imagePreview.isExisting) {
        URL.revokeObjectURL(imagePreview.url);
      }
    };
  }, [imagePreview]);

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
          },
        );

        const result = response.data;

        if (!result?.success || !result.data) {
          throw new Error(result?.message || "Failed to load category");
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
            : EMPTY_PREVIEW,
        );
      } catch (error: unknown) {
        if (active) toast.error(getErrorMessage(error));
      } finally {
        if (active) setLoadingExisting(false);
      }
    }

    void loadCategory();

    return () => {
      active = false;
    };
  }, [categoryId, isEditMode]);

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function buildInitialPreview(): ImagePreview {
    if (!initialData.imageUrl) {
      return EMPTY_PREVIEW;
    }

    return {
      file: null,
      url: initialData.imageUrl,
      isExisting: true,
    };
  }

  function closePage() {
    if (isModal && onClose) {
      onClose();
      return;
    }

    router.push(listPath);
  }

  async function successRedirect() {
    if (isModal && onSuccess) {
      await onSuccess();
      return;
    }

    router.push(listPath);
  }

  function validateAndSetImage(file: File | null) {
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
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
    validateAndSetImage(event.target.files?.[0] || null);
  }

  function handleImageDrag(
    event: DragEvent<HTMLLabelElement>,
    active: boolean,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setDraggingImage(active);
  }

  function handleImageDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDraggingImage(false);

    if (disabled) return;

    validateAndSetImage(event.dataTransfer.files?.[0] || null);
  }

  async function removeImage() {
    const hasLocalImage = Boolean(imagePreview.file && !imagePreview.isExisting);
    const hasExistingImage = Boolean(
      isEditMode && imagePreview.isExisting && initialData.imageUrl,
    );

    if (hasLocalImage) {
      setImagePreview((prev) => {
        if (prev.url && !prev.isExisting) {
          URL.revokeObjectURL(prev.url);
        }

        return buildInitialPreview();
      });
      clearFileInput();
      toast.success(
        initialData.imageUrl ? "Selected image cleared" : "Image removed",
      );
      return;
    }

    if (!hasExistingImage) {
      setImagePreview(EMPTY_PREVIEW);
      clearFileInput();
      return;
    }

    try {
      setRemovingImage(true);

      await apiClient.delete(getApiUrl("category_image_remove", categoryId));

      setImagePreview(EMPTY_PREVIEW);
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
    setDraggingImage(false);
    setImagePreview((prev) => {
      if (prev.url && !prev.isExisting) {
        URL.revokeObjectURL(prev.url);
      }

      return isEditMode ? buildInitialPreview() : EMPTY_PREVIEW;
    });
    setName(isEditMode ? initialData.name : "");
    clearFileInput();
  }

  function validateForm() {
    const trimmedName = name.trim();

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

  async function uploadEditImage() {
    if (!imagePreview.file) return;

    const formData = new FormData();
    formData.append("image", imagePreview.file);

    const response = await apiClient.put<CategoryResponse>(
      getApiUrl("category_image_upload", categoryId),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to upload category image");
    }
  }

  async function submitEdit() {
    const response = await apiClient.put<CategoryResponse>(
      getApiUrl("category_update", categoryId),
      {
        name: name.trim(),
      },
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to update category");
    }

    await uploadEditImage();
    toast.success("Category updated successfully");
    await successRedirect();
  }

  async function submitCreate() {
    const formData = new FormData();
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
      },
    );

    const result = response.data;

    if (!result?.success) {
      throw new Error(result?.message || "Failed to create category");
    }

    toast.success(result.message || "Category created successfully");
    resetForm();
    await successRedirect();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      if (isEditMode) {
        await submitEdit();
        return;
      }

      await submitCreate();
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
            ? "flex w-full items-center justify-center px-4 py-8"
            : "min-h-screen bg-slate-50 px-3 py-4 sm:px-4 lg:px-6"
        }
      >
        <div className="mx-auto flex w-full max-w-4xl items-center justify-center rounded-2xl border border-slate-200 bg-white py-12 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-black">Loading category...</span>
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
      <div className={isModal ? "w-full" : "mx-auto w-full max-w-4xl"}>
        <form
          onSubmit={handleSubmit}
          className={
            isModal
              ? "flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-white"
              : "flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          }
        >
          {isModal ? (
            <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black text-slate-950">
                  {title}
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Complete category details inside this popup.
                </p>
              </div>

              <button
                type="button"
                onClick={closePage}
                disabled={disabled}
                title="Close"
                aria-label="Close"
                className="ml-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4 p-4 sm:p-5">
                <TopLabelInput
                  label="Category Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter category name"
                  disabled={disabled}
                  required
                />

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Category Image
                  </label>

                  <label
                    htmlFor="category-image"
                    onDragEnter={(event) => handleImageDrag(event, true)}
                    onDragOver={(event) => handleImageDrag(event, true)}
                    onDragLeave={(event) => handleImageDrag(event, false)}
                    onDrop={handleImageDrop}
                    className={[
                      "group flex min-h-45 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center transition",
                      draggingImage
                        ? "border-[#00008b] bg-[#00008b]/5"
                        : "border-slate-300 bg-slate-50 hover:border-[#00008b] hover:bg-[#00008b]/5",
                      disabled ? "pointer-events-none opacity-70" : "",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#00008b] shadow-sm ring-1 ring-slate-100 transition group-hover:scale-105">
                      {draggingImage ? (
                        <UploadCloud className="h-6 w-6" />
                      ) : imagePreview.url ? (
                        <ImagePlus className="h-6 w-6" />
                      ) : (
                        <UploadCloud className="h-6 w-6" />
                      )}
                    </div>

                    <p className="text-sm font-black text-slate-900">
                      {imagePreview.url
                        ? "Replace category image"
                        : "Upload category image"}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      Drag and drop or click to browse PNG, JPG, JPEG, or WEBP
                      up to 3MB.
                    </p>

                    <input
                      id="category-image"
                      ref={fileInputRef}
                      type="file"
                      accept={IMAGE_TYPES.join(",")}
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={disabled}
                    />
                  </label>
                </div>
              </div>

              <aside className="border-t border-slate-200 bg-slate-50/60 p-4 sm:p-5 lg:border-l lg:border-t-0">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
                      <Shapes className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-950">
                        Preview
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        Current category image
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {imagePreview.url ? (
                      <div className="relative aspect-square w-full">
                        <Image
                          src={imagePreview.url}
                          alt={name.trim() || "Category preview"}
                          fill
                          sizes="300px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center text-slate-400">
                        <ImagePlus className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-black text-slate-900">
                      {name.trim() || "Category Name"}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      Clean names make category management easier across products
                      and mappings.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeImage()}
                    disabled={disabled || !imagePreview.url}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove Image
                  </button>
                </div>
              </aside>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <button
              type="button"
              onClick={closePage}
              disabled={disabled}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-black text-white shadow-[0_12px_25px_rgba(0,0,139,0.22)] transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
