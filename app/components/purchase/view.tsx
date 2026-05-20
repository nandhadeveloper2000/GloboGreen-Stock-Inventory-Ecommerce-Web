"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type SupplierDetails = {
  vendorName?: string;
  code?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  address?: Address;
};

type ShopDetails = {
  name?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  shopAddress?: Address;
  address?: Address;
  frontImageUrl?: string;
  frontImagePublicId?: string;
  shopOwnerAccountId?: {
    name?: string;
    email?: string;
    mobile?: string;
  } | null;
};

type PurchaseOrder = {
  _id: string;
  purchaseNo: string;
  mode: string;
  purchaseDate: string;
  invoiceNo?: string;
  invoiceDate?: string;
  payMode?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  netAmount?: number;
  status?: string;
  supplierId?: SupplierDetails | null;
  items?: Array<{
    _id: string;
    supplierId?: SupplierDetails | null;
    itemCode?: string;
    productName?: string;
    batch?: string;
    qty?: number;
    purchasePrice?: number;
    discount?: {
      percent?: number;
      amount?: number;
    };
    tax?: {
      label?: string;
      percent?: number;
    };
    purchaseAfterTax?: number;
    amount?: number;
  }>;
};

const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
const DARK_BLUE = "#00008b";

function readSelectedShop() {
  if (typeof window === "undefined") return { id: "", name: "" };

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
  };
}

