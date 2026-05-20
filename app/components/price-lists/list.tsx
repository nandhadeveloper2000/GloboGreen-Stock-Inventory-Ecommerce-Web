"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  FolderTree,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import { formatMoney, readSelectedShop } from "./shared";

type ProductReference =
  | string
  | {
      _id?: string;
      name?: string;
      brandId?:
        | string
        | {
            _id?: string;
            name?: string;
          };
      categoryId?:
        | string
        | {
            _id?: string;
            name?: string;
          };
    };

type ShopProductApiRow = {
  _id?: string;
  itemName?: string;
  itemCode?: string;
  sku?: string;
  mainUnit?: string;
  qty?: number | string | null;
  mrpPrice?: number | string | null;
  sellingPrice?: number | string | null;
  categoryId?: ProductReference;
  subcategoryId?: ProductReference;
  brandId?: ProductReference;
  modelId?: ProductReference;
};

type ShopProductResponse = {
  success?: boolean;
  message?: string;
  data?: ShopProductApiRow[];
  products?: ShopProductApiRow[];
};

type ApiListResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T[];
};

type ShopCategoryMapRow = {
  _id?: string;
  isActive?: boolean;
  categoryId?: ProductReference;
  category?: ProductReference;
};

type ShopSubCategoryMapRow = {
  _id?: string;
  isActive?: boolean;
  subCategoryId?: ProductReference;
};

type ShopBrandMapRow = {
  _id?: string;
  isActive?: boolean;
  brandId?: ProductReference;
};

type ShopModelMapRow = {
  _id?: string;
  isActive?: boolean;
  modelId?: ProductReference;
};

type ProductPriceRow = {
  _id: string;
  itemName: string;
  productCode: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  brandId: string;
  brandName: string;
  modelId: string;
  modelName: string;
  unit: string;
  qty: number;
  mrpPrice: number;
  sellingPrice: number;
};

