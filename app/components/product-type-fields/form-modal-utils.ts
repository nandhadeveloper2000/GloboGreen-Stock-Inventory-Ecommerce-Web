"use client";

import {
  buildProductTypeFieldKey,
  createEmptyProductTypeFieldDefinition,
  getProductTypeFieldRefId,
  normalizeCommaSeparatedList,
  normalizeProductTypeFieldBuilder,
  normalizeProductTypeFieldHeading,
  PRODUCT_TYPE_FIELD_HEADINGS,
  PRODUCT_TYPE_FIELD_INPUT_TYPES,
  sortProductTypeFieldSections,
} from "@/lib/product-type-fields";
import type {
  ProductTypeFieldBuilderDocument,
  ProductTypeFieldBuilderGroup,
  ProductTypeFieldBuilderSection,
  ProductTypeFieldDefinition,
  ProductTypeFieldInputType,
} from "@/types/product-type-fields";

type ProductTypeFieldCsvRow = {
  sectionHeading: string;
  groupName: string;
  fieldName: string;
  fieldKey: string;
  inputType: string;
  placeholder: string;
  options: string;
  unitOptions: string;
  sort: string;
  required: string;
  addMore: string;
  hasUnit: string;
  active: string;
};

const PRODUCT_TYPE_FIELD_IMPORT_HEADERS = [
  "Section / Tab Name",
  "Group Name",
  "Field Name",
  "Field Key",
  "Input Type",
  "Placeholder",
  "Options",
  "Unit Options",
  "Sort",
  "Required",
  "Add More",
  "Has Unit",
  "Active",
];

function canSkipMissingOptionsValidation(field: ProductTypeFieldDefinition) {
  const normalizedKey = buildProductTypeFieldKey(field.key || field.label || "");

  return normalizedKey === "externalProductIdType";
}

