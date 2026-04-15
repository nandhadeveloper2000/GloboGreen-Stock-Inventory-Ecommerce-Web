import type {
  ModelItem,
  OptionItem,
  PresetValueOption,
  ProductInformationField,
  ProductInformationSection,
  ProductPayload,
  ProductPresetDefinition,
  ProductPresetSection,
  ResolvedProductTypePreset,
  VariantAttribute,
  VariantImageGroupPayload,
  VariantItem,
} from "./create-types";

export const ROWS_PER_PAGE = 5;
export const PRODUCT_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp";
export const PRODUCT_IMAGE_MAX_SIZE = 3 * 1024 * 1024;

const PRODUCT_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const ITEM_TYPE_NAME_OPTIONS = [
  "Earbuds",
  "Adapter",
  "Smartphone",
  "Wired Earphones",
  "Dual Cord Type-C Cable",
  "Tempered Glass",
];

const SMARTPHONE_RAM_OPTIONS: PresetValueOption[] = [
  { value: "2GB", label: "2 GB" },
  { value: "3GB", label: "3 GB" },
  { value: "4GB", label: "4 GB" },
  { value: "6GB", label: "6 GB" },
  { value: "8GB", label: "8 GB" },
  { value: "12GB", label: "12 GB" },
  { value: "16GB", label: "16 GB" },
];

const SMARTPHONE_STORAGE_OPTIONS: PresetValueOption[] = [
  { value: "32GB", label: "32 GB" },
  { value: "64GB", label: "64 GB" },
  { value: "128GB", label: "128 GB" },
  { value: "256GB", label: "256 GB" },
  { value: "512GB", label: "512 GB" },
  { value: "1TB", label: "1 TB" },
];

const COLOUR_OPTIONS: PresetValueOption[] = [
  { value: "Black", label: "Black", swatch: "#111827" },
  { value: "White", label: "White", swatch: "#ffffff" },
  { value: "Silver", label: "Silver", swatch: "#c0c0c0" },
  { value: "Gray", label: "Gray", swatch: "#6b7280" },
  { value: "Space Gray", label: "Space Gray", swatch: "#4b5563" },
  { value: "Blue", label: "Blue", swatch: "#2563eb" },
  { value: "Navy Blue", label: "Navy Blue", swatch: "#1e3a8a" },
  { value: "Sky Blue", label: "Sky Blue", swatch: "#38bdf8" },
  { value: "Green", label: "Green", swatch: "#16a34a" },
  { value: "Mint Green", label: "Mint Green", swatch: "#6ee7b7" },
  { value: "Teal", label: "Teal", swatch: "#0f766e" },
  { value: "Cyan", label: "Cyan", swatch: "#06b6d4" },
  { value: "Red", label: "Red", swatch: "#dc2626" },
  { value: "Maroon", label: "Maroon", swatch: "#7f1d1d" },
  { value: "Pink", label: "Pink", swatch: "#ec4899" },
  { value: "Purple", label: "Purple", swatch: "#7c3aed" },
  { value: "Lavender", label: "Lavender", swatch: "#c4b5fd" },
  { value: "Yellow", label: "Yellow", swatch: "#facc15" },
  { value: "Orange", label: "Orange", swatch: "#f97316" },
  { value: "Gold", label: "Gold", swatch: "#eab308" },
  { value: "Rose Gold", label: "Rose Gold", swatch: "#f59e9e" },
  { value: "Brown", label: "Brown", swatch: "#8b5e3c" },
  { value: "Beige", label: "Beige", swatch: "#d6c6a5" },
  {
    value: "Transparent",
    label: "Transparent",
    swatch:
      "linear-gradient(135deg, #ffffff 0%, #ffffff 50%, #cbd5e1 50%, #cbd5e1 100%)",
  },
];

