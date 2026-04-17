"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FolderTree,
  ImagePlus,
  Loader2,
  Package2,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import {
  TopLabelInput,
  TopLabelPanel,
  TopLabelSelectButton,
} from "@/components/ui/top-label-fields";

type ApiImage = {
  url?: string;
  publicId?: string;
};

type OptionItem = {
  _id: string;
  id?: string;
  name: string;
  nameKey?: string;
  image?: ApiImage;
  isActive?: boolean;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string;
};

function keyOf(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
    const response = (error as { response?: { data?: ApiErrorResponse } })
      .response;
    return response?.data?.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function CreateProductTypePage() {
  const router = useRouter();

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [subCategories, setSubCategories] = useState<OptionItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [subCategoryId, setSubCategoryId] = useState("");
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const nameKeyPreview = useMemo(() => {
    return name.trim() ? keyOf(name) : "auto-generated-from-name";
  }, [name]);

  const selectedSubCategory = useMemo(() => {
    return subCategories.find((item) => item._id === subCategoryId) || null;
  }, [subCategories, subCategoryId]);

  const filteredSubCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return subCategories;

    return subCategories.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [subCategories, search]);

  useEffect(() => {
    void fetchSubCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  async function fetchSubCategories() {
    try {
      setLoadingOptions(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.sub_category_list.url
      );

      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      const activeRows = rows.filter((row) => row.isActive !== false);

      setSubCategories(activeRows);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load sub categories"));
      setSubCategories([]);
    } finally {
      setLoadingOptions(false);
    }
  }

  function validateAndSetImage(file: File | null) {
    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PNG, JPG, JPEG, or WEBP files are allowed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image size must be below 3MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function onSelectImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    validateAndSetImage(file);
  }

  function handleImageDragEnter(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  }

  function handleImageDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  }

  function handleImageDragLeave(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
  }

  function handleImageDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);

    if (submitting) return;

    const file = e.dataTransfer.files?.[0] || null;
    validateAndSetImage(file);
  }

  function removeImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(null);
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetForm() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setName("");
    setImageFile(null);
    setPreviewUrl("");
    setSearch("");
    setIsDropdownOpen(false);
    setSubCategoryId("");
    setIsDraggingImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSelectSubCategory(id: string) {
    setSubCategoryId(id);
    setIsDropdownOpen(false);
    setSearch("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!subCategoryId) {
      toast.error("Please select a sub category");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter product type name");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("subCategoryId", subCategoryId);
      formData.append("name", name.trim());

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await apiClient.post<ApiResponse<OptionItem>>(
        SummaryApi.product_type_create.url,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success(res.data?.message || "Product type created successfully");
      router.push("/master/producttype/list");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create product type"));
    } finally {
      setSubmitting(false);
    }
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
                  Create Product Type
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80 md:text-base">
                  Select a sub category, enter the product type name, and upload
                  an optional image.
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={onSubmit} className="space-y-5">
          <section className="premium-card-solid rounded-[28px] p-4 md:p-5">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <FolderTree className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Basic Information
                </h2>
                <p className="text-sm text-slate-500">
                  Fill in product type details below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <div ref={dropdownRef} className="relative">
                  <TopLabelSelectButton
                    label="Sub Category"
                    text={
                      loadingOptions
                        ? "Loading sub categories..."
                        : selectedSubCategory?.name || "Select sub category"
                    }
                    muted={!loadingOptions && !selectedSubCategory?.name}
                    icon={FolderTree}
                    open={isDropdownOpen}
                    disabled={loadingOptions || submitting}
                    required
                    onClick={() => {
                      if (loadingOptions || submitting) return;
                      setIsDropdownOpen((prev) => !prev);
                    }}
                  />

                  {isDropdownOpen && !loadingOptions ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                      <div className="border-b border-slate-200 p-3">
                        <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3">
                          <Search className="mr-2 h-4 w-4 text-slate-400" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search sub category"
                            className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-2">
                        {filteredSubCategories.length > 0 ? (
                          filteredSubCategories.map((item) => {
                            const isSelected = subCategoryId === item._id;

                            return (
                              <button
                                key={item._id}
                                type="button"
                                onClick={() =>
                                  handleSelectSubCategory(item._id)
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
                            No sub category found
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                  contentClassName="text-sm font-medium text-slate-500"
                >
                  <span>{nameKeyPreview}</span>
                </TopLabelPanel>
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
                  Product Type Image
                </h2>
                <p className="text-sm text-slate-500">
                  Upload or drag and drop an optional image for better catalog
                  presentation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
              <label
                htmlFor="product-type-image"
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
                <input
                  ref={fileInputRef}
                  id="product-type-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={onSelectImage}
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

              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Preview
                </p>

                <div className="relative flex h-55 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ImagePlus className="h-10 w-10" />
                      <span className="text-sm">No image selected</span>
                    </div>
                  )}
                </div>

                {previewUrl ? (
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

          <div className="sticky bottom-4 z-10 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="premium-btn-secondary h-11 px-5"
                disabled={submitting}
              >
                Reset
              </button>

              <button
                type="submit"
                className="premium-btn h-11 gap-2 px-5"
                disabled={submitting || loadingOptions}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Package2 className="h-4 w-4" />
                    Create Product Type
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
