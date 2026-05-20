"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Check,
  ChevronsUpDown,
  FileImage,
  ImagePlus,
  PackagePlus,
  Plus,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  DYNAMIC_VARIATION_MATRIX_FIELD_KEY,
  DYNAMIC_VARIATION_META_GROUP_NAME,
  DYNAMIC_VARIATION_OFFER_FIELD_KEYS,
  buildProductTypeFieldKey,
  getDynamicFieldValueEntry,
  hasDynamicFieldValue,
  isDynamicFileValue,
  isDynamicUnitValue,
  isDynamicVariationMatrixRow,
  normalizeProductTypeFieldHeading,
  sortProductTypeFieldDefinitions,
  sortProductTypeFieldGroups,
  sortProductTypeFieldSections,
  upsertDynamicFieldValue,
  upsertStandaloneDynamicFieldValue,
} from "@/lib/product-type-fields";
import type {
  DynamicProductFieldStoredValue,
  DynamicProductFieldValueEntry,
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
} from "@/types/product-type-fields";
import { formatFileSize, validateProductImageFile } from "./create-config";

type ActiveProductTypeSection = ProductTypeFieldBuilderSection & {
  groups: Array<
    ProductTypeFieldBuilderGroup & {
      fields: ProductTypeFieldDefinition[];
    }
  >;
};

type VariationOfferFieldKey = (typeof DYNAMIC_VARIATION_OFFER_FIELD_KEYS)[number];

type FieldOption = {
  label: string;
  value: string;
};

type VariationDimensionField = {
  section: ProductTypeFieldBuilderSection;
  group: ProductTypeFieldBuilderGroup;
  field: ProductTypeFieldDefinition;
  key: string;
  values: Array<DynamicProductPrimitiveValue | DynamicProductUnitValue>;
};

const IMAGES_HEADING = "Images";
const VARIATIONS_HEADING = "Variations";
const OFFER_HEADING = "Offer";
const SAFETY_HEADING = "Safety & Compliance";
const VARIATION_ROW_STATUS_OPTIONS: Array<{
  label: string;
  value: DynamicProductVariationMatrixStatus;
}> = [
  { label: "Available", value: "AVAILABLE" },
  { label: "Out Of Stock", value: "OUT_OF_STOCK" },
  { label: "Inactive", value: "INACTIVE" },
];

const VARIATION_OFFER_FIELD_FALLBACKS: Record<
  VariationOfferFieldKey,
  Pick<
    ProductTypeFieldDefinition,
    "label" | "inputType" | "placeholder" | "options" | "required"
  >
> = {
  sku: {
    label: "SKU",
    inputType: "text",
    placeholder: "Example: ABC123",
    options: [],
    required: false,
  },
  externalProductId: {
    label: "External Product ID",
    inputType: "text",
    placeholder: "Example: 714532191586",
    options: [],
    required: false,
  },
  externalProductIdType: {
    label: "External Product ID Type",
    inputType: "select",
    placeholder: "Select external product id type",
    options: ["UPC", "EAN", "GTIN", "ISBN", "ASIN"],
    required: false,
  },
  itemCondition: {
    label: "Item Condition",
    inputType: "select",
    placeholder: "Select item condition",
    options: ["New", "Renewed", "Used - Like New", "Used - Good"],
    required: false,
  },
  yourPrice: {
    label: "Your Price",
    inputType: "number",
    placeholder: "Enter your price",
    options: [],
    required: false,
  },
  quantity: {
    label: "Quantity",
    inputType: "number",
    placeholder: "Enter quantity",
    options: [],
    required: false,
  },
  offerConditionNote: {
    label: "Offer Condition Note",
    inputType: "textarea",
    placeholder: "Add offer condition note",
    options: [],
    required: false,
  },
};

function normalizeSectionName(value: string) {
  return normalizeProductTypeFieldHeading(value);
}

function getSectionKey(section: ProductTypeFieldBuilderSection) {
  return String(section._id || section.headingName || "");
}

function getSectionIcon(sectionName: string) {
  const normalized = normalizeSectionName(sectionName);

  if (normalized === IMAGES_HEADING) {
    return FileImage;
  }

  if (normalized === VARIATIONS_HEADING) {
    return Boxes;
  }

  if (normalized === OFFER_HEADING) {
    return Tags;
  }

  if (normalized === SAFETY_HEADING) {
    return ShieldCheck;
  }

  return PackagePlus;
}

function baseInputClassName(disabled = false) {
  return `h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 ${
    disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""
  }`;
}

function textareaClassName(disabled = false) {
  return `min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 ${
    disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""
  }`;
}

function toOptionList(options?: string[]) {
  return (options || [])
    .map((option) => String(option || "").trim())
    .filter(Boolean)
    .map((option) => ({
      label: option,
      value: option,
    }));
}

function getEntryValue(
  values: DynamicProductFieldValues,
  section: ProductTypeFieldBuilderSection,
  group: ProductTypeFieldBuilderGroup,
  field: ProductTypeFieldDefinition
) {
  return getDynamicFieldValueEntry(values, {
    sectionHeadingId: section._id,
    groupId: group._id,
    fieldId: field._id,
    key: field.key,
  });
}

function getFieldPrimitiveValue(
  value: DynamicProductFieldStoredValue | undefined
): DynamicProductPrimitiveValue | "" {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return "";
}

function getFieldPrimitiveArray(
  value: DynamicProductFieldStoredValue | undefined
): DynamicProductPrimitiveValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is DynamicProductPrimitiveValue =>
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean"
  );
}

function getFieldUnitArray(
  value: DynamicProductFieldStoredValue | undefined
): DynamicProductUnitValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is DynamicProductUnitValue =>
    isDynamicUnitValue(item)
  );
}

function getFieldFileArray(
  value: DynamicProductFieldStoredValue | undefined
): DynamicProductFileValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is DynamicProductFileValue =>
    isDynamicFileValue(item)
  );
}

function getFieldFileValue(
  value: DynamicProductFieldStoredValue | undefined
): DynamicProductFileValue | null {
  return isDynamicFileValue(value) ? value : null;
}

function getMatrixRows(
  value: DynamicProductFieldStoredValue | undefined
): DynamicProductVariationMatrixRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is DynamicProductVariationMatrixRow =>
    isDynamicVariationMatrixRow(item)
  );
}

function describeStoredValue(
  value: DynamicProductPrimitiveValue | DynamicProductUnitValue
) {
  if (isDynamicUnitValue(value)) {
    return [String(value.value), String(value.unit || "").trim()]
      .filter(Boolean)
      .join(" ");
  }

  return String(value);
}