export function makeLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `tmp-${prefix}-${crypto.randomUUID()}`;
  }

  return `tmp-${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getErrorMessage(error: unknown, fallback: string) {
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

  return fallback;
}

export function withLocalIds(
  value?: Partial<ProductTypeFieldBuilderDocument> | null
): ProductTypeFieldBuilderDocument {
  const normalized = normalizeProductTypeFieldBuilder(value);

  return {
    ...normalized,
    sectionHeadings: sortProductTypeFieldSections(normalized.sectionHeadings).map(
      (section) => ({
        ...section,
        _id: section._id || makeLocalId("section"),
        groups: (section.groups || []).map((group) => ({
          ...group,
          _id: group._id || makeLocalId("group"),
          fields: (group.fields || []).map((field, index) => ({
            ...field,
            _id: field._id || makeLocalId("field"),
            sortOrder:
              Number.isFinite(Number(field.sortOrder)) && Number(field.sortOrder) > 0
                ? Number(field.sortOrder)
                : index + 1,
          })),
        })),
      })
    ),
  };
}

function cleanFieldForSave(field: ProductTypeFieldDefinition, index: number) {
  return {
    ...(field._id ? { _id: field._id } : {}),
    label: String(field.label || "").trim(),
    key: buildProductTypeFieldKey(field.key || field.label || ""),
    inputType: field.inputType,
    placeholder: String(field.placeholder || "").trim(),
    options: Array.isArray(field.options)
      ? field.options.map((item) => item.trim()).filter(Boolean)
      : [],
    unitOptions: Array.isArray(field.unitOptions)
      ? field.unitOptions.map((item) => item.trim()).filter(Boolean)
      : [],
    sortOrder:
      Number.isFinite(Number(field.sortOrder)) && Number(field.sortOrder) > 0
        ? Number(field.sortOrder)
        : index + 1,
    required: Boolean(field.required),
    addMore: Boolean(field.addMore),
    hasUnit: Boolean(field.hasUnit),
    active: field.active !== false,
  };
}

export function cleanBuilderForSave(builder: ProductTypeFieldBuilderDocument) {
  return {
    categoryId: getProductTypeFieldRefId(builder.categoryId),
    subcategoryId: getProductTypeFieldRefId(builder.subcategoryId),
    productTypeId: getProductTypeFieldRefId(builder.productTypeId),
    isActive: builder.isActive !== false,
    sectionHeadings: sortProductTypeFieldSections(builder.sectionHeadings || []).map(
      (section, sectionIndex) => ({
        ...(section._id ? { _id: section._id } : {}),
        headingName: section.headingName,
        sortOrder:
          Number.isFinite(Number(section.sortOrder)) && Number(section.sortOrder) > 0
            ? Number(section.sortOrder)
            : sectionIndex + 1,
        isActive: section.isActive !== false,
        groups: (section.groups || []).map((group, groupIndex) => ({
          ...(group._id ? { _id: group._id } : {}),
          groupName: String(group.groupName || "").trim(),
          sortOrder:
            Number.isFinite(Number(group.sortOrder)) && Number(group.sortOrder) > 0
              ? Number(group.sortOrder)
              : groupIndex + 1,
          isActive: group.isActive !== false,
          fields: (group.fields || []).map((field, fieldIndex) =>
            cleanFieldForSave(field, fieldIndex)
          ),
        })),
      })
    ),
  };
}

export function hasDuplicateFieldKeys(builder: ProductTypeFieldBuilderDocument) {
  for (const section of builder.sectionHeadings || []) {
    for (const group of section.groups || []) {
      const seen = new Set<string>();

      for (const field of group.fields || []) {
        const key = buildProductTypeFieldKey(field.key || field.label || "");

        if (!key) {
          continue;
        }

        if (seen.has(key)) {
          return key;
        }

        seen.add(key);
      }
    }
  }

  return "";
}

export function validateProductTypeFieldBuilder(
  builder: ProductTypeFieldBuilderDocument
) {
  if (!getProductTypeFieldRefId(builder.categoryId)) {
    return "Category is required";
  }

  if (!getProductTypeFieldRefId(builder.subcategoryId)) {
    return "Subcategory is required";
  }

  if (!getProductTypeFieldRefId(builder.productTypeId)) {
    return "Product Type is required";
  }

  const duplicateKey = hasDuplicateFieldKeys(builder);

  if (duplicateKey) {
    return `Duplicate field key "${duplicateKey}" is not allowed inside the same group`;
  }

  for (const section of builder.sectionHeadings || []) {
    if (section.isActive === false) {
      continue;
    }

    for (const group of section.groups || []) {
      if (group.isActive === false) {
        continue;
      }

      if (!String(group.groupName || "").trim()) {
        return `Group name is required inside ${section.headingName}`;
      }

      for (const field of group.fields || []) {
        if (field.active === false) {
          continue;
        }

        if (!String(field.label || "").trim()) {
          return `Field label is required inside ${group.groupName}`;
        }

        if (
          ["select", "multiSelect", "radio"].includes(field.inputType) &&
          !(field.options || []).length &&
          !canSkipMissingOptionsValidation(field)
        ) {
          return `Options are required for ${field.label} inside ${group.groupName}`;
        }

        if (field.hasUnit && !(field.unitOptions || []).length) {
          return `Unit options are required for ${field.label} inside ${group.groupName}`;
        }
      }
    }
  }

  return "";
}

export function updateSectionList(
  builder: ProductTypeFieldBuilderDocument,
  callback: (sections: ProductTypeFieldBuilderSection[]) => ProductTypeFieldBuilderSection[]
) {
  return withLocalIds({
    ...builder,
    sectionHeadings: callback(builder.sectionHeadings || []),
  });
}

export function fieldsLengthOrZero(group: ProductTypeFieldBuilderGroup | null) {
  return group?.fields.length || 0;
}

export function buildFieldTemplateFileName({
  productTypeName,
  headingName,
}: {
  productTypeName?: string;
  headingName?: string;
}) {
  const fileBase = [productTypeName, headingName, "field-template"]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${fileBase || "product-type-fields-template"}.csv`;
}

