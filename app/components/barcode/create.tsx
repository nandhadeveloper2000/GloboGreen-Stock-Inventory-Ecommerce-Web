"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeInfo,
  Eye,
  Printer,
  Search,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type BarcodeType = "CODE128" | "QR";

type LabelFormat = {
  _id: string;
  name: string;
  scheme: string;
  paperSize: string;
  labelWidth: number;
  labelHeight: number;
  leftMargin: number;
  topMargin: number;
  horizontalGap: number;
  verticalGap: number;
  noOfColumns: number;
  currency: string;
  barcodeType: BarcodeType;
  fields: string[];
  isUse: boolean;
};

type BarcodeProduct = {
  _id: string;
  stockName: string;
  sku?: string;
  barcode: string;
  sellingPrice: number;
  mrp: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  vendorName?: string;
  image?: string;
  qty?: number;
};

type MediaAsset = {
  url?: string;
};

type ProductVariantReference = {
  images?: MediaAsset[];
};

type ShopProductReference =
  | string
  | {
      _id?: string;
      itemName?: string;
      name?: string;
      sku?: string;
      itemKey?: string;
      itemModelNumber?: string;
      mrpPrice?: number;
      price?: number;
      images?: MediaAsset[];
      variant?: ProductVariantReference[];
    };

type ShopProductVariantEntry = {
  variantIndex?: number;
  title?: string;
  mrpPrice?: number;
  sellingPrice?: number;
  maxSellingPrice?: number;
  unitSellingPrice?: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  isActive?: boolean;
};

type VendorReference =
  | string
  | {
      vendorName?: string;
      name?: string;
    };

type ShopProductItem = {
  _id: string;
  itemName?: string;
  itemCode?: string;
  sku?: string;
  barcode?: string;
  barcodeNo?: string;
  barcodeNumber?: string;
  mrpPrice?: number;
  sellingPrice?: number;
  maxSellingPrice?: number;
  unitSellingPrice?: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  images?: MediaAsset[];
  qty?: number;
  stockQty?: number;
  availableQty?: number;
  vendorId?: VendorReference | null;
  productId?: ShopProductReference;
  variantEntries?: ShopProductVariantEntry[];
};

type CopiesState = Record<string, number>;

const DEFAULT_LABEL_FORMAT: LabelFormat = {
  _id: "default-label-format",
  name: "Default",
  scheme: "4x4",
  paperSize: "A4",
  labelWidth: 39,
  labelHeight: 35,
  leftMargin: 0,
  topMargin: 1,
  horizontalGap: 0,
  verticalGap: 1,
  noOfColumns: 5,
  currency: "Rs.",
  barcodeType: "CODE128",
  fields: [
    "PRODUCT_IMAGE",
    "NAME",
    "BARCODE",
    "MRP",
    "PURCHASE_DATE",
    "EXPIRY_DATE",
  ],
  isUse: true,
};

const getShopId = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("selected_shop_id_web") || "";
};

const money = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const getResponseData = <T,>(res: unknown): T => {
  const response = res as { data?: ApiResponse<T> | T };
  const data = response?.data;

  if (data && typeof data === "object" && "data" in data) {
    return (data as ApiResponse<T>).data as T;
  }

  return data as T;
};

const getText = (value: unknown) => String(value || "").trim();

const getProductReference = (value?: ShopProductReference) => {
  if (!value || typeof value === "string") return null;
  return value;
};

const getVendorName = (value?: VendorReference | null) => {
  if (!value) return "";
  if (typeof value === "string") return getText(value);
  return getText(value.vendorName) || getText(value.name);
};

const getActiveVariantEntries = (entries?: ShopProductVariantEntry[]) =>
  Array.isArray(entries)
    ? entries.filter((entry) => entry?.isActive !== false)
    : [];

const getImageUrl = (images?: MediaAsset[]) =>
  Array.isArray(images)
    ? getText(images.find((image) => getText(image?.url))?.url)
    : "";

