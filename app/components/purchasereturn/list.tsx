"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Eye,
  FilePlus2,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Store,
  Undo2,
} from "lucide-react";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type PurchaseReturnRecord,
  formatDate,
  getPurchaseNumber,
  getPurchaseShopLabel,
  getPurchaseSupplier,
  getStatusLabel,
  getSupplierName,
  isPurchaseAllowedShop,
  money,
  normalizeSearchText,
  readSelectedShop,
  round,
  toNumber,
} from "./shared";

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type ShopDetails = {
  name?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  shopAddress?: Address;
  address?: Address;
  shopOwnerAccountId?: {
    name?: string;
    email?: string;
    mobile?: string;
  } | null;
};

type SupplierDetails = {
  vendorName?: string;
  code?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  address?: Address;
};

type PurchaseReturnItemLike = {
  _id?: string;
  itemCode?: string;
  productName?: string;
  name?: string;
  batch?: string;
  qty?: number;
  returnQty?: number;
  purchasePrice?: number;
  unitPrice?: number;
  price?: number;
  discount?: {
    percent?: number;
    amount?: number;
  };
  discountAmount?: number;
  tax?: {
    label?: string;
    percent?: number;
    amount?: number;
  };
  taxAmount?: number;
  amount?: number;
  total?: number;
  returnAmount?: number;
};

const DARK_BLUE = "#00008b";

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