function date(value?: string) {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function money(value?: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function moneyPlain(value?: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value || 0))}`;
}

function compactAddress(address?: Address | null) {
  if (!address) return "";

  return [
    address.street,
    address.area,
    address.taluk,
    address.district,
    address.state,
    address.pincode,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
}

function supplierName(supplier?: SupplierDetails | null) {
  return String(supplier?.vendorName || supplier?.code || "Supplier");
}

function rowTaxAmount(item: NonNullable<PurchaseOrder["items"]>[number]) {
  const qty = Number(item.qty || 0);
  const price = Number(item.purchasePrice || 0);
  const discount = Number(item.discount?.amount || 0);
  const afterDiscount = Math.max(qty * price - discount, 0);
  return Math.max(Number(item.amount || 0) - afterDiscount, 0);
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

function truncateText(value: unknown, maxLength: number) {
  const text = cleanPdfText(value);

  if (text.length <= maxLength) return text;

  return `${text.slice(0, Math.max(maxLength - 3, 0))}...`;
}

function sanitizeFileName(value: unknown) {
  return cleanPdfText(value).replace(/[^a-z0-9_-]+/gi, "-") || "invoice";
}

function pdfColor(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function estimateTextWidth(value: unknown, size: number) {
  return cleanPdfText(value).length * size * 0.52;
}

function buildPdfDocument(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
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

function buildInvoicePdf({
  data,
  shop,
  fallbackShopName,
}: {
  data: PurchaseOrder;
  shop: ShopDetails | null;
  fallbackShopName: string;
}) {
  const commands: string[] = [];
  const pageWidth = 595.28;
  const margin = 46;
  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const supplier = data.mode === "MULTI_SUPPLIER" ? null : data.supplierId;
  const shopAddress = compactAddress(shop?.shopAddress || shop?.address);
  const supplierAddress = compactAddress(supplier?.address);
  const invoiceNo = data.invoiceNo || data.purchaseNo || "-";
  const shopName = shop?.name || fallbackShopName || "Globo Green";
  const owner = shop?.shopOwnerAccountId || null;
  const shopMobile = shop?.mobile || owner?.mobile || "";
  const shopEmail = shop?.email || owner?.email || "";

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

    fillColor(options.color || "#111827");
    commands.push(
      `BT /${options.bold ? "F2" : "F1"} ${size} Tf ${nextX.toFixed(2)} ${y.toFixed(
        2
      )} Td (${escapePdfText(cleaned)}) Tj ET`
    );
  }

  function filledRect(x: number, y: number, width: number, height: number, color: string) {
    fillColor(color);
    commands.push(`${x} ${y} ${width} ${height} re f`);
  }

  function strokedRect(x: number, y: number, width: number, height: number) {
    strokeColor("#9ca3af");
    commands.push(`0.7 w ${x} ${y} ${width} ${height} re S`);
  }

  function horizontalLine(y: number, color = DARK_BLUE) {
    strokeColor(color);
    commands.push(`1.5 w ${margin} ${y} m ${pageWidth - margin} ${y} l S`);
  }

  text(shopName.toUpperCase(), pageWidth / 2, 790, {
    align: "center",
    bold: true,
    color: DARK_BLUE,
    size: 18,
  });

  let y = 770;
  [shopAddress, shopMobile ? `Contact - ${shopMobile}` : "", shopEmail ? `Email - ${shopEmail}` : "", shop?.gstNumber ? `GST - ${shop.gstNumber}` : ""]
    .filter(Boolean)
    .forEach((line) => {
      text(line, pageWidth / 2, y, { align: "center", size: 10 });
      y -= 14;
    });

  horizontalLine(y - 6);
  y -= 45;

  text("PURCHASE INVOICE / RECEIPT", pageWidth / 2, y, {
    align: "center",
    bold: true,
    color: DARK_BLUE,
    size: 20,
  });
  y -= 42;

  text("Supplier Details", margin, y, { bold: true, color: DARK_BLUE, size: 11 });
  text(`Order Number: ${invoiceNo}`, pageWidth - margin, y, {
    align: "right",
    bold: true,
    size: 10,
  });
  y -= 16;

  text(data.mode === "MULTI_SUPPLIER" ? "Multiple Supplier" : supplierName(supplier), margin, y, {
    bold: true,
    size: 10,
  });
  text(`Order Date: ${date(data.purchaseDate)}`, pageWidth - margin, y, {
    align: "right",
    bold: true,
    size: 10,
  });
  y -= 14;

  [supplier?.mobile, supplier?.email, supplierAddress, supplier?.gstNumber ? `GST - ${supplier.gstNumber}` : ""]
    .filter(Boolean)
    .forEach((line) => {
      text(line, margin, y, { size: 9 });
      y -= 12;
    });

  text(`Payment Method: ${data.payMode || "-"}`, pageWidth - margin, y + 26, {
    align: "right",
    bold: true,
    size: 10,
  });

  y -= 24;

  const columns =
    data.mode === "MULTI_SUPPLIER"
      ? [
          { label: "S.No", width: 30 },
          { label: "Supplier", width: 78 },
          { label: "Item", width: 125 },
          { label: "Qty", width: 38, right: true },
          { label: "Unit Price", width: 67, right: true },
          { label: "Discount", width: 58, right: true },
          { label: "Tax", width: 50, right: true },
          { label: "Total", width: 57, right: true },
        ]
      : [
          { label: "S.No", width: 35 },
          { label: "Item", width: 190 },
          { label: "Qty", width: 45, right: true },
          { label: "Unit Price", width: 70, right: true },
          { label: "Discount", width: 60, right: true },
          { label: "Tax", width: 55, right: true },
          { label: "Total", width: 48, right: true },
        ];

  const rowHeight = 24;
  filledRect(tableX, y - rowHeight, tableWidth, rowHeight, DARK_BLUE);

  let x = tableX;
  columns.forEach((column) => {
    text(column.label, column.right ? x + column.width - 6 : x + 6, y - 15, {
      align: column.right ? "right" : "left",
      bold: true,
      color: "#ffffff",
      size: 9,
    });
    x += column.width;
  });

  y -= rowHeight;

  (data.items || []).slice(0, 18).forEach((item, index) => {
    x = tableX;
    const values =
      data.mode === "MULTI_SUPPLIER"
        ? [
            String(index + 1),
            truncateText(supplierName(item.supplierId), 13),
            truncateText(item.productName || item.itemCode || "-", 24),
            String(Number(item.qty || 0)),
            moneyPlain(item.purchasePrice),
            moneyPlain(item.discount?.amount),
            moneyPlain(rowTaxAmount(item)),
            moneyPlain(item.amount),
          ]
        : [
            String(index + 1),
            truncateText(item.productName || item.itemCode || "-", 36),
            String(Number(item.qty || 0)),
            moneyPlain(item.purchasePrice),
            moneyPlain(item.discount?.amount),
            moneyPlain(rowTaxAmount(item)),
            moneyPlain(item.amount),
          ];

    columns.forEach((column, columnIndex) => {
      strokedRect(x, y - rowHeight, column.width, rowHeight);
      text(values[columnIndex], column.right ? x + column.width - 5 : x + 5, y - 15, {
        align: column.right ? "right" : "left",
        bold: column.label === "Total",
        size: 8,
      });
      x += column.width;
    });

    y -= rowHeight;
  });

  if ((data.items || []).length > 18) {
    text(`+ ${(data.items || []).length - 18} more items`, tableX, y - 14, {
      color: DARK_BLUE,
      size: 9,
    });
    y -= 24;
  }

  y -= 30;

  const totalsX = pageWidth - margin - 210;
  const totals = [
    ["Subtotal:", moneyPlain(data.subtotal), false],
    ["Tax Amount:", moneyPlain(data.taxAmount), false],
    ["Discount:", moneyPlain(data.discountAmount), false],
    ["Total Amount:", moneyPlain(data.netAmount), true],
  ] as const;

  totals.forEach(([label, value, isTotal]) => {
    if (isTotal) {
      filledRect(totalsX, y - 24, 210, 24, "#e8f0fb");
    }
    strokedRect(totalsX, y - 24, 115, 24);
    strokedRect(totalsX + 115, y - 24, 95, 24);
    text(label, totalsX + 7, y - 16, {
      bold: true,
      color: isTotal ? DARK_BLUE : "#111827",
      size: isTotal ? 10 : 9,
    });
    text(value, totalsX + 203, y - 16, {
      align: "right",
      bold: true,
      color: isTotal ? DARK_BLUE : "#111827",
      size: isTotal ? 10 : 9,
    });
    y -= 24;
  });

  text("Thank you for your business!", pageWidth / 2, 82, {
    align: "center",
    bold: true,
    color: DARK_BLUE,
    size: 11,
  });
  text(`This invoice was generated by ${shopName}.`, pageWidth / 2, 66, {
    align: "center",
    size: 8,
  });

  return buildPdfDocument(commands.join("\n"));
}

export default function PurchaseViewPage({ id }: { id: string }) {
  const { accessToken } = useAuth();

  const [shopId, setShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [data, setData] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPurchase = useCallback(async () => {
    if (!accessToken || !shopId || !id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [purchaseResponse, shopResponse] = await Promise.all([
        fetch(`${baseURL}${SummaryApi.purchase_detail.url(shopId, id)}`, {
          method: SummaryApi.purchase_detail.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${baseURL}${SummaryApi.shop_get.url(shopId)}`, {
          method: SummaryApi.shop_get.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }).catch(() => null),
      ]);

      const result = (await purchaseResponse
        .json()
        .catch(() => ({}))) as ApiResponse<PurchaseOrder>;

      if (!purchaseResponse.ok || !result.success) {
        throw new Error(result.message || "Failed to load purchase");
      }

      if (shopResponse?.ok) {
        const shopResult = (await shopResponse
          .json()
          .catch(() => ({}))) as ApiResponse<ShopDetails>;

        if (shopResult.success && shopResult.data) {
          setShop(shopResult.data);
        }
      }

      setData(result.data || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load purchase");
    } finally {
      setLoading(false);
    }
  }, [accessToken, shopId, id]);

  function downloadInvoice() {
    if (!data) return;

    const pdfBlob = buildInvoicePdf({
      data,
      shop,
      fallbackShopName: selectedShopName,
    });
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Purchase-Invoice-${sanitizeFileName(
      data.invoiceNo || data.purchaseNo
    )}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printInvoice() {
    if (!data) return;

    const pdfBlob = buildInvoicePdf({
      data,
      shop,
      fallbackShopName: selectedShopName,
    });
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  useEffect(() => {
    const selectedShop = readSelectedShop();
    setShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
  }, []);

  useEffect(() => {
    void loadPurchase();
  }, [loadPurchase]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#00008b]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <div className="rounded-md border bg-white p-6 text-center text-slate-500">
          Purchase order not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-md bg-[#00008b] p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">{data.purchaseNo}</h1>
            <p className="mt-1 text-sm text-white/80">
              {data.mode?.replace("_", " ")} - {date(data.purchaseDate)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={printInvoice}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>

            <button
              type="button"
              onClick={downloadInvoice}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-black text-[#00008b] transition hover:bg-blue-50"
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </button>

            <Link
              href="/shopowner/purchase/list"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/40 px-4 text-sm font-black text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-md border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-bold text-slate-400">Supplier</p>
            <p className="font-black">
              {data.mode === "MULTI_SUPPLIER"
                ? "Multiple Supplier"
                : supplierName(data.supplierId)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Invoice No</p>
            <p className="font-black">{data.invoiceNo || "-"}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Invoice Date</p>
            <p className="font-black">{date(data.invoiceDate)}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400">Pay Mode</p>
            <p className="font-black">{data.payMode || "-"}</p>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-md border bg-white shadow-sm">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead className="bg-[#00008b] text-white">
            <tr>
              <th className="px-3 py-3">S.No</th>

              {data.mode === "MULTI_SUPPLIER" ? (
                <th className="px-3 py-3">Supplier</th>
              ) : null}

              <th className="px-3 py-3">Item Code</th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Batch</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Purchase Price</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Tax</th>
              <th className="px-3 py-3">After Tax</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>

          <tbody>
            {(data.items || []).map((item, index) => (
              <tr key={item._id} className="border-b">
                <td className="px-3 py-3">{index + 1}</td>

                {data.mode === "MULTI_SUPPLIER" ? (
                  <td className="px-3 py-3">
                    {supplierName(item.supplierId)}
                  </td>
                ) : null}

                <td className="px-3 py-3">{item.itemCode || "-"}</td>
                <td className="px-3 py-3 font-bold">{item.productName || "-"}</td>
                <td className="px-3 py-3">{item.batch || "-"}</td>
                <td className="px-3 py-3">{item.qty || 0}</td>
                <td className="px-3 py-3">{money(item.purchasePrice)}</td>
                <td className="px-3 py-3">{money(item.discount?.amount)}</td>
                <td className="px-3 py-3">
                  {item.tax?.label || "None"} ({item.tax?.percent || 0}%)
                </td>
                <td className="px-3 py-3">{money(item.purchaseAfterTax)}</td>
                <td className="px-3 py-3 text-right font-black">
                  {money(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ml-auto max-w-lg rounded-md border bg-white p-4 shadow-sm">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <b>{money(data.subtotal)}</b>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <b>{money(data.taxAmount)}</b>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <b>{money(data.discountAmount)}</b>
          </div>
          <div className="mt-3 rounded-md bg-[#e8f0fb] p-4 text-right">
            <p className="text-xs font-black text-[#00008b]">Net Amount</p>
            <p className="text-2xl font-black text-[#00008b]">
              {money(data.netAmount)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