const COLOUR_KEYWORD_SWATCHES: Array<{
  tokens: string[];
  swatch: string;
}> = [
  { tokens: ["black"], swatch: "#111827" },
  { tokens: ["white"], swatch: "#ffffff" },
  { tokens: ["silver"], swatch: "#c0c0c0" },
  { tokens: ["gray", "grey"], swatch: "#6b7280" },
  { tokens: ["space gray", "space grey"], swatch: "#4b5563" },
  { tokens: ["navy"], swatch: "#1e3a8a" },
  { tokens: ["blue"], swatch: "#2563eb" },
  { tokens: ["sky"], swatch: "#38bdf8" },
  { tokens: ["mint"], swatch: "#b8f2d0" },
  { tokens: ["sage"], swatch: "#9caf88" },
  { tokens: ["olive"], swatch: "#6b8e23" },
  { tokens: ["green"], swatch: "#16a34a" },
  { tokens: ["teal"], swatch: "#0f766e" },
  { tokens: ["cyan"], swatch: "#06b6d4" },
  { tokens: ["red"], swatch: "#dc2626" },
  { tokens: ["maroon"], swatch: "#7f1d1d" },
  { tokens: ["rose"], swatch: "#fb7185" },
  { tokens: ["pink"], swatch: "#ec4899" },
  { tokens: ["purple"], swatch: "#7c3aed" },
  { tokens: ["lavender"], swatch: "#c4b5fd" },
  { tokens: ["violet"], swatch: "#8b5cf6" },
  { tokens: ["yellow"], swatch: "#facc15" },
  { tokens: ["orange"], swatch: "#f97316" },
  { tokens: ["gold"], swatch: "#eab308" },
  { tokens: ["brown"], swatch: "#8b5e3c" },
  { tokens: ["beige"], swatch: "#d6c6a5" },
];

