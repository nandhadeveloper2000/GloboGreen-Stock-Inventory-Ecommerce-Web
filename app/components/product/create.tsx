"use client";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type FormEvent,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Check,
  ChevronDown,
  Cpu,
  FolderTree,
  Info,
  Layers3,
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";
import {
  buildAutoModelNumber,
  ROWS_PER_PAGE,
  PRODUCT_MEDIA_ACCEPT,
  buildAutoSearchKeys,
  buildPresetProductInfoSections,
  buildPresetVariantRows,
  buildProductFormData,
  buildVariantTitle,
  cloneProductInfoSections,
  createVariantAttribute,
  createVariantItem,
  filterActive,
  getBrandIdFromModel,
  getErrorMessage,
  getPresetValueOptions,
  getRoleBasePath,
  initialProductInfoSection,
  isColourField,
  isFilledInfoField,
  isFilledVariant,
  keyOf,
  normalizeSearchKeys,
  resolveMobileSubcategoryPreset,
  resolvePresetValueOption,
  toModelArray,
  toOptionArray,
  validateProductImageFile,
  validateProductVideoFile,
} from "./create-config";
import {
  ModelCheckboxSelector,
  ProductDropdown,
  VariantAttributesEditor,
  VariantMediaUploader,
  VariantProductInformationEditor,
} from "./create-fields";
import type {
  ApiResponse,
  CategoryMappingMode,
  CompatibilityTableRow,
  DropdownConfig,
  ModelItem,
  OptionItem,
  ProductImageItem,
  ProductMediaItem,
  ProductInformationField,
  ProductInformationSection,
  ProductPayload,
  ProductVideoItem,
  VariantItem,
} from "./create-types";

type ProductReference =
  | string
  | {
      _id?: string;
      name?: string;
    };

type ProductApiMedia = {
  url?: string;
  publicId?: string;
};

type ProductApiImage = ProductApiMedia;
type ProductApiVideo = ProductApiMedia;

type ExistingProductInfoField = {
  label?: string;
  value?: unknown;
};

type ExistingProductInfoSection = {
  title?: string;
  fields?: ExistingProductInfoField[];
};

type NormalizableProductInfoSection =
  | ExistingProductInfoSection
  | ProductInformationSection;

type ExistingProductVariant = {
  title?: string;
  description?: string;
  attributes?: Array<{
    label?: string;
    value?: string;
  }>;
  images?: ProductApiImage[];
  videos?: ProductApiVideo[];
  compatible?: ExistingCompatibilityItem[];
  productInformation?: ExistingProductInfoSection[];
  isActive?: boolean;
};

type ExistingCompatibilityItem = {
  brandId?: ProductReference;
  modelId?: ProductReference[];
  notes?: string;
  isActive?: boolean;
};

type ExistingProductData = {
  _id: string;
  configurationMode?: CategoryMappingMode;
  itemName?: string;
  itemModelNumber?: string;
  itemKey?: string;
  description?: string;
  searchKeys?: string[];
  masterCategoryId?: ProductReference;
  categoryId?: ProductReference;
  subcategoryId?: ProductReference;
  brandId?: ProductReference | ProductReference[];
  modelId?: ProductReference | ProductReference[];
  images?: ProductApiImage[];
  videos?: ProductApiVideo[];
  compatible?: ExistingCompatibilityItem[];
  variant?: ExistingProductVariant[];
  productInformation?: ExistingProductInfoSection[];
  isActive?: boolean;
  isActiveGlobal?: boolean;
};

type ProductGetResponse = ApiResponse<ExistingProductData>;

function getReferenceId(value?: ProductReference | null) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || "");
}

function getReferenceName(value?: ProductReference | null) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value.name || "").trim();
}

