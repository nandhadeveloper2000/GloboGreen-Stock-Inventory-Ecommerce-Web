import type {
  DynamicProductFieldStoredValue,
  DynamicProductFieldValueEntry,
  DynamicProductFieldValueGroup,
  DynamicProductFieldValueSection,
  DynamicProductFieldValues,
  DynamicProductFileValue,
  DynamicProductPrimitiveValue,
  DynamicProductUnitValue,
  DynamicProductVariationMatrixRow,
  DynamicProductVariationMatrixStatus,
  ProductTypeFieldBuilderDocument,
  ProductTypeFieldBuilderGroup,
  ProductTypeFieldBuilderSection,
  ProductTypeFieldDefinition,
  ProductTypeFieldHeadingPreset,
  ProductTypeFieldInputType,
  ProductTypeFieldRef,
} from "@/types/product-type-fields";

export const PRODUCT_TYPE_FIELD_INPUT_TYPES: ProductTypeFieldInputType[] = [
  "text",
  "number",
  "textarea",
  "select",
  "multiSelect",
  "checkbox",
  "radio",
  "date",
  "file",
  "boolean",
];

export const PRODUCT_TYPE_FIELD_HEADINGS: ProductTypeFieldHeadingPreset[] = [
  "Product Details",
  "Images",
  "Variations",
  "Offer",
  "Safety & Compliance",
];

export const DEFAULT_PRODUCT_TYPE_FIELD_HEADING =
  PRODUCT_TYPE_FIELD_HEADINGS[0];

export const PRODUCT_VARIATION_SECTION_HEADING = "Variations";
export const DYNAMIC_VARIATION_META_GROUP_NAME = "__internal";
export const DYNAMIC_VARIATION_MATRIX_FIELD_KEY = "__variationMatrix";
export const DYNAMIC_VARIATION_OFFER_FIELD_KEYS = [
  "sku",
  "externalProductId",
  "externalProductIdType",
  "itemCondition",
  "yourPrice",
  "quantity",
  "offerConditionNote",
] as const;

export const PRODUCT_TYPE_FIELD_GROUP_NAME_SUGGESTIONS: Record<
  ProductTypeFieldHeadingPreset,
  string[]
> = {
  "Product Details": [
    "Basic Info",
    "Display",
    "Memory",
    "Camera",
    "Battery",
    "Connectivity",
  ],
  Images: ["Images", "Main Gallery", "Angle Shots", "Packaging", "In The Box"],
  Variations: [
    "Basic",
    "Variant",
    "Network",
    "Condition",
    "Memory Storage Capacity",
    "Display",
    "RAM",
    "Dimension",
  ],
  Offer: [
    "Basic",
    "Pricing",
    "Fulfillment",
    "Item Dimensions",
    "Item Package Dimensions",
  ],
  "Safety & Compliance": [
    "Origin",
    "Warranty",
    "Battery",
    "Dangerous Goods",
    "Weight",
    "Compliance Marks",
  ],
};

type ProductTypeFieldSuggestionPreset = {
  matchers: string[];
  headings: Partial<Record<ProductTypeFieldHeadingPreset, string[]>>;
};

const PRODUCT_TYPE_FIELD_GROUP_NAME_PRESETS: ProductTypeFieldSuggestionPreset[] = [
  {
    matchers: [
      "smartphone",
      "smartphones",
      "mobile",
      "mobiles",
      "mobile phone",
      "cellular phone",
      "phone",
    ],
    headings: {
      "Product Details": [
        "Basic Info",
        "Display",
        "Memory",
        "Camera",
        "Battery",
        "Connectivity",
      ],
      Images: ["Images"],
      Variations: [
        "Basic",
        "Variant",
        "Network",
        "Condition",
        "Memory Storage Capacity",
        "Display",
        "RAM",
        "Dimension",
      ],
      Offer: [
        "Basic",
        "Pricing",
        "Fulfillment",
        "Item Dimensions",
        "Item Package Dimensions",
      ],
      "Safety & Compliance": [
        "Origin",
        "Warranty",
        "Battery",
        "Dangerous Goods",
        "Weight",
        "SAR & Compliance",
      ],
    },
  },
  {
    matchers: [
      "cable",
      "cables",
      "data cable",
      "charging cable",
      "usb cable",
      "type c cable",
      "type-c cable",
      "dual cord type c cable",
    ],
    headings: {
      "Product Details": [
        "Basic Info",
        "Cable Specification",
        "Connector Details",
        "Compatibility",
        "Charging",
      ],
      Images: ["Connector Shots", "Cable Closeups", "Packaging", "In The Box"],
      Variations: ["Length Variants", "Color Variants", "Connector Variants"],
      Offer: ["Pricing", "Bulk Packs", "Fulfillment"],
      "Safety & Compliance": [
        "Safety Standards",
        "Material Compliance",
        "Country of Origin",
        "Warranty",
      ],
    },
  },
];

export type DynamicFieldUploadMeta = {
  sectionHeadingId?: string;
  groupId?: string;
  fieldId?: string;
  key: string;
  uploadField: string;
  file: File;
  itemIndex?: number;
  matrixComboKey?: string;
  matrixFileKey?: string;
};

export function buildProductTypeFieldKey(value: string) {
  const cleaned = value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase();

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (!words.length) {
    return "";
  }

  return words[0] + words.slice(1).map(capitalize).join("");
}

export function isDynamicUnitValue(value: unknown): value is DynamicProductUnitValue {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "value" in (value as Record<string, unknown>)
  );
}

export function isDynamicVariationMatrixRow(
  value: unknown
): value is DynamicProductVariationMatrixRow {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      String((value as { comboKey?: unknown }).comboKey || "").trim()
  );
}

export function isVariationMatrixFieldKey(value?: string | null) {
  return buildProductTypeFieldKey(String(value || "")) === DYNAMIC_VARIATION_MATRIX_FIELD_KEY;
}