export function buildFieldWorkbookTemplateFileName({
  productTypeName,
}: {
  productTypeName?: string;
}) {
  const fileBase = [productTypeName, "field-workbook-template"]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${fileBase || "product-type-fields-workbook-template"}.xlsx`;
}

export async function buildProductTypeFieldWorkbookTemplate() {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const sheetName of PRODUCT_TYPE_FIELD_HEADINGS) {
    const worksheet = XLSX.utils.aoa_to_sheet([
      PRODUCT_TYPE_FIELD_IMPORT_HEADERS,
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });
}

export function buildFieldWorkbookExportFileName({
  productTypeName,
}: {
  productTypeName?: string;
}) {
  const fileBase = [productTypeName, "field-workbook"]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${fileBase || "product-type-fields-workbook"}.xlsx`;
}

export async function buildProductTypeFieldWorkbookExport(
  builder: ProductTypeFieldBuilderDocument
) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const sheetName of PRODUCT_TYPE_FIELD_HEADINGS) {
    const matchedSection = builder.sectionHeadings.find(
      (section) =>
        normalizeProductTypeFieldHeading(section.headingName) === sheetName
    );

    const dataRows: string[][] = [];

    if (matchedSection) {
      for (const group of matchedSection.groups) {
        for (const field of group.fields) {
          dataRows.push([
            sheetName,
            group.groupName,
            field.label || "",
            field.key || "",
            field.inputType || "text",
            field.placeholder || "",
            (field.options || []).join(", "),
            (field.unitOptions || []).join(", "),
            String(field.sortOrder || ""),
            field.required ? "yes" : "no",
            field.addMore ? "yes" : "no",
            field.hasUnit ? "yes" : "no",
            field.active !== false ? "yes" : "no",
          ]);
        }
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet([
      PRODUCT_TYPE_FIELD_IMPORT_HEADERS,
      ...dataRows,
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });
}

export function parseProductTypeFieldCsv(csvText: string): ProductTypeFieldCsvRow[] {
  const rows = parseCsvMatrix(csvText);

  return parseProductTypeFieldImportRows(rows);
}

export async function parseProductTypeFieldWorkbook(file: File) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
  });
  const rows: ProductTypeFieldCsvRow[] = [];

  for (const sheetName of PRODUCT_TYPE_FIELD_HEADINGS) {
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      continue;
    }

    const sheetRows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });

    rows.push(
      ...parseProductTypeFieldImportRows(sheetRows).map((row) => ({
        ...row,
        sectionHeading: sheetName,
      }))
    );
  }

  return rows;
}