type ReportMeta = {
  shopName: string;
  categoryName: string;
  subcategoryName: string;
  brandName?: string;
  modelName?: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const PDF_DARK = "#0f172a";
const PDF_ACCENT = "#00008b";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function isObjectIdLike(value: string) {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanPdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: unknown) {
  return cleanPdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function truncatePdfText(value: unknown, maxLength: number) {
  const text = cleanPdfText(value);

  if (text.length <= maxLength) return text;

  return `${text.slice(0, Math.max(maxLength - 3, 0))}...`;
}

function sanitizeFileName(value: unknown) {
  return cleanPdfText(value).replace(/[^a-z0-9_-]+/gi, "-") || "price-list";
}

function pdfColor(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function estimateTextWidth(value: unknown, size: number) {
  return cleanPdfText(value).length * size * 0.5;
}

function buildPdfDocument(contents: string[]) {
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const pageStartObject = 5;
  const kids = contents
    .map((_, index) => `${pageStartObject + index * 2} 0 R`)
    .join(" ");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${contents.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ...contents.flatMap((content, index) => {
      const pageObjectNumber = pageStartObject + index * 2;
      const contentObjectNumber = pageObjectNumber + 1;

      return [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      ];
    }),
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function buildPriceListPdf(rows: ProductPriceRow[], meta: ReportMeta) {
  const pageWidth = 841.89;
  const margin = 28;
  const tableWidth = pageWidth - margin * 2;
  const tableStartY = 414;
  const rowHeight = 22;
  const rowsPerPage = 15;
  const generatedAt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const chunks =
    rows.length > 0
      ? Array.from({ length: Math.ceil(rows.length / rowsPerPage) }, (_, index) =>
          rows.slice(index * rowsPerPage, (index + 1) * rowsPerPage)
        )
      : [[]];

  const columns = [
    { label: "S.No", width: 38 },
    { label: "Product Name", width: 220 },
    { label: "Brand", width: 95 },
    { label: "Model", width: 105 },
    { label: "Unit", width: 45 },
    { label: "MRP Price", width: 82, right: true },
    { label: "Selling Price", width: 95, right: true },
    { label: "Stock Qty", width: 70, right: true },
  ];

  const contents = chunks.map((chunk, pageIndex) => {
    const commands: string[] = [];

    function fillColor(hex: string) {
      commands.push(`${pdfColor(hex)} rg`);
    }

    function strokeColor(hex: string) {
      commands.push(`${pdfColor(hex)} RG`);
    }

    function text(
      value: unknown,
      x: number,
      y: number,
      options: {
        align?: "left" | "center" | "right";
        bold?: boolean;
        color?: string;
        size?: number;
      } = {}
    ) {
      const size = options.size || 10;
      const cleaned = cleanPdfText(value);
      let nextX = x;

      if (options.align === "center") {
        nextX = x - estimateTextWidth(cleaned, size) / 2;
      }

      if (options.align === "right") {
        nextX = x - estimateTextWidth(cleaned, size);
      }

      fillColor(options.color || PDF_DARK);
      commands.push(
        `BT /${options.bold ? "F2" : "F1"} ${size} Tf ${nextX.toFixed(2)} ${y.toFixed(
          2
        )} Td (${escapePdfText(cleaned)}) Tj ET`
      );
    }

    function filledRect(
      x: number,
      y: number,
      width: number,
      height: number,
      color: string
    ) {
      fillColor(color);
      commands.push(
        `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(
          2
        )} re f`
      );
    }

    function strokedRect(x: number, y: number, width: number, height: number) {
      strokeColor("#cbd5e1");
      commands.push(
        `0.7 w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(
          2
        )} ${height.toFixed(2)} re S`
      );
    }

    function horizontalLine(y: number, color = PDF_ACCENT) {
      strokeColor(color);
      commands.push(
        `1.1 w ${margin.toFixed(2)} ${y.toFixed(2)} m ${(
          pageWidth - margin
        ).toFixed(2)} ${y.toFixed(2)} l S`
      );
    }

    text("PRODUCT PRICE LIST", pageWidth / 2, 555, {
      align: "center",
      bold: true,
      size: 22,
      color: PDF_ACCENT,
    });

    const leftMeta = [
      `Shop: ${meta.shopName || "Selected Shop"}`,
      `Category: ${meta.categoryName}`,
      `Subcategory: ${meta.subcategoryName}`,
      meta.brandName ? `Brand: ${meta.brandName}` : "",
      meta.modelName ? `Model: ${meta.modelName}` : "",
    ].filter(Boolean);

    const leftY = 520;
    leftMeta.forEach((line, index) => {
      text(line, margin, leftY - index * 16, {
        size: index === 0 ? 10 : 9.5,
        bold: index === 0,
      });
    });

    text(`Generated: ${generatedAt}`, pageWidth - margin, 520, {
      align: "right",
      size: 9.5,
    });
    text(`Total Products: ${rows.length}`, pageWidth - margin, 504, {
      align: "right",
      size: 9.5,
      bold: true,
    });
    text(`Page ${pageIndex + 1} of ${chunks.length}`, pageWidth - margin, 488, {
      align: "right",
      size: 9.5,
    });

    horizontalLine(460);

    filledRect(margin, tableStartY, tableWidth, 24, "#e8eeff");
    strokedRect(margin, tableStartY, tableWidth, 24);

    let currentX = margin;
    columns.forEach((column) => {
      text(
        column.label,
        currentX + (column.right ? column.width - 6 : 6),
        tableStartY + 8,
        {
          size: 9,
          bold: true,
          color: PDF_ACCENT,
          align: column.right ? "right" : "left",
        }
      );
      currentX += column.width;
    });

    chunk.forEach((row, rowIndex) => {
      const y = tableStartY - (rowIndex + 1) * rowHeight;
      strokedRect(margin, y, tableWidth, rowHeight);

      const values = [
        String(pageIndex * rowsPerPage + rowIndex + 1),
        truncatePdfText(row.itemName, 38),
        truncatePdfText(row.brandName || "-", 16),
        truncatePdfText(row.modelName || "-", 18),
        row.unit || "-",
        formatMoney(row.mrpPrice),
        formatMoney(row.sellingPrice),
        String(row.qty),
      ];

      let cellX = margin;
      columns.forEach((column, columnIndex) => {
        text(
          values[columnIndex],
          cellX + (column.right ? column.width - 6 : 6),
          y + 7,
          {
            size: 8.5,
            align: column.right ? "right" : "left",
          }
        );
        cellX += column.width;
      });
    });

    text("Globo Green Price Report", margin, 22, {
      size: 8,
      color: "#64748b",
    });

    return commands.join("\n");
  });

  return buildPdfDocument(contents);
}

function buildPrintHtml(rows: ProductPriceRow[], meta: ReportMeta) {
  const generatedAt = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const bodyRows = rows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.itemName)}</td>
          <td>${escapeHtml(row.brandName || "-")}</td>
          <td>${escapeHtml(row.modelName || "-")}</td>
          <td>${escapeHtml(row.unit || "-")}</td>
          <td class="num">${escapeHtml(formatMoney(row.mrpPrice))}</td>
          <td class="num">${escapeHtml(formatMoney(row.sellingPrice))}</td>
          <td class="num">${escapeHtml(String(row.qty))}</td>
        </tr>
      `
    )
    .join("");

  const brandLine = meta.brandName
    ? `<div><strong>Brand:</strong> ${escapeHtml(meta.brandName)}</div>`
    : "";
  const modelLine = meta.modelName
    ? `<div><strong>Model:</strong> ${escapeHtml(meta.modelName)}</div>`
    : "";

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Product Price List</title>
      <style>
        :root {
          color-scheme: light;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 22px;
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        }
        .top {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }
        h1 {
          margin: 0 0 16px;
          text-align: center;
          font-size: 26px;
          color: #00008b;
        }
        .meta {
          font-size: 13px;
          line-height: 1.65;
        }
        .meta-right {
          text-align: right;
          white-space: nowrap;
        }
        .rule {
          margin-top: 16px;
          border-top: 2px solid #00008b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 14px;
        }
        th,
        td {
          border: 1px solid #cbd5e1;
          padding: 10px 12px;
          font-size: 12px;
          text-align: left;
        }
        thead th {
          background: #e8eeff;
          color: #00008b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .num {
          text-align: right;
          white-space: nowrap;
        }
        .footer {
          margin-top: 18px;
          font-size: 11px;
          color: #64748b;
        }
        @media print {
          body {
            margin: 14px;
          }
        }
      </style>
    </head>
    <body>
      <h1>PRODUCT PRICE LIST</h1>

      <div class="top">
        <div class="meta">
          <div><strong>Shop:</strong> ${escapeHtml(meta.shopName || "Selected Shop")}</div>
          <div><strong>Category:</strong> ${escapeHtml(meta.categoryName)}</div>
          <div><strong>Subcategory:</strong> ${escapeHtml(meta.subcategoryName)}</div>
          ${brandLine}
          ${modelLine}
        </div>

        <div class="meta meta-right">
          <div>Generated: ${escapeHtml(generatedAt)}</div>
          <div><strong>Total Products:</strong> ${rows.length}</div>
        </div>
      </div>

      <div class="rule"></div>

      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product Name</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Unit</th>
            <th>MRP Price</th>
            <th>Selling Price</th>
            <th>Stock Qty</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>

      <div class="footer">Globo Green Price Report</div>

      <script>
        window.addEventListener("load", function () {
          setTimeout(function () {
            window.print();
          }, 150);
        });
      </script>
    </body>
  </html>`;
}

function getRefId(value?: ProductReference) {
  if (!value) return "";
  if (typeof value === "string") return cleanText(value);
  return cleanText(value._id);
}

function getRefName(value?: ProductReference, fallback = "-") {
  if (!value) return fallback;
  if (typeof value === "string") {
    const text = cleanText(value);
    return text && !isObjectIdLike(text) ? text : fallback;
  }
  return cleanText(value.name) || fallback;
}

function mapShopProductRow(product: ShopProductApiRow) {
  const id = cleanText(product._id);
  const itemName = cleanText(product.itemName);

  if (!id || !itemName) return null;

  return {
    _id: id,
    itemName,
    productCode: cleanText(product.itemCode || product.sku) || "-",
    categoryId: getRefId(product.categoryId),
    categoryName: getRefName(product.categoryId, "Unassigned Category"),
    subcategoryId: getRefId(product.subcategoryId),
    subcategoryName: getRefName(product.subcategoryId, "Unassigned Subcategory"),
    brandId: getRefId(product.brandId),
    brandName: getRefName(product.brandId, ""),
    modelId: getRefId(product.modelId),
    modelName: getRefName(product.modelId, ""),
    unit: cleanText(product.mainUnit) || "-",
    qty: toNumber(product.qty),
    mrpPrice: toNumber(product.mrpPrice),
    sellingPrice: toNumber(product.sellingPrice),
  } satisfies ProductPriceRow;
}

function isProductPriceRow(
  row: ProductPriceRow | null
): row is ProductPriceRow {
  return Boolean(row);
}

function buildOptions(rows: ProductPriceRow[], getId: (row: ProductPriceRow) => string, getName: (row: ProductPriceRow) => string) {
  const seen = new Map<string, string>();

  rows.forEach((row) => {
    const id = getId(row);
    const name = getName(row);

    if (!id || !name) return;
    if (!seen.has(id)) {
      seen.set(id, name);
    }
  });

  return Array.from(seen.entries())
    .map(([id, name]) => ({ _id: id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildReferenceOptions<T>(
  rows: T[],
  getReference: (row: T) => ProductReference | undefined
) {
  const seen = new Map<string, string>();

  rows.forEach((row) => {
    const reference = getReference(row);
    const id = getRefId(reference);
    const name = getRefName(reference, "");

    if (!id || !name) return;
    if (!seen.has(id)) {
      seen.set(id, name);
    }
  });

  return Array.from(seen.entries())
    .map(([id, name]) => ({ _id: id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getNestedCategoryId(value?: ProductReference) {
  if (!value || typeof value === "string") return "";
  return getRefId(value.categoryId);
}

function getNestedBrandId(value?: ProductReference) {
  if (!value || typeof value === "string") return "";
  return getRefId(value.brandId);
}

export default function PriceListPage() {
  const { accessToken } = useAuth();

  const [selectedShop, setSelectedShop] = useState(readSelectedShop());
  const [rows, setRows] = useState<ProductPriceRow[]>([]);
  const [shopCategoryMaps, setShopCategoryMaps] = useState<ShopCategoryMapRow[]>(
    []
  );
  const [shopSubCategoryMaps, setShopSubCategoryMaps] = useState<
    ShopSubCategoryMapRow[]
  >([]);
  const [shopBrandMaps, setShopBrandMaps] = useState<ShopBrandMapRow[]>([]);
  const [shopModelMaps, setShopModelMaps] = useState<ShopModelMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const syncSelectedShop = useCallback(() => {
    setSelectedShop(readSelectedShop());
  }, []);

  useEffect(() => {
    syncSelectedShop();

    window.addEventListener("shop-selection-changed", syncSelectedShop);
    window.addEventListener("storage", syncSelectedShop);

    return () => {
      window.removeEventListener("shop-selection-changed", syncSelectedShop);
      window.removeEventListener("storage", syncSelectedShop);
    };
  }, [syncSelectedShop]);

  const fetchProducts = useCallback(async () => {
    if (!accessToken || !selectedShop.id) {
      setRows([]);
      return;
    }

    try {
      const url =
        typeof SummaryApi.shop_product_list.url === "function"
          ? SummaryApi.shop_product_list.url(selectedShop.id)
          : SummaryApi.shop_product_list.url;

      const response = await fetch(`${baseURL}${url}`, {
        method: SummaryApi.shop_product_list.method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      const result =
        (await response.json().catch(() => ({}))) as ShopProductResponse;

      const sourceRows = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.products)
          ? result.products
          : [];

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load shop products");
      }

      setRows(
        sourceRows
          .map(mapShopProductRow)
          .filter(isProductPriceRow)
          .sort((a, b) => a.itemName.localeCompare(b.itemName))
      );
    } catch (error) {
      setRows([]);
      toast.error(
        error instanceof Error ? error.message : "Failed to load shop products"
      );
    }
  }, [accessToken, selectedShop.id]);

  const fetchFilterMappings = useCallback(async () => {
    if (!accessToken || !selectedShop.id) {
      setShopCategoryMaps([]);
      setShopSubCategoryMaps([]);
      setShopBrandMaps([]);
      setShopModelMaps([]);
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      };

      const requests = [
        {
          method: SummaryApi.shopCategoryMapByShop.method,
          url: SummaryApi.shopCategoryMapByShop.url(selectedShop.id),
        },
        {
          method: SummaryApi.shopSubCategoryMapByShop.method,
          url: SummaryApi.shopSubCategoryMapByShop.url(selectedShop.id),
        },
        {
          method: SummaryApi.shopBrandMapByShop.method,
          url: SummaryApi.shopBrandMapByShop.url(selectedShop.id),
        },
        {
          method: SummaryApi.shopModelMapByShop.method,
          url: SummaryApi.shopModelMapByShop.url(selectedShop.id),
        },
      ];

      const responses = await Promise.allSettled(
        requests.map((request) =>
          fetch(`${baseURL}${request.url}`, {
            method: request.method,
            headers,
            credentials: "include",
            cache: "no-store",
          })
        )
      );

      const payloads = await Promise.all(
        responses.map(async (result) => {
          if (result.status !== "fulfilled") return [];

          const response = result.value;
          const payload = (await response
            .json()
            .catch(() => ({}))) as ApiListResponse<unknown>;

          if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
            return [];
          }

          return payload.data;
        })
      );

      setShopCategoryMaps(payloads[0] as ShopCategoryMapRow[]);
      setShopSubCategoryMaps(payloads[1] as ShopSubCategoryMapRow[]);
      setShopBrandMaps(payloads[2] as ShopBrandMapRow[]);
      setShopModelMaps(payloads[3] as ShopModelMapRow[]);
    } catch {
      setShopCategoryMaps([]);
      setShopSubCategoryMaps([]);
      setShopBrandMaps([]);
      setShopModelMaps([]);
    }
  }, [accessToken, selectedShop.id]);

  useEffect(() => {
    if (!accessToken || !selectedShop.id) {
      setRows([]);
      setShopCategoryMaps([]);
      setShopSubCategoryMaps([]);
      setShopBrandMaps([]);
      setShopModelMaps([]);
      setSelectedCategoryId("");
      setSelectedSubCategoryId("");
      setSelectedBrandId("");
      setSelectedModelId("");
      setSearch("");
      setLoading(false);
      return;
    }

    let isActive = true;
    setLoading(true);

    void Promise.all([fetchProducts(), fetchFilterMappings()]).finally(() => {
      if (isActive) {
        setLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [accessToken, selectedShop.id, fetchFilterMappings, fetchProducts]);

  const productCategoryOptions = useMemo(
    () => buildOptions(rows, (row) => row.categoryId, (row) => row.categoryName),
    [rows]
  );

  const mappedCategoryOptions = useMemo(
    () =>
      buildReferenceOptions(
        shopCategoryMaps.filter((row) => row.isActive !== false),
        (row) => row.category || row.categoryId
      ),
    [shopCategoryMaps]
  );

  const categoryOptions = useMemo(
    () =>
      mappedCategoryOptions.length > 0
        ? mappedCategoryOptions
        : productCategoryOptions,
    [mappedCategoryOptions, productCategoryOptions]
  );

  const subCategorySourceRows = useMemo(
    () => rows.filter((row) => row.categoryId === selectedCategoryId),
    [rows, selectedCategoryId]
  );

  const productSubCategoryOptions = useMemo(
    () =>
      buildOptions(
        subCategorySourceRows,
        (row) => row.subcategoryId,
        (row) => row.subcategoryName
      ),
    [subCategorySourceRows]
  );

  const mappedSubCategoryOptions = useMemo(
    () =>
      buildReferenceOptions(
        shopSubCategoryMaps.filter(
          (row) =>
            row.isActive !== false &&
            getNestedCategoryId(row.subCategoryId) === selectedCategoryId
        ),
        (row) => row.subCategoryId
      ),
    [selectedCategoryId, shopSubCategoryMaps]
  );

  const subCategoryOptions = useMemo(
    () =>
      mappedSubCategoryOptions.length > 0
        ? mappedSubCategoryOptions
        : productSubCategoryOptions,
    [mappedSubCategoryOptions, productSubCategoryOptions]
  );

  const brandSourceRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.categoryId === selectedCategoryId &&
          row.subcategoryId === selectedSubCategoryId
      ),
    [rows, selectedCategoryId, selectedSubCategoryId]
  );

  const productBrandOptions = useMemo(
    () =>
      buildOptions(brandSourceRows, (row) => row.brandId, (row) => row.brandName),
    [brandSourceRows]
  );

  const mappedBrandOptions = useMemo(
    () =>
      buildReferenceOptions(
        shopBrandMaps.filter((row) => row.isActive !== false),
        (row) => row.brandId
      ),
    [shopBrandMaps]
  );

  const brandOptions = useMemo(() => {
    if (!selectedSubCategoryId) return [];

    return productBrandOptions.length > 0
      ? productBrandOptions
      : mappedBrandOptions;
  }, [mappedBrandOptions, productBrandOptions, selectedSubCategoryId]);

  const modelSourceRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.categoryId === selectedCategoryId &&
          row.subcategoryId === selectedSubCategoryId &&
          row.brandId === selectedBrandId
      ),
    [rows, selectedCategoryId, selectedSubCategoryId, selectedBrandId]
  );

  const productModelOptions = useMemo(
    () =>
      buildOptions(modelSourceRows, (row) => row.modelId, (row) => row.modelName),
    [modelSourceRows]
  );

  const mappedModelOptions = useMemo(
    () =>
      buildReferenceOptions(
        shopModelMaps.filter(
          (row) =>
            row.isActive !== false &&
            getNestedBrandId(row.modelId) === selectedBrandId
        ),
        (row) => row.modelId
      ),
    [selectedBrandId, shopModelMaps]
  );

  const modelOptions = useMemo(() => {
    if (!selectedBrandId) return [];

    return productModelOptions.length > 0
      ? productModelOptions
      : mappedModelOptions;
  }, [mappedModelOptions, productModelOptions, selectedBrandId]);

  useEffect(() => {
    if (selectedCategoryId && !categoryOptions.some((item) => item._id === selectedCategoryId)) {
      setSelectedCategoryId("");
      setSelectedSubCategoryId("");
      setSelectedBrandId("");
      setSelectedModelId("");
      setSearch("");
    }
  }, [categoryOptions, selectedCategoryId]);

  useEffect(() => {
    if (
      selectedSubCategoryId &&
      !subCategoryOptions.some((item) => item._id === selectedSubCategoryId)
    ) {
      setSelectedSubCategoryId("");
      setSelectedBrandId("");
      setSelectedModelId("");
      setSearch("");
    }
  }, [selectedSubCategoryId, subCategoryOptions]);

  useEffect(() => {
    if (selectedBrandId && !brandOptions.some((item) => item._id === selectedBrandId)) {
      setSelectedBrandId("");
      setSelectedModelId("");
      setSearch("");
    }
  }, [brandOptions, selectedBrandId]);

  useEffect(() => {
    if (selectedModelId && !modelOptions.some((item) => item._id === selectedModelId)) {
      setSelectedModelId("");
      setSearch("");
    }
  }, [modelOptions, selectedModelId]);

  function handleCategoryChange(value: string) {
    setSelectedCategoryId(value);
    setSelectedSubCategoryId("");
    setSelectedBrandId("");
    setSelectedModelId("");
    setSearch("");
  }

  function handleSubCategoryChange(value: string) {
    setSelectedSubCategoryId(value);
    setSelectedBrandId("");
    setSelectedModelId("");
    setSearch("");
  }

  function handleBrandChange(value: string) {
    setSelectedBrandId(value);
    setSelectedModelId("");
    setSearch("");
  }

  const hasBaseSelection = Boolean(selectedCategoryId && selectedSubCategoryId);

  const reportRows = useMemo(() => {
    if (!hasBaseSelection) return [];

    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (row.categoryId !== selectedCategoryId) return false;
      if (row.subcategoryId !== selectedSubCategoryId) return false;
      if (selectedBrandId && row.brandId !== selectedBrandId) return false;
      if (selectedModelId && row.modelId !== selectedModelId) return false;

      if (!keyword) return true;

      return `${row.itemName} ${row.productCode} ${row.brandName} ${row.modelName} ${row.unit}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [
    hasBaseSelection,
    rows,
    search,
    selectedCategoryId,
    selectedSubCategoryId,
    selectedBrandId,
    selectedModelId,
  ]);

  const selectedCategoryName =
    categoryOptions.find((item) => item._id === selectedCategoryId)?.name || "";
  const selectedSubCategoryName =
    subCategoryOptions.find((item) => item._id === selectedSubCategoryId)?.name || "";
  const selectedBrandName =
    brandOptions.find((item) => item._id === selectedBrandId)?.name || "";
  const selectedModelName =
    modelOptions.find((item) => item._id === selectedModelId)?.name || "";

  const tableModeLabel = useMemo(() => {
    if (!hasBaseSelection) return "";
    if (selectedBrandId && selectedModelId) {
      return "Category + Subcategory + Brand + Model Wise Price List";
    }
    if (selectedBrandId) {
      return "Category + Subcategory + Brand Wise Price List";
    }
    return "Category + Subcategory Wise Price List";
  }, [hasBaseSelection, selectedBrandId, selectedModelId]);

  const totalPages = Math.max(1, Math.ceil(reportRows.length / rowsPerPage));

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return reportRows.slice(start, start + rowsPerPage);
  }, [page, reportRows, rowsPerPage]);

  const paginationStart = reportRows.length === 0 ? 0 : page * rowsPerPage + 1;
  const paginationEnd = Math.min(reportRows.length, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    setPage(0);
  }, [
    search,
    rowsPerPage,
    selectedShop.id,
    selectedCategoryId,
    selectedSubCategoryId,
    selectedBrandId,
    selectedModelId,
  ]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  async function handleRefresh() {
    if (!accessToken || !selectedShop.id) return;

    try {
      setRefreshing(true);
      await Promise.all([fetchProducts(), fetchFilterMappings()]);
    } finally {
      setRefreshing(false);
    }
  }

  function buildReportMeta(): ReportMeta {
    return {
      shopName: selectedShop.name,
      categoryName: selectedCategoryName,
      subcategoryName: selectedSubCategoryName,
      brandName: selectedBrandId ? selectedBrandName : undefined,
      modelName: selectedModelId ? selectedModelName : undefined,
    };
  }

  function handlePrint() {
    if (!hasBaseSelection || !reportRows.length) {
      toast.error("Select filters and load products before printing");
      return;
    }

    const popup = window.open("", "_blank", "width=1200,height=900");

    if (!popup) {
      toast.error("Unable to open print window");
      return;
    }

    popup.document.open();
    popup.document.write(buildPrintHtml(reportRows, buildReportMeta()));
    popup.document.close();
  }

  function handleDownloadPdf() {
    if (!hasBaseSelection || !reportRows.length) {
      toast.error("Select filters and load products before downloading");
      return;
    }

    try {
      const pdf = buildPriceListPdf(reportRows, buildReportMeta());
      const url = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      const fileBaseName = [
        selectedShop.name || "shop",
        selectedCategoryName,
        selectedSubCategoryName,
        selectedBrandName,
        selectedModelName,
        "product-price-list",
      ]
        .filter(Boolean)
        .join("-");

      link.href = url;
      link.download = `${sanitizeFileName(fileBaseName)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to generate PDF");
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="premium-card-solid w-full px-8 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#00008b]/10 border-t-[#00008b]">
              <Loader2 className="h-6 w-6 animate-spin text-[#00008b]" />
            </div>

            <p className="mt-4 text-sm font-semibold text-secondary-text">
              Loading product price list...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="w-full">
        <section className="premium-card-solid overflow-hidden rounded-[20px]">
          <div className="border-b border-token px-4 py-4 md:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#00008b]">
                  <FileText className="h-3.5 w-3.5" />
                  Price List Report
                </div>

                <h1 className="mt-3 text-[24px] font-bold tracking-tight text-heading md:text-[26px]">
                  Product Price List
                </h1>

                <p className="mt-1.5 text-[13px] text-secondary-text">
                  Choose a category and subcategory first, then optionally use
                  brand and model filters for the selected shop.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing || !selectedShop.id}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-bold text-[#00008b] shadow-sm transition hover:border-[#00008b]/25 hover:bg-[#00008b]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={classNames(
                      "h-4 w-4",
                      refreshing && "animate-spin"
                    )}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!hasBaseSelection || reportRows.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!hasBaseSelection || reportRows.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#00008b] bg-[#00008b] px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#06066f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={selectedCategoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                disabled={!selectedShop.id}
                className="premium-select h-10 rounded-lg px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((option) => (
                  <option key={option._id} value={option._id}>
                    {option.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubCategoryId}
                onChange={(event) => handleSubCategoryChange(event.target.value)}
                disabled={!selectedCategoryId || subCategoryOptions.length === 0}
                className="premium-select h-10 rounded-lg px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {!selectedCategoryId
                    ? "Select Category First"
                    : subCategoryOptions.length === 0
                      ? "No Subcategories Available"
                      : "Select Subcategory"}
                </option>
                {subCategoryOptions.map((option) => (
                  <option key={option._id} value={option._id}>
                    {option.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedBrandId}
                onChange={(event) => handleBrandChange(event.target.value)}
                disabled={!selectedSubCategoryId || brandOptions.length === 0}
                className="premium-select h-10 rounded-lg px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {!selectedSubCategoryId
                    ? "Select Subcategory First"
                    : brandOptions.length === 0
                      ? "No Brands Available"
                      : "All Brands"}
                </option>
                {brandOptions.map((option) => (
                  <option key={option._id} value={option._id}>
                    {option.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedModelId}
                onChange={(event) => setSelectedModelId(event.target.value)}
                disabled={!selectedBrandId || modelOptions.length === 0}
                className="premium-select h-10 rounded-lg px-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {!selectedBrandId
                    ? "Select Brand First"
                    : modelOptions.length === 0
                      ? "No Models Available"
                      : "All Models"}
                </option>
                {modelOptions.map((option) => (
                  <option key={option._id} value={option._id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            {hasBaseSelection ? (
              <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by product name, code, brand, or model"
                    className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                  />
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00008b]">
                  <FolderTree className="h-3.5 w-3.5" />
                  {tableModeLabel}
                </span>
              </div>
            ) : null}
          </div>

          {!selectedShop.id ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00008b]/5 text-[#00008b]">
                <Store className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No shop selected
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Select a shop first to generate the product price list.
              </p>
            </div>
          ) : !hasBaseSelection ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00008b]/5 text-[#00008b]">
                <FolderTree className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                Select filters to generate the price list
              </h3>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-secondary-text">
                Start with a category, then choose a subcategory. After that you
                can optionally narrow the result with a brand and model before
                printing or downloading the report.
              </p>
            </div>
          ) : reportRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00008b]/5 text-[#00008b]">
                <FileText className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No products found for this filter
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                Try another brand, model, or search term for the selected
                category and subcategory.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-token px-4 py-4 md:px-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-[16px] font-bold text-heading">
                      {tableModeLabel}
                    </h2>

                    <p className="mt-1 text-[12px] text-secondary-text">
                      {selectedCategoryName}
                      {" -> "}
                      {selectedSubCategoryName}
                      {selectedBrandId ? ` -> ${selectedBrandName}` : ""}
                      {selectedModelId ? ` -> ${selectedModelName}` : ""}
                    </p>
                  </div>

                  <p className="text-[13px] font-semibold text-primary-text">
                    {reportRows.length} product{reportRows.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse">
                  <thead className="bg-soft-token">
                    <tr>
                      {[
                        "S.No",
                        "Product",
                        "Brand",
                        "Model",
                        "Unit",
                        "MRP Price",
                        "Selling Price",
                        "Stock Qty",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={classNames(
                            "border-b border-token px-3 py-3 text-[11px] font-bold text-primary-text",
                            heading.includes("Price") || heading === "Stock Qty"
                              ? "text-right"
                              : "text-left"
                          )}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-divider bg-card-token">
                    {paginatedRows.map((row, index) => (
                      <tr
                        key={row._id}
                        className="transition hover:bg-[#00008b]/5"
                      >
                        <td className="px-3 py-3 text-[12px] text-secondary-text">
                          {page * rowsPerPage + index + 1}
                        </td>

                        <td className="px-3 py-3">
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-heading">
                              {row.itemName}
                            </div>
                            <p className="mt-1 text-[11px] text-secondary-text">
                              Code: {row.productCode}
                            </p>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-[12px] font-semibold text-primary-text">
                          {row.brandName || "-"}
                        </td>

                        <td className="px-3 py-3 text-[12px] font-semibold text-primary-text">
                          {row.modelName || "-"}
                        </td>

                        <td className="px-3 py-3 text-[12px] font-semibold text-primary-text">
                          {row.unit}
                        </td>

                        <td className="px-3 py-3 text-right text-[12px] font-semibold text-primary-text">
                          {formatMoney(row.mrpPrice)}
                        </td>

                        <td className="px-3 py-3 text-right text-[12px] font-semibold text-primary-text">
                          {formatMoney(row.sellingPrice)}
                        </td>

                        <td className="px-3 py-3 text-right text-[12px] font-semibold text-primary-text">
                          {row.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-token px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <label className="inline-flex items-center justify-end gap-2 text-[13px] font-semibold text-primary-text">
                    Rows per page:
                    <select
                      value={rowsPerPage}
                      onChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                      }}
                      className="premium-select h-10 rounded-lg px-3 text-[13px]"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center justify-end gap-3">
                    <p className="text-[13px] font-semibold text-primary-text">
                      {paginationStart}-{paginationEnd} of {reportRows.length}
                    </p>

                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                      disabled={page === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      &lt;
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPage((prev) => Math.min(prev + 1, totalPages - 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