function toReferenceArray(
  value?: ProductReference | ProductReference[] | null
): ProductReference[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getReferenceIds(value?: ProductReference | ProductReference[] | null) {
  return toReferenceArray(value)
    .map((item) => getReferenceId(item))
    .filter(Boolean);
}

function getReferenceNames(
  value?: ProductReference | ProductReference[] | null
) {
  return toReferenceArray(value)
    .map((item) => getReferenceName(item))
    .filter(Boolean);
}

function toTextValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function createExistingMediaItem(
  media: ProductApiMedia,
  prefix: string,
  index: number
): ProductMediaItem | null {
  const url = String(media?.url || "").trim();
  if (!url) return null;

  const publicId = String(media?.publicId || "").trim();
  const nameFromPublicId = publicId.split("/").pop();
  const nameFromUrl = url.split("/").pop()?.split("?")[0];

  return {
    id: `${prefix}-${publicId || index}-${Math.random().toString(36).slice(2, 8)}`,
    file: null,
    previewUrl: url,
    name: nameFromPublicId || nameFromUrl || `${prefix}-${index + 1}`,
    size: 0,
    publicId: publicId || undefined,
    isExisting: true,
  };
}

function normalizeExistingMedia(
  value: ProductApiMedia[] | undefined,
  prefix: string
) {
  return Array.isArray(value)
    ? value
        .map((media, index) => createExistingMediaItem(media, prefix, index))
        .filter((media): media is ProductMediaItem => Boolean(media))
    : [];
}

function normalizeExistingImages(
  value: ProductApiImage[] | undefined,
  prefix: string
) {
  return normalizeExistingMedia(value, prefix) as ProductImageItem[];
}

function normalizeExistingVideos(
  value: ProductApiVideo[] | undefined,
  prefix: string
) {
  return normalizeExistingMedia(value, prefix) as ProductVideoItem[];
}

function normalizeExistingProductInformation(
  sections: NormalizableProductInfoSection[] | undefined,
  fallbackSections?: NormalizableProductInfoSection[]
) {
  const normalized = Array.isArray(sections)
    ? sections
        .map((section) => ({
          title: String(section?.title || ""),
          fields: Array.isArray(section?.fields) && section.fields.length
            ? section.fields.map((field) => ({
                label: String(field?.label || ""),
                value: toTextValue(field?.value),
              }))
            : [{ label: "", value: "" }],
        }))
        .filter((section) =>
          section.title.trim() ||
          section.fields.some(
            (field) => field.label.trim() || field.value.trim()
          )
        )
    : [];

  if (normalized.length) {
    return normalized;
  }

  if (fallbackSections?.length) {
    return normalizeExistingProductInformation(fallbackSections);
  }

  return [{ ...initialProductInfoSection }];
}

function normalizeExistingVariants(
  value: ExistingProductVariant[] | undefined,
  fallbackSections?: NormalizableProductInfoSection[],
  brandsList: OptionItem[] = [],
  fallbackCompatibility?: ExistingCompatibilityItem[]
) {
  const normalized = Array.isArray(value)
    ? value.map((item, index) => ({
        id: `existing-variant-${index}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        title: String(item?.title || ""),
        description: String(item?.description || ""),
        attributes:
          Array.isArray(item?.attributes) && item.attributes.length
            ? item.attributes.map((attribute, attributeIndex) => ({
                id: `existing-variant-attribute-${index}-${attributeIndex}-${Math.random()
                  .toString(36)
                  .slice(2, 8)}`,
                label: String(attribute?.label || ""),
                value: String(attribute?.value || ""),
              }))
            : [createVariantAttribute()],
        images: normalizeExistingImages(item?.images, `variant-${index}`),
        videos: normalizeExistingVideos(item?.videos, `variant-video-${index}`),
        compatibility: buildCompatibilityRows(
          brandsList,
          item?.compatible?.length ? item.compatible : fallbackCompatibility
        ),
        productInformation: normalizeExistingProductInformation(
          item?.productInformation,
          fallbackSections
        ),
        isActive: item?.isActive !== false,
      }))
    : [];

  return normalized.length
    ? normalized
    : [createVariantItem([], buildCompatibilityRows(brandsList, fallbackCompatibility))];
}

function hasSharedMediaData(item?: ExistingProductData | null) {
  return Boolean(
    (item?.images?.length ?? 0) > 0 ||
      (item?.videos?.length ?? 0) > 0 ||
      (item?.productInformation?.length ?? 0) > 0
  );
}

function hasCompatibilityData(item?: ExistingProductData | null) {
  return Boolean(
    (item?.compatible?.length ?? 0) > 0 ||
      item?.variant?.some((variantItem) => (variantItem?.compatible?.length ?? 0) > 0)
  );
}

function hasVariantData(item?: ExistingProductData | null) {
  return Boolean(item?.variant?.length);
}

function resolveCategoryMappingMode(
  item?: ExistingProductData | null
): CategoryMappingMode {
  if (
    item?.configurationMode === "variant" ||
    item?.configurationMode === "variantCompatibility" ||
    item?.configurationMode === "productMediaInfoCompatibility" ||
    item?.configurationMode === "productMediaInfo"
  ) {
    return item.configurationMode;
  }

  if (hasVariantData(item) && hasCompatibilityData(item)) {
    return "variantCompatibility";
  }

  if (hasVariantData(item)) {
    return "variant";
  }

  if (hasSharedMediaData(item) && hasCompatibilityData(item)) {
    return "productMediaInfoCompatibility";
  }

  if (hasSharedMediaData(item)) {
    return "productMediaInfo";
  }

  return "variant";
}

function buildCompatibilityRows(
  brandsList: OptionItem[],
  compatibilityItems: ExistingCompatibilityItem[] | undefined
) {
  const compatibilityMap = new Map<
    string,
    {
      modelId: string[];
      notes: string;
      isActive: boolean;
    }
  >();

  (compatibilityItems || []).forEach((item) => {
    const brandId = getReferenceId(item?.brandId);
    if (!brandId) return;

    compatibilityMap.set(brandId, {
      modelId: Array.isArray(item?.modelId)
        ? item.modelId.map((model) => getReferenceId(model)).filter(Boolean)
        : [],
      notes: String(item?.notes || ""),
      isActive: item?.isActive !== false,
    });
  });

  return brandsList.map((brand) => {
    const existing = compatibilityMap.get(brand._id);

    return {
      rowId: brand._id,
      brandId: brand._id,
      enabled: Boolean(existing),
      modelId: existing?.modelId || [],
      notes: existing?.notes || "",
      isActive: existing?.isActive ?? true,
    };
  });
}

function mergeCompatibilityRowsWithBrands(
  brandsList: OptionItem[],
  currentRows: CompatibilityTableRow[]
) {
  const currentMap = new Map(
    currentRows.map((row) => [
      row.brandId,
      {
        modelId: row.modelId,
        notes: row.notes,
        isActive: row.isActive,
        enabled: row.enabled,
      },
    ])
  );

  return brandsList.map((brand) => {
    const existing = currentMap.get(brand._id);

    return {
      rowId: brand._id,
      brandId: brand._id,
      enabled: existing?.enabled ?? false,
      modelId: existing?.modelId || [],
      notes: existing?.notes || "",
      isActive: existing?.isActive ?? true,
    };
  });
}

function cloneCompatibilityRows(rows: CompatibilityTableRow[]) {
  return rows.map((row) => ({
    ...row,
    modelId: [...row.modelId],
  }));
}

function hasEnabledCompatibilityRows(rows: CompatibilityTableRow[]) {
  return rows.some((row) => row.enabled);
}

function buildInitialManualSearchKeys(item: ExistingProductData) {
  const nextSearchKeys = normalizeSearchKeys(
    (Array.isArray(item.searchKeys) ? item.searchKeys : []).join(",")
  );
  const autoKeys = new Set(
    buildAutoSearchKeys({
      itemName: String(item.itemName || ""),
      subcategoryName: getReferenceName(item.subcategoryId),
      brandName: getReferenceNames(item.brandId).join(", "),
      modelName: getReferenceNames(item.modelId).join(", "),
    })
  );
  const excludedKeys = new Set(
    normalizeSearchKeys(
      [item.itemModelNumber, item.itemKey].filter(Boolean).join(",")
    )
  );

  return nextSearchKeys.filter(
    (key) => !autoKeys.has(key) && !excludedKeys.has(key)
  );
}

function buildMediaPayload(items: ProductMediaItem[]) {
  return items
    .filter((item) => item.isExisting && item.previewUrl.trim())
    .map((item) => ({
      url: item.previewUrl.trim(),
      ...(item.publicId ? { publicId: item.publicId } : {}),
    }));
}

function getMediaIdentity(item: ProductMediaItem) {
  if (item.file instanceof File) {
    return `${item.name}-${item.size}-${item.file.lastModified}`;
  }

  return `existing-${item.publicId || item.previewUrl}`;
}

function hasFilledProductInfoSections(sections: ProductInformationSection[]) {
  return sections.some((section) =>
    section.fields.some((field) => isFilledInfoField(field))
  );
}

function hasMeaningfulVariantData(item: VariantItem) {
  return Boolean(
    item.title.trim() ||
      item.description.trim() ||
      isFilledVariant(item) ||
      item.images.length > 0 ||
      item.videos.length > 0 ||
      hasEnabledCompatibilityRows(item.compatibility) ||
      hasFilledProductInfoSections(item.productInformation)
  );
}

function revokeMediaItems(items: ProductMediaItem[]) {
  items.forEach((item) => {
    if (!item.isExisting) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
}

function revokeVariantMedia(items: VariantItem[]) {
  items.forEach((item) => {
    revokeMediaItems(item.images);
    revokeMediaItems(item.videos);
  });
}

function classifyProductMediaFile(file: File): "image" | "video" | null {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  if (
    fileType.startsWith("image/") ||
    /\.(png|jpe?g|webp)$/.test(fileName)
  ) {
    return "image";
  }

  if (
    fileType.startsWith("video/") ||
    /\.(mp4|mov|webm)$/.test(fileName)
  ) {
    return "video";
  }

  return null;
}

function splitProductMediaFiles(files: FileList | File[] | null) {
  return Array.from(files ?? []).reduce(
    (acc, file) => {
      const mediaKind = classifyProductMediaFile(file);

      if (mediaKind === "image") {
        acc.images.push(file);
        return acc;
      }

      if (mediaKind === "video") {
        acc.videos.push(file);
        return acc;
      }

      acc.unsupported.push(file.name);
      return acc;
    },
    {
      images: [] as File[],
      videos: [] as File[],
      unsupported: [] as string[],
    }
  );
}

function TopLabelInput({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  type = "text",
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={disabled ? "" : placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-2 pt-6 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />

        <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500">
          {label} {required ? <span className="text-rose-500">*</span> : null}
        </label>
      </div>

      {hint ? <p className="px-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SearchableSingleSelectCard({
  title,
  description,
  icon: Icon,
  iconClassName,
  label,
  placeholder,
  disabled = false,
  loading = false,
  options,
  value,
  selectedName,
  search,
  open,
  emptyText,
  onToggle,
  onSearchChange,
  onSelect,
  dropdownRef,
  searchInputRef,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  label: string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  options: Array<{ _id: string; name: string }>;
  value: string;
  selectedName: string;
  search: string;
  open: boolean;
  emptyText: string;
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  dropdownRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      ref={dropdownRef}
      className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl",
            iconClassName,
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || loading}
          className={[
            "relative flex h-14 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left shadow-sm outline-none transition",
            open
              ? "border-violet-500 ring-4 ring-violet-100"
              : "border-slate-200 hover:border-violet-300",
            disabled || loading
              ? "cursor-not-allowed bg-slate-50 text-slate-400"
              : "text-slate-900",
          ].join(" ")}
        >
          <span className="min-w-0">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">
              {label}
            </span>
            <span
              className={[
                "block truncate text-sm font-bold",
                selectedName ? "text-slate-900" : "text-slate-400",
              ].join(" ")}
            >
              {loading ? "Loading..." : selectedName || placeholder}
            </span>
          </span>

          <ChevronDown
            className={[
              "h-4 w-4 shrink-0 text-slate-400 transition",
              open ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search..."
                  disabled={disabled || loading}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {options.length ? (
                options.map((option) => {
                  const selected = value === option._id;

                  return (
                    <button
                      key={option._id}
                      type="button"
                      onClick={() => onSelect(option._id)}
                      disabled={disabled || loading}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition",
                        selected
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <span className="truncate">{option.name}</span>

                      {selected ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-400">
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {selectedName ? (
        <div className="mt-3">
          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
            {selectedName}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function CompatibilityRowsEditor({
  rows,
  brandMap,
  modelMapByBrand,
  disabled = false,
  emptyStateText = "Compatible brands will appear here after brands load.",
  onUpdateRow,
}: {
  rows: CompatibilityTableRow[];
  brandMap: Map<string, OptionItem>;
  modelMapByBrand: Map<string, ModelItem[]>;
  disabled?: boolean;
  emptyStateText?: string;
  onUpdateRow: (rowId: string, patch: Partial<CompatibilityTableRow>) => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
        {emptyStateText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const brandName = brandMap.get(row.brandId)?.name || "-";
        const brandModels =
          modelMapByBrand.get(row.brandId)?.map((model) => ({
            _id: model._id,
            name: model.name,
          })) || [];

        return (
          <div
            key={row.rowId}
            className="rounded-[22px] border border-slate-200 bg-white p-4"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
              <div className="space-y-3">
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) =>
                      onUpdateRow(row.rowId, {
                        enabled: e.target.checked,
                      })
                    }
                    disabled={disabled}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="font-semibold text-slate-900">
                    {brandName}
                  </span>
                </label>

                <textarea
                  value={row.notes}
                  onChange={(e) =>
                    onUpdateRow(row.rowId, {
                      notes: e.target.value,
                    })
                  }
                  placeholder="Notes"
                  className="premium-textarea min-h-25"
                  disabled={disabled || !row.enabled}
                />
              </div>

              <ModelCheckboxSelector
                options={brandModels}
                values={row.modelId}
                onChange={(values) =>
                  onUpdateRow(row.rowId, { modelId: values })
                }
                disabled={!row.enabled || disabled}
                emptyText="Enable the brand to choose models"
                allLabel="Select all models"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreateProductPage({
  mode = "create",
  productId = "",
}: {
  mode?: "create" | "edit";
  productId?: string;
}) {
  const router = useRouter();
  const { role } = useAuth();
  const isEditMode = mode === "edit";

  const basePath = getRoleBasePath(role);

  const [submitting, setSubmitting] = useState(false);
  const [loadingExistingProduct, setLoadingExistingProduct] =
    useState(isEditMode);

  const [itemName, setItemName] = useState("");
  const [itemModelNumber, setItemModelNumber] = useState("");
  const [itemKey, setItemKey] = useState("");
  const [description, setDescription] = useState("");
  const [searchKeysInput, setSearchKeysInput] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [modelNumberManuallyEdited, setModelNumberManuallyEdited] =
    useState(false);

  const [masterCategories, setMasterCategories] = useState<OptionItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [subcategories, setSubcategories] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);

  const [masterCategoryId, setMasterCategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [categoryMappingMode, setCategoryMappingMode] =
    useState<CategoryMappingMode>("variant");

  const [loadingMasterCategories, setLoadingMasterCategories] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(true);

  const [openDropdown, setOpenDropdown] =
    useState<DropdownConfig["key"] | null>(null);
  const [searchMap, setSearchMap] = useState<
    Record<DropdownConfig["key"], string>
  >({
    masterCategoryId: "",
    categoryId: "",
    subcategoryId: "",
    brandId: "",
    modelId: "",
  });

  const [variant, setVariant] = useState<VariantItem[]>([createVariantItem()]);
  const [productImages, setProductImages] = useState<ProductImageItem[]>([]);
  const [productVideos, setProductVideos] = useState<ProductVideoItem[]>([]);
  const [productInformation, setProductInformation] = useState<
    ProductInformationSection[]
  >([{ ...initialProductInfoSection }]);

  const [compatibilityRows, setCompatibilityRows] = useState<
    CompatibilityTableRow[]
  >([]);
  const [compatibilityBrandSearch, setCompatibilityBrandSearch] = useState("");
  const [compatibilityCurrentPage, setCompatibilityCurrentPage] = useState(1);

  const variantRef = useRef<VariantItem[]>([]);
  const productImagesRef = useRef<ProductImageItem[]>([]);
  const productVideosRef = useRef<ProductVideoItem[]>([]);
  const skipNextPresetSyncRef = useRef(false);

  const masterCategoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const subcategoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const brandDropdownRef = useRef<HTMLDivElement | null>(null);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);

  const masterCategorySearchInputRef = useRef<HTMLInputElement | null>(null);
  const categorySearchInputRef = useRef<HTMLInputElement | null>(null);
  const subcategorySearchInputRef = useRef<HTMLInputElement | null>(null);
  const brandSearchInputRef = useRef<HTMLInputElement | null>(null);
  const modelSearchInputRef = useRef<HTMLInputElement | null>(null);

  const autoItemKey = useMemo(() => {
    return keyOf(itemName);
  }, [itemName]);

  const autoItemModelNumber = useMemo(() => {
    return buildAutoModelNumber(itemName);
  }, [itemName]);

  const itemKeyPreview = itemKey.trim() ? keyOf(itemKey) : autoItemKey;

  const selectedSubcategoryName = useMemo(() => {
    return subcategories.find((item) => item._id === subcategoryId)?.name || "";
  }, [subcategories, subcategoryId]);

  const selectedSubcategoryPreset = useMemo(() => {
    return resolveMobileSubcategoryPreset(selectedSubcategoryName);
  }, [selectedSubcategoryName]);

  const usesVariantCompatibilityMapping =
    categoryMappingMode === "variantCompatibility";
  const usesProductCompatibilityMapping =
    categoryMappingMode === "productMediaInfoCompatibility";
  const usesVariantConfiguration =
    categoryMappingMode === "variant" ||
    usesVariantCompatibilityMapping;
  const usesCompatibilityMapping =
    usesVariantCompatibilityMapping || usesProductCompatibilityMapping;
  const usesProductMediaInformation =
    usesProductCompatibilityMapping ||
    categoryMappingMode === "productMediaInfo";

  const filteredBrandOptions = useMemo(() => {
    const query = searchMap.brandId.trim().toLowerCase();

    return query
      ? brands.filter((item) => item.name.toLowerCase().includes(query))
      : brands;
  }, [brands, searchMap.brandId]);

  const availablePrimaryModelOptions = useMemo(() => {
    return brandId
      ? models.filter((item) => getBrandIdFromModel(item) === brandId)
      : [];
  }, [brandId, models]);

  const filteredPrimaryModelOptions = useMemo(() => {
    const query = searchMap.modelId.trim().toLowerCase();

    return query
      ? availablePrimaryModelOptions.filter((item) =>
          item.name.toLowerCase().includes(query)
        )
      : availablePrimaryModelOptions;
  }, [availablePrimaryModelOptions, searchMap.modelId]);

  const brandMap = useMemo(() => {
    const map = new Map<string, OptionItem>();
    brands.forEach((item) => map.set(item._id, item));
    return map;
  }, [brands]);

  const modelMapByBrand = useMemo(() => {
    const map = new Map<string, ModelItem[]>();

    models.forEach((item) => {
      const currentBrandId = getBrandIdFromModel(item);
      if (!currentBrandId) return;

      const existing = map.get(currentBrandId) || [];
      existing.push(item);
      map.set(currentBrandId, existing);
    });

    return map;
  }, [models]);

  const selectedBrandName = useMemo(() => {
    return brands.find((item) => item._id === brandId)?.name || "";
  }, [brandId, brands]);

  const selectedModelName = useMemo(() => {
    return models.find((item) => item._id === modelId)?.name || "";
  }, [modelId, models]);

  const defaultVariantCompatibilityRows = useMemo(() => {
    return buildCompatibilityRows(brands, undefined);
  }, [brands]);

  const filteredCompatibilityRows = useMemo(() => {
    const q = compatibilityBrandSearch.trim().toLowerCase();
    if (!q) return compatibilityRows;

    return compatibilityRows.filter((row) => {
      const brandName = brandMap.get(row.brandId)?.name || "";
      return brandName.toLowerCase().includes(q);
    });
  }, [compatibilityRows, compatibilityBrandSearch, brandMap]);

  const manualSearchKeys = useMemo(() => {
    return normalizeSearchKeys(searchKeysInput);
  }, [searchKeysInput]);

  const totalCompatibilityRows = filteredCompatibilityRows.length;
  const totalCompatibilityPages = Math.max(
    1,
    Math.ceil(totalCompatibilityRows / ROWS_PER_PAGE)
  );
  const safeCompatibilityPage = Math.min(
    compatibilityCurrentPage,
    totalCompatibilityPages
  );
  const compatibilityStartIndex =
    (safeCompatibilityPage - 1) * ROWS_PER_PAGE;
  const paginatedCompatibilityRows = filteredCompatibilityRows.slice(
    compatibilityStartIndex,
    compatibilityStartIndex + ROWS_PER_PAGE
  );

const fetchExistingProduct = useEffectEvent(
  async (brandsList: OptionItem[]) => {
    if (!isEditMode) {
      setLoadingExistingProduct(false);
      return;
    }

    if (!productId?.trim()) {
      toast.error("Invalid product id");
      setLoadingExistingProduct(false);
      return;
    }

    try {
      setLoadingExistingProduct(true);

      const response = await apiClient.get<ProductGetResponse>(
        SummaryApi.product_get.url(productId),
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.message || "Failed to load product");
      }

      const item = response.data.data;

      const nextItemName = String(item.itemName || "");
      const nextItemModelNumber = String(item.itemModelNumber || "");
      const nextMasterCategoryId = getReferenceId(item.masterCategoryId);
      const nextCategoryId = getReferenceId(item.categoryId);
      const nextSubcategoryId = getReferenceId(item.subcategoryId);
      const nextBrandId = getReferenceId(
        Array.isArray(item.brandId) ? item.brandId[0] : item.brandId
      );
      const nextModelId = getReferenceId(
        Array.isArray(item.modelId) ? item.modelId[0] : item.modelId
      );

      setItemName(nextItemName);
      setItemModelNumber(nextItemModelNumber);
      setModelNumberManuallyEdited(
        Boolean(nextItemModelNumber.trim()) &&
          nextItemModelNumber.trim() !== buildAutoModelNumber(nextItemName)
      );
      setItemKey(String(item.itemKey || ""));
      setDescription(String(item.description || ""));
      setSearchKeysInput(buildInitialManualSearchKeys(item).join(", "));

      setMasterCategoryId(nextMasterCategoryId);
      setCategoryId(nextCategoryId);
      setSubcategoryId(nextSubcategoryId);
      setBrandId(nextBrandId);
      setModelId(nextModelId);

      skipNextPresetSyncRef.current = true;
      setCategoryMappingMode(resolveCategoryMappingMode(item));

      const nextVariant = normalizeExistingVariants(
        item.variant,
        item.productInformation,
        brandsList,
        item.compatible
      );
      const nextProductImages = normalizeExistingImages(
        item.images,
        "product-image"
      );
      const nextProductVideos = normalizeExistingVideos(
        item.videos,
        "product-video"
      );
      const nextProductInformation = normalizeExistingProductInformation(
        item.productInformation
      );

      setVariant(nextVariant);
      setProductImages(nextProductImages);
      setProductVideos(nextProductVideos);
      setProductInformation(nextProductInformation);
      setCompatibilityRows(buildCompatibilityRows(brandsList, item.compatible));
      setIsActive(Boolean(item.isActiveGlobal ?? item.isActive));

      if (nextMasterCategoryId) {
        await fetchCategories(nextMasterCategoryId, {
          categoryId: nextCategoryId,
          subcategoryId: nextSubcategoryId,
        });
      }

      if (nextCategoryId) {
        await fetchSubcategories(nextCategoryId, {
          subcategoryId: nextSubcategoryId,
        });
      }
    } catch (error: unknown) {
      console.error("Failed to load product", error);
      toast.error(getErrorMessage(error, "Failed to load product"));
    } finally {
      setLoadingExistingProduct(false);
    }
  }
);

const fetchInitialOptions = useEffectEvent(async () => {
  const [, brandsList] = await Promise.all([
    fetchMasterCategories(),
    fetchBrandsAndSeedCompatibility(),
    fetchModels(),
  ]);

  if (isEditMode) {
    await fetchExistingProduct(brandsList || []);
    return;
  }

  setLoadingExistingProduct(false);
});

useEffect(() => {
  if (isEditMode && !productId?.trim()) return;
  void fetchInitialOptions();
}, [isEditMode, productId]);

  useEffect(() => {
    variantRef.current = variant;
  }, [variant]);

  useEffect(() => {
    if (!modelNumberManuallyEdited) {
      setItemModelNumber(autoItemModelNumber);
    }
  }, [autoItemModelNumber, modelNumberManuallyEdited]);

  useEffect(() => {
    productImagesRef.current = productImages;
  }, [productImages]);

  useEffect(() => {
    productVideosRef.current = productVideos;
  }, [productVideos]);

  useEffect(() => {
    return () => {
      revokeVariantMedia(variantRef.current);
      revokeMediaItems(productImagesRef.current);
      revokeMediaItems(productVideosRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInside = [
        masterCategoryDropdownRef,
        categoryDropdownRef,
        subcategoryDropdownRef,
        brandDropdownRef,
        modelDropdownRef,
      ].some((ref) => ref.current?.contains(target));

      if (!clickedInside) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!openDropdown) return;

    let inputRef: RefObject<HTMLInputElement | null> | null = null;

    if (openDropdown === "masterCategoryId") {
      inputRef = masterCategorySearchInputRef;
    } else if (openDropdown === "categoryId") {
      inputRef = categorySearchInputRef;
    } else if (openDropdown === "subcategoryId") {
      inputRef = subcategorySearchInputRef;
    } else if (openDropdown === "brandId") {
      inputRef = brandSearchInputRef;
    } else if (openDropdown === "modelId") {
      inputRef = modelSearchInputRef;
    }

    const timer = window.setTimeout(() => {
      inputRef?.current?.focus();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [openDropdown]);

  useEffect(() => {
    if (!masterCategoryId) {
      setCategories([]);
      setCategoryId("");
      return;
    }

    void fetchCategories(masterCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterCategoryId]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId("");
      return;
    }

    void fetchSubcategories(categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  useEffect(() => {
    if (skipNextPresetSyncRef.current) {
      skipNextPresetSyncRef.current = false;
      return;
    }

    if (!selectedSubcategoryPreset) {
      revokeVariantMedia(variantRef.current);
      setVariant([
        createVariantItem([], cloneCompatibilityRows(defaultVariantCompatibilityRows)),
      ]);
      setProductInformation([{ ...initialProductInfoSection }]);
      return;
    }

    revokeVariantMedia(variantRef.current);

    const sections = buildPresetProductInfoSections(
      selectedSubcategoryPreset.sections,
      selectedSubcategoryPreset.itemTypeName
    );

    const presetVariants = buildPresetVariantRows(
      selectedSubcategoryPreset.variantLabels
    ).map((item) => ({
      ...item,
      compatibility: cloneCompatibilityRows(defaultVariantCompatibilityRows),
      productInformation: cloneProductInfoSections(sections),
    }));

    setVariant(presetVariants);
    setProductInformation(sections);
  }, [defaultVariantCompatibilityRows, selectedSubcategoryPreset]);

  useEffect(() => {
    setCompatibilityCurrentPage(1);
  }, [compatibilityBrandSearch]);

  useEffect(() => {
    if (!modelId) return;

    const exists = availablePrimaryModelOptions.some(
      (item) => item._id === modelId
    );

    if (!exists) {
      setModelId("");
    }
  }, [availablePrimaryModelOptions, modelId]);

  async function fetchMasterCategories() {
    try {
      setLoadingMasterCategories(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.master_category_list.url
      );

      const rows = filterActive(
        toOptionArray(
          res.data?.data || res.data?.categories || res.data?.masterCategories
        )
      );

      setMasterCategories(rows);
      return rows;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load master categories"));
      setMasterCategories([]);
      return [];
    } finally {
      setLoadingMasterCategories(false);
    }
  }

  async function fetchCategories(
    selectedMasterCategoryId: string,
    selectedValues?: {
      categoryId?: string;
      subcategoryId?: string;
    }
  ) {
    try {
      setLoadingCategories(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.category_list.url
      );

      const rows = filterActive(toOptionArray(res.data?.data)).filter(
        (item: OptionItem & { masterCategoryId?: string | { _id?: string } }) => {
          const value = item.masterCategoryId;
          if (typeof value === "string") return value === selectedMasterCategoryId;
          return value?._id === selectedMasterCategoryId;
        }
      );

      setCategories(rows);
      const nextCategoryId = selectedValues?.categoryId ?? categoryId;
      const nextSubcategoryId = selectedValues?.subcategoryId ?? subcategoryId;
      const hasSelectedCategory = rows.some((item) => item._id === nextCategoryId);

      if (!hasSelectedCategory) {
        setCategoryId("");
        setSubcategoryId("");
        setSubcategories([]);
      } else {
        setCategoryId(nextCategoryId);
        setSubcategoryId(nextSubcategoryId);
      }

      return rows;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load categories"));
      setCategories([]);
      return [];
    } finally {
      setLoadingCategories(false);
    }
  }

  async function fetchSubcategories(
    selectedCategoryId: string,
    selectedValues?: {
      subcategoryId?: string;
    }
  ) {
    try {
      setLoadingSubcategories(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.sub_category_list.url
      );

      const rows = filterActive(toOptionArray(res.data?.data)).filter(
        (item: OptionItem & { categoryId?: string | { _id?: string } }) => {
          const value = item.categoryId;
          if (typeof value === "string") return value === selectedCategoryId;
          return value?._id === selectedCategoryId;
        }
      );

      setSubcategories(rows);
      const nextSubcategoryId = selectedValues?.subcategoryId ?? subcategoryId;
      const hasSelectedSubcategory = rows.some(
        (item) => item._id === nextSubcategoryId
      );

      if (!hasSelectedSubcategory) {
        setSubcategoryId("");
      } else {
        setSubcategoryId(nextSubcategoryId);
      }

      return rows;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load sub categories"));
      setSubcategories([]);
      return [];
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function fetchBrandsAndSeedCompatibility() {
    try {
      setLoadingBrands(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.brand_list.url
      );

      const activeBrands = filterActive(
        toOptionArray(res.data?.data || res.data?.brands)
      );

      setBrands(activeBrands);
      setCompatibilityRows((prev) =>
        mergeCompatibilityRowsWithBrands(activeBrands, prev)
      );
      setVariant((prev) =>
        prev.map((item) => ({
          ...item,
          compatibility: mergeCompatibilityRowsWithBrands(
            activeBrands,
            item.compatibility
          ),
        }))
      );
      return activeBrands;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load brands"));
      setBrands([]);
      setCompatibilityRows([]);
      setVariant((prev) =>
        prev.map((item) => ({
          ...item,
          compatibility: [],
        }))
      );
      return [];
    } finally {
      setLoadingBrands(false);
    }
  }

  async function fetchModels() {
    try {
      setLoadingModels(true);

      const res = await apiClient.get<ApiResponse<ModelItem[]>>(
        SummaryApi.model_list.url
      );

      const rows = filterActive(toModelArray(res.data?.data || res.data?.models));
      setModels(rows);
      return rows;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load models"));
      setModels([]);
      return [];
    } finally {
      setLoadingModels(false);
    }
  }

  function handleToggleDropdown(key: DropdownConfig["key"]) {
    setOpenDropdown((prev) => (prev === key ? null : key));
  }

  function handleSearchChange(key: DropdownConfig["key"], value: string) {
    setSearchMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSelectDropdownValue(
    key: DropdownConfig["key"],
    value: string
  ) {
    if (key === "masterCategoryId") setMasterCategoryId(value);
    if (key === "categoryId") setCategoryId(value);
    if (key === "subcategoryId") setSubcategoryId(value);

    setSearchMap((prev) => ({
      ...prev,
      [key]: "",
    }));

    setOpenDropdown(null);
  }

  function handlePrimaryBrandChange(value: string) {
    setBrandId(value);

    const currentModelStillValid = models.some(
      (item) => item._id === modelId && getBrandIdFromModel(item) === value
    );

    if (!currentModelStillValid) {
      setModelId("");
    }
  }

  function handlePrimaryModelChange(value: string) {
    setModelId(value);
  }

  function updateVariant(
    variantId: string,
    patch: Partial<VariantItem>
  ) {
    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        const next = { ...item, ...patch };

        if (!next.title.trim()) {
          next.title = buildVariantTitle(next.attributes);
        }

        return next;
      })
    );
  }

  function updateVariantAttributeLabel(
    variantId: string,
    attributeId: string,
    value: string
  ) {
    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        const nextAttributes = item.attributes.map((attribute) =>
          attribute.id === attributeId ? { ...attribute, label: value } : attribute
        );

        return {
          ...item,
          attributes: nextAttributes,
          title: item.title.trim() || buildVariantTitle(nextAttributes),
        };
      })
    );
  }

  function updateVariantAttributeValue(
    variantId: string,
    attributeId: string,
    value: string
  ) {
    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        const nextAttributes = item.attributes.map((attribute) =>
          attribute.id === attributeId ? { ...attribute, value } : attribute
        );

        return {
          ...item,
          attributes: nextAttributes,
          title: buildVariantTitle(nextAttributes),
        };
      })
    );
  }

  function addVariantAttribute(variantId: string) {
    setVariant((prev) =>
      prev.map((item) =>
        item.id === variantId
          ? {
              ...item,
              attributes: [...item.attributes, createVariantAttribute()],
            }
          : item
      )
    );
  }

  function removeVariantAttribute(variantId: string, attributeId: string) {
    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        const nextAttributes =
          item.attributes.length === 1
            ? [createVariantAttribute()]
            : item.attributes.filter((attribute) => attribute.id !== attributeId);

        return {
          ...item,
          attributes: nextAttributes,
          title: buildVariantTitle(nextAttributes),
        };
      })
    );
  }

  function buildDraftVariant(sourceVariant?: VariantItem) {
    const presetLabels =
      selectedSubcategoryPreset?.variantLabels?.length
        ? selectedSubcategoryPreset.variantLabels
        : [];

    const defaultProductInfo =
      selectedSubcategoryPreset && productInformation.length
        ? cloneProductInfoSections(productInformation)
        : [{ ...initialProductInfoSection }];

    const defaultCompatibility = cloneCompatibilityRows(
      defaultVariantCompatibilityRows
    );

    const nextVariant = createVariantItem(presetLabels, defaultCompatibility);

    if (!sourceVariant) {
      return {
        ...nextVariant,
        productInformation: defaultProductInfo,
      };
    }

    const nextAttributes = sourceVariant.attributes.length
      ? sourceVariant.attributes.map((attribute) =>
          createVariantAttribute(attribute.label, attribute.value)
        )
      : nextVariant.attributes;

    return {
      ...nextVariant,
      title: sourceVariant.title.trim() || buildVariantTitle(nextAttributes),
      description: sourceVariant.description,
      attributes: nextAttributes,
      compatibility: sourceVariant.compatibility.length
        ? cloneCompatibilityRows(sourceVariant.compatibility)
        : defaultCompatibility,
      productInformation: sourceVariant.productInformation.length
        ? cloneProductInfoSections(sourceVariant.productInformation)
        : defaultProductInfo,
      isActive: sourceVariant.isActive,
    };
  }

  function addVariantRow() {
    setVariant((prev) => {
      const sourceVariant =
        [...prev].reverse().find((item) => hasMeaningfulVariantData(item)) ||
        prev[prev.length - 1];

      return [...prev, buildDraftVariant(sourceVariant)];
    });
  }

  function removeVariantRow(variantId: string) {
    setVariant((prev) => {
      if (prev.length === 1) {
        revokeVariantMedia(prev);
        return [buildDraftVariant()];
      }

      const current = prev.find((item) => item.id === variantId);
      revokeMediaItems(current?.images || []);
      revokeMediaItems(current?.videos || []);

      return prev.filter((item) => item.id !== variantId);
    });
  }

  function addVariantImages(variantId: string, files: FileList | File[] | null) {
    const nextFiles = Array.from(files ?? []);
    if (!nextFiles.length) return;

    const errors: string[] = [];

    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        const existingSignatures = new Set(item.images.map(getMediaIdentity));

        const additions: ProductImageItem[] = [];

        nextFiles.forEach((file) => {
          const validationError = validateProductImageFile(file);

          if (validationError) {
            errors.push(`${file.name}: ${validationError}`);
            return;
          }

          const signature = `${file.name}-${file.size}-${file.lastModified}`;

          if (existingSignatures.has(signature)) {
            return;
          }

          existingSignatures.add(signature);

          additions.push({
            id: `${signature}-${Math.random().toString(36).slice(2, 10)}`,
            file,
            previewUrl: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
          });
        });

        return {
          ...item,
          images: [...item.images, ...additions],
        };
      })
    );

    errors.forEach((message) => toast.error(message));
  }

  function removeVariantImage(variantId: string, imageId: string) {
    const currentVariant = variant.find((item) => item.id === variantId);
    const image = currentVariant?.images.find((item) => item.id === imageId);

    if (image && !image.isExisting) {
      URL.revokeObjectURL(image.previewUrl);
    }

    setVariant((prev) =>
      prev.map((item) =>
        item.id === variantId
          ? {
              ...item,
              images: item.images.filter((imageItem) => imageItem.id !== imageId),
            }
          : item
      )
    );
  }

  function addVariantVideos(variantId: string, files: FileList | File[] | null) {
    const nextFiles = Array.from(files ?? []);
    if (!nextFiles.length) return;

    const errors: string[] = [];

    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        const existingSignatures = new Set(item.videos.map(getMediaIdentity));
        const additions: ProductVideoItem[] = [];

        nextFiles.forEach((file) => {
          const validationError = validateProductVideoFile(file);

          if (validationError) {
            errors.push(`${file.name}: ${validationError}`);
            return;
          }

          const signature = `${file.name}-${file.size}-${file.lastModified}`;

          if (existingSignatures.has(signature)) {
            return;
          }

          existingSignatures.add(signature);

          additions.push({
            id: `${signature}-${Math.random().toString(36).slice(2, 10)}`,
            file,
            previewUrl: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
          });
        });

        return {
          ...item,
          videos: [...item.videos, ...additions],
        };
      })
    );

    errors.forEach((message) => toast.error(message));
  }

  function removeVariantVideo(variantId: string, videoId: string) {
    const currentVariant = variant.find((item) => item.id === variantId);
    const video = currentVariant?.videos.find((item) => item.id === videoId);

    if (video && !video.isExisting) {
      URL.revokeObjectURL(video.previewUrl);
    }

    setVariant((prev) =>
      prev.map((item) =>
        item.id === variantId
          ? {
              ...item,
              videos: item.videos.filter((videoItem) => videoItem.id !== videoId),
            }
          : item
      )
    );
  }

  function addVariantMedia(variantId: string, files: FileList | File[] | null) {
    const { images, videos, unsupported } = splitProductMediaFiles(files);

    if (images.length > 0) {
      addVariantImages(variantId, images);
    }

    if (videos.length > 0) {
      addVariantVideos(variantId, videos);
    }

    unsupported.forEach((fileName) => {
      toast.error(
        `${fileName}: Only PNG, JPG, JPEG, WEBP, MP4, MOV, and WEBM files are allowed`
      );
    });
  }

  function removeVariantMedia(
    variantId: string,
    mediaKind: "image" | "video",
    itemId: string
  ) {
    if (mediaKind === "image") {
      removeVariantImage(variantId, itemId);
      return;
    }

    removeVariantVideo(variantId, itemId);
  }

  function addProductImages(files: FileList | File[] | null) {
    const nextFiles = Array.from(files ?? []);
    if (!nextFiles.length) return;

    const errors: string[] = [];

    setProductImages((prev) => {
      const existingSignatures = new Set(prev.map(getMediaIdentity));

      const additions: ProductImageItem[] = [];

      nextFiles.forEach((file) => {
        const validationError = validateProductImageFile(file);

        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          return;
        }

        const signature = `${file.name}-${file.size}-${file.lastModified}`;

        if (existingSignatures.has(signature)) {
          return;
        }

        existingSignatures.add(signature);

        additions.push({
          id: `${signature}-${Math.random().toString(36).slice(2, 10)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
        });
      });

      return [...prev, ...additions];
    });

    errors.forEach((message) => toast.error(message));
  }

  function addProductVideos(files: FileList | File[] | null) {
    const nextFiles = Array.from(files ?? []);
    if (!nextFiles.length) return;

    const errors: string[] = [];

    setProductVideos((prev) => {
      const existingSignatures = new Set(prev.map(getMediaIdentity));
      const additions: ProductVideoItem[] = [];

      nextFiles.forEach((file) => {
        const validationError = validateProductVideoFile(file);

        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          return;
        }

        const signature = `${file.name}-${file.size}-${file.lastModified}`;

        if (existingSignatures.has(signature)) {
          return;
        }

        existingSignatures.add(signature);

        additions.push({
          id: `${signature}-${Math.random().toString(36).slice(2, 10)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
        });
      });

      return [...prev, ...additions];
    });

    errors.forEach((message) => toast.error(message));
  }

  function removeProductImage(imageId: string) {
    const image = productImages.find((item) => item.id === imageId);

    if (image && !image.isExisting) {
      URL.revokeObjectURL(image.previewUrl);
    }

    setProductImages((prev) =>
      prev.filter((imageItem) => imageItem.id !== imageId)
    );
  }

  function removeProductVideo(videoId: string) {
    const video = productVideos.find((item) => item.id === videoId);

    if (video && !video.isExisting) {
      URL.revokeObjectURL(video.previewUrl);
    }

    setProductVideos((prev) =>
      prev.filter((videoItem) => videoItem.id !== videoId)
    );
  }

  function addProductMedia(files: FileList | File[] | null) {
    const { images, videos, unsupported } = splitProductMediaFiles(files);

    if (images.length > 0) {
      addProductImages(images);
    }

    if (videos.length > 0) {
      addProductVideos(videos);
    }

    unsupported.forEach((fileName) => {
      toast.error(
        `${fileName}: Only PNG, JPG, JPEG, WEBP, MP4, MOV, and WEBM files are allowed`
      );
    });
  }

  function removeProductMedia(mediaKind: "image" | "video", itemId: string) {
    if (mediaKind === "image") {
      removeProductImage(itemId);
      return;
    }

    removeProductVideo(itemId);
  }

  function addProductInfoSection() {
    setProductInformation((prev) => [
      ...prev,
      {
        title: "",
        fields: [{ label: "", value: "" }],
      },
    ]);
  }

  function removeProductInfoSection(index: number) {
    setProductInformation((prev) => {
      if (prev.length === 1) return [{ ...initialProductInfoSection }];
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function updateProductInfoSectionTitle(index: number, value: string) {
    setProductInformation((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, title: value } : item
      )
    );
  }

  function addProductInfoField(sectionIndex: number) {
    setProductInformation((prev) =>
      prev.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              fields: [...section.fields, { label: "", value: "" }],
            }
          : section
      )
    );
  }

  function removeProductInfoField(sectionIndex: number, fieldIndex: number) {
    setProductInformation((prev) =>
      prev.map((section, index) => {
        if (index !== sectionIndex) return section;

        if (section.fields.length === 1) {
          return {
            ...section,
            fields: [{ label: "", value: "" }],
          };
        }

        return {
          ...section,
          fields: section.fields.filter((_, idx) => idx !== fieldIndex),
        };
      })
    );
  }

  function updateProductInfoField(
    sectionIndex: number,
    fieldIndex: number,
    key: keyof ProductInformationField,
    value: string
  ) {
    setProductInformation((prev) =>
      prev.map((section, index) => {
        if (index !== sectionIndex) return section;

        return {
          ...section,
          fields: section.fields.map((field, idx) =>
            idx === fieldIndex ? { ...field, [key]: value } : field
          ),
        };
      })
    );
  }

  function addVariantProductInfoSection(variantId: string) {
    setVariant((prev) =>
      prev.map((item) =>
        item.id === variantId
          ? {
              ...item,
              productInformation: [
                ...item.productInformation,
                { title: "", fields: [{ label: "", value: "" }] },
              ],
            }
          : item
      )
    );
  }

  function removeVariantProductInfoSection(variantId: string, sectionIndex: number) {
    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        if (item.productInformation.length === 1) {
          return {
            ...item,
            productInformation: [{ ...initialProductInfoSection }],
          };
        }

        return {
          ...item,
          productInformation: item.productInformation.filter(
            (_, index) => index !== sectionIndex
          ),
        };
      })
    );
  }

  function updateVariantProductInfoSectionTitle(
    variantId: string,
    sectionIndex: number,
    value: string
  ) {
    setVariant((prev) =>
      prev.map((item) =>
        item.id === variantId
          ? {
              ...item,
              productInformation: item.productInformation.map((section, index) =>
                index === sectionIndex ? { ...section, title: value } : section
              ),
            }
          : item
      )
    );
  }

  function addVariantProductInfoField(variantId: string, sectionIndex: number) {
    setVariant((prev) =>
      prev.map((item) =>
        item.id === variantId
          ? {
              ...item,
              productInformation: item.productInformation.map((section, index) =>
                index === sectionIndex
                  ? {
                      ...section,
                      fields: [...section.fields, { label: "", value: "" }],
                    }
                  : section
              ),
            }
          : item
      )
    );
  }

  function removeVariantProductInfoField(
    variantId: string,
    sectionIndex: number,
    fieldIndex: number
  ) {
    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        return {
          ...item,
          productInformation: item.productInformation.map((section, index) => {
            if (index !== sectionIndex) return section;

            if (section.fields.length === 1) {
              return {
                ...section,
                fields: [{ label: "", value: "" }],
              };
            }

            return {
              ...section,
              fields: section.fields.filter((_, idx) => idx !== fieldIndex),
            };
          }),
        };
      })
    );
  }

  function updateVariantProductInfoField(
    variantId: string,
    sectionIndex: number,
    fieldIndex: number,
    key: keyof ProductInformationField,
    value: string
  ) {
    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        return {
          ...item,
          productInformation: item.productInformation.map((section, index) => {
            if (index !== sectionIndex) return section;

            return {
              ...section,
              fields: section.fields.map((field, idx) =>
                idx === fieldIndex ? { ...field, [key]: value } : field
              ),
            };
          }),
        };
      })
    );
  }

  function updateCompatibilityRow(
    rowId: string,
    patch: Partial<CompatibilityTableRow>
  ) {
    setCompatibilityRows((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;

        const next: CompatibilityTableRow = {
          ...item,
          ...patch,
        };

        if (patch.enabled === false) {
          next.modelId = [];
          next.notes = "";
        }

        return next;
      })
    );
  }

  function updateVariantCompatibilityRow(
    variantId: string,
    rowId: string,
    patch: Partial<CompatibilityTableRow>
  ) {
    setVariant((prev) =>
      prev.map((item) => {
        if (item.id !== variantId) return item;

        return {
          ...item,
          compatibility: item.compatibility.map((row) => {
            if (row.rowId !== rowId) return row;

            const next: CompatibilityTableRow = {
              ...row,
              ...patch,
            };

            if (patch.enabled === false) {
              next.modelId = [];
              next.notes = "";
            }

            return next;
          }),
        };
      })
    );
  }

  function buildCompatibilityPayload(rows: CompatibilityTableRow[]) {
    return rows
      .filter((row) => row.enabled)
      .map((row) => ({
        brandId: row.brandId,
        modelId: row.modelId,
        notes: row.notes.trim(),
        isActive: row.isActive,
      }));
  }

  function buildMergedCompatibilityPayload(items: VariantItem[]) {
    const compatibilityMap = new Map<
      string,
      {
        brandId: string;
        modelId: Set<string>;
        notes: Set<string>;
        isActive: boolean;
      }
    >();

    items.forEach((item) => {
      buildCompatibilityPayload(item.compatibility).forEach((row) => {
        const existing =
          compatibilityMap.get(row.brandId) ||
          {
            brandId: row.brandId,
            modelId: new Set<string>(),
            notes: new Set<string>(),
            isActive: false,
          };

        row.modelId.forEach((modelId) => existing.modelId.add(modelId));

        if (row.notes.trim()) {
          existing.notes.add(row.notes.trim());
        }

        existing.isActive = existing.isActive || row.isActive;
        compatibilityMap.set(row.brandId, existing);
      });
    });

    return Array.from(compatibilityMap.values()).map((row) => ({
      brandId: row.brandId,
      modelId: Array.from(row.modelId),
      notes: Array.from(row.notes).join(" | "),
      isActive: row.isActive,
    }));
  }

  function validateProductInfoSections(
    sections: ProductInformationSection[],
    errorPrefix: string
  ) {
    const invalid = sections.some((section) => {
      const hasCompletedField = section.fields.some((field) =>
        isFilledInfoField(field)
      );
      const hasValueWithoutLabel = section.fields.some(
        (field) => field.value.trim() && !field.label.trim()
      );

      if (hasValueWithoutLabel) return true;
      if (!hasCompletedField) return false;

      return !section.title.trim();
    });

    if (invalid) {
      toast.error(`${errorPrefix} section must have a title and complete fields`);
      return false;
    }

    return true;
  }

  function buildFilledProductInformation(
    sections: ProductInformationSection[]
  ): ProductPayload["productInformation"] {
    return sections
      .map((section) => ({
        title: section.title.trim(),
        fields: section.fields
          .filter((field) => isFilledInfoField(field))
          .map((field) => ({
            label: field.label.trim(),
            value: field.value.trim(),
          })),
      }))
      .filter((section) => section.title && section.fields.length > 0);
  }

  function validateForm() {
    if (!itemName.trim()) {
      toast.error("Please enter product name");
      return false;
    }

    if (!itemModelNumber.trim()) {
      toast.error("Please enter model number");
      return false;
    }

    if (!masterCategoryId) {
      toast.error("Please select a master category");
      return false;
    }

    if (!categoryId) {
      toast.error("Please select a category");
      return false;
    }

    if (!subcategoryId) {
      toast.error("Please select a sub category");
      return false;
    }

    if (!brandId) {
      toast.error("Please select product brand");
      return false;
    }

    if (!usesCompatibilityMapping && !modelId) {
      toast.error("Please select model");
      return false;
    }

    if (usesVariantConfiguration) {
      const hasConfiguredVariant = variant.some((item) =>
        hasMeaningfulVariantData(item)
      );

      if (!hasConfiguredVariant) {
        toast.error("Add at least one variant");
        return false;
      }

      const invalidVariant = variant.some((item) => {
        if (!hasMeaningfulVariantData(item)) return false;

        return item.attributes.some((attribute) => {
          const hasPartial = attribute.label.trim() || attribute.value.trim();
          if (!hasPartial) return false;
          return !(attribute.label.trim() && attribute.value.trim());
        });
      });

      if (invalidVariant) {
        toast.error("Each variant attribute must have both label and value");
        return false;
      }

      const invalidVariantInfo = variant.some((item) => {
        if (!hasFilledProductInfoSections(item.productInformation)) {
          return false;
        }

        return !validateProductInfoSections(
          item.productInformation,
          "Each variant product information"
        );
      });

      if (invalidVariantInfo) {
        return false;
      }
    }

    if (usesProductMediaInformation) {
      if (
        !validateProductInfoSections(productInformation, "Each product information")
      ) {
        return false;
      }

      const hasProductMediaOrInfo =
        productImages.length > 0 ||
        productVideos.length > 0 ||
        hasFilledProductInfoSections(productInformation);

      if (!hasProductMediaOrInfo) {
        toast.error("Add product images, videos, or product information for this option");
        return false;
      }
    }

    if (usesVariantCompatibilityMapping) {
      const missingVariantCompatibilityIndex = variant.findIndex(
        (item) =>
          hasMeaningfulVariantData(item) &&
          !hasEnabledCompatibilityRows(item.compatibility)
      );

      if (missingVariantCompatibilityIndex >= 0) {
        toast.error(
          `Select at least one compatible brand for Variant ${
            missingVariantCompatibilityIndex + 1
          }`
        );
        return false;
      }

      const invalidVariantCompatibilityIndex = variant.findIndex(
        (item) =>
          hasMeaningfulVariantData(item) &&
          item.compatibility.some((row) => row.enabled && row.modelId.length === 0)
      );

      if (invalidVariantCompatibilityIndex >= 0) {
        toast.error(
          `Each selected compatible brand must have at least one model in Variant ${
            invalidVariantCompatibilityIndex + 1
          }`
        );
        return false;
      }
    }

    if (usesProductCompatibilityMapping) {
      const hasCompatibleBrand = compatibilityRows.some((row) => row.enabled);

      if (!hasCompatibleBrand) {
        toast.error("Select at least one compatible brand");
        return false;
      }

      const invalidCompatibility = compatibilityRows.some(
        (row) => row.enabled && row.modelId.length === 0
      );

      if (invalidCompatibility) {
        toast.error("Each selected compatible brand must have at least one model");
        return false;
      }
    }

    return true;
  }

  function buildPayload(): ProductPayload {
    const filledProductInformation = buildFilledProductInformation(productInformation);

    return {
      configurationMode: categoryMappingMode,
      itemName: itemName.trim(),
      itemModelNumber: itemModelNumber.trim(),
      itemKey: itemKeyPreview,
      description: description.trim(),
      searchKeys: manualSearchKeys,
      masterCategoryId,
      categoryId,
      subcategoryId,
      brandId: brandId as unknown as ProductPayload["brandId"],
      modelId: (usesCompatibilityMapping ? null : modelId) as unknown as ProductPayload["modelId"],
      images: usesProductMediaInformation ? buildMediaPayload(productImages) : [],
      videos: usesProductMediaInformation ? buildMediaPayload(productVideos) : [],
      compatible: usesVariantCompatibilityMapping
        ? buildMergedCompatibilityPayload(
            variant.filter((item) => hasMeaningfulVariantData(item))
          )
        : usesProductCompatibilityMapping
          ? buildCompatibilityPayload(compatibilityRows)
        : [],
      variant: usesVariantConfiguration
        ? variant
            .filter((item) => hasMeaningfulVariantData(item))
            .map((item) => ({
              title: item.title.trim() || buildVariantTitle(item.attributes),
              description: item.description.trim(),
              attributes: item.attributes
                .filter(
                  (attribute) => attribute.label.trim() && attribute.value.trim()
                )
                .map((attribute) => ({
                  label: attribute.label.trim(),
                  value: attribute.value.trim(),
                })),
              images: buildMediaPayload(item.images),
              videos: buildMediaPayload(item.videos),
              compatible: usesVariantCompatibilityMapping
                ? buildCompatibilityPayload(item.compatibility)
                : [],
              productInformation: buildFilledProductInformation(
                item.productInformation
              ),
              isActive: item.isActive,
            }))
        : [],
      productInformation: usesProductMediaInformation ? filledProductInformation : [],
      isActive,
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const activeVariantItems = usesVariantConfiguration
        ? variant.filter((item) => hasMeaningfulVariantData(item))
        : [];
      const payload = buildPayload();
      const formData = buildProductFormData(
        payload,
        activeVariantItems,
        usesProductMediaInformation ? productImages : [],
        usesProductMediaInformation ? productVideos : []
      );

      const response = isEditMode
        ? await apiClient.put<ApiResponse<unknown>>(
            SummaryApi.product_update.url(productId),
            formData
          )
        : await apiClient.post<ApiResponse<unknown>>(
            SummaryApi.product_create.url,
            formData
          );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            `Failed to ${isEditMode ? "update" : "create"} product`
        );
      }

      toast.success(
        response.data?.message ||
          `Product ${isEditMode ? "updated" : "created"} successfully`
      );
      router.push(`${basePath}/product/list`);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          `Failed to ${isEditMode ? "update" : "create"} product`
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  const dropdownConfigs: DropdownConfig[] = [
    {
      key: "masterCategoryId",
      label: "Master Category",
      placeholder: "Select master category",
      icon: FolderTree,
      options: masterCategories,
      value: masterCategoryId,
      search: searchMap.masterCategoryId,
      open: openDropdown === "masterCategoryId",
      loading: loadingMasterCategories,
    },
    {
      key: "categoryId",
      label: "Category",
      placeholder: "Select category",
      icon: Layers3,
      options: categories,
      value: categoryId,
      search: searchMap.categoryId,
      open: openDropdown === "categoryId",
      loading: loadingCategories,
      disabled: !masterCategoryId,
    },
    {
      key: "subcategoryId",
      label: "Subcategory",
      placeholder: "Select subcategory",
      icon: Layers3,
      options: subcategories,
      value: subcategoryId,
      search: searchMap.subcategoryId,
      open: openDropdown === "subcategoryId",
      loading: loadingSubcategories,
      disabled: !categoryId,
    },
  ];

  const dropdownRefs = {
    masterCategoryId: masterCategoryDropdownRef,
    categoryId: categoryDropdownRef,
    subcategoryId: subcategoryDropdownRef,
    brandId: brandDropdownRef,
    modelId: modelDropdownRef,
  };

  const searchInputRefs = {
    masterCategoryId: masterCategorySearchInputRef,
    categoryId: categorySearchInputRef,
    subcategoryId: subcategorySearchInputRef,
    brandId: brandSearchInputRef,
    modelId: modelSearchInputRef,
  };

  const categoryMappingOptions: Array<{
    value: CategoryMappingMode;
    title: string;
    description: string;
    icon: typeof Boxes;
  }> = [
    {
      value: "variant",
      title: "Variant",
      description:
        "Use Variant Title,   , Variant Images & Media, and Variant Product Information.",
      icon: Boxes,
    },
    {
      value: "variantCompatibility",
      title: "Variant & Compatible Brands & Models",
      description:
        "Use Variant Title, Variant Product Description, Variant Images & Media, Variant Product Information, and per-variant compatible brands and models.",
      icon: ShieldCheck,
    },
    {
      value: "productMediaInfoCompatibility",
      title:
        "Product Description & Product Images & Product Information & Compatible Brands & Models",
      description:
        "Use Product Description, Product Images & Media, and Product Information with compatible brands and models.",
      icon: ShieldCheck,
    },
    {
      value: "productMediaInfo",
      title: "Product Description & Product Images & Product Information",
      description:
        "Use Product Description, Product Images & Media, and Product Information without creating variants.",
      icon: Info,
    },
  ];

  if (isEditMode && loadingExistingProduct) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-80 w-full max-w-7xl items-center justify-center">
          <div className="premium-card-solid flex w-full max-w-xl items-center gap-4 rounded-[28px] p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Loading Product
              </h2>
              <p className="text-sm text-slate-500">
                Fetching product details so you can update the configuration.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <section className="premium-hero premium-glow relative overflow-hidden rounded-[30px] px-4 py-4 md:px-5 md:py-5">
          <div className="premium-grid-bg premium-bg-animate opacity-40" />
          <div className="premium-bg-overlay" />

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">
                <Sparkles className="h-3.5 w-3.5" />
                Product Management
              </span>

              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-4xl">
                  {isEditMode ? "Edit Product" : "Create Product"}
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-white/80 md:text-sm">
                  {isEditMode
                    ? "Update product details, configuration mode, compatibility mapping, and shared media without losing existing data."
                    : "Create one product with the right setup for variants, compatibility mapping, or shared product media and information."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="product-create-form-compact space-y-4">
          <section className="premium-card-solid rounded-3xl p-3 md:p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <PackagePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Product Basics
                </h2>
                <p className="text-sm text-slate-500">
                  Enter the base product details here, then choose whether this
                  item uses variants, compatibility mapping, or shared media and
                  product information.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TopLabelInput
                label="Product Name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. OnePlus Nord 5"
                disabled={submitting}
                required
              />

              <TopLabelInput
                label="Model Number"
                value={itemModelNumber}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setItemModelNumber(nextValue);
                  setModelNumberManuallyEdited(
                    Boolean(nextValue.trim()) &&
                      nextValue.trim() !== autoItemModelNumber
                  );
                }}
                placeholder="Auto generated from product name"
                disabled={submitting}
                required
                hint="Auto generated from product name. You can still edit it if needed."
              />

              <TopLabelInput
                label="Item Key"
                value={itemKey}
                onChange={(e) => setItemKey(e.target.value)}
                placeholder="Auto generated from name"
                disabled={submitting}
              />

              <div className="space-y-1.5">
                <TopLabelInput
                  label="Search Keys"
                  value={searchKeysInput}
                  onChange={(e) => setSearchKeysInput(e.target.value)}
                  placeholder="Add custom search keys, separated by commas"
                  disabled={submitting}
                  hint="Enter only the custom search keys you want to store for this product."
                />

                {manualSearchKeys.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {manualSearchKeys.map((key) => (
                      <span
                        key={key}
                        className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="premium-card-solid rounded-3xl p-3 md:p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <FolderTree className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">Category Mapping</h2>
                <p className="text-sm text-slate-500">
                  Select the product hierarchy and primary brand/model.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dropdownConfigs.map((config) => (
                <ProductDropdown
                  key={config.key}
                  config={config}
                  onToggle={handleToggleDropdown}
                  onSearchChange={handleSearchChange}
                  onSelect={handleSelectDropdownValue}
                  dropdownRef={dropdownRefs[config.key]}
                  searchInputRef={searchInputRefs[config.key]}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SearchableSingleSelectCard
                title="Brands"
                description="Select one brand for this product."
                icon={Tags}
                iconClassName="bg-violet-100 text-violet-600"
                label="Brand"
                placeholder="Select brand"
                disabled={submitting}
                loading={loadingBrands}
                options={filteredBrandOptions.map((item) => ({
                  _id: item._id,
                  name: item.name,
                }))}
                value={brandId}
                selectedName={selectedBrandName}
                search={searchMap.brandId}
                open={openDropdown === "brandId"}
                emptyText="No brands found"
                onToggle={() => handleToggleDropdown("brandId")}
                onSearchChange={(value) => handleSearchChange("brandId", value)}
                onSelect={(value) => {
                  handlePrimaryBrandChange(value);
                  handleSearchChange("brandId", "");
                  setOpenDropdown(null);
                }}
                dropdownRef={brandDropdownRef}
                searchInputRef={brandSearchInputRef}
              />

              <SearchableSingleSelectCard
                title="Models"
                description="Select one model from the chosen brand."
                icon={Cpu}
                iconClassName="bg-sky-100 text-sky-600"
                label="Model"
                placeholder={brandId ? "Select model" : "Select brand first"}
                disabled={submitting || !brandId}
                loading={loadingModels}
                options={filteredPrimaryModelOptions.map((item) => ({
                  _id: item._id,
                  name: item.name,
                }))}
                value={modelId}
                selectedName={selectedModelName}
                search={searchMap.modelId}
                open={openDropdown === "modelId"}
                emptyText={brandId ? "No models found" : "Select brand to choose model"}
                onToggle={() => {
                  if (!brandId) return;
                  handleToggleDropdown("modelId");
                }}
                onSearchChange={(value) => handleSearchChange("modelId", value)}
                onSelect={(value) => {
                  handlePrimaryModelChange(value);
                  handleSearchChange("modelId", "");
                  setOpenDropdown(null);
                }}
                dropdownRef={modelDropdownRef}
                searchInputRef={modelSearchInputRef}
              />
            </div>
          </section>

          {usesProductMediaInformation ? (
            <section className="premium-card-solid rounded-3xl p-3 md:p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <Info className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Product Description
                  </h2>
                  <p className="text-sm text-slate-500">
                    {usesCompatibilityMapping
                      ? "Add a shared product summary for product-level media, information, and compatibility details."
                      : "Add a shared product summary for product-level media and information."}
                  </p>
                </div>
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-cyan-50/60 p-4 shadow-sm">
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write a simple product description, highlights, use case, or selling summary..."
                  className="premium-textarea min-h-36 w-full rounded-2xl border-slate-200 bg-white/90"
                  disabled={submitting}
                  maxLength={1200}
                />

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <p>
                    This description is stored with the product and can be reused
                    in future product views or listings.
                  </p>
                  <span className="shrink-0 font-medium text-slate-400">
                    {description.trim().length}/1200
                  </span>
                </div>
              </div>
            </section>
          ) : null}

          <section className="premium-card-solid rounded-3xl p-3 md:p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Layers3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Configuration Option
                </h2>
                <p className="text-sm text-slate-500">
                  Choose how product details should be stored before entering
                  the matching description, media, and compatibility data.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {categoryMappingOptions.map((option) => {
                const Icon = option.icon;
                const selected = categoryMappingMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCategoryMappingMode(option.value)}
                    className={`rounded-3xl border p-4 text-left transition ${
                      selected
                        ? "border-violet-500 bg-violet-50 shadow-[0_18px_40px_rgba(139,92,246,0.14)]"
                        : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50"
                    }`}
                    disabled={submitting}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                          selected
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <span
                        className={`inline-flex h-5 w-5 shrink-0 rounded-full border-2 ${
                          selected
                            ? "border-violet-600 bg-violet-600"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        <span className="m-auto h-2 w-2 rounded-full bg-white" />
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {option.title}
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {usesVariantConfiguration ? (
            <section className="premium-card-solid rounded-3xl p-3 md:p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Boxes className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {usesVariantCompatibilityMapping
                      ? "Variants & Compatible Brands & Models"
                      : "Variants"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {usesVariantCompatibilityMapping
                      ? "Each variant can have its own title, description, attributes, media, product information, and compatible brands and models."
                      : "Each variant can have its own title, description, attributes, media, and product information."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addVariantRow}
                className="premium-btn-secondary h-10 gap-1.5 px-3.5"
                disabled={submitting}
              >
                <Plus className="h-4 w-4" />
                Add Variant
              </button>
            </div>

            <div className="space-y-4">
              {variant.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Variant {index + 1}
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        {item.title.trim() || "New Variant"}
                      </h3>
                      {usesVariantCompatibilityMapping ? (
                        <p className="mt-1 text-sm text-slate-500">
                          Variant {index + 1} compatible brands & models
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeVariantRow(item.id)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-rose-600 transition hover:bg-rose-100"
                      disabled={submitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="premium-label">Variant Title</label>
                      <input
                        value={item.title}
                        onChange={(e) =>
                          updateVariant(item.id, { title: e.target.value })
                        }
                        placeholder="Auto generated from attributes"
                        className="premium-input"
                        disabled={submitting}
                      />
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-amber-50/50 p-3 shadow-sm">
                      <label className="premium-label">
                        Variant Product Description
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          updateVariant(item.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Write a short description for this variant..."
                        className="premium-textarea min-h-28 w-full resize-none rounded-2xl border-slate-200 bg-white/90"
                        disabled={submitting}
                        maxLength={1200}
                      />

                      <div className="mt-2 flex justify-end text-xs font-medium text-slate-400">
                        {item.description.trim().length}/1200
                      </div>
                    </div>

                    <div>
                      <label className="premium-label">Variant Attributes</label>
                      <VariantAttributesEditor
                        attributes={item.attributes}
                        disabled={submitting}
                        onChangeLabel={(attributeId, value) =>
                          updateVariantAttributeLabel(item.id, attributeId, value)
                        }
                        onChangeValue={(attributeId, value) =>
                          updateVariantAttributeValue(item.id, attributeId, value)
                        }
                        onAddAttribute={() => addVariantAttribute(item.id)}
                        onRemoveAttribute={(attributeId) =>
                          removeVariantAttribute(item.id, attributeId)
                        }
                        resolveOptions={getPresetValueOptions}
                        allowCustom={(label) => isColourField(label)}
                        resolveCustomOption={(label, value) =>
                          resolvePresetValueOption(label, value)
                        }
                      />
                    </div>

                    <div>
                      <label className="premium-label">Variant Images & Media</label>
                      <VariantMediaUploader
                        inputId={`variant-media-${item.id}`}
                        images={item.images}
                        videos={item.videos}
                        accept={PRODUCT_MEDIA_ACCEPT}
                        disabled={submitting}
                        onFilesSelected={(files) => addVariantMedia(item.id, files)}
                        onRemove={(mediaKind, itemId) =>
                          removeVariantMedia(item.id, mediaKind, itemId)
                        }
                      />
                    </div>

                    <div>
                      <label className="premium-label">Variant Product Information</label>
                      <VariantProductInformationEditor
                        sections={item.productInformation}
                        disabled={submitting}
                        onChangeSectionTitle={(sectionIndex, value) =>
                          updateVariantProductInfoSectionTitle(
                            item.id,
                            sectionIndex,
                            value
                          )
                        }
                        onAddSection={() => addVariantProductInfoSection(item.id)}
                        onRemoveSection={(sectionIndex) =>
                          removeVariantProductInfoSection(item.id, sectionIndex)
                        }
                        onAddField={(sectionIndex) =>
                          addVariantProductInfoField(item.id, sectionIndex)
                        }
                        onRemoveField={(sectionIndex, fieldIndex) =>
                          removeVariantProductInfoField(
                            item.id,
                            sectionIndex,
                            fieldIndex
                          )
                        }
                        onChangeField={(sectionIndex, fieldIndex, key, value) =>
                          updateVariantProductInfoField(
                            item.id,
                            sectionIndex,
                            fieldIndex,
                            key,
                            value
                          )
                        }
                        resolveOptions={getPresetValueOptions}
                        allowCustomValue={(label) => isColourField(label)}
                        resolveCustomValueOption={(label, value) =>
                          resolvePresetValueOption(label, value)
                        }
                      />
                    </div>

                    {usesVariantCompatibilityMapping ? (
                      <div>
                        <label className="premium-label">
                          Variant {index + 1} Compatible Brands & Models
                        </label>
                        <CompatibilityRowsEditor
                          rows={item.compatibility}
                          brandMap={brandMap}
                          modelMapByBrand={modelMapByBrand}
                          disabled={submitting}
                          onUpdateRow={(rowId, patch) =>
                            updateVariantCompatibilityRow(item.id, rowId, patch)
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            </section>
          ) : null}

          {usesProductMediaInformation ? (
            <section className="premium-card-solid rounded-3xl p-3 md:p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-600">
                  <Info className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Product Images & Media
                  </h2>
                  <p className="text-sm text-slate-500">
                    Use shared product media and common details when this product
                    does not need separate variant cards.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
                <div>
                  <label className="premium-label">Product Images & Media</label>
                  <VariantMediaUploader
                    inputId="product-media"
                    images={productImages}
                    videos={productVideos}
                    accept={PRODUCT_MEDIA_ACCEPT}
                    disabled={submitting}
                    title="Upload product images & media"
                    description="Drag and drop or click to browse shared PNG, JPG, JPEG, WEBP, MP4, MOV, or WEBM files."
                    emptyStateText="Shared product media previews will appear here after upload."
                    onFilesSelected={addProductMedia}
                    onRemove={removeProductMedia}
                  />
                </div>

                <div>
                  <label className="premium-label">Product Information</label>
                  <VariantProductInformationEditor
                    sections={productInformation}
                    disabled={submitting}
                    onChangeSectionTitle={updateProductInfoSectionTitle}
                    onAddSection={addProductInfoSection}
                    onRemoveSection={removeProductInfoSection}
                    onAddField={addProductInfoField}
                    onRemoveField={removeProductInfoField}
                    onChangeField={updateProductInfoField}
                    resolveOptions={getPresetValueOptions}
                    allowCustomValue={(label) => isColourField(label)}
                    resolveCustomValueOption={(label, value) =>
                      resolvePresetValueOption(label, value)
                    }
                  />
                </div>
              </div>
            </section>
          ) : null}

          {usesProductCompatibilityMapping ? (
            <section className="premium-card-solid rounded-3xl p-3 md:p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Compatible Brands & Models
                </h2>
                <p className="text-sm text-slate-500">
                  Select supported brands and models for compatibility-driven products.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <TopLabelInput
                label="Compatibility"
                value={compatibilityBrandSearch}
                onChange={(e) => setCompatibilityBrandSearch(e.target.value)}
                placeholder="Search compatible brand"
                disabled={submitting}
              />
            </div>

            <CompatibilityRowsEditor
              rows={paginatedCompatibilityRows}
              brandMap={brandMap}
              modelMapByBrand={modelMapByBrand}
              disabled={submitting}
              emptyStateText="No compatible brands matched your search."
              onUpdateRow={updateCompatibilityRow}
            />
            </section>
          ) : null}

          <section className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={submitting}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm font-medium text-slate-800">
                Product active
              </span>
            </label>

            <button
              type="submit"
              className="premium-btn-primary h-11 gap-2 px-5"
              disabled={submitting}
            >
              <Save className="h-4 w-4" />
              {submitting
                ? "Saving..."
                : isEditMode
                  ? "Update Product"
                  : "Create Product"}
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}