const getProductImage = (item: ShopProductItem) => {
  const product = getProductReference(item.productId);
  const firstVariant = getActiveVariantEntries(item.variantEntries)[0];
  const variantIndex = Number(firstVariant?.variantIndex ?? 0);
  const productVariants = Array.isArray(product?.variant) ? product.variant : [];

  const selectedVariantImage = getImageUrl(productVariants[variantIndex]?.images);
  const anyVariantImage = getImageUrl(
    productVariants.flatMap((variant) =>
      Array.isArray(variant?.images) ? variant.images : []
    )
  );
  const shopProductImage = getImageUrl(item.images);
  const productImage = getImageUrl(product?.images);

  return selectedVariantImage || anyVariantImage || shopProductImage || productImage;
};

const getSellingPrice = (item: ShopProductItem, firstVariant: ShopProductVariantEntry) =>
  Number(firstVariant?.sellingPrice || 0) ||
  Number(firstVariant?.maxSellingPrice || 0) ||
  Number(firstVariant?.unitSellingPrice || 0) ||
  Number(item.sellingPrice || 0) ||
  Number(item.maxSellingPrice || 0) ||
  Number(item.unitSellingPrice || 0) ||
  0;

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const sanitizeLabelFields = (fields?: string[]) =>
  Array.isArray(fields)
    ? fields.filter((field) => field !== "VENDOR_NAME")
    : [];

const mapShopProductToBarcodeProduct = (item: ShopProductItem): BarcodeProduct => {
  const product = getProductReference(item.productId);
  const firstVariant = getActiveVariantEntries(item.variantEntries)[0] || {};

  const stockName =
    getText(item.itemName) ||
    getText(product?.itemName) ||
    getText(product?.name) ||
    getText(firstVariant.title) ||
    "Product";

  const sku =
    getText(item.sku) ||
    getText(item.itemCode) ||
    getText(product?.sku) ||
    getText(product?.itemKey) ||
    getText(product?.itemModelNumber);

  return {
    _id: String(item._id),
    stockName,
    sku,
    barcode:
      getText(item.barcode) ||
      getText(item.barcodeNo) ||
      getText(item.barcodeNumber) ||
      sku ||
      String(item._id),
    sellingPrice: getSellingPrice(item, firstVariant),
    mrp:
      Number(item.mrpPrice || 0) ||
      Number(firstVariant.mrpPrice || 0) ||
      Number(product?.mrpPrice || 0) ||
      Number(product?.price || 0),
    purchaseDate: item.purchaseDate || firstVariant.purchaseDate || null,
    expiryDate: item.expiryDate || firstVariant.expiryDate || null,
    vendorName: getVendorName(item.vendorId),
    image: getProductImage(item),
    qty:
      Number(item.qty || 0) ||
      Number(item.stockQty || 0) ||
      Number(item.availableQty || 0) ||
      0,
  };
};

const escapeHtml = (value: string) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const createBarcodeSvg = (value: string) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  JsBarcode(svg, value || "-", {
    format: "CODE128",
    displayValue: false,
    height: 34,
    margin: 0,
    width: 1.5,
  });

  return new XMLSerializer().serializeToString(svg);
};

const createQrImage = async (value: string) => {
  return QRCode.toDataURL(value || "-", {
    margin: 0,
    width: 90,
  });
};

