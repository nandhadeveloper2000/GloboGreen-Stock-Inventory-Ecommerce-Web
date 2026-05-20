"use client";

import type {
  DynamicProductFieldValues,
  ProductTypeFieldBuilderDocument,
  ProductTypeFieldBuilderGroup,
  ProductTypeFieldBuilderSection,
  ProductTypeFieldDefinition,
} from "@/types/product-type-fields";
import {
  buildProductTypeFieldKey,
  normalizeProductTypeFieldHeading,
  sortProductTypeFieldSections,
  upsertDynamicFieldValue,
} from "@/lib/product-type-fields";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

const SECTION_IMAGES     = "images";
const SECTION_VARIATIONS = "variations";
const SKIP_INPUT_TYPES   = new Set(["file", "image", "repeat"]);
const MAX_IMAGES         = 8;

const IMAGE_COLUMNS = Array.from({ length: MAX_IMAGES }, (_, i) => ({
  header: i === 0 ? "Main Image URL" : `Image ${i + 1} URL`,
  key: `image_url_${i + 1}`,
}));

const VARIATION_COLUMNS = [
  { header: "Product S.No",    key: "product_sno"   },
  { header: "Variant Title",   key: "var_title"     },
  { header: "Attr 1 Label",    key: "attr1_label"   },
  { header: "Attr 1 Value",    key: "attr1_value"   },
  { header: "Attr 2 Label",    key: "attr2_label"   },
  { header: "Attr 2 Value",    key: "attr2_value"   },
  { header: "Attr 3 Label",    key: "attr3_label"   },
  { header: "Attr 3 Value",    key: "attr3_value"   },
  { header: "SKU",             key: "var_sku"       },
  { header: "Your Price",      key: "var_price"     },
  { header: "Quantity",        key: "var_qty"       },
  { header: "Status",          key: "var_status"    },  // AVAILABLE | OUT_OF_STOCK | INACTIVE
];

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type FieldColumnDef = {
  header:    string;
  key:       string;
  inputType: string;
  options:   string[];
  required:  boolean;
  section:   ProductTypeFieldBuilderSection;
  group:     ProductTypeFieldBuilderGroup;
  field:     ProductTypeFieldDefinition;
};

export type SimpleColumnDef = {
  header: string;
  key:    string;
};

export type SectionSheetDef =
  | { type: "fields";     sheetName: string; columns: FieldColumnDef[] }
  | { type: "images";     sheetName: string; columns: SimpleColumnDef[] }
  | { type: "variations"; sheetName: string; columns: SimpleColumnDef[] };

/** Parsed row from one section sheet */
export type ParsedSectionRow = {
  rowNo: number;                      // 1-based product row
  fieldValues?: Record<string, string>; // key → value for "fields" sheets
  imageUrls?: string[];               // for "images" sheets
  variantRows?: VariantExcelRow[];    // for "variations" sheets
};

export type VariantExcelRow = {
  productSno: number;
  title:      string;
  attributes: Array<{ label: string; value: string }>;
  sku:        string;
  price:      string;
  qty:        string;
  status:     string;
};

/** Full parsed import data indexed by product S.No (1-based) */
export type ParsedBulkData = {
  /** productSno → field values per section sheet */
  sectionData: Map<number, Map<string /* sheetName */, Record<string, string>>>;
  /** productSno → image URL array */
  imageData: Map<number, string[]>;
  /** productSno → variant rows */
  variantData: Map<number, VariantExcelRow[]>;
  /** Total product count (from Product Details sheet row count) */
  productCount: number;
};

/* ─────────────────────────────────────────────
   Sheet definition builder
───────────────────────────────────────────── */

export function getSectionSheets(
  builder: ProductTypeFieldBuilderDocument
): SectionSheetDef[] {
  const sheets: SectionSheetDef[] = [];
  const sections = sortProductTypeFieldSections(builder.sectionHeadings ?? []);

  for (const section of sections) {
    const norm = normalizeProductTypeFieldHeading(section.headingName);

    if (norm === SECTION_IMAGES) {
      sheets.push({
        type: "images",
        sheetName: section.headingName || "Images",
        columns: IMAGE_COLUMNS,
      });
      continue;
    }

    if (norm === SECTION_VARIATIONS) {
      sheets.push({
        type: "variations",
        sheetName: section.headingName || "Variations",
        columns: VARIATION_COLUMNS,
      });
      continue;
    }

    // Regular field section
    const columns: FieldColumnDef[] = [];
    for (const group of section.groups ?? []) {
      for (const field of group.fields ?? []) {
        if (SKIP_INPUT_TYPES.has(field.inputType)) continue;
        const key = buildProductTypeFieldKey(field.key || field.label || "");
        if (!key) continue;

        columns.push({
          header:    field.label || key,
          key,
          inputType: field.inputType || "text",
          options:   field.options ?? [],
          required:  field.required ?? false,
          section,
          group,
          field,
        });
      }
    }

    if (columns.length > 0) {
      sheets.push({ type: "fields", sheetName: section.headingName, columns });
    }
  }

  return sheets;
}