function isPresetVariationSection(value?: string | null) {
  return normalizeProductTypeFieldHeading(value) === PRODUCT_VARIATION_SECTION_HEADING;
}

export function normalizeCommaSeparatedList(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeDynamicPrimitiveValue(value: unknown): DynamicProductPrimitiveValue | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
}

function normalizeDynamicVariationMatrixStatus(
  value: unknown
): DynamicProductVariationMatrixStatus | null {
  const normalized = String(value || "").trim().toUpperCase();

  if (
    normalized === "AVAILABLE" ||
    normalized === "OUT_OF_STOCK" ||
    normalized === "INACTIVE"
  ) {
    return normalized as DynamicProductVariationMatrixStatus;
  }

  return null;
}

export function normalizeProductTypeFieldHeading(value?: string | null) {
  const heading = String(value || "").trim();

  if (!heading) {
    return DEFAULT_PRODUCT_TYPE_FIELD_HEADING;
  }

  const matchedHeading = PRODUCT_TYPE_FIELD_HEADINGS.find(
    (item) => item.toLowerCase() === heading.toLowerCase()
  );

  return matchedHeading || heading;
}

export function getProductTypeFieldHeadingOrder(value?: string | null) {
  const normalizedHeading = normalizeProductTypeFieldHeading(value);
  const index = PRODUCT_TYPE_FIELD_HEADINGS.findIndex(
    (item) => item === normalizedHeading
  );

  return index === -1 ? PRODUCT_TYPE_FIELD_HEADINGS.length : index;
}

export function getProductTypeFieldRefId(value?: ProductTypeFieldRef | null) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || "");
}

export function getProductTypeFieldRefName(value?: ProductTypeFieldRef | null) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value.name || "").trim();
}