const MOBILE_PRODUCT_PRESETS: Record<string, ProductPresetDefinition> = {
  smartphone: {
    variantLabels: [
      "Colour",
      "Memory Storage Capacity",
      "Ram Memory Installed Size",
      "Style Name",
    ],
    sections: [
      {
        title: "Additional Details",
        fieldLabels: [
          "Operating System",
          "Ram Memory Installed",
          "Memory Storage Capacity",
          "Connector Type",
          "Form Factor",
          "SIM Card Slot Count",
          "Colour",
          "Sim Card Size",
          "Water Resistance Level",
          "EU Spare Part Availability Duration",
          "Product Features",
          "Biometric Security Feature",
          "Human Interface Types",
        ],
      },
      {
        title: "Battery",
        fieldLabels: ["Battery Power", "Battery Capacity"],
      },
      {
        title: "Battery Life",
        fieldLabels: [
          "Battery Average Life",
          "Phone Talk Time",
          "Battery Average Life Talk Time",
        ],
      },
      {
        title: "Camera",
        fieldLabels: [
          "Front Photo Sensor Resolution",
          "Rear Facing Camera Photo Sensor Resolution",
          "Number of Rear Facing Cameras",
          "Digital Zoom",
          "Camera Flash Type",
        ],
      },
      {
        title: "Measurements",
        fieldLabels: ["Item Weight Unit of Measure", "Item Dimensions"],
      },
      {
        title: "Display",
        fieldLabels: [
          "Screen Size Unit of Measure",
          "Resolution",
          "Display Type",
          "Maximum Display Resolution",
        ],
      },
      {
        title: "Connectivity",
        fieldLabels: [
          "Wireless Provider",
          "Cellular Technology",
          "Network Connectivity Technology",
        ],
      },
      {
        title: "Item Details",
        fieldLabels: ["Box Contents", "Item Type Name", "Unit Count"],
      },
      {
        title: "Video",
        fieldLabels: [
          "Effective Video Resolution",
          "Video Capture Resolution",
          "Frame Rate",
        ],
      },
    ],
  },
  temperedGlass: {
    variantLabels: [
      "Material",
      "Product Dimensions",
      "Finish Type",
      "Water Resistance Level",
      "Item Hardness",
      "Special Feature",
    ],
    sections: [
      {
        title: "Item Details",
        fieldLabels: ["Item Type Name", "Item Weight", "Warranty Description"],
      },
      {
        title: "Features & Specs",
        fieldLabels: ["Clarity", "Screen Surface Description"],
      },
      {
        title: "Measurements",
        fieldLabels: ["Unit Count", "Item Dimensions L x W", "Number of Items"],
      },
      {
        title: "Additional Details",
        fieldLabels: ["Material Type"],
      },
    ],
  },
  backCover: {
    variantLabels: ["Colour", "Material"],
    sections: [
      {
        title: "Features & Specs",
        fieldLabels: [
          "Water Resistance Level",
          "Embellishment Feature",
          "Product Features",
        ],
      },
      {
        title: "Style",
        fieldLabels: ["Colour", "Form Factor", "Pattern", "Theme"],
      },
      {
        title: "Additional Details",
        fieldLabels: ["Item Dimensions"],
      },
      {
        title: "Materials & Care",
        fieldLabels: ["Enclosure Material", "Product Finish Type"],
      },
      {
        title: "Item Details",
        fieldLabels: ["Box Contents", "Unit Count", "Item Type Name"],
      },
    ],
  },
  chargingAccessories: {
    variantLabels: [
      "Connector Type",
      "Included Components",
      "Special Feature",
      "Colour",
      "Input Voltage",
      "Amperages",
      "Total USB Port",
    ],
    sections: [
      {
        title: "Features & Specs",
        fieldLabels: ["Connectivity Technology"],
      },
      {
        title: "Materials & Care",
        fieldLabels: ["Enclosure Material", "Product Finish Type"],
      },
      {
        title: "Additional Details",
        fieldLabels: ["Item Dimensions", "Outer Material Type"],
      },
      {
        title: "Measurements",
        fieldLabels: ["Unit Count", "Item Weight", "Number of Items"],
      },
      {
        title: "Style",
        fieldLabels: ["Colour", "Item Shape"],
      },
      {
        title: "Item Details",
        fieldLabels: ["Box Contents", "Unit Count", "Item Type Name"],
      },
    ],
  },
  chargingAdapter: {
    variantLabels: [
      "Connector Type",
      "Cable Type",
      "Included Components",
      "Special Feature",
      "Colour",
      "Input Voltage",
      "Wattage",
      "Amperage",
      "Additional Features",
    ],
    sections: [
      {
        title: "Measurements",
        fieldLabels: [
          "Number of Items",
          "Item Weight Unit of Measure",
          "Unit Count",
        ],
      },
      {
        title: "User Guide",
        fieldLabels: [
          "Recommended Uses For Product",
          "Specification Met",
          "Indoor Outdoor Usage",
        ],
      },
      {
        title: "Additional Details",
        fieldLabels: ["Colour", "Enclosure Material"],
      },
      {
        title: "Item Details",
        fieldLabels: ["Box Contents", "Unit Count", "Item Type Name"],
      },
      {
        title: "Features & Specs",
        fieldLabels: [
          "Connector Type",
          "Additional Features",
          "Wattage",
          "Output Current",
          "Power Source",
          "Output Voltage",
        ],
      },
    ],
  },
  audio: {
    variantLabels: [
      "Connectivity Technology",
      "Colour",
      "Ear Placement",
      "Form Factor",
    ],
    sections: [
      {
        title: "Measurements",
        fieldLabels: ["Item Weight Unit of Measure", "Unit Count"],
      },
      {
        title: "Audio",
        fieldLabels: [
          "Impedance Unit of Measure",
          "Noise Control",
          "Frequency Response",
          "Frequency Range",
          "Audio Driver Type",
          "Audio Driver Size",
        ],
      },
      {
        title: "Additional Details",
        fieldLabels: [
          "Product Features",
          "Enclosure Material",
          "Specific Uses For Product",
          "Antenna Location",
          "Water Resistance Level",
          "Compatible Devices",
        ],
      },
      {
        title: "Connectivity",
        fieldLabels: [
          "Headphone Jack",
          "Network Connectivity Technology",
          "Bluetooth Version",
          "Bluetooth Range",
          "Wireless Technology Type",
        ],
      },
      {
        title: "Style",
        fieldLabels: ["Colour", "Style Name"],
      },
      {
        title: "Battery",
        fieldLabels: ["Battery Charge Time", "Battery Average Life"],
      },
      {
        title: "Controls",
        fieldLabels: ["Control Type", "Control Method", "Controller Type"],
      },
    ],
  },
};