/* ─────────────────────────────────────────────
   Template builder  (multi-sheet)
───────────────────────────────────────────── */

export async function buildBulkProductTemplate(
  builder: ProductTypeFieldBuilderDocument,
  productTypeName: string
): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheets = getSectionSheets(builder);
  const allOptions: Array<[string, string]> = [];

  for (const sheet of sheets) {
    /* ── Fields sheet ── */
    if (sheet.type === "fields") {
      const headers = ["S.No", ...sheet.columns.map((c) => c.required ? `${c.header} *` : c.header)];
      const exampleRow = [
        "1",
        ...sheet.columns.map((c) => {
          if (c.options.length > 0) return c.options[0] ?? "";
          if (c.inputType === "number") return "0";
          return "";
        }),
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
      ws["!cols"] = [
        { wch: 6 },
        ...sheet.columns.map((c) => ({ wch: Math.max(c.header.length + 6, 20) })),
      ];
      XLSX.utils.book_append_sheet(workbook, ws, sheet.sheetName);

      for (const col of sheet.columns) {
        if (col.options.length > 0) allOptions.push([col.header, col.options.join(", ")]);
      }
      continue;
    }

    /* ── Images sheet ── */
    if (sheet.type === "images") {
      const headers = ["S.No", ...IMAGE_COLUMNS.map((c) => c.header)];
      const exampleRow = ["1", "https://example.com/main.jpg", ...Array(MAX_IMAGES - 1).fill("")];

      const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
      ws["!cols"] = [{ wch: 6 }, ...Array(MAX_IMAGES).fill({ wch: 50 })];
      XLSX.utils.book_append_sheet(workbook, ws, sheet.sheetName);
      continue;
    }

    /* ── Variations sheet ── */
    if (sheet.type === "variations") {
      const headers = VARIATION_COLUMNS.map((c) => c.header);
      const exampleRow = [
        "1",                // Product S.No
        "Variant A",        // Variant Title
        "Color", "Black",   // Attr 1
        "Storage", "128 GB",// Attr 2
        "", "",             // Attr 3
        "SKU-001",          // SKU
        "29999",            // Price
        "50",               // Qty
        "AVAILABLE",        // Status
      ];
      allOptions.push(["Status", "AVAILABLE, OUT_OF_STOCK, INACTIVE"]);

      const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
      ws["!cols"] = VARIATION_COLUMNS.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(workbook, ws, sheet.sheetName);
      continue;
    }
  }

  /* ── Allowed Values reference sheet ── */
  const optionRows: string[][] = [["Column", "Allowed Values"], ...allOptions];
  const optWs = XLSX.utils.aoa_to_sheet(optionRows);
  optWs["!cols"] = [{ wch: 32 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, optWs, "Allowed Values");

  /* ── Instructions sheet ── */
  const instrWs = XLSX.utils.aoa_to_sheet([
    [`GloboGreen Bulk Import — ${productTypeName}`],
    [""],
    ["Instructions:"],
    ["• Each tab matches a product section. Fill each row for one product."],
    ["• S.No in every sheet links sheets to products (Row 1 = S.No 1)."],
    ["• In the Variations sheet, Product S.No links variants to their parent product."],
    ["• Images sheet: enter publicly accessible image URLs (Cloudinary, etc.)."],
    ["• Required columns are marked with *."],
    ["• See the Allowed Values sheet for valid options on select fields."],
    ["• Do NOT rename column headers — they must match exactly on import."],
  ]);
  instrWs["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, instrWs, "Instructions");

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

/* ─────────────────────────────────────────────
   Parser (multi-sheet → structured data)
───────────────────────────────────────────── */

export async function parseBulkProductWorkbook(
  file: File,
  sheets: SectionSheetDef[]
): Promise<ParsedBulkData> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });

  const sectionData  = new Map<number, Map<string, Record<string, string>>>();
  const imageData    = new Map<number, string[]>();
  const variantData  = new Map<number, VariantExcelRow[]>();
  let productCount   = 0;

  for (const sheet of sheets) {
    const ws = workbook.Sheets[sheet.sheetName];
    if (!ws) continue;

    const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1, raw: false, defval: "", blankrows: false,
    }) as string[][];

    if (rows.length < 2) continue;
    const [headerRow, ...dataRows] = rows;

    /* ── Fields sheet parsing ── */
    if (sheet.type === "fields") {
      // Build header → FieldColumnDef map
      const hMap = new Map<number, FieldColumnDef>();
      let snoIdx = -1;
      headerRow.forEach((h, idx) => {
        const label = String(h ?? "").replace(" *", "").trim().toLowerCase();
        if (label === "s.no") { snoIdx = idx; return; }
        const col = sheet.columns.find((c) => c.header.trim().toLowerCase() === label);
        if (col) hMap.set(idx, col);
      });

      dataRows
        .filter((row) => row.some((cell) => String(cell ?? "").trim()))
        .forEach((row, rowIdx) => {
          const sno = snoIdx >= 0
            ? (parseInt(String(row[snoIdx] ?? ""), 10) || rowIdx + 1)
            : rowIdx + 1;

          if (sno > productCount) productCount = sno;

          if (!sectionData.has(sno)) sectionData.set(sno, new Map());
          const sectionMap = sectionData.get(sno)!;
          if (!sectionMap.has(sheet.sheetName)) sectionMap.set(sheet.sheetName, {});
          const fieldMap = sectionMap.get(sheet.sheetName)!;

          row.forEach((cell, idx) => {
            const col = hMap.get(idx);
            if (col) fieldMap[col.key] = String(cell ?? "").trim();
          });
        });
      continue;
    }

    /* ── Images sheet parsing ── */
    if (sheet.type === "images") {
      let snoIdx = -1;
      const urlIdxMap = new Map<number, number>(); // colIdx → imageSlot (0-based)
      headerRow.forEach((h, idx) => {
        const label = String(h ?? "").trim().toLowerCase();
        if (label === "s.no") { snoIdx = idx; return; }
        const slot = IMAGE_COLUMNS.findIndex(
          (c) => c.header.toLowerCase() === label
        );
        if (slot >= 0) urlIdxMap.set(idx, slot);
      });

      dataRows
        .filter((row) => row.some((cell) => String(cell ?? "").trim()))
        .forEach((row, rowIdx) => {
          const sno = snoIdx >= 0
            ? (parseInt(String(row[snoIdx] ?? ""), 10) || rowIdx + 1)
            : rowIdx + 1;

          const urls: string[] = [];
          urlIdxMap.forEach((slot, colIdx) => {
            const url = String(row[colIdx] ?? "").trim();
            if (url) urls[slot] = url;
          });

          if (urls.length > 0) imageData.set(sno, urls.filter(Boolean));
        });
      continue;
    }

    /* ── Variations sheet parsing ── */
    if (sheet.type === "variations") {
      let colMap: Record<string, number> = {};
      headerRow.forEach((h, idx) => {
        const key = VARIATION_COLUMNS.find(
          (c) => c.header.toLowerCase() === String(h ?? "").trim().toLowerCase()
        )?.key;
        if (key) colMap[key] = idx;
      });

      const get = (row: string[], key: string) =>
        String(row[colMap[key] ?? -1] ?? "").trim();

      dataRows
        .filter((row) => row.some((cell) => String(cell ?? "").trim()))
        .forEach((row) => {
          const productSno = parseInt(get(row, "product_sno"), 10);
          if (!productSno) return;

          const attrs: Array<{ label: string; value: string }> = [];
          for (let i = 1; i <= 3; i++) {
            const label = get(row, `attr${i}_label`);
            const value = get(row, `attr${i}_value`);
            if (label && value) attrs.push({ label, value });
          }

          const variant: VariantExcelRow = {
            productSno,
            title:      get(row, "var_title"),
            attributes: attrs,
            sku:        get(row, "var_sku"),
            price:      get(row, "var_price"),
            qty:        get(row, "var_qty"),
            status:     get(row, "var_status") || "AVAILABLE",
          };

          const existing = variantData.get(productSno) ?? [];
          variantData.set(productSno, [...existing, variant]);
        });
      continue;
    }
  }

  if (productCount === 0) {
    // Derive from sectionData if no explicit S.No
    sectionData.forEach((_, sno) => {
      if (sno > productCount) productCount = sno;
    });
  }

  return { sectionData, imageData, variantData, productCount };
}

/* ─────────────────────────────────────────────
   Build dynamic field values from parsed row
───────────────────────────────────────────── */

export function buildDynamicValuesFromParsed(
  sno: number,
  sectionData: ParsedBulkData["sectionData"],
  sheets: SectionSheetDef[]
): DynamicProductFieldValues {
  let values: DynamicProductFieldValues = [];
  const productSectionMap = sectionData.get(sno);
  if (!productSectionMap) return values;

  for (const sheet of sheets) {
    if (sheet.type !== "fields") continue;
    const fieldMap = productSectionMap.get(sheet.sheetName);
    if (!fieldMap) continue;

    for (const col of sheet.columns) {
      const raw = fieldMap[col.key];
      if (raw === undefined || raw === "") continue;

      let value: string | number | boolean = raw;
      if (col.inputType === "number") {
        const num = Number(raw);
        value = Number.isNaN(num) ? raw : num;
      } else if (col.inputType === "checkbox") {
        const lower = raw.toLowerCase();
        value = lower === "true" || lower === "1" || lower === "yes";
      }

      values = upsertDynamicFieldValue(values, {
        section: col.section,
        group:   col.group,
        field:   col.field,
        value,
      });
    }
  }

  return values;
}