export function importProductTypeFieldCsvRows({
  builder,
  rows,
  selectedSectionId,
  selectedSectionName,
  selectedGroupId,
  selectedGroupName,
}: {
  builder: ProductTypeFieldBuilderDocument;
  rows: ProductTypeFieldCsvRow[];
  selectedSectionId?: string;
  selectedSectionName?: string;
  selectedGroupId?: string;
  selectedGroupName?: string;
}) {
  const nextBuilder = withLocalIds(builder);
  const nextSections = nextBuilder.sectionHeadings.map((section) => ({
    ...section,
    groups: section.groups.map((group) => ({
      ...group,
      fields: [...group.fields],
    })),
  }));

  let importedFieldCount = 0;
  let lastSectionId = "";
  let lastGroupId = "";

  for (const row of rows) {
    const fieldName = String(row.fieldName || "").trim();

    if (!fieldName) {
      continue;
    }

    const sectionName = normalizeProductTypeFieldHeading(
      row.sectionHeading || selectedSectionName || ""
    );
    const hasRowSection = Boolean(String(row.sectionHeading || "").trim());
    const section =
      (hasRowSection
        ? nextSections.find((item) => item.headingName === sectionName)
        : nextSections.find(
            (item) =>
              item._id === selectedSectionId || item.headingName === sectionName
          )) ||
      nextSections.find((item) => item.headingName === sectionName) ||
      nextSections[0];

    if (!section) {
      throw new Error("No section heading is available for workbook import");
    }

    const fallbackGroupName = String(selectedGroupName || "").trim();
    const requestedGroupName = String(row.groupName || "").trim() || fallbackGroupName;

    if (!requestedGroupName) {
      throw new Error(
        `Group Name is required for "${fieldName}". Add a group first or include Group Name in the workbook.`
      );
    }

    let group =
      section.groups.find((item) => item._id === selectedGroupId && !row.groupName.trim()) ||
      section.groups.find(
        (item) => item.groupName.trim().toLowerCase() === requestedGroupName.toLowerCase()
      );

    if (!group) {
      group = {
        _id: makeLocalId("group"),
        groupName: requestedGroupName,
        sortOrder: section.groups.length + 1,
        isActive: true,
        fields: [],
      };
      section.groups.push(group);
    }

    const inputType = normalizeImportedInputType(row.inputType);
    const hasUnit = normalizeCsvBoolean(
      row.hasUnit,
      normalizeCommaSeparatedList(row.unitOptions || "").length > 0
    );
    const nextField: ProductTypeFieldDefinition = {
      ...createEmptyProductTypeFieldDefinition(),
      _id: makeLocalId("field"),
      label: fieldName,
      key: buildProductTypeFieldKey(row.fieldKey || fieldName),
      inputType,
      placeholder: String(row.placeholder || "").trim(),
      options: supportsImportOptions(inputType)
        ? normalizeCommaSeparatedList(row.options || "")
        : [],
      unitOptions: hasUnit ? normalizeCommaSeparatedList(row.unitOptions || "") : [],
      sortOrder: normalizeImportedSortOrder(row.sort, group.fields.length + 1),
      required: normalizeCsvBoolean(row.required, false),
      addMore: normalizeCsvBoolean(row.addMore, false),
      hasUnit,
      active: normalizeCsvBoolean(row.active, true),
    };

    const existingFieldIndex = group.fields.findIndex(
      (field) =>
        buildProductTypeFieldKey(field.key || field.label || "") === nextField.key
    );

    if (existingFieldIndex >= 0) {
      group.fields[existingFieldIndex] = {
        ...group.fields[existingFieldIndex],
        ...nextField,
        _id: group.fields[existingFieldIndex]._id || nextField._id,
      };
    } else {
      group.fields.push(nextField);
    }

    group.fields = group.fields
      .map((field, index) => ({
        ...field,
        sortOrder: normalizeImportedSortOrder(String(field.sortOrder || ""), index + 1),
      }))
      .sort((first, second) => Number(first.sortOrder || 0) - Number(second.sortOrder || 0))
      .map((field, index) => ({
        ...field,
        sortOrder: index + 1,
      }));

    importedFieldCount += 1;
    lastSectionId = section._id || "";
    lastGroupId = group._id || "";
  }

  return {
    builder: withLocalIds({
      ...nextBuilder,
      sectionHeadings: nextSections.map((section, index) => ({
        ...section,
        sortOrder: index + 1,
        groups: section.groups.map((group, groupIndex) => ({
          ...group,
          sortOrder: groupIndex + 1,
        })),
      })),
    }),
    importedFieldCount,
    lastSectionId,
    lastGroupId,
  };
}

export function insertFieldAfterIndex(
  fields: ProductTypeFieldDefinition[],
  index: number
) {
  const nextField: ProductTypeFieldDefinition = {
    ...createEmptyProductTypeFieldDefinition(),
    _id: makeLocalId("field"),
  };
  const nextFields = [...fields];

  if (!nextFields.length || index < 0 || index >= nextFields.length) {
    nextFields.push(nextField);
  } else {
    nextFields.splice(index + 1, 0, nextField);
  }

  return nextFields.map((field, fieldIndex) => ({
    ...field,
    sortOrder: fieldIndex + 1,
  }));
}

