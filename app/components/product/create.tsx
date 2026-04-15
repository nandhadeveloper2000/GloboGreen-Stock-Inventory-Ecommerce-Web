"use client";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Cpu,
  FolderTree,
  Info,
  Layers3,
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
  ROWS_PER_PAGE,
  PRODUCT_IMAGE_ACCEPT,
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
  resolveMobileProductPreset,
  resolvePresetValueOption,
  toModelArray,
  toOptionArray,
  validateProductImageFile,
} from "./create-config";
import {
  ModelCheckboxSelector,
  PresetValueDropdown,
  ProductDropdown,
  VariantAttributesEditor,
  VariantImageUploader,
  VariantProductInformationEditor,
} from "./create-fields";
import type {
  ApiResponse,
  CompatibilityTableRow,
  DropdownConfig,
  ModelItem,
  OptionItem,
  ProductImageItem,
  ProductInformationField,
  ProductInformationSection,
  ProductPayload,
  VariantItem,
} from "./create-types";

export default function CreateProductPage() {
  const router = useRouter();
  const { role } = useAuth();

  const basePath = getRoleBasePath(role);

  const [submitting, setSubmitting] = useState(false);

  const [itemName, setItemName] = useState("");
  const [itemModelNumber, setItemModelNumber] = useState("");
  const [itemKey, setItemKey] = useState("");
  const [searchKeysInput, setSearchKeysInput] = useState("");
  const [searchKeys, setSearchKeys] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const [masterCategories, setMasterCategories] = useState<OptionItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [subcategories, setSubcategories] = useState<OptionItem[]>([]);
  const [productTypes, setProductTypes] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);

  const [masterCategoryId, setMasterCategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");

  const [loadingMasterCategories, setLoadingMasterCategories] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingProductTypes, setLoadingProductTypes] = useState(false);
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
    productTypeId: "",
    brandId: "",
    modelId: "",
  });

  const [variant, setVariant] = useState<VariantItem[]>([createVariantItem()]);
  const [productInformation, setProductInformation] = useState<
    ProductInformationSection[]
  >([{ ...initialProductInfoSection }]);

  const [compatibilityRows, setCompatibilityRows] = useState<
    CompatibilityTableRow[]
  >([]);
  const [compatibilityBrandSearch, setCompatibilityBrandSearch] = useState("");
  const [compatibilityCurrentPage, setCompatibilityCurrentPage] = useState(1);

  const variantRef = useRef<VariantItem[]>([]);

  const masterCategoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const subcategoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const productTypeDropdownRef = useRef<HTMLDivElement | null>(null);
  const brandDropdownRef = useRef<HTMLDivElement | null>(null);
  const modelDropdownRef = useRef<HTMLDivElement | null>(null);

  const masterCategorySearchInputRef = useRef<HTMLInputElement | null>(null);
  const categorySearchInputRef = useRef<HTMLInputElement | null>(null);
  const subcategorySearchInputRef = useRef<HTMLInputElement | null>(null);
  const productTypeSearchInputRef = useRef<HTMLInputElement | null>(null);
  const brandSearchInputRef = useRef<HTMLInputElement | null>(null);
  const modelSearchInputRef = useRef<HTMLInputElement | null>(null);

  const autoItemKey = useMemo(() => {
    const combined = [itemName, itemModelNumber].filter(Boolean).join(" ");
    return keyOf(combined);
  }, [itemName, itemModelNumber]);

  const itemKeyPreview = itemKey.trim() ? keyOf(itemKey) : autoItemKey;

  const selectedProductBrandName = useMemo(() => {
    return brands.find((item) => item._id === brandId)?.name || "";
  }, [brands, brandId]);

  const selectedProductTypeName = useMemo(() => {
    return productTypes.find((item) => item._id === productTypeId)?.name || "";
  }, [productTypes, productTypeId]);

  const selectedProductTypePreset = useMemo(() => {
    return resolveMobileProductPreset(selectedProductTypeName);
  }, [selectedProductTypeName]);

  const filteredPrimaryModelOptions = useMemo(() => models, [models]);

  const brandMap = useMemo(() => {
    const map = new Map<string, OptionItem>();
    brands.forEach((item) => map.set(item._id, item));
    return map;
  }, [brands]);

  const modelMap = useMemo(() => {
    const map = new Map<string, ModelItem>();
    models.forEach((item) => map.set(item._id, item));
    return map;
  }, [models]);

  const selectedPrimaryModelName = useMemo(() => {
    return modelMap.get(modelId)?.name || "";
  }, [modelMap, modelId]);

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

  const filteredCompatibilityRows = useMemo(() => {
    const q = compatibilityBrandSearch.trim().toLowerCase();
    if (!q) return compatibilityRows;

    return compatibilityRows.filter((row) => {
      const brandName = brandMap.get(row.brandId)?.name || "";
      return brandName.toLowerCase().includes(q);
    });
  }, [compatibilityRows, compatibilityBrandSearch, brandMap]);

  const selectedCompatibilitySummary = useMemo(() => {
    return compatibilityRows
      .filter((row) => row.enabled)
      .map((row) => {
        const brandName = brandMap.get(row.brandId)?.name || "-";
        const selectedModels = row.modelId
          .map((id) => modelMap.get(id)?.name)
          .filter(Boolean) as string[];

        return {
          brandId: row.brandId,
          brandName,
          models: selectedModels,
          isActive: row.isActive,
        };
      });
  }, [compatibilityRows, brandMap, modelMap]);

  const generatedSearchKeys = useMemo(() => {
    return buildAutoSearchKeys({
      itemName,
      itemModelNumber,
      productTypeName: selectedProductTypeName,
      brandName: selectedProductBrandName,
      modelName: selectedPrimaryModelName,
      compatibleItems: selectedCompatibilitySummary.map((item) => ({
        brandName: item.brandName,
        models: item.models,
      })),
      variantItems: variant.map((item) => ({
        title: item.title,
        attributes: item.attributes.map((attribute) => ({
          label: attribute.label,
          value: attribute.value,
        })),
      })),
    });
  }, [
    itemModelNumber,
    itemName,
    selectedCompatibilitySummary,
    selectedPrimaryModelName,
    selectedProductBrandName,
    selectedProductTypeName,
    variant,
  ]);

  const combinedSearchKeys = useMemo(() => {
    return Array.from(
      new Set([...generatedSearchKeys, ...normalizeSearchKeys(searchKeysInput)])
    );
  }, [generatedSearchKeys, searchKeysInput]);

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

  function revokeVariantImages(items: VariantItem[]) {
    items.forEach((item) => {
      item.images.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    });
  }

  const fetchInitialOptions = useEffectEvent(async () => {
    await Promise.all([
      fetchMasterCategories(),
      fetchBrandsAndSeedCompatibility(),
      fetchModels(),
    ]);
  });

  useEffect(() => {
    void fetchInitialOptions();
  }, []);

  useEffect(() => {
    variantRef.current = variant;
  }, [variant]);

  useEffect(() => {
    return () => {
      variantRef.current.forEach((item) => {
        item.images.forEach((image) => {
          URL.revokeObjectURL(image.previewUrl);
        });
      });
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInside = [
        masterCategoryDropdownRef,
        categoryDropdownRef,
        subcategoryDropdownRef,
        productTypeDropdownRef,
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
    } else if (openDropdown === "productTypeId") {
      inputRef = productTypeSearchInputRef;
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
  }, [masterCategoryId]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId("");
      return;
    }

    void fetchSubcategories(categoryId);
  }, [categoryId]);

  useEffect(() => {
    if (!subcategoryId) {
      setProductTypes([]);
      setProductTypeId("");
      return;
    }

    void fetchProductTypes(subcategoryId);
  }, [subcategoryId]);

  useEffect(() => {
    if (!selectedProductTypePreset) {
      revokeVariantImages(variantRef.current);
      setVariant([createVariantItem()]);
      setProductInformation([{ ...initialProductInfoSection }]);
      return;
    }

    revokeVariantImages(variantRef.current);

    const sections = buildPresetProductInfoSections(
      selectedProductTypePreset.sections,
      selectedProductTypePreset.itemTypeName
    );

    const presetVariants = buildPresetVariantRows(
      selectedProductTypePreset.variantLabels
    ).map((item) => ({
      ...item,
      productInformation: cloneProductInfoSections(sections),
    }));

    setVariant(presetVariants);
    setProductInformation(sections);
  }, [selectedProductTypePreset]);

  useEffect(() => {
    setCompatibilityCurrentPage(1);
  }, [compatibilityBrandSearch]);

  useEffect(() => {
    const stillValid = filteredPrimaryModelOptions.some(
      (item) => item._id === modelId
    );

    if (modelId && !stillValid) {
      setModelId("");
    }
  }, [filteredPrimaryModelOptions, modelId]);

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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load master categories"));
      setMasterCategories([]);
    } finally {
      setLoadingMasterCategories(false);
    }
  }

  async function fetchCategories(selectedMasterCategoryId: string) {
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
      setCategoryId("");
      setSubcategoryId("");
      setProductTypeId("");
      setSubcategories([]);
      setProductTypes([]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load categories"));
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function fetchSubcategories(selectedCategoryId: string) {
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
      setSubcategoryId("");
      setProductTypeId("");
      setProductTypes([]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load sub categories"));
      setSubcategories([]);
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function fetchProductTypes(selectedSubcategoryId: string) {
    try {
      setLoadingProductTypes(true);

      const res = await apiClient.get<ApiResponse<OptionItem[]>>(
        SummaryApi.product_type_list.url
      );

      const rows = filterActive(
        toOptionArray(res.data?.data || res.data?.productTypes)
      ).filter(
        (item: OptionItem & { subCategoryId?: string | { _id?: string } }) => {
          const value = item.subCategoryId;
          if (typeof value === "string") return value === selectedSubcategoryId;
          return value?._id === selectedSubcategoryId;
        }
      );

      setProductTypes(rows);
      setProductTypeId("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load product types"));
      setProductTypes([]);
    } finally {
      setLoadingProductTypes(false);
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
      setCompatibilityRows(
        activeBrands.map((brand) => ({
          rowId: brand._id,
          brandId: brand._id,
          enabled: false,
          modelId: [],
          notes: "",
          isActive: true,
        }))
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load brands"));
      setBrands([]);
      setCompatibilityRows([]);
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

      setModels(filterActive(toModelArray(res.data?.data || res.data?.models)));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load models"));
      setModels([]);
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
    if (key === "productTypeId") setProductTypeId(value);
    if (key === "brandId") setBrandId(value);
    if (key === "modelId") setModelId(value);

    setSearchMap((prev) => ({
      ...prev,
      [key]: "",
    }));

    setOpenDropdown(null);
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

  function addVariantRow() {
    const presetLabels =
      selectedProductTypePreset?.variantLabels?.length
        ? selectedProductTypePreset.variantLabels
        : [];

    const defaultProductInfo =
      selectedProductTypePreset && productInformation.length
        ? cloneProductInfoSections(productInformation)
        : [{ ...initialProductInfoSection }];

    setVariant((prev) => [
      ...prev,
      {
        ...createVariantItem(presetLabels),
        productInformation: defaultProductInfo,
      },
    ]);
  }

  function removeVariantRow(variantId: string) {
    setVariant((prev) => {
      if (prev.length === 1) {
        revokeVariantImages(prev);
        return [createVariantItem()];
      }

      const current = prev.find((item) => item.id === variantId);
      current?.images.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });

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

        const existingSignatures = new Set(
          item.images.map(
            (image) => `${image.name}-${image.size}-${image.file.lastModified}`
          )
        );

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

    if (image) {
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

  function handleGenerateModelNumber() {
    const source = [itemName.trim(), selectedProductBrandName, selectedPrimaryModelName]
      .filter(Boolean)
      .join(" ");

    if (source) {
      setItemModelNumber(keyOf(source));
      return;
    }

    setItemModelNumber(`prod-${Math.floor(100000 + Math.random() * 900000)}`);
  }

  function handleGenerateSearchKeys() {
    const customKeys = normalizeSearchKeys(searchKeysInput);
    const nextKeys = Array.from(
      new Set([...searchKeys, ...generatedSearchKeys, ...customKeys])
    );

    setSearchKeys(nextKeys);
    setSearchKeysInput("");
  }

  function validateProductInfoSections(
    sections: ProductInformationSection[],
    errorPrefix: string
  ) {
    const invalid = sections.some((section) => {
      const hasPartialSection =
        section.title.trim() ||
        section.fields.some((field) => field.label.trim() || field.value.trim());

      if (!hasPartialSection) return false;
      if (!section.title.trim()) return true;

      return section.fields.some(
        (field) =>
          Boolean(field.label.trim() || field.value.trim()) &&
          !isFilledInfoField(field)
      );
    });

    if (invalid) {
      toast.error(`${errorPrefix} section must have a title and complete fields`);
      return false;
    }

    return true;
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

    if (!productTypeId) {
      toast.error("Please select a product type");
      return false;
    }

    if (!brandId) {
      toast.error("Please select a brand");
      return false;
    }

    if (!modelId) {
      toast.error("Please select a model");
      return false;
    }

    const invalidVariant = variant.some((item) => {
      const hasSomeData =
        item.title.trim() ||
        item.attributes.some((attribute) => attribute.label.trim() || attribute.value.trim()) ||
        item.images.length > 0 ||
        item.productInformation.some(
          (section) =>
            section.title.trim() ||
            section.fields.some((field) => field.label.trim() || field.value.trim())
        );

      if (!hasSomeData) return false;

      const hasInvalidAttribute = item.attributes.some((attribute) => {
        const hasPartial = attribute.label.trim() || attribute.value.trim();
        if (!hasPartial) return false;
        return !(attribute.label.trim() && attribute.value.trim());
      });

      return hasInvalidAttribute;
    });

    if (invalidVariant) {
      toast.error("Each variant attribute must have both label and value");
      return false;
    }

    if (!validateProductInfoSections(productInformation, "Each product information")) {
      return false;
    }

    const invalidVariantInfo = variant.some((item) => {
      const hasAnyInfo = item.productInformation.some(
        (section) =>
          section.title.trim() ||
          section.fields.some((field) => field.label.trim() || field.value.trim())
      );

      if (!hasAnyInfo) return false;

      return !validateProductInfoSections(
        item.productInformation,
        "Each variant product information"
      );
    });

    if (invalidVariantInfo) {
      return false;
    }

    const invalidCompatibility = compatibilityRows.some(
      (row) => row.enabled && row.modelId.length === 0
    );

    if (invalidCompatibility) {
      toast.error("Each selected compatible brand must have at least one model");
      return false;
    }

    return true;
  }

  function buildPayload(): ProductPayload {
    return {
      itemName: itemName.trim(),
      itemModelNumber: itemModelNumber.trim(),
      itemKey: itemKeyPreview,
      searchKeys: searchKeys.length ? searchKeys : combinedSearchKeys,
      masterCategoryId,
      categoryId,
      subcategoryId,
      productTypeId,
      brandId,
      modelId,
      compatible: compatibilityRows
        .filter((row) => row.enabled)
        .map((row) => ({
          brandId: row.brandId,
          modelId: row.modelId,
          notes: row.notes.trim(),
          isActive: row.isActive,
        })),
      variant: variant
        .filter((item) => {
          return (
            item.title.trim() ||
            item.attributes.some((attribute) => attribute.label.trim() || attribute.value.trim()) ||
            item.images.length > 0 ||
            item.productInformation.some(
              (section) =>
                section.title.trim() ||
                section.fields.some((field) => field.label.trim() || field.value.trim())
            )
          );
        })
        .map((item) => ({
          title: item.title.trim() || buildVariantTitle(item.attributes),
          attributes: item.attributes
            .filter((attribute) => attribute.label.trim() || attribute.value.trim())
            .map((attribute) => ({
              label: attribute.label.trim(),
              value: attribute.value.trim(),
            })),
          images: [],
          productInformation: item.productInformation
            .filter(
              (section) =>
                section.title.trim() ||
                section.fields.some(
                  (field) => field.label.trim() || field.value.trim()
                )
            )
            .map((section) => ({
              title: section.title.trim(),
              fields: section.fields
                .filter((field) => field.label.trim() || field.value.trim())
                .map((field) => ({
                  label: field.label.trim(),
                  value: field.value.trim(),
                })),
            })),
          isActive: item.isActive,
        })),
      productInformation: productInformation
        .filter(
          (section) =>
            section.title.trim() ||
            section.fields.some(
              (field) => field.label.trim() || field.value.trim()
            )
        )
        .map((section) => ({
          title: section.title.trim(),
          fields: section.fields
            .filter((field) => field.label.trim() || field.value.trim())
            .map((field) => ({
              label: field.label.trim(),
              value: field.value.trim(),
            })),
        })),
      isActive,
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = buildPayload();
      const formData = buildProductFormData(payload, variant);

      const response = await apiClient.post<ApiResponse<unknown>>(
        SummaryApi.product_create.url,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to create product");
      }

      toast.success(response.data?.message || "Product created successfully");
      router.push(`${basePath}/product/list`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create product"));
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
      label: "Sub Category",
      placeholder: "Select sub category",
      icon: Layers3,
      options: subcategories,
      value: subcategoryId,
      search: searchMap.subcategoryId,
      open: openDropdown === "subcategoryId",
      loading: loadingSubcategories,
      disabled: !categoryId,
    },
    {
      key: "productTypeId",
      label: "Product Type",
      placeholder: "Select product type",
      icon: Boxes,
      options: productTypes,
      value: productTypeId,
      search: searchMap.productTypeId,
      open: openDropdown === "productTypeId",
      loading: loadingProductTypes,
      disabled: !subcategoryId,
    },
    {
      key: "brandId",
      label: "Brand",
      placeholder: "Select brand",
      icon: Tags,
      options: brands,
      value: brandId,
      search: searchMap.brandId,
      open: openDropdown === "brandId",
      loading: loadingBrands,
    },
    {
      key: "modelId",
      label: "Model",
      placeholder: "Select model",
      icon: Cpu,
      options: filteredPrimaryModelOptions.map((item) => ({
        _id: item._id,
        name: item.name,
        isActive: item.isActive,
      })),
      value: modelId,
      search: searchMap.modelId,
      open: openDropdown === "modelId",
      loading: loadingModels,
    },
  ];

  const dropdownRefs = {
    masterCategoryId: masterCategoryDropdownRef,
    categoryId: categoryDropdownRef,
    subcategoryId: subcategoryDropdownRef,
    productTypeId: productTypeDropdownRef,
    brandId: brandDropdownRef,
    modelId: modelDropdownRef,
  };

  const searchInputRefs = {
    masterCategoryId: masterCategorySearchInputRef,
    categoryId: categorySearchInputRef,
    subcategoryId: subcategorySearchInputRef,
    productTypeId: productTypeSearchInputRef,
    brandId: brandSearchInputRef,
    modelId: modelSearchInputRef,
  };

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
                  Create Product
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-white/80 md:text-sm">
                  Create one product and keep shopper-selectable combinations
                  inside variants with their own images and product information.
                </p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="product-create-form-compact space-y-4">
          <section className="premium-card-solid rounded-[24px] p-3 md:p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <PackagePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Product Basics
                </h2>
                <p className="text-sm text-slate-500">
                  Enter the base product only. Keep colour, RAM, storage, and
                  other selectable combinations inside Variants.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="premium-label">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. OnePlus Nord 5"
                  className="premium-input"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="premium-label">
                  Model Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={itemModelNumber}
                    onChange={(e) => setItemModelNumber(e.target.value)}
                    placeholder="e.g. oneplus-nord-5"
                    className="premium-input"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateModelNumber}
                    className="premium-btn-secondary whitespace-nowrap px-4"
                    disabled={submitting}
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="premium-label">Item Key</label>
                <input
                  value={itemKey}
                  onChange={(e) => setItemKey(e.target.value)}
                  placeholder="Auto generated from name + model number"
                  className="premium-input"
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Preview: <span className="font-medium">{itemKeyPreview || "-"}</span>
                </p>
              </div>

              <div>
                <label className="premium-label">Search Keys</label>
                <div className="flex gap-2">
                  <input
                    value={searchKeysInput}
                    onChange={(e) => setSearchKeysInput(e.target.value)}
                    placeholder="Comma separated search keys"
                    className="premium-input"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateSearchKeys}
                    className="premium-btn-secondary whitespace-nowrap px-4"
                    disabled={submitting}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>

                {combinedSearchKeys.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {combinedSearchKeys.map((key) => (
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

          <section className="premium-card-solid rounded-[24px] p-3 md:p-4">
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
          </section>

          <section className="premium-card-solid rounded-[24px] p-3 md:p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Boxes className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">Variants</h2>
                  <p className="text-sm text-slate-500">
                    Each variant can have its own attributes, images, and product
                    information.
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
                  className="rounded-[24px] border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Variant {index + 1}
                      </p>
                      <h3 className="text-lg font-bold text-slate-900">
                        {item.title.trim() || "New Variant"}
                      </h3>
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
                      <label className="premium-label">Variant Images</label>
                      <VariantImageUploader
                        inputId={`variant-images-${item.id}`}
                        images={item.images}
                        accept={PRODUCT_IMAGE_ACCEPT}
                        disabled={submitting}
                        onFilesSelected={(files) => addVariantImages(item.id, files)}
                        onRemove={(imageId) => removeVariantImage(item.id, imageId)}
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
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="premium-card-solid rounded-[24px] p-3 md:p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-600">
                  <Info className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Product Information
                  </h2>
                  <p className="text-sm text-slate-500">
                    Keep common product details here. Variant-specific changes go
                    inside each variant card above.
                  </p>
                </div>
              </div>
            </div>

            <VariantProductInformationEditor
              sections={productInformation}
              disabled={submitting}
              onChangeSectionTitle={updateProductInfoSectionTitle}
              onAddSection={addProductInfoSection}
              onRemoveSection={removeProductInfoSection}
              onAddField={addProductInfoField}
              onRemoveField={removeProductInfoField}
              onChangeField={updateProductInfoField}
            />
          </section>

          <section className="premium-card-solid rounded-[24px] p-3 md:p-4">
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
              <input
                value={compatibilityBrandSearch}
                onChange={(e) => setCompatibilityBrandSearch(e.target.value)}
                placeholder="Search compatible brand"
                className="premium-input"
                disabled={submitting}
              />
            </div>

            <div className="space-y-3">
              {paginatedCompatibilityRows.map((row) => {
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
                              updateCompatibilityRow(row.rowId, {
                                enabled: e.target.checked,
                              })
                            }
                            disabled={submitting}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="font-semibold text-slate-900">
                            {brandName}
                          </span>
                        </label>

                        <textarea
                          value={row.notes}
                          onChange={(e) =>
                            updateCompatibilityRow(row.rowId, {
                              notes: e.target.value,
                            })
                          }
                          placeholder="Notes"
                          className="premium-textarea min-h-[100px]"
                          disabled={submitting || !row.enabled}
                        />
                      </div>

                      <ModelCheckboxSelector
                        options={brandModels}
                        values={row.modelId}
                        onChange={(values) =>
                          updateCompatibilityRow(row.rowId, { modelId: values })
                        }
                        disabled={!row.enabled || submitting}
                        emptyText="Enable the brand to choose models"
                        allLabel="Select all models"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
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
              {submitting ? "Saving..." : "Create Product"}
            </button>
          </section>
        </form>
      </div>
    </div>
  );
}