function normalizeProductTypeSuggestionKey(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getProductTypeFieldGroupSuggestions(params: {
  productTypeName?: string | null;
  headingName?: string | null;
  allowFallback?: boolean;
}): string[] {
  const headingName = normalizeProductTypeFieldHeading(
    params.headingName
  ) as ProductTypeFieldHeadingPreset;
  const normalizedProductTypeName = normalizeProductTypeSuggestionKey(
    params.productTypeName
  );

  const matchedPreset = PRODUCT_TYPE_FIELD_GROUP_NAME_PRESETS.find((preset) =>
    preset.matchers.some((matcher) =>
      normalizedProductTypeName.includes(
        normalizeProductTypeSuggestionKey(matcher)
      )
    )
  );

  if (matchedPreset?.headings[headingName]) {
    return matchedPreset.headings[headingName] || [];
  }

  if (params.allowFallback) {
    return PRODUCT_TYPE_FIELD_GROUP_NAME_SUGGESTIONS[
      headingName as ProductTypeFieldHeadingPreset
    ] || [];
  }

  return [];
}

export function createEmptyProductTypeFieldDefinition(): ProductTypeFieldDefinition {
  return {
    label: "",
    key: "",
    inputType: "text",
    placeholder: "",
    options: [],
    unitOptions: [],
    sortOrder: 1,
    required: false,
    addMore: false,
    hasUnit: false,
    active: true,
  };
}

export function createDefaultProductTypeFieldSections() {
  return PRODUCT_TYPE_FIELD_HEADINGS.map((headingName, index) => ({
    headingName,
    sortOrder: index + 1,
    isActive: true,
    groups: [],
  })) satisfies ProductTypeFieldBuilderSection[];
}

export function createEmptyProductTypeFieldBuilderDocument(): ProductTypeFieldBuilderDocument {
  return {
    sectionHeadings: createDefaultProductTypeFieldSections(),
    isActive: true,
  };
}

export function sortProductTypeFieldDefinitions(
  fields: ProductTypeFieldDefinition[]
) {
  return [...fields].sort((a, b) => {
    const orderDiff = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return a.label.localeCompare(b.label);
  });
}

export function sortProductTypeFieldGroups(
  groups: ProductTypeFieldBuilderGroup[]
) {
  return [...groups]
    .map((group, index) => ({
      ...group,
      sortOrder: Number.isFinite(Number(group.sortOrder))
        ? Number(group.sortOrder)
        : index + 1,
      fields: sortProductTypeFieldDefinitions(group.fields || []),
    }))
    .sort((a, b) => {
      const orderDiff = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return a.groupName.localeCompare(b.groupName);
    });
}

export function sortProductTypeFieldSections(
  sections: ProductTypeFieldBuilderSection[]
) {
  return [...sections]
    .map((section, index) => ({
      ...section,
      headingName: normalizeProductTypeFieldHeading(section.headingName),
      sortOrder: Number.isFinite(Number(section.sortOrder))
        ? Number(section.sortOrder)
        : index + 1,
      groups: sortProductTypeFieldGroups(section.groups || []),
    }))
    .sort((a, b) => {
      const orderDiff = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;

      return (
        getProductTypeFieldHeadingOrder(a.headingName) -
        getProductTypeFieldHeadingOrder(b.headingName)
      );
    });
}

export function normalizeProductTypeFieldBuilder(
  value?: Partial<ProductTypeFieldBuilderDocument> | null
): ProductTypeFieldBuilderDocument {
  const sourceSections = Array.isArray(value?.sectionHeadings)
    ? value.sectionHeadings
    : [];
  const sectionMap = new Map(
    sourceSections.map((section) => [
      normalizeProductTypeFieldHeading(section.headingName),
      section,
    ])
  );

  const normalizedDefaultSections = PRODUCT_TYPE_FIELD_HEADINGS.map(
    (headingName, index) => {
      const existingSection = sectionMap.get(headingName);

      return {
        _id: existingSection?._id,
        headingName,
        sortOrder: Number.isFinite(Number(existingSection?.sortOrder))
          ? Number(existingSection?.sortOrder)
          : index + 1,
        isActive: existingSection?.isActive !== false,
        groups: Array.isArray(existingSection?.groups)
          ? existingSection.groups.map((group, groupIndex) => ({
              _id: group._id,
              groupName: String(group.groupName || "").trim(),
              sortOrder: Number.isFinite(Number(group.sortOrder))
                ? Number(group.sortOrder)
                : groupIndex + 1,
              isActive: group.isActive !== false,
              fields: Array.isArray(group.fields)
                ? group.fields.map((field, fieldIndex) => ({
                    _id: field._id,
                    label: String(field.label || "").trim(),
                    key:
                      buildProductTypeFieldKey(String(field.key || field.label || "")) ||
                      "",
                    inputType:
                      PRODUCT_TYPE_FIELD_INPUT_TYPES.includes(field.inputType)
                        ? field.inputType
                        : "text",
                    placeholder: String(field.placeholder || "").trim(),
                    options: Array.isArray(field.options) ? field.options : [],
                    unitOptions: Array.isArray(field.unitOptions)
                      ? field.unitOptions
                      : [],
                    sortOrder: Number.isFinite(Number(field.sortOrder))
                      ? Number(field.sortOrder)
                      : fieldIndex + 1,
                    required: Boolean(field.required),
                    addMore: Boolean(field.addMore),
                    hasUnit: Boolean(field.hasUnit),
                    active: field.active !== false,
                  }))
                : [],
            }))
          : [],
      } satisfies ProductTypeFieldBuilderSection;
    }
  );

  const customSections = sourceSections
    .filter(
      (section) =>
        !PRODUCT_TYPE_FIELD_HEADINGS.includes(
          normalizeProductTypeFieldHeading(section.headingName) as ProductTypeFieldHeadingPreset
        )
    )
    .map((section, index) => ({
      _id: section._id,
      headingName: normalizeProductTypeFieldHeading(section.headingName),
      sortOrder: Number.isFinite(Number(section.sortOrder))
        ? Number(section.sortOrder)
        : PRODUCT_TYPE_FIELD_HEADINGS.length + index + 1,
      isActive: section.isActive !== false,
      groups: sortProductTypeFieldGroups(section.groups || []),
    }));

  return {
    _id: value?._id,
    productTypeId: value?.productTypeId,
    categoryId: value?.categoryId,
    subcategoryId: value?.subcategoryId,
    sectionHeadings: sortProductTypeFieldSections([
      ...normalizedDefaultSections,
      ...customSections,
    ]),
    isActive: value?.isActive !== false,
    createdAt: value?.createdAt,
    updatedAt: value?.updatedAt,
  };
}

export function countProductTypeFieldGroups(
  builder: ProductTypeFieldBuilderDocument
) {
  return builder.sectionHeadings.reduce(
    (total, section) => total + (section.groups?.length || 0),
    0
  );
}

export function countProductTypeFields(builder: ProductTypeFieldBuilderDocument) {
  return builder.sectionHeadings.reduce(
    (total, section) =>
      total +
      (section.groups || []).reduce(
        (groupTotal, group) => groupTotal + (group.fields?.length || 0),
        0
      ),
    0
  );
}

export function flattenBuilderFieldText(builder: ProductTypeFieldBuilderDocument) {
  return builder.sectionHeadings
    .flatMap((section) => [
      section.headingName,
      ...(section.groups || []).flatMap((group) => [
        group.groupName,
        ...(group.fields || []).flatMap((field) => [
          field.label,
          field.key,
          field.inputType,
          ...(field.options || []),
          ...(field.unitOptions || []),
        ]),
      ]),
    ])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getSectionById(
  builder: ProductTypeFieldBuilderDocument,
  sectionId?: string
) {
  return (
    builder.sectionHeadings.find((section) => section._id === sectionId) ||
    builder.sectionHeadings[0] ||
    null
  );
}

export function getGroupById(
  section: ProductTypeFieldBuilderSection | null | undefined,
  groupId?: string
) {
  if (!section) return null;

  return (
    section.groups.find((group) => group._id === groupId) ||
    section.groups[0] ||
    null
  );
}

export function isDynamicFileValue(
  value: unknown
): value is DynamicProductFileValue {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !isDynamicUnitValue(value) &&
      ("url" in value ||
        "publicId" in value ||
        "fileName" in value ||
        "mimeType" in value ||
        "file" in value)
  );
}

export function hasDynamicFieldValue(
  value: DynamicProductFieldStoredValue | undefined | null
) {
  if (Array.isArray(value)) {
    return value.some((item) => {
      if (isDynamicFileValue(item)) {
        return Boolean(item.url || item.fileName || item.file || item.publicId);
      }

      if (isDynamicUnitValue(item)) {
        return normalizeDynamicPrimitiveValue(item.value) !== null;
      }

      if (isDynamicVariationMatrixRow(item)) {
        return Boolean(item.comboKey);
      }

      return normalizeDynamicPrimitiveValue(item) !== null;
    });
  }

  if (isDynamicFileValue(value)) {
    return Boolean(value.url || value.fileName || value.file || value.publicId);
  }

  if (isDynamicUnitValue(value)) {
    return normalizeDynamicPrimitiveValue(value.value) !== null;
  }

  return normalizeDynamicPrimitiveValue(value) !== null;
}

function normalizeDynamicFieldStoredValue(
  value: unknown
): DynamicProductFieldStoredValue | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    const normalizedFileValues = value
      .map((item) => normalizeDynamicFileValue(item))
      .filter(Boolean) as DynamicProductFileValue[];

    if (normalizedFileValues.length === value.length && normalizedFileValues.length > 0) {
      return normalizedFileValues;
    }

    const normalizedUnitValues = value
      .map((item) => normalizeDynamicUnitEntry(item))
      .filter(Boolean) as DynamicProductUnitValue[];

    if (normalizedUnitValues.length === value.length && normalizedUnitValues.length > 0) {
      return normalizedUnitValues;
    }

    const normalizedVariationRows = value
      .map((item) => normalizeDynamicVariationMatrixRow(item))
      .filter(Boolean) as DynamicProductVariationMatrixRow[];

    if (normalizedVariationRows.length === value.length && normalizedVariationRows.length > 0) {
      return normalizedVariationRows;
    }

    return value
      .map((item) => normalizeDynamicPrimitiveValue(item))
      .filter(
        (item): item is DynamicProductPrimitiveValue => item !== null
      );
  }

  const fileValue = normalizeDynamicFileValue(value);

  if (fileValue) {
    return fileValue;
  }

  return normalizeDynamicPrimitiveValue(value);
}