const buildPrintHtml = async (
  format: LabelFormat,
  products: BarcodeProduct[],
  copies: CopiesState
) => {
  const labels: string[] = [];

  for (const product of products) {
    const count = Math.max(0, Number(copies[product._id] || 0));

    for (let i = 0; i < count; i += 1) {
      let codeHtml = "";

      if (format.barcodeType === "QR") {
        const src = await createQrImage(product.barcode);
        codeHtml = `<img class="qr-img" src="${src}" alt="QR" />`;
      } else {
        codeHtml = `<div class="barcode-svg">${createBarcodeSvg(
          product.barcode
        )}</div>`;
      }

      const labelFields = sanitizeLabelFields(format.fields);
      const hasField = (field: string) => labelFields.includes(field);
      const showImage = hasField("PRODUCT_IMAGE") && Boolean(product.image);
      const showName = hasField("NAME");
      const showSellingPrice = hasField("SELLING_PRICE");
      const showMrp = hasField("MRP");
      const showPurchaseDate =
        hasField("PURCHASE_DATE") && Boolean(product.purchaseDate);
      const showExpiryDate =
        hasField("EXPIRY_DATE") && Boolean(product.expiryDate);

      labels.push(`
        <div class="label">
          ${
            showImage || showName
              ? `
                <div class="label-header">
                  ${
                    showImage
                      ? `<img class="label-image" src="${escapeHtml(
                          product.image || ""
                        )}" alt="${escapeHtml(product.stockName)}" />`
                      : ""
                  }
                  <div class="label-header-body">
                    ${
                      showName
                        ? `<div class="label-name">${escapeHtml(
                            product.stockName
                          )}</div>`
                        : ""
                    }
                  </div>
                </div>
              `
              : ""
          }
          ${
            hasField("BARCODE")
              ? `<div class="barcode-wrap">${codeHtml}`
              : ""
          }
          ${
            hasField("BARCODE")
              ? `<div class="barcode-text">${escapeHtml(product.barcode)}</div>`
              : ""
          }
          ${hasField("BARCODE") ? `</div>` : ""}
          ${
            hasField("SKU") && product.sku
              ? `<div class="small-text">SKU: ${escapeHtml(product.sku)}</div>`
              : ""
          }
          ${
            showSellingPrice || showMrp || showPurchaseDate || showExpiryDate
              ? `
                <div class="meta-grid">
                  ${
                    showSellingPrice
                      ? `
                        <div class="meta-item">
                          <div class="meta-label">Selling</div>
                          <div class="meta-value">${escapeHtml(
                            format.currency || "Rs."
                          )} ${money(product.sellingPrice)}</div>
                        </div>
                      `
                      : ""
                  }
                  ${
                    showMrp
                      ? `
                        <div class="meta-item">
                          <div class="meta-label">MRP</div>
                          <div class="meta-value">${escapeHtml(
                            format.currency || "Rs."
                          )} ${money(product.mrp)}</div>
                        </div>
                      `
                      : ""
                  }
                  ${
                    showPurchaseDate
                      ? `
                        <div class="meta-item">
                          <div class="meta-label">Purchase</div>
                          <div class="meta-value">${escapeHtml(
                            formatDate(product.purchaseDate)
                          )}</div>
                        </div>
                      `
                      : ""
                  }
                  ${
                    showExpiryDate
                      ? `
                        <div class="meta-item">
                          <div class="meta-label">Expiry</div>
                          <div class="meta-value">${escapeHtml(
                            formatDate(product.expiryDate)
                          )}</div>
                        </div>
                      `
                      : ""
                  }
                </div>
              `
              : ""
          }
        </div>
      `);
    }
  }

  return `
    <!doctype html>
    <html>
      <head>
        <title>Barcode Labels</title>
        <style>
          @page {
            size: A4;
            margin: ${format.topMargin || 0}mm 0 0 ${format.leftMargin || 0}mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
          }

          .sheet {
            width: 210mm;
            min-height: 297mm;
            display: grid;
            grid-template-columns: repeat(${format.noOfColumns || 1}, ${
              format.labelWidth
            }mm);
            grid-auto-rows: ${format.labelHeight}mm;
            column-gap: ${format.horizontalGap || 0}mm;
            row-gap: ${format.verticalGap || 0}mm;
            align-content: start;
          }

          .label {
            width: ${format.labelWidth}mm;
            height: ${format.labelHeight}mm;
            padding: 1.5mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
            text-align: left;
            gap: 0.7mm;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .label-header {
            display: flex;
            align-items: flex-start;
            gap: 1mm;
          }

          .label-image {
            width: 9mm;
            height: 9mm;
            object-fit: cover;
            border-radius: 1mm;
            border: 0.3mm solid #dbe2ea;
            flex-shrink: 0;
          }

          .label-header-body {
            min-width: 0;
            flex: 1;
          }

          .label-name {
            width: 100%;
            font-size: 7.5px;
            line-height: 1.1;
            font-weight: 700;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .label-subtext {
            font-size: 6.2px;
            line-height: 1.15;
            color: #475569;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .barcode-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .barcode-svg {
            width: 100%;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .barcode-svg svg {
            max-width: 100%;
            height: 24px;
          }

          .qr-img {
            width: 12mm;
            height: 12mm;
            object-fit: contain;
          }

          .barcode-text {
            font-size: 6.5px;
            line-height: 1;
            margin-top: 1px;
            text-align: center;
          }

          .small-text {
            font-size: 6.4px;
            line-height: 1.1;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.4mm 1mm;
          }

          .meta-item {
            min-width: 0;
          }

          .meta-label {
            font-size: 5.2px;
            line-height: 1.1;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .meta-value {
            font-size: 6.2px;
            line-height: 1.15;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          ${labels.join("")}
        </div>
      </body>
    </html>
  `;
};