function createFallbackVariationOfferField(
  key: VariationOfferFieldKey
): ProductTypeFieldDefinition {
  const fallback = VARIATION_OFFER_FIELD_FALLBACKS[key];

  return {
    _id: `virtual-${key}`,
    label: fallback.label,
    key,
    inputType: fallback.inputType,
    placeholder: fallback.placeholder,
    options: fallback.options,
    unitOptions: [],
    sortOrder: 0,
    required: fallback.required,
    addMore: false,
    hasUnit: false,
    active: true,
  };
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function serializeVariationRows(rows: DynamicProductVariationMatrixRow[]) {
  const serializeFileValue = (value?: DynamicProductFileValue | null) =>
    value
      ? {
          url: value.url || "",
          publicId: value.publicId || "",
          fileName: value.fileName || "",
          mimeType: value.mimeType || "",
          hasFile: value.file instanceof File,
        }
      : null;

  return JSON.stringify(
    rows.map((row) => ({
      comboKey: row.comboKey,
      dimensions: Object.fromEntries(
        Object.entries(row.dimensions || {}).sort(([first], [second]) =>
          first.localeCompare(second)
        )
      ),
      values: Object.fromEntries(
        Object.entries(row.values || {}).sort(([first], [second]) =>
          first.localeCompare(second)
        )
      ),
      mainImage: serializeFileValue(row.mainImage),
      status: row.status || "AVAILABLE",
      details: String(row.details || "").trim(),
    }))
  );
}

function buildVariationRows(
  dimensions: VariationDimensionField[],
  existingRows: DynamicProductVariationMatrixRow[]
) {
  const populatedDimensions = dimensions.filter((dimension) => dimension.values.length > 0);

  if (!populatedDimensions.length) {
    return [];
  }

  const existingRowMap = new Map(existingRows.map((row) => [row.comboKey, row]));

  let combinations: Array<{
    comboKeyParts: string[];
    dimensions: Record<string, DynamicProductPrimitiveValue | DynamicProductUnitValue>;
  }> = [{ comboKeyParts: [], dimensions: {} }];

  for (const dimension of populatedDimensions) {
    const nextCombinations: typeof combinations = [];

    for (const currentCombination of combinations) {
      for (const dimensionValue of dimension.values) {
        nextCombinations.push({
          comboKeyParts: [
            ...currentCombination.comboKeyParts,
            `${dimension.key}:${describeStoredValue(dimensionValue)}`,
          ],
          dimensions: {
            ...currentCombination.dimensions,
            [dimension.key]: dimensionValue,
          },
        });
      }
    }

    combinations = nextCombinations;
  }

  const dedupedRows = new Map<string, DynamicProductVariationMatrixRow>();

  for (const combination of combinations) {
    const comboKey = combination.comboKeyParts.join("||");
    const existingRow = existingRowMap.get(comboKey);

    dedupedRows.set(comboKey, {
      comboKey,
      dimensions: combination.dimensions,
      values: { ...(existingRow?.values || {}) },
      status: existingRow?.status || "AVAILABLE",
      ...(existingRow?.details ? { details: existingRow.details } : {}),
      ...(existingRow?.mainImage ? { mainImage: existingRow.mainImage } : {}),
    });
  }

  return Array.from(dedupedRows.values());
}

export default function DynamicProductFieldsSection({
  builder,
  values,
  disabled = false,
  loading = false,
  onChange,
}: {
  builder: ProductTypeFieldBuilderDocument | null;
  values: DynamicProductFieldValues;
  disabled?: boolean;
  loading?: boolean;
  onChange: (nextValues: DynamicProductFieldValues) => void;
}) {
  const activeSections = useMemo<ActiveProductTypeSection[]>(() => {
    if (!builder) {
      return [];
    }

    return sortProductTypeFieldSections(builder.sectionHeadings || [])
      .filter((section) => section.isActive !== false)
      .map((section) => ({
        ...section,
        groups: sortProductTypeFieldGroups(section.groups || [])
          .filter((group) => group.isActive !== false)
          .map((group) => ({
            ...group,
            fields: sortProductTypeFieldDefinitions(group.fields || []).filter(
              (field) => field.active !== false
            ),
          }))
          .filter((group) => group.fields.length > 0),
      }))
      .filter((section) => section.groups.length > 0);
  }, [builder]);

  const [selectedSectionKey, setSelectedSectionKey] = useState("");

  const activeSection =
    activeSections.find((section) => getSectionKey(section) === selectedSectionKey) ||
    activeSections[0] ||
    null;

  const variationSection =
    activeSections.find(
      (section) => normalizeSectionName(section.headingName) === VARIATIONS_HEADING
    ) || null;
  const variationDimensions = useMemo<VariationDimensionField[]>(() => {
    if (!variationSection) {
      return [];
    }

    return variationSection.groups.flatMap((group) =>
      group.fields
        .filter((field) => field.addMore)
        .map((field) => {
          const entry = getEntryValue(values, variationSection, group, field);
          const fieldKey = buildProductTypeFieldKey(field.key || field.label || "");
          const nextValues = field.hasUnit
            ? getFieldUnitArray(entry?.value)
            : field.inputType === "file"
              ? getFieldFileArray(entry?.value)
              : getFieldPrimitiveArray(entry?.value);

          return {
            section: variationSection,
            group,
            field,
            key: fieldKey,
            values: nextValues.filter(
              (item): item is DynamicProductPrimitiveValue | DynamicProductUnitValue =>
                field.hasUnit
                  ? isDynamicUnitValue(item)
                  : typeof item === "string" ||
                    typeof item === "number" ||
                    typeof item === "boolean"
            ),
          };
        })
    );
  }, [values, variationSection]);

  const populatedVariationDimensions = variationDimensions.filter(
    (dimension) => dimension.values.length > 0
  );
  const hasVariationDimensions = populatedVariationDimensions.length > 0;

  const reservedOfferFields = useMemo(() => {
    const actualFieldMap = new Map<string, ProductTypeFieldDefinition>();

    for (const section of activeSections) {
      if (normalizeSectionName(section.headingName) !== OFFER_HEADING) {
        continue;
      }

      for (const group of section.groups) {
        for (const field of group.fields) {
          const normalizedKey = buildProductTypeFieldKey(field.key || field.label || "");

          if (
            DYNAMIC_VARIATION_OFFER_FIELD_KEYS.includes(
              normalizedKey as VariationOfferFieldKey
            )
          ) {
            actualFieldMap.set(normalizedKey, field);
          }
        }
      }
    }

    return DYNAMIC_VARIATION_OFFER_FIELD_KEYS.map((fieldKey) => {
      const field = actualFieldMap.get(fieldKey) || createFallbackVariationOfferField(fieldKey);

      return {
        key: fieldKey,
        field,
      };
    });
  }, [activeSections]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur md:p-5">
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!builder || !activeSections.length || !activeSection) {
    return null;
  }

  function updateFieldValue(params: {
    section: ProductTypeFieldBuilderSection;
    group: ProductTypeFieldBuilderGroup;
    field: ProductTypeFieldDefinition;
    value: DynamicProductFieldStoredValue;
    unit?: string;
  }) {
    onChange(upsertDynamicFieldValue(values, params));
  }

  function updateVariationMatrix(rows: DynamicProductVariationMatrixRow[]) {
    if (!variationSection) {
      return;
    }

    onChange(
      upsertStandaloneDynamicFieldValue(values, {
        sectionHeadingId: variationSection._id,
        sectionHeadingName: variationSection.headingName,
        groupName: DYNAMIC_VARIATION_META_GROUP_NAME,
        label: "Variation Matrix",
        key: DYNAMIC_VARIATION_MATRIX_FIELD_KEY,
        value: rows,
      })
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            Product Type Attributes
          </h2>
          <p className="text-sm font-semibold leading-6 text-slate-500">
            The form below comes directly from the selected product type. Use it
            for a single product or switch on variations to bulk-create child
            SKUs in one save flow.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
          <span>
            {activeSections.length} section{activeSections.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        {activeSections.map((section) => {
          const sectionKey = getSectionKey(section);
          const isSelected = sectionKey === getSectionKey(activeSection);
          const Icon = getSectionIcon(section.headingName);
          return (
            <button
              key={sectionKey}
              type="button"
              onClick={() => setSelectedSectionKey(sectionKey)}
              className={[
                "flex min-h-20 items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                isSelected
                  ? "border-[#00008b] bg-[#00008b]/5 shadow-[0_12px_24px_rgba(0,0,139,0.08)]"
                  : "border-slate-200 bg-white hover:border-[#00008b]/40 hover:bg-slate-50",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                  isSelected
                    ? "bg-[#00008b] text-white"
                    : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-black text-slate-900">
                  {section.headingName}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-950">
              {activeSection.headingName}
            </h3>
          </div>

          <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
            Active Section
          </div>
        </div>

        {normalizeSectionName(activeSection.headingName) === IMAGES_HEADING ? (
          <ImagesSectionRenderer
            section={activeSection}
            values={values}
            disabled={disabled}
            onUpdateField={updateFieldValue}
          />
        ) : normalizeSectionName(activeSection.headingName) === VARIATIONS_HEADING ? (
          <VariationsSectionRenderer
            section={activeSection}
            values={values}
            reservedOfferFields={reservedOfferFields}
            disabled={disabled}
            onUpdateField={updateFieldValue}
            onUpdateMatrix={updateVariationMatrix}
          />
        ) : (
          <AmazonStructuredSectionRenderer
            section={activeSection}
            values={values}
            disabled={disabled}
            searchableSelects
            hiddenFieldKeys={
              normalizeSectionName(activeSection.headingName) === OFFER_HEADING &&
              hasVariationDimensions
                ? new Set(DYNAMIC_VARIATION_OFFER_FIELD_KEYS)
                : undefined
            }
            onUpdateField={updateFieldValue}
          />
        )}
      </div>
    </section>
  );
}

function AmazonStructuredSectionRenderer({
  section,
  values,
  disabled,
  searchableSelects,
  hiddenFieldKeys,
  onUpdateField,
}: {
  section: ActiveProductTypeSection;
  values: DynamicProductFieldValues;
  disabled: boolean;
  searchableSelects?: boolean;
  hiddenFieldKeys?: Set<string>;
  onUpdateField: (params: {
    section: ProductTypeFieldBuilderSection;
    group: ProductTypeFieldBuilderGroup;
    field: ProductTypeFieldDefinition;
    value: DynamicProductFieldStoredValue;
    unit?: string;
  }) => void;
}) {
  const visibleGroups = section.groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => {
        const normalizedKey = buildProductTypeFieldKey(field.key || field.label || "");
        return !hiddenFieldKeys?.has(normalizedKey);
      }),
    }))
    .filter((group) => group.fields.length > 0);

  if (!visibleGroups.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm font-semibold text-slate-500">
        No visible fields in this section.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {visibleGroups.map((group) => (
        <div
          key={group._id || `${section.headingName}-${group.groupName}`}
          className="overflow-hidden rounded-[24px] border border-slate-200 bg-white"
        >
          {/* Group header */}
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h4 className="text-sm font-black text-slate-800">
              {group.groupName || "Field Group"}
            </h4>
          </div>

          {/* Fields as label-left, input-right rows */}
          <div>
            {group.fields.map((field, idx) => {
              const entry = getEntryValue(values, section, group, field);
              return (
                <div
                  key={field._id || field.key}
                  className={`flex items-start gap-4 px-4 py-3 ${
                    idx < group.fields.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div className="w-48 shrink-0 pt-2.5">
                    <span className="text-sm font-semibold text-slate-700">
                      {field.required ? (
                        <span className="mr-1 text-rose-500">*</span>
                      ) : null}
                      {field.label}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <FieldRenderer
                      section={section}
                      group={group}
                      field={field}
                      entry={entry}
                      disabled={disabled}
                      searchableSelects={searchableSelects}
                      onUpdateField={onUpdateField}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImagesSectionRenderer({
  section,
  values,
  disabled,
  onUpdateField,
}: {
  section: ActiveProductTypeSection;
  values: DynamicProductFieldValues;
  disabled: boolean;
  onUpdateField: (params: {
    section: ProductTypeFieldBuilderSection;
    group: ProductTypeFieldBuilderGroup;
    field: ProductTypeFieldDefinition;
    value: DynamicProductFieldStoredValue;
    unit?: string;
  }) => void;
}) {
  const allFields = section.groups.flatMap((group) =>
    group.fields.map((field) => ({ group, field }))
  );

  const uploadedCount = allFields.filter(({ group, field }) => {
    const entry = getEntryValue(values, section, group, field);
    if (field.addMore) return getFieldFileArray(entry?.value).length > 0;
    return getFieldFileValue(entry?.value) !== null;
  }).length;

  return (
    <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
      {/* Header */}
      <div>
        <h4 className="text-base font-black text-slate-900">
          Your image recommendations
        </h4>
        <p className="mt-0.5 text-sm font-medium text-slate-600">
          Upload your recommendations for product images.
        </p>
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#00008b] hover:underline"
        >
          See image guidelines
          <ChevronsUpDown className="h-3 w-3" />
        </button>
      </div>

      {/* Upload prompt + count */}
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[#00008b]">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#00008b] text-[11px] font-black leading-none">
            +
          </span>
          Upload multiple files or drag and drop 1 or more files below.
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Uploaded: {uploadedCount} of {allFields.length} images. Maximum{" "}
          {allFields.length} images are allowed. You can arrange the order after uploading.
        </p>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {allFields.map(({ group, field }, index) => {
          const entry = getEntryValue(values, section, group, field);
          return (
            <div key={field._id || field.key} className="flex flex-col items-center gap-1">
              {field.addMore ? (
                <ImageFieldRenderer
                  section={section}
                  group={group}
                  field={field}
                  entry={entry}
                  disabled={disabled}
                  onUpdateField={onUpdateField}
                />
              ) : (
                <AmazonImageTile
                  label={field.label}
                  value={getFieldFileValue(entry?.value)}
                  disabled={disabled}
                  onChange={(nextValue) =>
                    onUpdateField({ section, group, field, value: nextValue || "" })
                  }
                />
              )}
              {index === 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  MAIN
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AmazonImageTile({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: DynamicProductFileValue | null;
  disabled: boolean;
  onChange: (nextValue: DynamicProductFileValue | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imageFile = value?.file;
  const previewUrl = useMemo(() => {
    if (imageFile instanceof File) {
      return URL.createObjectURL(imageFile);
    }

    return value?.url || "";
  }, [imageFile, value?.url]);

  useEffect(() => {
    if (imageFile instanceof File) {
      return () => URL.revokeObjectURL(previewUrl);
    }
    return undefined;
  }, [imageFile, previewUrl]);

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationMessage = validateProductImageFile(file);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    onChange({
      ...(value?.url ? { url: value.url } : {}),
      ...(value?.publicId ? { publicId: value.publicId } : {}),
      fileName: file.name,
      mimeType: file.type,
      file,
    });
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={disabled}
      title={label}
      className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-100 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt={value?.fileName || label}
          fill
          unoptimized
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 33vw"
          className="object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <ImagePlus className="h-7 w-7 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Upload</span>
        </div>
      )}
    </button>
  );
}

function VariationsSectionRenderer({
  section,
  values,
  reservedOfferFields,
  disabled,
  onUpdateField,
  onUpdateMatrix,
}: {
  section: ActiveProductTypeSection;
  values: DynamicProductFieldValues;
  reservedOfferFields: Array<{
    key: VariationOfferFieldKey;
    field: ProductTypeFieldDefinition;
  }>;
  disabled: boolean;
  onUpdateField: (params: {
    section: ProductTypeFieldBuilderSection;
    group: ProductTypeFieldBuilderGroup;
    field: ProductTypeFieldDefinition;
    value: DynamicProductFieldStoredValue;
    unit?: string;
  }) => void;
  onUpdateMatrix: (rows: DynamicProductVariationMatrixRow[]) => void;
}) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const dimensionGroups = useMemo(() => section.groups, [section]);

  function getGroupKey(group: ProductTypeFieldBuilderGroup) {
    return String(group._id || group.groupName || "");
  }

  function toggleGroup(groupKey: string) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  const autoSelectedGroupIds = useMemo(() => {
    const next = new Set<string>();

    for (const group of section.groups) {
      const groupKey = getGroupKey(group);
      const hasSavedValues = group.fields.some((field) =>
        hasDynamicFieldValue(getEntryValue(values, section, group, field)?.value)
      );

      if (hasSavedValues) {
        next.add(groupKey);
      }
    }

    return next;
  }, [section, values]);
  const effectiveSelectedGroupIds = useMemo(() => {
    const merged = new Set(autoSelectedGroupIds);

    for (const groupId of selectedGroupIds) {
      merged.add(groupId);
    }

    return merged;
  }, [autoSelectedGroupIds, selectedGroupIds]);

  const dimensionFields = useMemo<VariationDimensionField[]>(() => {
    return section.groups
      .filter((group) => effectiveSelectedGroupIds.has(getGroupKey(group)))
      .flatMap((group) =>
        group.fields.map((field) => {
          const entry = getEntryValue(values, section, group, field);
          const fieldKey = buildProductTypeFieldKey(field.key || field.label || "");
          return {
            section,
            group,
            field,
            key: fieldKey,
            values: field.hasUnit
              ? getFieldUnitArray(entry?.value)
              : getFieldPrimitiveArray(entry?.value),
          };
        })
      );
  }, [effectiveSelectedGroupIds, section, values]);

  const populatedDimensions = dimensionFields.filter(
    (dimension) => dimension.values.length > 0
  );
  const matrixEntry =
    getDynamicFieldValueEntry(values, {
      sectionHeadingId: section._id,
      key: DYNAMIC_VARIATION_MATRIX_FIELD_KEY,
    }) || null;
  const currentMatrixRows = getMatrixRows(matrixEntry?.value);
  const generatedRows = useMemo(
    () => buildVariationRows(populatedDimensions, currentMatrixRows),
    [currentMatrixRows, populatedDimensions]
  );

  useEffect(() => {
    if (serializeVariationRows(currentMatrixRows) !== serializeVariationRows(generatedRows)) {
      onUpdateMatrix(generatedRows);
    }
  }, [currentMatrixRows, generatedRows, onUpdateMatrix]);

  const activeGroups = section.groups.filter((group) =>
    effectiveSelectedGroupIds.has(getGroupKey(group))
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <PackagePlus className="h-4.5 w-4.5" />
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-900">Single Product</h4>
              <p className="text-xs font-semibold text-slate-500">
                Leave variation types unselected when this product has one sellable SKU only.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
            {activeGroups.length === 0 ? "Current Method" : "Available"}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
              <Boxes className="h-4.5 w-4.5" />
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-900">Bulk Product Variations</h4>
              <p className="text-xs font-semibold text-slate-500">
                Choose one or more variation groups to generate child rows with images, status,
                SKU fields, and variant details.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#00008b]">
            {generatedRows.length
              ? `${generatedRows.length} Variant${generatedRows.length === 1 ? "" : "s"} Ready`
              : "Select Variation Types"}
          </div>
        </div>
      </div>

      {/* Instructional notice */}
      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-medium leading-6 text-slate-600">
        To list variations (for example, the same product in a different size or colour), begin by
        selecting a variation type below. The variation type cannot be edited after the parent SKU
        is created.{" "}
        <a href="#" className="text-[#00008b] underline">
          how to create product variations
        </a>
        .
      </div>

      {/* Choose Variation type checkboxes */}
      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-slate-800">Choose Variation type:</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {dimensionGroups.map((group) => {
            const groupKey = getGroupKey(group);
            const isChecked = selectedGroupIds.has(groupKey);
            return (
              <label
                key={groupKey}
                className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleGroup(groupKey)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                />
                {group.groupName}
              </label>
            );
          })}
        </div>
      </div>

      {/* Variant value inputs — only for selected groups */}
      {activeGroups.length > 0 ? (
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="mb-1 text-sm font-bold text-slate-800">
            List all of your variants for the variation types below.
          </p>
          <p className="mb-4 text-xs font-medium leading-5 text-slate-500">
            For the fields below, list the variations that exist for your products. For example, if
            you are selling Pirate Shirts in the sizes Small, Medium and Large, and in the colours
            White and Black, list all those terms. This is necessary even if you do not carry every
            combination or are temporarily out of stock on some.
          </p>
          <div className="space-y-5">
            {activeGroups.map((group) =>
              group.fields.map((field) => (
                <div key={field._id || field.key} className="space-y-1">
                  <FieldRenderer
                    section={section}
                    group={group}
                    field={{ ...field, addMore: true }}
                    entry={getEntryValue(values, section, group, field)}
                    disabled={disabled}
                    searchableSelects
                    onUpdateField={onUpdateField}
                  />
                  {field.placeholder ? (
                    <p className="pl-1 text-xs font-medium text-slate-400">
                      Example: {field.placeholder}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {populatedDimensions.length ? (
        <VariationMatrixTable
          rows={generatedRows}
          dimensions={populatedDimensions}
          offerFields={reservedOfferFields.filter(
            ({ key }) => !["yourPrice", "quantity", "offerConditionNote"].includes(key)
          )}
          disabled={disabled}
          onChange={(nextRows) => onUpdateMatrix(nextRows)}
        />
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm font-semibold text-slate-500">
          Add at least one repeated variation value to generate the variation matrix.
        </div>
      )}
    </div>
  );
}

function FieldRenderer({
  section,
  group,
  field,
  entry,
  disabled,
  searchableSelects,
  onUpdateField,
}: {
  section: ProductTypeFieldBuilderSection;
  group: ProductTypeFieldBuilderGroup;
  field: ProductTypeFieldDefinition;
  entry: DynamicProductFieldValueEntry | null;
  disabled: boolean;
  searchableSelects?: boolean;
  onUpdateField: (params: {
    section: ProductTypeFieldBuilderSection;
    group: ProductTypeFieldBuilderGroup;
    field: ProductTypeFieldDefinition;
    value: DynamicProductFieldStoredValue;
    unit?: string;
  }) => void;
}) {
  const currentValue = entry?.value;
  const currentUnit = String(entry?.unit || "").trim();
  const currentPrimitiveValue = getFieldPrimitiveValue(currentValue);

  function pushValue(nextValue: DynamicProductFieldStoredValue, unit = currentUnit) {
    onUpdateField({
      section,
      group,
      field,
      value: nextValue,
      unit,
    });
  }

  if (field.inputType === "file" && normalizeSectionName(section.headingName) === IMAGES_HEADING) {
    return (
      <ImageFieldRenderer
        section={section}
        group={group}
        field={field}
        entry={entry}
        disabled={disabled}
        onUpdateField={onUpdateField}
      />
    );
  }

  if (field.addMore && field.inputType === "file") {
    return (
      <FieldShell field={field}>
        <RepeatableFileFieldControl
          values={getFieldFileArray(currentValue)}
          disabled={disabled}
          isImageField={false}
          onChange={(nextValue) => pushValue(nextValue)}
        />
      </FieldShell>
    );
  }

  if (field.inputType === "file") {
    return (
      <FieldShell field={field}>
        <SingleFileFieldControl
          value={getFieldFileValue(currentValue)}
          disabled={disabled}
          isImageField={false}
          onChange={(nextValue) => pushValue(nextValue || "")}
        />
      </FieldShell>
    );
  }

  if (field.addMore) {
    return (
      <FieldShell field={field}>
        <RepeatableValueFieldControl
          field={field}
          values={
            field.hasUnit ? getFieldUnitArray(currentValue) : getFieldPrimitiveArray(currentValue)
          }
          disabled={disabled}
          searchableSelects={searchableSelects}
          onChange={(nextValue) => pushValue(nextValue)}
        />
      </FieldShell>
    );
  }

  return (
    <FieldShell field={field}>
      <ScalarValueControl
        field={field}
        value={
          field.inputType === "multiSelect"
            ? getFieldPrimitiveArray(currentValue)
            : getFieldPrimitiveValue(currentValue)
        }
        multiSelectValues={getFieldPrimitiveArray(currentValue)}
        unit={currentUnit}
        disabled={disabled}
        searchableSelects={searchableSelects}
        onValueChange={(nextValue) => pushValue(nextValue)}
        onUnitChange={(nextUnit) => pushValue(currentPrimitiveValue, nextUnit)}
      />
    </FieldShell>
  );
}

function FieldShell({
  field,
  children,
}: {
  field: ProductTypeFieldDefinition;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1 text-sm font-semibold text-slate-700">
        <span>{field.label}</span>
        {field.required ? <span className="text-rose-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function ScalarValueControl({
  field,
  value,
  multiSelectValues,
  unit,
  disabled,
  searchableSelects,
  onValueChange,
  onUnitChange,
}: {
  field: ProductTypeFieldDefinition;
  value: DynamicProductPrimitiveValue | DynamicProductPrimitiveValue[] | "";
  multiSelectValues?: DynamicProductPrimitiveValue[];
  unit: string;
  disabled: boolean;
  searchableSelects?: boolean;
  onValueChange: (
    nextValue: DynamicProductPrimitiveValue | DynamicProductPrimitiveValue[] | ""
  ) => void;
  onUnitChange: (nextUnit: string) => void;
}) {
  const plainValue =
    typeof value === "string" || typeof value === "number" ? String(value) : "";
  const options = toOptionList(field.options);

  const inputControl =
    field.inputType === "textarea" ? (
      <textarea
        value={plainValue}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={field.placeholder || `Enter ${field.label}`}
        disabled={disabled}
        className={textareaClassName(disabled)}
      />
    ) : field.inputType === "select" || field.inputType === "radio" ? (
      searchableSelects ? (
        <SearchableSelect
          label={field.label}
          icon={PackagePlus}
          value={plainValue}
          options={options}
          placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
          searchPlaceholder={`Search ${field.label.toLowerCase()}`}
          disabled={disabled}
          required={field.required}
          onChange={(nextValue) => onValueChange(nextValue)}
        />
      ) : (
        <select
          value={plainValue}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={disabled}
          className={baseInputClassName(disabled)}
        >
          <option value="">
            {field.placeholder || `Select ${field.label.toLowerCase()}`}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    ) : field.inputType === "multiSelect" ? (
      <MultiSelectControl
        field={field}
        value={multiSelectValues || []}
        disabled={disabled}
        onChange={(nextValues) => onValueChange(nextValues)}
      />
    ) : field.inputType === "checkbox" || field.inputType === "boolean" ? (
      <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onValueChange(event.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
        />
        <span className="text-sm font-medium text-slate-700">
          {value === true ? "Enabled" : "Disabled"}
        </span>
      </label>
    ) : (
      <input
        type={
          field.inputType === "date"
            ? "date"
            : field.inputType === "number"
              ? "number"
              : "text"
        }
        value={plainValue}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={field.placeholder || `Enter ${field.label}`}
        disabled={disabled}
        className={baseInputClassName(disabled)}
      />
    );

  if (
    field.inputType === "textarea" ||
    field.inputType === "checkbox" ||
    field.inputType === "boolean" ||
    field.inputType === "multiSelect"
  ) {
    return field.hasUnit ? (
      <div className="space-y-3">
        {inputControl}
        <UnitSelect
          value={unit}
          options={field.unitOptions || []}
          disabled={disabled}
          onChange={onUnitChange}
        />
      </div>
    ) : (
      inputControl
    );
  }

  return field.hasUnit ? (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      {inputControl}
      <UnitSelect
        value={unit}
        options={field.unitOptions || []}
        disabled={disabled}
        onChange={onUnitChange}
      />
    </div>
  ) : (
    inputControl
  );
}

function UnitSelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (nextUnit: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={baseInputClassName(disabled)}
    >
      <option value="">Select unit</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function MultiSelectControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ProductTypeFieldDefinition;
  value: DynamicProductPrimitiveValue[];
  disabled: boolean;
  onChange: (nextValues: DynamicProductPrimitiveValue[]) => void;
}) {
  const selectedValues = value.map((item) => String(item));
  const options = field.options || [];

  function toggleOption(option: string) {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((item) => item !== option));
      return;
    }

    onChange([...selectedValues, option]);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              disabled={disabled}
              className={`inline-flex min-h-10 items-center rounded-full border px-3 py-2 text-sm font-semibold transition ${
                selected
                  ? "border-[#00008b] bg-[#00008b] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selectedValues.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((selectedValue) => (
            <span
              key={selectedValue}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
            >
              {selectedValue}
              <button
                type="button"
                onClick={() => toggleOption(selectedValue)}
                disabled={disabled}
                className="text-slate-500 transition hover:text-slate-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs font-medium text-slate-500">
          Select one or more options.
        </p>
      )}
    </div>
  );
}

function RepeatableValueFieldControl({
  field,
  values,
  disabled,
  searchableSelects,
  onChange,
}: {
  field: ProductTypeFieldDefinition;
  values: Array<DynamicProductPrimitiveValue | DynamicProductUnitValue>;
  disabled: boolean;
  searchableSelects?: boolean;
  onChange: (
    nextValues:
      | DynamicProductPrimitiveValue[]
      | DynamicProductUnitValue[]
  ) => void;
}) {
  const [draftValue, setDraftValue] = useState<DynamicProductPrimitiveValue | "">("");
  const [draftUnit, setDraftUnit] = useState("");

  const primitiveValues = values.filter(
    (item): item is DynamicProductPrimitiveValue => !isDynamicUnitValue(item)
  );
  const unitValues = values.filter((item): item is DynamicProductUnitValue =>
    isDynamicUnitValue(item)
  );

  function addValue() {
    const hasDraftValue =
      draftValue === true ||
      draftValue === false ||
      String(draftValue || "").trim().length > 0;

    if (!hasDraftValue) {
      return;
    }

    if (field.hasUnit) {
      onChange([
        ...unitValues,
        {
          value: draftValue === "" ? "" : draftValue,
          ...(draftUnit ? { unit: draftUnit } : {}),
        } as DynamicProductUnitValue,
      ]);
    } else {
      onChange([...primitiveValues, draftValue]);
    }

    setDraftValue("");
    setDraftUnit("");
  }

  function removeValue(index: number) {
    if (field.hasUnit) {
      onChange(unitValues.filter((_, itemIndex) => itemIndex !== index));
      return;
    }

    onChange(primitiveValues.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto]">
        <ScalarValueControl
          field={{
            ...field,
            hasUnit: false,
            inputType: field.inputType === "multiSelect" ? "select" : field.inputType,
          }}
          value={draftValue}
          unit=""
          disabled={disabled}
          searchableSelects={searchableSelects}
          onValueChange={(nextValue) => {
            if (!Array.isArray(nextValue)) {
              setDraftValue(nextValue);
            }
          }}
          onUnitChange={() => undefined}
        />
        {field.hasUnit ? (
          <UnitSelect
            value={draftUnit}
            options={field.unitOptions || []}
            disabled={disabled}
            onChange={setDraftUnit}
          />
        ) : (
          <div className="hidden md:block" />
        )}
        <button
          type="button"
          onClick={addValue}
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((item, index) => (
            <span
              key={`${describeStoredValue(item)}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
            >
              {describeStoredValue(item)}
              <button
                type="button"
                onClick={() => removeValue(index)}
                disabled={disabled}
                className="text-slate-500 transition hover:text-slate-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs font-medium text-slate-500">
          Add one or more values for this field.
        </p>
      )}
    </div>
  );
}

function ImageFieldRenderer({
  section,
  group,
  field,
  entry,
  disabled,
  onUpdateField,
}: {
  section: ProductTypeFieldBuilderSection;
  group: ProductTypeFieldBuilderGroup;
  field: ProductTypeFieldDefinition;
  entry: DynamicProductFieldValueEntry | null;
  disabled: boolean;
  onUpdateField: (params: {
    section: ProductTypeFieldBuilderSection;
    group: ProductTypeFieldBuilderGroup;
    field: ProductTypeFieldDefinition;
    value: DynamicProductFieldStoredValue;
    unit?: string;
  }) => void;
}) {
  const currentValue = entry?.value;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1 text-sm font-semibold text-slate-700">
        <span>{field.label}</span>
        {field.required ? <span className="text-rose-500">*</span> : null}
      </label>

      {field.addMore ? (
        <RepeatableFileFieldControl
          values={getFieldFileArray(currentValue)}
          disabled={disabled}
          isImageField
          onChange={(nextValue) =>
            onUpdateField({
              section,
              group,
              field,
              value: nextValue,
            })
          }
        />
      ) : (
        <SingleFileFieldControl
          value={getFieldFileValue(currentValue)}
          disabled={disabled}
          isImageField
          onChange={(nextValue) =>
            onUpdateField({
              section,
              group,
              field,
              value: nextValue || "",
            })
          }
        />
      )}
    </div>
  );
}

function SingleFileFieldControl({
  value,
  disabled,
  isImageField,
  onChange,
}: {
  value: DynamicProductFileValue | null;
  disabled: boolean;
  isImageField: boolean;
  onChange: (nextValue: DynamicProductFileValue | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (isImageField) {
      const validationMessage = validateProductImageFile(file);

      if (validationMessage) {
        toast.error(validationMessage);
        return;
      }
    }

    onChange({
      ...(value?.url ? { url: value.url } : {}),
      ...(value?.publicId ? { publicId: value.publicId } : {}),
      fileName: file.name,
      mimeType: file.type,
      file,
    });
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <input
        ref={inputRef}
        type="file"
        accept={isImageField ? "image/*" : undefined}
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#00008b] shadow-sm">
          <ImagePlus className="h-7 w-7" />
        </div>

        <p className="text-sm font-black text-slate-900">
          {value?.fileName || "Upload"}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {value?.file instanceof File
            ? formatFileSize(value.file.size)
            : value?.url
              ? "Existing file attached"
              : "PNG, JPG, JPEG, WEBP"}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Choose File
          </button>

          {value?.url ? (
            <a
              href={value.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Open
            </a>
          ) : null}

          {(value?.fileName || value?.url) ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RepeatableFileFieldControl({
  values,
  disabled,
  isImageField,
  onChange,
}: {
  values: DynamicProductFileValue[];
  disabled: boolean;
  isImageField: boolean;
  onChange: (nextValues: DynamicProductFileValue[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length) {
      return;
    }

    const nextItems: DynamicProductFileValue[] = [];

    for (const file of files) {
      if (isImageField) {
        const validationMessage = validateProductImageFile(file);

        if (validationMessage) {
          toast.error(validationMessage);
          return;
        }
      }

      nextItems.push({
        fileName: file.name,
        mimeType: file.type,
        file,
      });
    }

    onChange([...values, ...nextItems]);
  }

  function removeAt(index: number) {
    onChange(values.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveAt(index: number, direction: "up" | "down") {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    onChange(moveItem(values, index, nextIndex));
  }

  return (
    <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={isImageField ? "image/*" : undefined}
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Upload Multiple Files
        </button>

        <p className="text-xs font-semibold text-slate-500">
          {values.length} file{values.length === 1 ? "" : "s"} uploaded
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 disabled:cursor-not-allowed"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#00008b] shadow-sm">
            <ImagePlus className="h-7 w-7" />
          </div>
          <p className="text-base font-black text-slate-900">Upload</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Drag in new product images any time
          </p>
        </button>

        {values.map((fileValue, index) => (
          <FileTile
            key={`${fileValue.fileName || fileValue.url || "file"}-${index}`}
            value={fileValue}
            index={index}
            disabled={disabled}
            onRemove={() => removeAt(index)}
            onMoveUp={() => moveAt(index, "up")}
            onMoveDown={() => moveAt(index, "down")}
          />
        ))}
      </div>
    </div>
  );
}

function FileTile({
  value,
  index,
  disabled,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  value: DynamicProductFileValue;
  index: number;
  disabled: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const previewUrl = useMemo(() => {
    if (value.file instanceof File) {
      return URL.createObjectURL(value.file);
    }

    return value.url || "";
  }, [value.file, value.url]);

  useEffect(() => {
    if (value.file instanceof File) {
      return () => URL.revokeObjectURL(previewUrl);
    }

    return undefined;
  }, [previewUrl, value.file]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <div className="relative flex min-h-[180px] items-center justify-center bg-slate-100">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={value.fileName || `Uploaded file ${index + 1}`}
            fill
            unoptimized
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <FileImage className="h-8 w-8" />
            <span className="text-xs font-bold">No preview</span>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-2 text-sm font-black text-slate-900">
            {value.fileName || `Image ${index + 1}`}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {value.file instanceof File ? formatFileSize(value.file.size) : "Existing image"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUp className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onMoveDown}
            disabled={disabled}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDown className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function VariationMatrixTable({
  rows,
  dimensions,
  offerFields,
  disabled,
  onChange,
}: {
  rows: DynamicProductVariationMatrixRow[];
  dimensions: VariationDimensionField[];
  offerFields: Array<{
    key: VariationOfferFieldKey;
    field: ProductTypeFieldDefinition;
  }>;
  disabled: boolean;
  onChange: (nextRows: DynamicProductVariationMatrixRow[]) => void;
}) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] =
    useState<DynamicProductVariationMatrixStatus>("AVAILABLE");

  function updateRow(
    rowIndex: number,
    updater: (row: DynamicProductVariationMatrixRow) => DynamicProductVariationMatrixRow
  ) {
    onChange(
      rows.map((row, currentIndex) =>
        currentIndex === rowIndex ? updater(row) : row
      )
    );
  }

  function updateCell(
    rowIndex: number,
    fieldKey: VariationOfferFieldKey,
    nextValue: DynamicProductPrimitiveValue | ""
  ) {
    updateRow(rowIndex, (row) => {
        const nextValues = { ...(row.values || {}) };

        if (nextValue === "") {
          delete nextValues[fieldKey];
        } else {
          nextValues[fieldKey] = nextValue;
        }

        return {
          ...row,
          values: nextValues,
        };
      });
  }

  function updateImage(rowIndex: number, nextValue: DynamicProductFileValue | null) {
    updateRow(rowIndex, (row) => ({
      ...row,
      ...(nextValue ? { mainImage: nextValue } : {}),
      ...(nextValue ? {} : { mainImage: null }),
    }));
  }

  function updateStatus(
    rowIndex: number,
    nextValue: DynamicProductVariationMatrixStatus
  ) {
    updateRow(rowIndex, (row) => ({
      ...row,
      status: nextValue,
    }));
  }

  function updateDetails(rowIndex: number, nextValue: string) {
    updateRow(rowIndex, (row) => ({
      ...row,
      ...(nextValue.trim() ? { details: nextValue } : {}),
      ...(nextValue.trim() ? {} : { details: "" }),
    }));
  }

  const visibleRows = rows.filter((row) => row.comboKey.trim());
  const effectiveSelectedRowKeys = useMemo(
    () =>
      new Set(
        Array.from(selectedRowKeys).filter((comboKey) =>
          visibleRows.some((row) => row.comboKey === comboKey)
        )
      ),
    [selectedRowKeys, visibleRows]
  );

  function toggleRow(comboKey: string) {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(comboKey)) {
        next.delete(comboKey);
      } else {
        next.add(comboKey);
      }
      return next;
    });
  }

  function toggleAllRows() {
    if (effectiveSelectedRowKeys.size === visibleRows.length) {
      setSelectedRowKeys(new Set());
    } else {
      setSelectedRowKeys(new Set(visibleRows.map((r) => r.comboKey)));
    }
  }

  function applyStatusToSelection() {
    const targetKeys =
      effectiveSelectedRowKeys.size > 0
        ? effectiveSelectedRowKeys
        : new Set(visibleRows.map((row) => row.comboKey));

    onChange(
      rows.map((row) =>
        targetKeys.has(row.comboKey)
          ? {
              ...row,
              status: bulkStatus,
            }
          : row
      )
    );
  }

  if (!visibleRows.length) {
    return null;
  }

  const allSelected =
    visibleRows.length > 0 && effectiveSelectedRowKeys.size === visibleRows.length;
  const someSelected = effectiveSelectedRowKeys.size > 0;

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      {/* Info banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium leading-5 text-amber-800">
        Variation rows are created automatically from the values above. Use this table to upload
        each child image, set row status, and complete per-variant identifiers before saving.
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
          {someSelected
            ? `${effectiveSelectedRowKeys.size} row${effectiveSelectedRowKeys.size === 1 ? "" : "s"} selected`
            : "No rows selected. Bulk status applies to all rows."}
        </div>
        <select
          value={bulkStatus}
          onChange={(event) =>
            setBulkStatus(event.target.value as DynamicProductVariationMatrixStatus)
          }
          disabled={disabled}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          {VARIATION_ROW_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applyStatusToSelection}
          disabled={disabled || visibleRows.length === 0}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Status
        </button>
        <span className="text-sm font-semibold text-slate-600">
          {visibleRows.length} variation{visibleRows.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1680px] w-full border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th className="w-16 px-3 py-3 text-left align-top">
                <div className="flex flex-col items-start gap-1">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllRows}
                    className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                  />
                  <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                    Select
                  </span>
                </div>
              </th>

              <th className="min-w-[220px] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                Variant
              </th>
              <th className="min-w-[160px] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                Main Image
              </th>
              <th className="min-w-[160px] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                Status
              </th>
              <th className="min-w-[240px] px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                Variant Details
              </th>

              {dimensions.map((dimension) => (
                <th
                  key={dimension.key}
                  className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-700"
                >
                  {dimension.field.label}
                </th>
              ))}

              {offerFields.map(({ key, field }) => (
                <th
                  key={key}
                  className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-700"
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, rowIndex) => {
              const isSelected = effectiveSelectedRowKeys.has(row.comboKey);
              return (
                <tr
                  key={row.comboKey}
                  className={`border-t border-slate-200 transition ${isSelected ? "bg-blue-50/50" : ""}`}
                >
                  {/* Row checkbox */}
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(row.comboKey)}
                      className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                    />
                  </td>

                  <td className="px-3 py-3 align-top">
                    <VariantRowSummary
                      row={row}
                      dimensions={dimensions}
                    />
                  </td>

                  <td className="px-3 py-3 align-top">
                    <VariationMatrixImageCell
                      value={row.mainImage || null}
                      disabled={disabled}
                      label={`Variation image ${rowIndex + 1}`}
                      onChange={(nextValue) => updateImage(rowIndex, nextValue)}
                    />
                  </td>

                  <td className="px-3 py-3 align-top">
                    <select
                      value={row.status || "AVAILABLE"}
                      onChange={(event) =>
                        updateStatus(
                          rowIndex,
                          event.target.value as DynamicProductVariationMatrixStatus
                        )
                      }
                      disabled={disabled}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      {VARIATION_ROW_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-3 align-top">
                    <textarea
                      value={row.details || ""}
                      onChange={(event) => updateDetails(rowIndex, event.target.value)}
                      placeholder="Add short variant notes, bundle info, or model-specific details"
                      disabled={disabled}
                      className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </td>

                  {dimensions.map((dimension) => (
                    <td key={`${row.comboKey}-${dimension.key}`} className="px-3 py-3 align-top">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                        {row.dimensions[dimension.key]
                          ? describeStoredValue(row.dimensions[dimension.key])
                          : "-"}
                      </span>
                    </td>
                  ))}

                  {offerFields.map(({ key, field }) => (
                    <td key={`${row.comboKey}-${key}`} className="min-w-[180px] px-3 py-3 align-top">
                      <MatrixOfferCell
                        field={field}
                        value={
                          typeof row.values[key] === "string" ||
                          typeof row.values[key] === "number" ||
                          typeof row.values[key] === "boolean"
                            ? row.values[key]
                            : ""
                        }
                        disabled={disabled}
                        onChange={(nextValue) => updateCell(rowIndex, key, nextValue)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VariantRowSummary({
  row,
  dimensions,
}: {
  row: DynamicProductVariationMatrixRow;
  dimensions: VariationDimensionField[];
}) {
  const summary = dimensions
    .map((dimension) => {
      const value = row.dimensions[dimension.key];
      const readableValue = value ? describeStoredValue(value) : "";

      return readableValue
        ? `${dimension.field.label}: ${readableValue}`
        : "";
    })
    .filter(Boolean);
  const status = row.status || "AVAILABLE";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {summary.length ? (
          summary.map((item) => (
            <span
              key={item}
              className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm font-semibold text-slate-500">
            Variation values will appear here.
          </span>
        )}
      </div>
      <span
        className={[
          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em]",
          status === "AVAILABLE"
            ? "bg-emerald-100 text-emerald-700"
            : status === "OUT_OF_STOCK"
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-200 text-slate-700",
        ].join(" ")}
      >
        {status.replaceAll("_", " ")}
      </span>
    </div>
  );
}

function VariationMatrixImageCell({
  value,
  disabled,
  label,
  onChange,
}: {
  value: DynamicProductFileValue | null;
  disabled: boolean;
  label: string;
  onChange: (nextValue: DynamicProductFileValue | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imageFile = value?.file;
  const previewUrl = useMemo(() => {
    if (imageFile instanceof File) {
      return URL.createObjectURL(imageFile);
    }

    return value?.url || "";
  }, [imageFile, value?.url]);

  useEffect(() => {
    if (imageFile instanceof File) {
      return () => URL.revokeObjectURL(previewUrl);
    }
    return undefined;
  }, [imageFile, previewUrl]);

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationMessage = validateProductImageFile(file);

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    onChange({
      ...(value?.url ? { url: value.url } : {}),
      ...(value?.publicId ? { publicId: value.publicId } : {}),
      fileName: file.name,
      mimeType: file.type,
      file,
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 transition hover:border-[#00008b]/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={value?.fileName || label}
            fill
            unoptimized
            sizes="160px"
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <ImagePlus className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.14em]">
              Upload
            </span>
          </div>
        )}
      </button>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-slate-500">
          {value?.fileName || (value?.url ? "Existing image" : "No image")}
        </span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MatrixOfferCell({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ProductTypeFieldDefinition;
  value: DynamicProductPrimitiveValue | "";
  disabled: boolean;
  onChange: (nextValue: DynamicProductPrimitiveValue | "") => void;
}) {
  const plainValue =
    typeof value === "string" || typeof value === "number" ? String(value) : "";

  if (field.inputType === "textarea") {
    return (
      <textarea
        value={plainValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder || `Enter ${field.label}`}
        disabled={disabled}
        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    );
  }

  if (field.inputType === "select" || field.inputType === "radio") {
    return (
      <select
        value={plainValue}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <option value="">
          {field.placeholder || `Select ${field.label.toLowerCase()}`}
        </option>
        {(field.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.inputType === "number" ? "number" : "text"}
      value={plainValue}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder || `Enter ${field.label}`}
      disabled={disabled}
      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
    />
  );
}

function SearchableSelect({
  label,
  icon: Icon,
  value,
  options,
  placeholder,
  searchPlaceholder,
  disabled,
  required,
  onChange,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  options: FieldOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    const selectedOption = options.find((option) => option.value === value);
    return selectedOption?.label || value;
  }, [options, value]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, options]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return;
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div className="space-y-2">
      <label className="hidden items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>

      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (disabled) {
              return;
            }

            if (open) {
              setQuery("");
            }

            setOpen((previous) => !previous);
          }}
          disabled={disabled}
          className={`flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm shadow-sm transition ${
            disabled
              ? "cursor-not-allowed bg-slate-50 text-slate-400"
              : "border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <span className={selectedLabel ? "text-slate-700" : "text-slate-400"}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-slate-400" />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder || "Search..."}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300"
              />
            </div>

            <div className="mt-3 max-h-56 overflow-y-auto">
              {filteredOptions.length ? (
                <div className="space-y-1">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                        value === option.value
                          ? "bg-slate-100 font-semibold text-slate-900"
                          : "text-slate-700"
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {value === option.value ? (
                        <Check className="ml-auto h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  No matching options found.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