export function normalizeDynamicProductFieldValues(
  value: unknown
): DynamicProductFieldValues {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section) => {
      const sectionHeadingName = String(
        (section as DynamicProductFieldValueSection)?.sectionHeadingName || ""
      ).trim();
      const sectionHeadingId = String(
        (section as DynamicProductFieldValueSection)?.sectionHeadingId || ""
      ).trim();
      const groups = Array.isArray(
        (section as DynamicProductFieldValueSection)?.groups
      )
        ? ((section as DynamicProductFieldValueSection).groups || [])
            .map((group) => {
              const groupName = String(group.groupName || "").trim();
              const groupId = String(group.groupId || "").trim();
              const fields = Array.isArray(group.fields)
                ? group.fields
                    .map((field) => {
                      const normalizedValue = normalizeDynamicFieldStoredValue(
                        field.value
                      );
                      const normalizedKey = buildProductTypeFieldKey(
                        String(field.key || "")
                      );

                      if (
                        !field.label ||
                        !normalizedKey ||
                        !hasDynamicFieldValue(normalizedValue || undefined)
                      ) {
                        return null;
                      }

                      return {
                        fieldId: String(field.fieldId || "").trim() || undefined,
                        label: String(field.label || "").trim(),
                        key: normalizedKey,
                        value: normalizedValue as DynamicProductFieldStoredValue,
                        unit: String(field.unit || "").trim() || undefined,
                      } satisfies DynamicProductFieldValueEntry;
                    })
                    .filter(Boolean)
                : [];

              if (!groupName || !fields.length) {
                return null;
              }

              return {
                groupId: groupId || undefined,
                groupName,
                fields: fields as DynamicProductFieldValueEntry[],
              } satisfies DynamicProductFieldValueGroup;
            })
            .filter(Boolean)
        : [];

      if (!sectionHeadingName || !groups.length) {
        return null;
      }

      return {
        sectionHeadingId: sectionHeadingId || undefined,
        sectionHeadingName,
        groups: groups as DynamicProductFieldValueGroup[],
      } satisfies DynamicProductFieldValueSection;
    })
    .filter(Boolean) as DynamicProductFieldValues;
}

