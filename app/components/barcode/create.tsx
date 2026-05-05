"use client";

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
  mrp: number;
  qty?: number;
};

type CopiesState = Record<string, number>;

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

      const hasField = (field: string) => format.fields?.includes(field);

      labels.push(`
        <div class="label">
          ${
            hasField("NAME")
              ? `<div class="label-name">${escapeHtml(product.stockName)}</div>`
              : ""
          }
          ${hasField("BARCODE") ? codeHtml : ""}
          ${
            hasField("BARCODE")
              ? `<div class="barcode-text">${escapeHtml(product.barcode)}</div>`
              : ""
          }
          ${
            hasField("SKU") && product.sku
              ? `<div class="small-text">SKU: ${escapeHtml(product.sku)}</div>`
              : ""
          }
          ${
            hasField("MRP")
              ? `<div class="price">${escapeHtml(format.currency || "Rs.")} ${money(
                  product.mrp
                )}</div>`
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
            align-items: center;
            justify-content: center;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .label-name {
            width: 100%;
            font-size: 10px;
            line-height: 1.1;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .barcode-svg {
            width: 100%;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .barcode-svg svg {
            max-width: 100%;
            height: 35px;
          }

          .qr-img {
            width: 18mm;
            height: 18mm;
            object-fit: contain;
          }

          .barcode-text {
            font-size: 8px;
            line-height: 1;
            margin-top: 1px;
          }

          .small-text {
            font-size: 8px;
            line-height: 1.1;
          }

          .price {
            font-size: 10px;
            line-height: 1.1;
            font-weight: 700;
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
      const text = `${item.stockName} ${item.sku || ""} ${
        item.barcode || ""
      }`.toLowerCase();

      return text.includes(q);
    });
  }, [products, search]);

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
        apiClient({
          method: SummaryApi.barcode_label_formats.method,
          url: SummaryApi.barcode_label_formats.url,
          params: { shopId: currentShopId },
        }),
        apiClient({
          method: SummaryApi.barcode_products.method,
          url: SummaryApi.barcode_products.url,
          params: { shopId: currentShopId },
        }),
      ]);

      const formatData = getResponseData<LabelFormat[]>(formatRes) || [];
      const productData = getResponseData<BarcodeProduct[]>(productRes) || [];

      setFormats(formatData);
      setProducts(productData);

      const active = formatData.find((item) => item.isUse) || formatData[0];
      setSelectedFormatId(active?._id || "");
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (!selectedFormat || totalLabels <= 0) return;

    setPrinting(true);

    try {
      const html = await buildPrintHtml(selectedFormat, products, copies);
      const popup = window.open("", "_blank", "width=1100,height=800");

      if (!popup) {
        alert("Popup blocked. Please allow popup for preview/print.");
        return;
      }

      popup.document.open();
      popup.document.write(html);
      popup.document.close();

      if (autoPrint) {
        popup.onload = () => {
          popup.focus();
          popup.print();
        };

        setTimeout(() => {
          popup.focus();
          popup.print();
        }, 500);
      }
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
          <b>{selectedFormat?.name || formats.find((f) => f.isUse)?.name}</b>.
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
            placeholder="Search by name, SKU, barcode..."
            className="h-9 w-full rounded-sm border border-gray-300 pl-9 pr-3 outline-none focus:border-[#1976d2]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-212.5 border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-xs font-bold">Stock Name</th>
                <th className="px-3 py-2 text-xs font-bold">BARCODE</th>
                <th className="px-3 py-2 text-xs font-bold">MRP</th>
                <th className="px-3 py-2 text-xs font-bold text-right">
                  No Of Copies
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => (
                  <tr key={item._id} className="border-b border-gray-200">
                    <td className="px-3 py-3">{item.stockName}</td>
                    <td className="px-3 py-3">{item.barcode}</td>
                    <td className="px-3 py-3">
                      Rs.{money(Number(item.mrp || 0))}
                    </td>
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
              disabled={!selectedFormat || totalLabels <= 0 || printing}
              onClick={() => openPrintWindow(false)}
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#1976d2] px-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Eye className="h-4 w-4" />
              Show preview (opens in new window for print)
            </button>

            <button
              type="button"
              disabled={!selectedFormat || totalLabels <= 0 || printing}
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