export default function BarcodePrinting() {
  const router = useRouter();

  const [shopId, setShopId] = useState("");
  const [formats, setFormats] = useState<LabelFormat[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState("");
  const [products, setProducts] = useState<BarcodeProduct[]>([]);
  const [copies, setCopies] = useState<CopiesState>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  const selectedFormat = useMemo(
    () => formats.find((item) => item._id === selectedFormatId) || null,
    [formats, selectedFormatId]
  );

  const effectiveFormat = useMemo(
    () =>
      selectedFormat ||
      formats.find((item) => item.isUse) ||
      formats[0] ||
      DEFAULT_LABEL_FORMAT,
    [formats, selectedFormat]
  );

  const totalLabels = useMemo(
    () =>
      Object.values(copies).reduce((sum, value) => {
        const count = Number(value || 0);
        return sum + (Number.isFinite(count) && count > 0 ? count : 0);
      }, 0),
    [copies]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return products;

    return products.filter((item) => {
      const text = [
        item.stockName,
        item.sku || "",
        item.barcode || "",
        item.vendorName || "",
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [products, search]);

  const scannedProduct = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return null;

    return (
      filteredProducts.find((item) => item.barcode.toLowerCase() === q) ||
      filteredProducts.find((item) => (item.sku || "").toLowerCase() === q) ||
      (filteredProducts.length === 1 ? filteredProducts[0] : null)
    );
  }, [filteredProducts, search]);

  const loadLabelFormats = useCallback(async (currentShopId: string) => {
    try {
      const response = await apiClient({
        method: SummaryApi.barcode_label_formats.method,
        url: SummaryApi.barcode_label_formats.url({
          shopId: currentShopId,
        }),
      });

      return getResponseData<LabelFormat[]>(response) || [];
    } catch (error) {
      console.error("Failed to load barcode label formats", error);
      return [];
    }
  }, []);

  const loadProducts = useCallback(async (currentShopId: string) => {
    try {
      const response = await apiClient({
        method: SummaryApi.barcode_products.method,
        url: SummaryApi.barcode_products.url({
          shopId: currentShopId,
        }),
      });

      const data = getResponseData<BarcodeProduct[]>(response) || [];

      if (data.length > 0) {
        return data;
      }
    } catch (error) {
      console.error("Failed to load barcode products", error);
    }

    try {
      const fallbackResponse = await apiClient({
        method: SummaryApi.shop_product_list.method,
        url: SummaryApi.shop_product_list.url(currentShopId),
      });

      const fallbackData = getResponseData<ShopProductItem[]>(fallbackResponse) || [];
      return fallbackData.map(mapShopProductToBarcodeProduct);
    } catch (error) {
      console.error("Failed to load shop products for barcode printing", error);
      return [];
    }
  }, []);

  const fetchData = useCallback(async () => {
    const currentShopId = getShopId();
    setShopId(currentShopId);

    if (!currentShopId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [formatRes, productRes] = await Promise.all([
        loadLabelFormats(currentShopId),
        loadProducts(currentShopId),
      ]);

      const formatData = formatRes || [];
      const productData = productRes || [];

      setFormats(formatData);
      setProducts(productData);

      const active = formatData.find((item) => item.isUse) || formatData[0];
      setSelectedFormatId(active?._id || "");
    } finally {
      setLoading(false);
    }
  }, [loadLabelFormats, loadProducts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCopies = (productId: string, value: string) => {
    const count = Math.max(0, Number(value || 0));

    setCopies((prev) => ({
      ...prev,
      [productId]: Number.isFinite(count) ? count : 0,
    }));
  };

  const openPrintWindow = async (autoPrint: boolean) => {
    if (totalLabels <= 0) return;

    const popup = window.open("", "_blank", "width=1100,height=800");

    if (!popup) {
      alert("Popup blocked. Please allow popup for preview/print.");
      return;
    }

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Preparing barcode labels...</title>
        </head>
        <body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          Preparing barcode labels...
        </body>
      </html>
    `);
    popup.document.close();

    setPrinting(true);

    try {
      const html = await buildPrintHtml(effectiveFormat, products, copies);

      popup.document.open();
      popup.document.write(html);
      popup.document.close();

      if (autoPrint) {
        const triggerPrint = () => {
          popup.focus();
          popup.print();
        };

        popup.onload = triggerPrint;

        setTimeout(() => {
          triggerPrint();
        }, 500);
      }
    } catch (error) {
      popup.document.open();
      popup.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Barcode print failed</title>
          </head>
          <body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#991b1b;background:#fef2f2;">
            Failed to prepare barcode labels. Please try again.
          </body>
        </html>
      `);
      popup.document.close();
      console.error("Failed to open barcode preview/print window", error);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f5f5] p-4 text-sm text-black">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[#1976d2] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold">Barcode Printing</h1>

        {formats.length > 0 && (
          <div className="ml-4 w-45">
            <label className="mb-1 block text-xs text-gray-600">
              Label format
            </label>
            <select
              value={selectedFormatId}
              onChange={(e) => setSelectedFormatId(e.target.value)}
              className="h-9 w-full rounded-sm border border-gray-300 bg-white px-2 outline-none focus:border-[#1976d2]"
            >
              {formats.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!shopId && (
        <div className="mb-4 border border-red-100 bg-red-50 px-4 py-3 text-red-700">
          Valid shopId required. Please select shop first.
        </div>
      )}

      {formats.length === 0 ? (
        <div className="mb-4 flex items-center gap-3 bg-[#e5f6fd] px-4 py-4 text-[#00344d]">
          <BadgeInfo className="h-5 w-5 text-[#0288d1]" />
          <span>
            No label formats found. Create one in Settings → Label settings
            (Barcode / QR), then set it as &quot;Use it&quot; so it appears
            here for printing.
          </span>
        </div>
      ) : (
        <div className="mb-3 text-gray-700">
          Label format in use:{" "}
          <b>{effectiveFormat.name}</b>.
          Change above to use a different format for this session.
        </div>
      )}

      <section className="rounded-sm border border-gray-300 bg-white p-3 shadow-sm">
        <h2 className="mb-3 font-bold">Product list</h2>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Scan barcode or search by name, SKU, vendor..."
            className="h-9 w-full rounded-sm border border-gray-300 pl-9 pr-3 outline-none focus:border-[#1976d2]"
          />
        </div>

        <p className="mb-3 text-xs text-gray-500">
          Scan the barcode into the search box to view product name, selling
          price, MRP, purchase date, expiry date, vendor name, and image before
          printing.
        </p>

        {scannedProduct && (
          <div className="mb-4 rounded-lg border border-[#c7d2fe] bg-[#eef2ff] p-4">
            <div className="mb-3 flex items-center gap-2">
              <BadgeInfo className="h-4 w-4 text-[#1d4ed8]" />
              <h3 className="text-sm font-semibold text-[#1e3a8a]">
                Scanned Product Details
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-[112px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-lg border border-[#cbd5e1] bg-white">
                {scannedProduct.image ? (
                  <img
                    src={scannedProduct.image}
                    alt={scannedProduct.stockName}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-28 items-center justify-center text-xs font-medium text-slate-400">
                    No Image
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Product Name
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {scannedProduct.stockName}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Barcode
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {scannedProduct.barcode || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Selling Price
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    Rs.{money(scannedProduct.sellingPrice)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    MRP Price
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    Rs.{money(scannedProduct.mrp)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Purchase Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDate(scannedProduct.purchaseDate)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Expiry Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDate(scannedProduct.expiryDate)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Vendor Name
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {scannedProduct.vendorName || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Copies
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {copies[scannedProduct._id] || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-xs font-bold">Image</th>
                <th className="px-3 py-2 text-xs font-bold">Product Name</th>
                <th className="px-3 py-2 text-xs font-bold">Selling Price</th>
                <th className="px-3 py-2 text-xs font-bold">MRP Price</th>
                <th className="px-3 py-2 text-xs font-bold">Purchase Date</th>
                <th className="px-3 py-2 text-xs font-bold">Expiry Date</th>
                <th className="px-3 py-2 text-xs font-bold">Vendor Name</th>
                <th className="px-3 py-2 text-xs font-bold">BARCODE</th>
                <th className="px-3 py-2 text-xs font-bold text-right">
                  No Of Copies
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => (
                  <tr key={item._id} className="border-b border-gray-200">
                    <td className="px-3 py-3">
                      <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.stockName}
                            className="h-12 w-12 object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center text-[10px] font-medium text-slate-400">
                            No Image
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium">{item.stockName}</td>
                    <td className="px-3 py-3">
                      Rs.{money(Number(item.sellingPrice || 0))}
                    </td>
                    <td className="px-3 py-3">
                      Rs.{money(Number(item.mrp || 0))}
                    </td>
                    <td className="px-3 py-3">
                      {formatDate(item.purchaseDate)}
                    </td>
                    <td className="px-3 py-3">
                      {formatDate(item.expiryDate)}
                    </td>
                    <td className="px-3 py-3">{item.vendorName || "-"}</td>
                    <td className="px-3 py-3">{item.barcode}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={copies[item._id] || ""}
                        onChange={(e) => updateCopies(item._id, e.target.value)}
                        className="h-9 w-18 rounded-sm border border-gray-300 px-2 text-center outline-none focus:border-[#1976d2]"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-gray-700">
            total labels selected: <b>{totalLabels}</b>
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push("/shopowner/barcode-printing/settings/label-settings")}
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#1976d2] bg-white px-3 text-[#1976d2] hover:bg-blue-50"
            >
              <Settings className="h-4 w-4" />
              Label settings
            </button>

            <button
              type="button"
              disabled={totalLabels <= 0 || printing}
              onClick={() => openPrintWindow(false)}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#1976d2] px-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Eye className="h-4 w-4" />
              Show preview (opens in new window for print)
            </button>

            <button
              type="button"
              disabled={totalLabels <= 0 || printing}
              onClick={() => openPrintWindow(true)}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#2e7d32] px-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Printer className="h-4 w-4" />
              Direct Print
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