export function getDynamicFieldValueEntry(
  values: DynamicProductFieldValues,
  params: {
    sectionHeadingId?: string;
    groupId?: string;
    fieldId?: string;
    key?: string;
  }
) {
  const normalizedKey = buildProductTypeFieldKey(String(params.key || ""));

  for (const section of values) {
    if (
      params.sectionHeadingId &&
      section.sectionHeadingId &&
      section.sectionHeadingId !== params.sectionHeadingId
    ) {
      continue;
    }

    for (const group of section.groups) {
      if (params.groupId && group.groupId && group.groupId !== params.groupId) {
        continue;
      }

      const match =
        group.fields.find(
          (field) =>
            (params.fieldId && field.fieldId === params.fieldId) ||
            (normalizedKey && field.key === normalizedKey)
        ) || null;

      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function upsertStandaloneDynamicFieldValue(
  values: DynamicProductFieldValues,
  params: {
    sectionHeadingId?: string;
    sectionHeadingName: string;
    groupId?: string;
    groupName: string;
    fieldId?: string;
    label: string;
    key: string;
    value: DynamicProductFieldStoredValue;
    unit?: string;
  }
) {
  const nextSections = normalizeDynamicProductFieldValues(values);
  const normalizedKey = buildProductTypeFieldKey(params.key || params.label);
  const hasValue = hasDynamicFieldValue(params.value);
  const unit = String(params.unit || "").trim();

  let section = nextSections.find(
    (item) =>
      item.sectionHeadingId === params.sectionHeadingId ||
      item.sectionHeadingName === params.sectionHeadingName
  );

  if (!section && hasValue) {
    section = {
      sectionHeadingId: params.sectionHeadingId,
      sectionHeadingName: params.sectionHeadingName,
      groups: [],
    };
    nextSections.push(section);
  }

  if (!section) {
    return nextSections;
  }

  let group = section.groups.find(
    (item) =>
      item.groupId === params.groupId || item.groupName === params.groupName
  );

  if (!group && hasValue) {
    group = {
      groupId: params.groupId,
      groupName: params.groupName,
      fields: [],
    };
    section.groups.push(group);
  }

  if (!group) {
    return nextSections;
  }

  const fieldIndex = group.fields.findIndex(
    (item) => item.fieldId === params.fieldId || item.key === normalizedKey
  );

  if (!hasValue) {
    if (fieldIndex >= 0) {
      group.fields.splice(fieldIndex, 1);
    }
  } else {
    const nextEntry: DynamicProductFieldValueEntry = {
      ...(params.fieldId ? { fieldId: params.fieldId } : {}),
      label: params.label,
      key: normalizedKey,
      value: params.value,
      ...(unit ? { unit } : {}),
    };

    if (fieldIndex >= 0) {
      group.fields[fieldIndex] = nextEntry;
    } else {
      group.fields.push(nextEntry);
    }
  }

  return nextSections
    .map((currentSection) => ({
      ...currentSection,
      groups: currentSection.groups.filter(
        (currentGroup) => currentGroup.fields.length > 0
      ),
    }))
    .filter((currentSection) => currentSection.groups.length > 0);
}

export function upsertDynamicFieldValue(
  values: DynamicProductFieldValues,
  params: {
    section: ProductTypeFieldBuilderSection;
    group: ProductTypeFieldBuilderGroup;
    field: ProductTypeFieldDefinition;
    value: DynamicProductFieldStoredValue;
    unit?: string;
  }
) {
  const nextSections = normalizeDynamicProductFieldValues(values);
  const normalizedKey = buildProductTypeFieldKey(params.field.key || params.field.label);
  const hasValue = hasDynamicFieldValue(params.value);
  const unit = String(params.unit || "").trim();

  let section = nextSections.find(
    (item) =>
      item.sectionHeadingId === params.section._id ||
      item.sectionHeadingName === params.section.headingName
  );

  if (!section && hasValue) {
    section = {
      sectionHeadingId: params.section._id,
      sectionHeadingName: params.section.headingName,
      groups: [],
    };
    nextSections.push(section);
  }

  if (!section) {
    return pruneDynamicFieldValues(values, {
      sectionHeadings: [params.section],
      isActive: true,
    } as ProductTypeFieldBuilderDocument);
  }

  let group = section.groups.find(
    (item) =>
      item.groupId === params.group._id || item.groupName === params.group.groupName
  );

  if (!group && hasValue) {
    group = {
      groupId: params.group._id,
      groupName: params.group.groupName,
      fields: [],
    };
    section.groups.push(group);
  }

  if (!group) {
    return pruneDynamicFieldValues(nextSections, {
      sectionHeadings: [params.section],
      isActive: true,
    } as ProductTypeFieldBuilderDocument);
  }

  const fieldIndex = group.fields.findIndex(
    (item) => item.fieldId === params.field._id || item.key === normalizedKey
  );

  if (!hasValue) {
    if (fieldIndex >= 0) {
      group.fields.splice(fieldIndex, 1);
    }
  } else {
    const nextEntry: DynamicProductFieldValueEntry = {
      fieldId: params.field._id,
      label: params.field.label,
      key: normalizedKey,
      value: params.value,
      ...(params.field.hasUnit && unit ? { unit } : {}),
    };

    if (fieldIndex >= 0) {
      group.fields[fieldIndex] = nextEntry;
    } else {
      group.fields.push(nextEntry);
    }
  }

  return nextSections
    .map((currentSection) => ({
      ...currentSection,
      groups: currentSection.groups.filter((currentGroup) => currentGroup.fields.length > 0),
    }))
    .filter((currentSection) => currentSection.groups.length > 0);
}

export function pruneDynamicFieldValues(
  values: DynamicProductFieldValues,
  builder: ProductTypeFieldBuilderDocument
) {
  const normalizedValues = normalizeDynamicProductFieldValues(values);
  const nextSections: DynamicProductFieldValueSection[] = [];

  for (const section of sortProductTypeFieldSections(builder.sectionHeadings || [])) {
    if (section.isActive === false) {
      continue;
    }

    const nextGroups: DynamicProductFieldValueGroup[] = [];

    for (const group of sortProductTypeFieldGroups(section.groups || [])) {
      if (group.isActive === false) {
        continue;
      }

      const nextFields: DynamicProductFieldValueEntry[] = [];

      for (const field of sortProductTypeFieldDefinitions(group.fields || [])) {
        if (field.active === false) {
          continue;
        }

        const entry = getDynamicFieldValueEntry(normalizedValues, {
          sectionHeadingId: section._id,
          groupId: group._id,
          fieldId: field._id,
          key: field.key,
        });

        if (!entry || !hasDynamicFieldValue(entry.value)) {
          continue;
        }

        nextFields.push({
          fieldId: field._id,
          label: field.label,
          key: buildProductTypeFieldKey(field.key),
          value: entry.value,
          ...(field.hasUnit && entry.unit ? { unit: entry.unit } : {}),
        });
      }

      if (nextFields.length > 0) {
        nextGroups.push({
          groupId: group._id,
          groupName: group.groupName,
          fields: nextFields,
        });
      }
    }

    if (isPresetVariationSection(section.headingName)) {
      const matrixEntry = getDynamicFieldValueEntry(normalizedValues, {
        sectionHeadingId: section._id,
        key: DYNAMIC_VARIATION_MATRIX_FIELD_KEY,
      });

      if (matrixEntry && hasDynamicFieldValue(matrixEntry.value)) {
        nextGroups.push({
          groupName: DYNAMIC_VARIATION_META_GROUP_NAME,
          fields: [
            {
              label: matrixEntry.label || "Variation Matrix",
              key: DYNAMIC_VARIATION_MATRIX_FIELD_KEY,
              value: matrixEntry.value,
            },
          ],
        });
      }
    }

    if (nextGroups.length > 0) {
      nextSections.push({
        sectionHeadingId: section._id,
        sectionHeadingName: section.headingName,
        groups: nextGroups,
      });
    }
  }

  return nextSections;
}

export function validateDynamicFieldValues(
  builder: ProductTypeFieldBuilderDocument | null | undefined,
  values: DynamicProductFieldValues
) {
  if (!builder) {
    return "";
  }

  const normalizedValues = normalizeDynamicProductFieldValues(values);

  for (const section of sortProductTypeFieldSections(builder.sectionHeadings || [])) {
    if (section.isActive === false) continue;

    for (const group of sortProductTypeFieldGroups(section.groups || [])) {
      if (group.isActive === false) continue;

      for (const field of sortProductTypeFieldDefinitions(group.fields || [])) {
        if (field.active === false) continue;

        const current = getDynamicFieldValueEntry(normalizedValues, {
          sectionHeadingId: section._id,
          groupId: group._id,
          fieldId: field._id,
          key: field.key,
        });
        const rawValue = current?.value;
        const hasValue = hasDynamicFieldValue(rawValue);

        if (field.required && !hasValue) {
          return `${field.label} is required`;
        }

        if (!hasValue) {
          continue;
        }

        const validationError = validateDynamicFieldEntry(field, current);

        if (validationError) {
          return validationError;
        }
      }
    }
  }

  const variationSection = sortProductTypeFieldSections(builder.sectionHeadings || []).find(
    (section) => section.isActive !== false && isPresetVariationSection(section.headingName)
  );

  if (variationSection) {
    const dimensionFields = sortProductTypeFieldGroups(variationSection.groups || [])
      .filter((group) => group.isActive !== false)
      .flatMap((group) =>
        sortProductTypeFieldDefinitions(group.fields || []).filter(
          (field) => field.active !== false && field.addMore
        )
      );

    const hasVariationDimensions = dimensionFields.some((field) => {
      const entry = getDynamicFieldValueEntry(normalizedValues, {
        sectionHeadingId: variationSection._id,
        fieldId: field._id,
        key: field.key,
      });

      return hasDynamicFieldValue(entry?.value);
    });

    const matrixEntry = getDynamicFieldValueEntry(normalizedValues, {
      sectionHeadingId: variationSection._id,
      key: DYNAMIC_VARIATION_MATRIX_FIELD_KEY,
    });

    if (hasVariationDimensions) {
      if (!matrixEntry || !Array.isArray(matrixEntry.value) || matrixEntry.value.length === 0) {
        return "Variation combinations are required";
      }

      if (!matrixEntry.value.every((item) => isDynamicVariationMatrixRow(item))) {
        return "Variation combinations are invalid";
      }

      const offerFieldMap = new Map<string, ProductTypeFieldDefinition>();
      const offerSection = sortProductTypeFieldSections(builder.sectionHeadings || []).find(
        (section) =>
          section.isActive !== false &&
          normalizeProductTypeFieldHeading(section.headingName) === "Offer"
      );

      for (const offerGroup of sortProductTypeFieldGroups(offerSection?.groups || [])) {
        if (offerGroup.isActive === false) continue;

        for (const offerField of sortProductTypeFieldDefinitions(offerGroup.fields || [])) {
          if (
            offerField.active !== false &&
            DYNAMIC_VARIATION_OFFER_FIELD_KEYS.includes(
              buildProductTypeFieldKey(offerField.key) as (typeof DYNAMIC_VARIATION_OFFER_FIELD_KEYS)[number]
            )
          ) {
            offerFieldMap.set(buildProductTypeFieldKey(offerField.key), offerField);
          }
        }
      }

      for (const row of matrixEntry.value) {
        if (!String(row.comboKey || "").trim()) {
          return "Variation combinations are invalid";
        }

        if (
          row.status &&
          !normalizeDynamicVariationMatrixStatus(row.status)
        ) {
          return "Variation row status is invalid";
        }

        for (const [fieldKey, offerField] of offerFieldMap.entries()) {
          const cellValue = row.values?.[fieldKey];
          const cellHasValue = hasDynamicFieldValue(
            cellValue as DynamicProductFieldStoredValue | undefined
          );

          if (offerField.required && !cellHasValue) {
            return `${offerField.label} is required for each variation row`;
          }

          if (!cellHasValue) {
            continue;
          }

          const cellError = validateScalarDynamicValue(
            offerField,
            cellValue as DynamicProductPrimitiveValue
          );

          if (cellError) {
            return `${offerField.label} ${cellError}`;
          }
        }
      }
    }
  }

  return "";
}

export function splitDynamicFieldValuesForSubmit(values: DynamicProductFieldValues) {
  const normalizedValues = normalizeDynamicProductFieldValues(values);
  const uploads: DynamicFieldUploadMeta[] = [];

  const cleanedValues = normalizedValues.map((section) => ({
    ...section,
    groups: section.groups.map((group) => ({
      ...group,
      fields: group.fields.map((field) => ({
        ...field,
        value: prepareDynamicValueForSubmit({
          field,
          sectionHeadingId: section.sectionHeadingId,
          groupId: group.groupId,
          uploads,
        }),
      })),
    })),
  }));

  return {
    values: cleanedValues,
    uploads,
  };
}

export function buildLegacyDynamicFieldValues(
  legacyValue: unknown,
  builder: ProductTypeFieldBuilderDocument | null | undefined
) {
  if (!builder || !legacyValue || typeof legacyValue !== "object" || Array.isArray(legacyValue)) {
    return [];
  }

  const legacyMap = legacyValue as Record<string, unknown>;
  const nextSections: DynamicProductFieldValues = [];

  for (const section of sortProductTypeFieldSections(builder.sectionHeadings || [])) {
    if (section.isActive === false) continue;

    const nextGroups: DynamicProductFieldValueGroup[] = [];

    for (const group of sortProductTypeFieldGroups(section.groups || [])) {
      if (group.isActive === false) continue;

      const nextFields: DynamicProductFieldValueEntry[] = [];

      for (const field of sortProductTypeFieldDefinitions(group.fields || [])) {
        if (field.active === false) continue;

        const rawLegacyEntry = legacyMap[field.key];

        if (!rawLegacyEntry) {
          continue;
        }

        const nextValue =
          rawLegacyEntry &&
          typeof rawLegacyEntry === "object" &&
          !Array.isArray(rawLegacyEntry) &&
          "value" in rawLegacyEntry
            ? normalizeDynamicFieldStoredValue(
                (rawLegacyEntry as { value?: unknown }).value
              )
            : normalizeDynamicFieldStoredValue(rawLegacyEntry);

        const nextUnit =
          rawLegacyEntry &&
          typeof rawLegacyEntry === "object" &&
          !Array.isArray(rawLegacyEntry) &&
          "unit" in rawLegacyEntry
            ? String((rawLegacyEntry as { unit?: unknown }).unit || "").trim()
            : "";

        if (!hasDynamicFieldValue(nextValue)) {
          continue;
        }

        nextFields.push({
          fieldId: field._id,
          label: field.label,
          key: field.key,
          value: nextValue as DynamicProductFieldStoredValue,
          ...(nextUnit ? { unit: nextUnit } : {}),
        });
      }

      if (nextFields.length > 0) {
        nextGroups.push({
          groupId: group._id,
          groupName: group.groupName,
          fields: nextFields,
        });
      }
    }

    if (nextGroups.length > 0) {
      nextSections.push({
        sectionHeadingId: section._id,
        sectionHeadingName: section.headingName,
        groups: nextGroups,
      });
    }
  }

  return nextSections;
}

function normalizeDynamicFileValue(value: unknown): DynamicProductFileValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as DynamicProductFileValue;
  const normalized = {
    ...(String(candidate.url || "").trim()
      ? { url: String(candidate.url).trim() }
      : {}),
    ...(String(candidate.publicId || "").trim()
      ? { publicId: String(candidate.publicId).trim() }
      : {}),
    ...(String(candidate.fileName || "").trim()
      ? { fileName: String(candidate.fileName).trim() }
      : {}),
    ...(String(candidate.mimeType || "").trim()
      ? { mimeType: String(candidate.mimeType).trim() }
      : {}),
    ...(candidate.file instanceof File ? { file: candidate.file } : {}),
  };

  return Object.keys(normalized).length ? normalized : null;
}

function normalizeDynamicUnitEntry(value: unknown): DynamicProductUnitValue | null {
  if (!isDynamicUnitValue(value)) {
    return null;
  }

  const normalizedValue = normalizeDynamicPrimitiveValue(value.value);

  if (normalizedValue === null) {
    return null;
  }

  const unit = String(value.unit || "").trim();

  return {
    value: normalizedValue,
    ...(unit ? { unit } : {}),
  };
}

function normalizeDynamicVariationMatrixCellValue(
  value: unknown
): DynamicProductPrimitiveValue | DynamicProductUnitValue | null {
  const normalizedUnitValue = normalizeDynamicUnitEntry(value);

  if (normalizedUnitValue) {
    return normalizedUnitValue;
  }

  return normalizeDynamicPrimitiveValue(value);
}

function normalizeDynamicVariationMatrixRow(
  value: unknown
): DynamicProductVariationMatrixRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as DynamicProductVariationMatrixRow;
  const comboKey = String(candidate.comboKey || "").trim();

  if (!comboKey) {
    return null;
  }

  const dimensions = Object.entries(candidate.dimensions || {}).reduce<
    Record<string, DynamicProductPrimitiveValue | DynamicProductUnitValue>
  >((acc, [key, rawValue]) => {
    const normalizedKey = buildProductTypeFieldKey(key);
    const normalizedValue = normalizeDynamicVariationMatrixCellValue(rawValue);

    if (normalizedKey && normalizedValue !== null) {
      acc[normalizedKey] = normalizedValue;
    }

    return acc;
  }, {});

  const values = Object.entries(candidate.values || {}).reduce<
    Record<string, DynamicProductPrimitiveValue>
  >((acc, [key, rawValue]) => {
    const normalizedKey = buildProductTypeFieldKey(key);
    const normalizedValue = normalizeDynamicPrimitiveValue(rawValue);

    if (normalizedKey && normalizedValue !== null) {
      acc[normalizedKey] = normalizedValue;
    }

    return acc;
  }, {});

  const mainImage = normalizeDynamicFileValue(
    (candidate as { mainImage?: unknown }).mainImage
  );
  const status =
    normalizeDynamicVariationMatrixStatus(
      (candidate as { status?: unknown }).status
    ) || "AVAILABLE";
  const details = String(
    (candidate as { details?: unknown }).details || ""
  ).trim();

  return {
    comboKey,
    dimensions,
    values,
    ...(mainImage ? { mainImage } : {}),
    status,
    ...(details ? { details } : {}),
  };
}

function validateScalarDynamicValue(
  field: ProductTypeFieldDefinition,
  rawValue: DynamicProductPrimitiveValue | undefined,
  unit?: string
) {
  if (rawValue === undefined) {
    return "is invalid";
  }

  if (field.inputType === "number" && Number.isNaN(Number(rawValue))) {
    return "must be a valid number";
  }

  if (
    (field.inputType === "select" || field.inputType === "radio") &&
    Array.isArray(field.options) &&
    field.options.length > 0 &&
    !field.options.includes(String(rawValue))
  ) {
    return "has an invalid option";
  }

  if (
    (field.inputType === "checkbox" || field.inputType === "boolean") &&
    typeof rawValue !== "boolean"
  ) {
    return "must be a valid boolean";
  }

  if (
    field.inputType === "date" &&
    Number.isNaN(new Date(String(rawValue)).getTime())
  ) {
    return "must be a valid date";
  }

  if (field.hasUnit) {
    const normalizedUnit = String(unit || "").trim();

    if (!normalizedUnit) {
      return "unit is required";
    }

    if (
      Array.isArray(field.unitOptions) &&
      field.unitOptions.length > 0 &&
      !field.unitOptions.includes(normalizedUnit)
    ) {
      return "has an invalid unit";
    }
  }

  return "";
}

function validateDynamicFieldEntry(
  field: ProductTypeFieldDefinition,
  current: DynamicProductFieldValueEntry | null
) {
  const rawValue = current?.value;

  if (field.inputType === "multiSelect") {
    if (
      !Array.isArray(rawValue) ||
      rawValue.some((value) => !field.options?.includes(String(value)))
    ) {
      return `${field.label} has an invalid option`;
    }

    return "";
  }

  if (field.inputType === "file") {
    if (field.addMore) {
      if (
        !Array.isArray(rawValue) ||
        rawValue.some(
          (item) =>
            !isDynamicFileValue(item) || (!item.file && !item.url)
        )
      ) {
        return `${field.label} file is required`;
      }

      return "";
    }

    if (!isDynamicFileValue(rawValue) || (!rawValue.file && !rawValue.url)) {
      return `${field.label} file is required`;
    }

    return "";
  }

  if (field.addMore) {
    if (!Array.isArray(rawValue)) {
      return `${field.label} must contain multiple values`;
    }

    if (field.hasUnit) {
      for (const item of rawValue) {
        const normalizedUnitEntry = normalizeDynamicUnitEntry(item);

        if (!normalizedUnitEntry) {
          return `${field.label} has an invalid value`;
        }

        const error = validateScalarDynamicValue(
          field,
          normalizedUnitEntry.value,
          normalizedUnitEntry.unit
        );

        if (error) {
          return `${field.label} ${error}`;
        }
      }

      return "";
    }

    for (const item of rawValue) {
      const normalizedValue = normalizeDynamicPrimitiveValue(item);

      if (normalizedValue === null) {
        return `${field.label} has an invalid value`;
      }

      const error = validateScalarDynamicValue(field, normalizedValue);

      if (error) {
        return `${field.label} ${error}`;
      }
    }

    return "";
  }

  if (field.hasUnit) {
    return validateScalarDynamicValue(
      field,
      normalizeDynamicPrimitiveValue(rawValue) ?? undefined,
      String(current?.unit || "")
    )
      ? `${field.label} ${validateScalarDynamicValue(
          field,
          normalizeDynamicPrimitiveValue(rawValue) ?? undefined,
          String(current?.unit || "")
        )}`
      : "";
  }

  return validateScalarDynamicValue(
    field,
    normalizeDynamicPrimitiveValue(rawValue) ?? undefined
  )
    ? `${field.label} ${validateScalarDynamicValue(
        field,
        normalizeDynamicPrimitiveValue(rawValue) ?? undefined
      )}`
    : "";
}

function prepareDynamicValueForSubmit(params: {
  field: DynamicProductFieldValueEntry;
  sectionHeadingId?: string;
  groupId?: string;
  uploads: DynamicFieldUploadMeta[];
}) {
  const { field, sectionHeadingId, groupId, uploads } = params;

  if (Array.isArray(field.value)) {
    if (field.value.every((item) => isDynamicVariationMatrixRow(item))) {
      return field.value.map((row, rowIndex) => {
        const normalizedRow = normalizeDynamicVariationMatrixRow(row);

        if (!normalizedRow) {
          return row;
        }

        const nextRow: DynamicProductVariationMatrixRow = {
          comboKey: normalizedRow.comboKey,
          dimensions: normalizedRow.dimensions,
          values: normalizedRow.values,
          status: normalizedRow.status || "AVAILABLE",
          ...(normalizedRow.details ? { details: normalizedRow.details } : {}),
        };
        const mainImage = normalizeDynamicFileValue(normalizedRow.mainImage);

        if (!mainImage || !(mainImage.file instanceof File)) {
          return {
            ...nextRow,
            ...(mainImage ? { mainImage } : {}),
          };
        }

        const uploadField = field.fieldId
          ? `dynamicFieldFile_${field.fieldId}_matrix_${rowIndex}`
          : `dynamicFieldFile_${field.key}_matrix_${rowIndex}`;

        uploads.push({
          sectionHeadingId,
          groupId,
          fieldId: field.fieldId,
          key: field.key,
          uploadField,
          file: mainImage.file,
          matrixComboKey: normalizedRow.comboKey,
          matrixFileKey: "mainImage",
        });

        return {
          ...nextRow,
          mainImage: {
            ...(mainImage.url ? { url: mainImage.url } : {}),
            ...(mainImage.publicId ? { publicId: mainImage.publicId } : {}),
            fileName: mainImage.file.name,
            mimeType: mainImage.file.type,
          },
        };
      });
    }

    return field.value.map((item, itemIndex) => {
      const fileValue = normalizeDynamicFileValue(item);

      if (!fileValue || !(fileValue.file instanceof File)) {
        return item;
      }

      const uploadField =
        field.fieldId
          ? `dynamicFieldFile_${field.fieldId}_${itemIndex}`
          : `dynamicFieldFile_${field.key}_${itemIndex}`;

      uploads.push({
        sectionHeadingId,
        groupId,
        fieldId: field.fieldId,
        key: field.key,
        uploadField,
        file: fileValue.file,
        itemIndex,
      });

      return {
        ...(fileValue.url ? { url: fileValue.url } : {}),
        ...(fileValue.publicId ? { publicId: fileValue.publicId } : {}),
        fileName: fileValue.file.name,
        mimeType: fileValue.file.type,
      };
    });
  }

  if (!isDynamicFileValue(field.value) || !(field.value.file instanceof File)) {
    return field.value;
  }

  const uploadField =
    field.fieldId ? `dynamicFieldFile_${field.fieldId}` : `dynamicFieldFile_${field.key}`;

  uploads.push({
    sectionHeadingId,
    groupId,
    fieldId: field.fieldId,
    key: field.key,
    uploadField,
    file: field.value.file,
  });

  return {
    ...(field.value.url ? { url: field.value.url } : {}),
    ...(field.value.publicId ? { publicId: field.value.publicId } : {}),
    fileName: field.value.file.name,
    mimeType: field.value.file.type,
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