export function getRoleBasePath(role: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "MASTER_ADMIN") return "/master";
  if (normalizedRole === "MANAGER") return "/manager";
  if (normalizedRole === "SUPERVISOR") return "/supervisor";
  if (normalizedRole === "STAFF") return "/staff";

  return "/master";
}

export function keyOf(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "-");
}

function normalizeRole(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;

    return response?.data?.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function toOptionArray(value: unknown): OptionItem[] {
  return Array.isArray(value) ? (value as OptionItem[]) : [];
}

export function toModelArray(value: unknown): ModelItem[] {
  return Array.isArray(value) ? (value as ModelItem[]) : [];
}

export function filterActive<T extends { isActive?: boolean }>(items: T[]) {
  return items.filter((item) => item.isActive !== false);
}

function makeId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createVariantAttribute(
  label = "",
  value = ""
): VariantAttribute {
  return {
    id: makeId("variant-attr"),
    label,
    value,
  };
}

export function createVariantItem(attributeLabels: string[] = []): VariantItem {
  return {
    id: makeId("variant"),
    title: "",
    attributes: attributeLabels.length
      ? attributeLabels.map((label) => createVariantAttribute(label, ""))
      : [createVariantAttribute()],
    images: [],
    productInformation: [{ ...initialProductInfoSection }],
    isActive: true,
  };
}

export const initialProductInfoSection: ProductInformationSection = {
  title: "",
  fields: [{ label: "", value: "" }],
};

export function isFilledVariantAttribute(item: VariantAttribute) {
  return item.label.trim() && item.value.trim();
}

export function isFilledVariant(item: VariantItem) {
  return item.attributes.some((attribute) => isFilledVariantAttribute(attribute));
}

export function isFilledInfoField(field: ProductInformationField) {
  return field.label.trim() && field.value.trim();
}

export function getBrandIdFromModel(item: ModelItem): string {
  if (!item.brandId) return "";
  if (typeof item.brandId === "string") return String(item.brandId);
  return String(item.brandId?._id || "");
}

export function normalizeSearchKeys(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function validateProductImageFile(file: File) {
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    return "Only PNG, JPG, JPEG, and WEBP images are allowed";
  }

  if (file.size > PRODUCT_IMAGE_MAX_SIZE) {
    return "Each image must be 3MB or smaller";
  }

  return null;
}

export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

export function buildProductFormData(
  payload: ProductPayload,
  variantItems: VariantItem[]
) {
  const formData = new FormData();

  formData.append("itemName", payload.itemName);
  formData.append("itemModelNumber", payload.itemModelNumber);
  formData.append("itemKey", payload.itemKey);
  formData.append("masterCategoryId", payload.masterCategoryId);
  formData.append("categoryId", payload.categoryId);
  formData.append("subcategoryId", payload.subcategoryId);
  formData.append("productTypeId", payload.productTypeId);
  formData.append("brandId", payload.brandId);
  formData.append("modelId", payload.modelId);
  formData.append("searchKeys", JSON.stringify(payload.searchKeys));
  formData.append("compatible", JSON.stringify(payload.compatible));
  formData.append("variant", JSON.stringify(payload.variant));
  formData.append(
    "productInformation",
    JSON.stringify(payload.productInformation)
  );
  formData.append("isActive", String(payload.isActive));

  const variantImageGroups: VariantImageGroupPayload[] = variantItems
    .map((item, index) => ({
      variantIndex: index,
      imageField: `variantImages[${index}]`,
      fileNames: item.images.map((image) => image.name),
    }))
    .filter((item) => item.fileNames.length > 0);

  if (variantImageGroups.length > 0) {
    formData.append("variantImageGroups", JSON.stringify(variantImageGroups));
  }

  variantItems.forEach((item, index) => {
    item.images.forEach((image) => {
      formData.append(`variantImages[${index}]`, image.file);
    });
  });

  return formData;
}

export function buildAutoSearchKeys({
  itemName,
  itemModelNumber,
  productTypeName,
  brandName,
  modelName,
  compatibleItems,
  variantItems,
}: {
  itemName: string;
  itemModelNumber: string;
  productTypeName: string;
  brandName: string;
  modelName: string;
  compatibleItems: Array<{
    brandName: string;
    models: string[];
  }>;
  variantItems: Array<{
    title: string;
    attributes: Array<{ label: string; value: string }>;
  }>;
}) {
  const baseCandidates = [
    itemName,
    itemModelNumber,
    productTypeName,
    brandName,
    modelName,
    itemName && itemModelNumber ? `${itemName} ${itemModelNumber}` : "",
    brandName && itemName ? `${brandName} ${itemName}` : "",
    brandName && itemModelNumber ? `${brandName} ${itemModelNumber}` : "",
    brandName && modelName ? `${brandName} ${modelName}` : "",
    productTypeName && brandName ? `${productTypeName} ${brandName}` : "",
    productTypeName && modelName ? `${productTypeName} ${modelName}` : "",
  ];

  const compatibilityCandidates = compatibleItems.flatMap((item) => {
    const safeBrandName = item.brandName.trim();
    const safeModels = item.models.map((model) => model.trim()).filter(Boolean);

    return [
      safeBrandName,
      ...safeModels,
      ...safeModels.map((model) =>
        safeBrandName ? `${safeBrandName} ${model}` : model
      ),
    ];
  });

  const variantCandidates = variantItems.flatMap((item) => {
    const title = item.title.trim();
    const attrValues = item.attributes.flatMap((attribute) => [
      attribute.label.trim(),
      attribute.value.trim(),
    ]);

    const attrOnlyValues = item.attributes
      .map((attribute) => attribute.value.trim())
      .filter(Boolean);

    return [
      title,
      ...attrValues,
      ...attrOnlyValues,
      attrOnlyValues.length ? `${itemName} ${attrOnlyValues.join(" ")}` : "",
      attrOnlyValues.length ? `${brandName} ${attrOnlyValues.join(" ")}` : "",
    ];
  });

  return normalizeSearchKeys(
    [...baseCandidates, ...compatibilityCandidates, ...variantCandidates]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(",")
  );
}

function normalizePresetLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashToPastelSwatch(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 75% 85%)`;
}

function resolveColourSwatch(value: string) {
  const normalizedValue = normalizePresetLookup(value);

  const keywordMatch = COLOUR_KEYWORD_SWATCHES.find((item) =>
    item.tokens.some((token) => normalizedValue.includes(token))
  );

  return keywordMatch?.swatch || hashToPastelSwatch(value);
}

export function isColourField(label: string) {
  const normalizedLabel = normalizePresetLookup(label);
  return normalizedLabel === "colour" || normalizedLabel === "color";
}

export function getPresetValueOptions(label: string) {
  const normalizedLabel = normalizePresetLookup(label);

  if (normalizedLabel === "ram memory installed size") {
    return SMARTPHONE_RAM_OPTIONS;
  }

  if (normalizedLabel === "memory storage capacity") {
    return SMARTPHONE_STORAGE_OPTIONS;
  }

  if (normalizedLabel === "colour" || normalizedLabel === "color") {
    return COLOUR_OPTIONS;
  }

  return [];
}

export function resolvePresetValueOption(
  label: string,
  value: string
): PresetValueOption | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const matchingOption = getPresetValueOptions(label).find(
    (option) =>
      option.value.toLowerCase() === trimmedValue.toLowerCase() ||
      option.label.toLowerCase() === trimmedValue.toLowerCase()
  );

  if (matchingOption) {
    return matchingOption;
  }

  if (isColourField(label)) {
    return {
      value: trimmedValue,
      label: trimmedValue,
      swatch: resolveColourSwatch(trimmedValue),
    };
  }

  return null;
}

export function isItemTypeNameField(label: string) {
  return normalizePresetLookup(label) === "item type name";
}

export function supportsVariantImages(label: string) {
  const normalizedLabel = normalizePresetLookup(label);

  return ["colour", "color", "pattern", "theme", "style name"].includes(
    normalizedLabel
  );
}

export function getItemTypeNameOptions(currentValue: string) {
  const trimmedValue = currentValue.trim();

  if (!trimmedValue) {
    return ITEM_TYPE_NAME_OPTIONS;
  }

  const hasMatch = ITEM_TYPE_NAME_OPTIONS.some(
    (option) => option.toLowerCase() === trimmedValue.toLowerCase()
  );

  return hasMatch
    ? ITEM_TYPE_NAME_OPTIONS
    : [...ITEM_TYPE_NAME_OPTIONS, trimmedValue];
}

export function getItemTypeNamePresetOptions(currentValue: string) {
  return getItemTypeNameOptions(currentValue).map((option) => ({
    value: option,
    label: option,
  }));
}

export function buildPresetVariantRows(labels: string[]) {
  return [createVariantItem(labels)];
}

export function buildPresetProductInfoSections(
  sections: ProductPresetSection[],
  itemTypeName: string
) {
  return sections.map((section) => ({
    title: section.title,
    fields: section.fieldLabels.map((label) => ({
      label,
      value: isItemTypeNameField(label) ? itemTypeName : "",
    })),
  }));
}

export function buildVariantTitle(attributes: VariantAttribute[]) {
  return attributes
    .map((attribute) => attribute.value.trim())
    .filter(Boolean)
    .join(" / ");
}

export function cloneProductInfoSections(
  sections: ProductInformationSection[]
): ProductInformationSection[] {
  return sections.map((section) => ({
    title: section.title,
    fields: section.fields.map((field) => ({
      label: field.label,
      value: field.value,
    })),
  }));
}

export function resolveMobileProductPreset(
  productTypeName: string
): ResolvedProductTypePreset | null {
  const normalizedName = normalizePresetLookup(productTypeName);

  if (!normalizedName) {
    return null;
  }

  if (normalizedName.includes("tempered glass")) {
    return {
      ...MOBILE_PRODUCT_PRESETS.temperedGlass,
      itemTypeName: "Tempered Glass",
    };
  }

  if (
    normalizedName.includes("back cover") ||
    normalizedName.includes("backcover")
  ) {
    return {
      ...MOBILE_PRODUCT_PRESETS.backCover,
      itemTypeName: "Back Cover",
    };
  }

  if (
    normalizedName.includes("charging accessories") ||
    normalizedName.includes("chargingaccessories")
  ) {
    return {
      ...MOBILE_PRODUCT_PRESETS.chargingAccessories,
      itemTypeName: "",
    };
  }

  if (
    normalizedName.includes("charge cable") ||
    normalizedName.includes("charging cable") ||
    normalizedName.includes("data cable") ||
    normalizedName.includes("dual cord") ||
    (normalizedName.includes("cable") && !normalizedName.includes("adapter"))
  ) {
    return {
      ...MOBILE_PRODUCT_PRESETS.chargingAccessories,
      itemTypeName: "Dual Cord Type-C Cable",
    };
  }

  if (
    normalizedName.includes("charging adapter") ||
    normalizedName.includes("charger adapter") ||
    normalizedName.includes("adapter")
  ) {
    return {
      ...MOBILE_PRODUCT_PRESETS.chargingAdapter,
      itemTypeName: "Adapter",
    };
  }

  if (
    normalizedName.includes("wired earphones") ||
    normalizedName.includes("earbuds") ||
    normalizedName.includes("ear headphones") ||
    normalizedName.includes("headphones") ||
    normalizedName.includes("earphones")
  ) {
    let itemTypeName = "Headphones";

    if (normalizedName.includes("wired earphones")) {
      itemTypeName = "Wired Earphones";
    } else if (normalizedName.includes("earbuds")) {
      itemTypeName = "Earbuds";
    }

    return {
      ...MOBILE_PRODUCT_PRESETS.audio,
      itemTypeName,
    };
  }

  if (
    normalizedName.includes("smartphone") ||
    normalizedName === "mobile" ||
    normalizedName === "mobiles" ||
    normalizedName.includes("mobile phone")
  ) {
    return {
      ...MOBILE_PRODUCT_PRESETS.smartphone,
      itemTypeName: "Smartphone",
    };
  }

  return null;
}