function moneyPlain(value?: number) {
  return `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value || 0))}`;
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
  return cleanPdfText(value).replace(/[^a-z0-9_-]+/gi, "-") || "purchase-return";
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

  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function getReturnItems(row: PurchaseReturnRecord): PurchaseReturnItemLike[] {
  return Array.isArray(row.items) ? (row.items as PurchaseReturnItemLike[]) : [];
}

function getItemQty(item: PurchaseReturnItemLike) {
  return Math.max(toNumber(item.returnQty ?? item.qty, 0), 0);
}

function getItemPrice(item: PurchaseReturnItemLike) {
  return Math.max(toNumber(item.unitPrice ?? item.purchasePrice ?? item.price, 0), 0);
}

function getItemDiscount(item: PurchaseReturnItemLike) {
  return Math.max(toNumber(item.discount?.amount ?? item.discountAmount, 0), 0);
}

function getItemTax(item: PurchaseReturnItemLike) {
  return Math.max(toNumber(item.tax?.amount ?? item.taxAmount, 0), 0);
}

function getItemTotal(item: PurchaseReturnItemLike) {
  const explicitTotal = toNumber(item.returnAmount ?? item.total ?? item.amount, 0);

  if (explicitTotal > 0) return explicitTotal;

  const qty = getItemQty(item);
  const price = getItemPrice(item);
  const discount = getItemDiscount(item);
  const tax = getItemTax(item);

  return Math.max(qty * price - discount + tax, 0);
}

function getSafeReturnAmount(row: PurchaseReturnRecord) {
  const items = getReturnItems(row);

  if (!items.length) {
    return Math.max(toNumber(row.totalReturnAmount, 0), 0);
  }

  return round(items.reduce((total, item) => total + getItemTotal(item), 0));
}

function getReturnSubtotal(row: PurchaseReturnRecord) {
  const items = getReturnItems(row);

  if (!items.length) return getSafeReturnAmount(row);

  return round(
    items.reduce((total, item) => {
      const qty = getItemQty(item);
      const price = getItemPrice(item);
      return total + qty * price;
    }, 0)
  );
}

function getReturnTax(row: PurchaseReturnRecord) {
  return round(
    getReturnItems(row).reduce((total, item) => total + getItemTax(item), 0)
  );
}

function getReturnDiscount(row: PurchaseReturnRecord) {
  return round(
    getReturnItems(row).reduce((total, item) => total + getItemDiscount(item), 0)
  );
}

function buildPurchaseReturnInvoicePdf({
  row,
  shop,
  fallbackShopName,
}: {
  row: PurchaseReturnRecord;
  shop: ShopDetails | null;
  fallbackShopName: string;
}) {
  const commands: string[] = [];
  const pageWidth = 595.28;
  const margin = 46;
  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;

  const supplier = (row.supplierId ||
    getPurchaseSupplier(row.purchaseId)) as SupplierDetails | null;

  const shopName = shop?.name || fallbackShopName || "Globo Green";
  const owner = shop?.shopOwnerAccountId || null;
  const shopMobile = shop?.mobile || owner?.mobile || "";
  const shopEmail = shop?.email || owner?.email || "";
  const shopAddress = compactAddress(shop?.shopAddress || shop?.address);
  const supplierAddress = compactAddress(supplier?.address);

  const items = getReturnItems(row);
  const subtotal = getReturnSubtotal(row);
  const taxAmount = getReturnTax(row);
  const discountAmount = getReturnDiscount(row);
  const totalAmount = getSafeReturnAmount(row);

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
      `BT /${options.bold ? "F2" : "F1"} ${size} Tf ${nextX.toFixed(
        2
      )} ${y.toFixed(2)} Td (${escapePdfText(cleaned)}) Tj ET`
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

  [
    shopAddress,
    shopMobile ? `Contact - ${shopMobile}` : "",
    shopEmail ? `Email - ${shopEmail}` : "",
    shop?.gstNumber ? `GST - ${shop.gstNumber}` : "",
  ]
    .filter(Boolean)
    .forEach((line) => {
      text(line, pageWidth / 2, y, { align: "center", size: 10 });
      y -= 14;
    });

  horizontalLine(y - 6);
  y -= 45;

  text("PURCHASE RETURN INVOICE / RECEIPT", pageWidth / 2, y, {
    align: "center",
    bold: true,
    color: DARK_BLUE,
    size: 19,
  });

  y -= 42;

  text("Supplier Details", margin, y, {
    bold: true,
    color: DARK_BLUE,
    size: 11,
  });

  text(`Return No: ${row.returnNo || "-"}`, pageWidth - margin, y, {
    align: "right",
    bold: true,
    size: 10,
  });

  y -= 16;

  text(getSupplierName(supplier), margin, y, {
    bold: true,
    size: 10,
  });

  text(`Return Date: ${formatDate(row.returnDate)}`, pageWidth - margin, y, {
    align: "right",
    bold: true,
    size: 10,
  });

  y -= 14;

  [
    supplier?.mobile,
    supplier?.email,
    supplierAddress,
    supplier?.gstNumber ? `GST - ${supplier.gstNumber}` : "",
  ]
    .filter(Boolean)
    .forEach((line) => {
      text(line, margin, y, { size: 9 });
      y -= 12;
    });

  text(
    `Purchase Order: ${getPurchaseNumber(row.purchaseId, row.purchaseNo)}`,
    pageWidth - margin,
    y + 26,
    {
      align: "right",
      bold: true,
      size: 10,
    }
  );

  text(`Status: ${getStatusLabel(row.status)}`, pageWidth - margin, y + 10, {
    align: "right",
    bold: true,
    size: 10,
  });

  y -= 24;

  const columns = [
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

  items.slice(0, 18).forEach((item, index) => {
    x = tableX;

    const values = [
      String(index + 1),
      truncateText(item.productName || item.name || item.itemCode || "-", 36),
      String(getItemQty(item)),
      moneyPlain(getItemPrice(item)),
      moneyPlain(getItemDiscount(item)),
      moneyPlain(getItemTax(item)),
      moneyPlain(getItemTotal(item)),
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

  if (!items.length) {
    x = tableX;

    const values = [
      "1",
      truncateText(row.reason || "Purchase return", 36),
      String(Math.max(toNumber(row.totalQty, 0), 0)),
      moneyPlain(totalAmount),
      moneyPlain(0),
      moneyPlain(0),
      moneyPlain(totalAmount),
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
  }

  if (items.length > 18) {
    text(`+ ${items.length - 18} more items`, tableX, y - 14, {
      color: DARK_BLUE,
      size: 9,
    });

    y -= 24;
  }

  y -= 30;

  const totalsX = pageWidth - margin - 210;

  const totals = [
    ["Subtotal:", moneyPlain(subtotal), false],
    ["Tax Amount:", moneyPlain(taxAmount), false],
    ["Discount:", moneyPlain(discountAmount), false],
    ["Return Amount:", moneyPlain(totalAmount), true],
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

  if (row.reason || row.notes) {
    y -= 18;

    text("Return Reason / Notes", margin, y, {
      bold: true,
      color: DARK_BLUE,
      size: 10,
    });

    y -= 14;

    text(truncateText(row.reason || row.notes || "-", 90), margin, y, {
      size: 9,
    });
  }

  text("This purchase return receipt was generated by system.", pageWidth / 2, 70, {
    align: "center",
    size: 8,
  });

  return buildPdfDocument(commands.join("\n"));
}

export default function PurchaseReturnListPage() {
  const { accessToken } = useAuth();

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [selectedShopType, setSelectedShopType] = useState("");
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [rows, setRows] = useState<PurchaseReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const purchaseAllowedShopSelected = useMemo(
    () => isPurchaseAllowedShop(selectedShopType),
    [selectedShopType]
  );

  const selectedShopTypeLabel = useMemo(
    () => getPurchaseShopLabel(selectedShopType),
    [selectedShopType]
  );

  const syncSelectedShop = useCallback(() => {
    const selectedShop = readSelectedShop();

    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
    setSelectedShopType(selectedShop.type);
  }, []);

  const fetchRows = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setRows([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!selectedShopId || !purchaseAllowedShopSelected) {
        setRows([]);
        setShop(null);
        setErrorMessage("");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        const [returnResponse, shopResponse] = await Promise.all([
          fetch(`${baseURL}${SummaryApi.purchase_return_list.url(selectedShopId)}`, {
            method: SummaryApi.purchase_return_list.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`${baseURL}${SummaryApi.shop_get.url(selectedShopId)}`, {
            method: SummaryApi.shop_get.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }).catch(() => null),
        ]);

        const result = (await returnResponse
          .json()
          .catch(() => ({}))) as ApiResponse<PurchaseReturnRecord[]>;

        if (!returnResponse.ok || !result.success) {
          throw new Error(result.message || "Failed to load purchase returns");
        }

        if (shopResponse?.ok) {
          const shopResult = (await shopResponse
            .json()
            .catch(() => ({}))) as ApiResponse<ShopDetails>;

          if (shopResult.success && shopResult.data) {
            setShop(shopResult.data);
          }
        }

        setRows(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load purchase returns";

        setRows([]);
        setErrorMessage(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, purchaseAllowedShopSelected, selectedShopId]
  );

  useEffect(() => {
    syncSelectedShop();

    function handleShopChange() {
      syncSelectedShop();
    }

    window.addEventListener("shop-selection-changed", handleShopChange);
    window.addEventListener("storage", handleShopChange);

    return () => {
      window.removeEventListener("shop-selection-changed", handleShopChange);
      window.removeEventListener("storage", handleShopChange);
    };
  }, [syncSelectedShop]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const filteredRows = useMemo(() => {
    const query = normalizeSearchText(search);

    if (!query) return rows;

    return rows.filter((row) =>
      normalizeSearchText(
        [
          row.returnNo,
          getPurchaseNumber(row.purchaseId, row.purchaseNo),
          getSupplierName(row.supplierId || getPurchaseSupplier(row.purchaseId)),
          row.reason,
          row.notes,
          ...(row.items || []).flatMap((item) => [item.productName, item.itemCode]),
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(query)
    );
  }, [rows, search]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(Math.ceil(totalRows / rowsPerPage), 1);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [search, rowsPerPage]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageStart = totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(page * rowsPerPage, totalRows);

  function downloadPurchaseReturnInvoice(row: PurchaseReturnRecord) {
    const pdfBlob = buildPurchaseReturnInvoicePdf({
      row,
      shop,
      fallbackShopName: selectedShopName,
    });

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Purchase-Return-Invoice-${sanitizeFileName(
      row.returnNo || row._id
    )}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function printPurchaseReturnInvoice(row: PurchaseReturnRecord) {
    const pdfBlob = buildPurchaseReturnInvoicePdf({
      row,
      shop,
      fallbackShopName: selectedShopName,
    });

    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  const iconActionButtonClassName =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-token bg-white text-secondary-text transition hover:bg-primary-soft hover:text-primary";

  if (!selectedShopId) {
    return (
      <div className="page-shell">
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <div className="premium-card-solid w-full max-w-xl px-8 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Store className="h-6 w-6" />
            </div>

            <h1 className="mt-4 text-2xl font-bold text-heading">
              Purchase Return List
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary-text">
              Select a shop first to see purchase returns.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseAllowedShopSelected) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-4xl">
          <div className="premium-card-solid border-amber-200 bg-amber-50 px-6 py-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-heading">
                  Purchase Return List
                </h1>

                <p className="mt-2 text-sm leading-6 text-amber-900">
                  Purchase returns are available only for {selectedShopTypeLabel}.
                </p>
              </div>
            </div>
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
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(46,49,146,0.14)] bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <Undo2 className="h-3.5 w-3.5" />
                  Purchase Return Register
                </div>

                <h1 className="mt-3 text-[24px] font-bold tracking-tight text-heading md:text-[26px]">
                  Purchase Return List
                </h1>

                <p className="mt-1.5 text-[13px] text-secondary-text">
                  Manage processed return records for the currently selected shop.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-token bg-soft-token px-3 text-[12px] font-semibold text-primary-text">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    {selectedShopName || "No shop selected"}
                  </span>

                  <span className="inline-flex h-8 items-center rounded-lg bg-primary-soft px-3 text-[12px] font-semibold text-primary">
                    {selectedShopTypeLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchRows(true)}
                  disabled={refreshing}
                  className="premium-btn-secondary h-10 rounded-lg px-4 py-0 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <Link
                  href="/shopowner/purchasereturn/create"
                  className="premium-btn h-10 rounded-lg px-4 py-0 text-[13px]"
                >
                  <FilePlus2 className="h-4 w-4" />
                  New Return
                </Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by return no, purchase no, supplier, item code, or reason"
                  className="premium-input h-10 rounded-lg pl-10 pr-4 text-[13px]"
                />
              </div>

              <div className="flex h-10 flex-col items-center justify-center rounded-lg border border-[rgba(46,49,146,0.18)] bg-primary-soft px-3 text-center">
                <span className="text-[10px] font-semibold text-secondary-text">
                  Search by
                </span>

                <span className="text-[12px] font-bold text-primary">
                  Return / Supplier
                </span>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] text-secondary-text">
              Search also matches purchase numbers, notes, and returned item codes.
            </p>
          </div>

          {loading ? (
            <div className="px-8 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary-soft-2 border-t-primary">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>

              <p className="mt-4 text-sm font-semibold text-secondary-text">
                Loading purchase returns...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                Unable to load purchase returns
              </h3>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-rose-700">
                {errorMessage}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Undo2 className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-xl font-semibold text-heading">
                No purchase returns found
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                {search.trim()
                  ? "Try another search term or clear the current filter."
                  : "Process a new return to see records here."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead className="bg-soft-token">
                  <tr>
                    {[
                      "S.No",
                      "Return No",
                      "Date",
                      "Purchase No",
                      "Supplier",
                      "Qty",
                      "Amount",
                      "Reason",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className={`border-b border-token px-3 py-3 text-[11px] font-bold text-primary-text ${
                          heading === "Actions" ? "text-center" : "text-left"
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-divider bg-card-token">
                  {paginatedRows.map((row, index) => {
                    const purchaseNumber = getPurchaseNumber(
                      row.purchaseId,
                      row.purchaseNo
                    );
                    const supplierName = getSupplierName(
                      row.supplierId || getPurchaseSupplier(row.purchaseId)
                    );
                    const totalQty = Math.max(toNumber(row.totalQty, 0), 0);
                    const returnAmount = money(getSafeReturnAmount(row));
                    const itemCount = Math.max(
                      toNumber(row.itemCount, getReturnItems(row).length),
                      0
                    );

                    return (
                      <tr
                        key={row._id}
                        className="transition hover:bg-primary-soft/60"
                      >
                        <td className="px-3 py-3 text-[12px] text-secondary-text">
                          {(page - 1) * rowsPerPage + index + 1}
                        </td>

                        <td className="px-3 py-3">
                          <div className="text-[12px] font-semibold text-heading">
                            {row.returnNo || "-"}
                          </div>

                          <div className="mt-1 text-[11px] text-secondary-text">
                            {itemCount} item{itemCount === 1 ? "" : "s"}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-[12px] text-primary-text">
                          {formatDate(row.returnDate)}
                        </td>

                        <td className="px-3 py-3">
                          <div className="text-[12px] font-semibold text-heading">
                            {purchaseNumber}
                          </div>

                          <div className="mt-1 text-[11px] text-secondary-text">
                            Updated {formatDate(row.updatedAt || row.createdAt)}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-[12px] text-primary-text">
                          {supplierName}
                        </td>

                        <td className="px-3 py-3 text-[12px] font-semibold text-heading">
                          {totalQty}
                        </td>

                        <td className="px-3 py-3 text-[12px] font-semibold text-heading">
                          {returnAmount}
                        </td>

                        <td className="max-w-[240px] px-3 py-3">
                          <div className="text-[12px] font-medium text-primary-text">
                            {row.reason || "-"}
                          </div>

                          {row.notes ? (
                            <div className="mt-1 line-clamp-2 text-[11px] text-secondary-text">
                              {row.notes}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                            {getStatusLabel(row.status)}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/shopowner/purchasereturn/view?id=${row._id}`}
                              className={iconActionButtonClassName}
                              title="View"
                              aria-label="View purchase return"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => printPurchaseReturnInvoice(row)}
                              className={iconActionButtonClassName}
                              title="Print invoice"
                              aria-label="Print purchase return invoice"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => downloadPurchaseReturnInvoice(row)}
                              className={iconActionButtonClassName}
                              title="Download invoice"
                              aria-label="Download purchase return invoice"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>

                            <Link
                              href={`/shopowner/purchasereturn/edit/${row._id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#00008b] text-white transition hover:bg-blue-900"
                              title="Edit"
                              aria-label="Edit purchase return"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-token bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex items-center gap-3 text-[12px] font-medium text-primary-text">
                  <span>Rows per page:</span>

                  <select
                    value={rowsPerPage}
                    onChange={(event) => setRowsPerPage(Number(event.target.value))}
                    className="h-9 rounded-lg border border-token bg-white px-3 text-[12px] font-semibold text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                  >
                    {[10, 25, 50, 100].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-4 text-[12px] font-semibold text-heading">
                  <span>
                    {pageStart}-{pageEnd} of {totalRows}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={page <= 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[16px] font-bold text-heading transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    &lt;
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(current + 1, totalPages))
                    }
                    disabled={page >= totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[16px] font-bold text-heading transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