function parseProductTypeFieldImportRows(rows: string[][]) {
  if (!rows.length) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headerIndexMap = new Map<string, number>();

  headerRow.forEach((header, index) => {
    headerIndexMap.set(normalizeCsvHeader(header), index);
  });

  return dataRows
    .map((row) => {
      const fieldName =
        normalizeImportedCsvText(
          getCsvCellValue(row, headerIndexMap, [
            "fieldname",
            "label",
            "fieldlabel",
            "attribute",
          ])
        ) || "";
      const sectionHeading =
        normalizeImportedCsvText(
          getCsvCellValue(row, headerIndexMap, [
            "sectionheading",
            "section",
            "tab",
            "tabname",
            "sectiontabname",
          ])
        ) || "";
      const groupName =
        normalizeImportedCsvText(
          getCsvCellValue(row, headerIndexMap, ["groupname", "group"])
        ) || "";

      if (!fieldName.trim() && !sectionHeading.trim() && !groupName.trim()) {
        return null;
      }

      return {
        sectionHeading,
        groupName,
        fieldName,
        fieldKey:
          normalizeImportedCsvText(
            getCsvCellValue(row, headerIndexMap, ["fieldkey", "key"])
          ) || "",
        inputType:
          normalizeImportedCsvText(
            getCsvCellValue(row, headerIndexMap, ["inputtype", "type"])
          ) || "",
        placeholder:
          normalizeImportedCsvText(
            getCsvCellValue(row, headerIndexMap, ["placeholder", "hint"])
          ) || "",
        options:
          getCsvCellValue(row, headerIndexMap, ["options", "exampleoptions"]) || "",
        unitOptions:
          getCsvCellValue(row, headerIndexMap, ["unitoptions", "unitoption"]) || "",
        sort: getCsvCellValue(row, headerIndexMap, ["sort", "sortorder"]) || "",
        required: getCsvCellValue(row, headerIndexMap, ["required"]) || "",
        addMore: getCsvCellValue(row, headerIndexMap, ["addmore"]) || "",
        hasUnit: getCsvCellValue(row, headerIndexMap, ["hasunit"]) || "",
        active: getCsvCellValue(row, headerIndexMap, ["active"]) || "",
      } satisfies ProductTypeFieldCsvRow;
    })
    .filter(Boolean) as ProductTypeFieldCsvRow[];
}

function parseCsvMatrix(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      currentCell = "";

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());

    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeCsvHeader(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getCsvCellValue(
  row: string[],
  headerIndexMap: Map<string, number>,
  headerKeys: string[]
) {
  for (const headerKey of headerKeys) {
    const index = headerIndexMap.get(headerKey);

    if (index !== undefined) {
      return String(row[index] || "").trim();
    }
  }

  for (const headerKey of headerKeys) {
    for (const [normalizedHeader, index] of headerIndexMap.entries()) {
      if (normalizedHeader.startsWith(headerKey)) {
        return String(row[index] || "").trim();
      }
    }
  }

  return "";
}

function normalizeImportedCsvText(value: string) {
  return String(value || "")
    .replace(/[\uFEFF\u00A0\uFFFD]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCsvBoolean(value: string, fallback: boolean) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (
    ["true", "yes", "1", "y", "on", "active", "checked", "tick", "✓", "✔", "☑", "✅"].includes(
      normalized
    )
  ) {
    return true;
  }

  if (
    ["false", "no", "0", "n", "off", "inactive", "unchecked", "✗", "✘", "☐", "❌"].includes(
      normalized
    )
  ) {
    return false;
  }

  return fallback;
}

function normalizeImportedSortOrder(value: string, fallback: number) {
  const sortOrder = Number(value);

  if (Number.isFinite(sortOrder) && sortOrder > 0) {
    return sortOrder;
  }

  return fallback;
}

function normalizeImportedInputType(value: string): ProductTypeFieldInputType {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  if (!normalized) {
    return "text";
  }

  const mappedValue: Record<string, ProductTypeFieldInputType> = {
    text: "text",
    number: "number",
    textarea: "textarea",
    textareafield: "textarea",
    select: "select",
    dropdown: "select",
    multiselect: "multiSelect",
    multitext: "textarea",
    checkbox: "checkbox",
    radio: "radio",
    date: "date",
    file: "file",
    boolean: "boolean",
    toggle: "boolean",
  };

  const nextInputType = mappedValue[normalized];

  if (nextInputType && PRODUCT_TYPE_FIELD_INPUT_TYPES.includes(nextInputType)) {
    return nextInputType;
  }

  return "text";
}

function supportsImportOptions(inputType: ProductTypeFieldInputType) {
  return ["select", "multiSelect", "radio"].includes(inputType);
}
