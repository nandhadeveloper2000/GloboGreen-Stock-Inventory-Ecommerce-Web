"use client";

export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
};

export type Address = {
  label?: string;
  name?: string;
  mobile?: string;
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

export type CustomerRecord = {
  _id: string;
  name?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  state?: string;
  address?: string;
  openingBalance?: number;
  dueBalance?: number;
  points?: number;
  isWalkIn?: boolean;
  isActive?: boolean;
};

export type ShopRecord = {
  _id?: string;
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
  shopType?: string;
};

export type ProductReference =
  | string
  | {
      _id?: string;
      itemName?: string;
      itemModelNumber?: string;
      itemKey?: string;
      sku?: string;
    }
  | null;

export type ShopProductRecord = {
  _id: string;
  productId?: ProductReference;
  itemName?: string;
  itemKey?: string;
  itemCode?: string;
  sku?: string;
  itemModelNumber?: string;
  mainUnit?: string;
  qty?: number;
  mrpPrice?: number;
  sellingPrice?: number;
  inputPrice?: number;
  singlePricing?: {
    mrpPrice?: number;
    sellingPrice?: number;
    unitSellingPrice?: number;
  } | null;
  bulkPricing?: {
    mrpPrice?: number;
    sellingPrice?: number;
    unitSellingPrice?: number;
  } | null;
};

export type PaymentSummary = {
  method?: string;
  paid?: boolean;
  provider?: string;
  txnId?: string;
  receivedAmount?: number;
  changeAmount?: number;
  reference?: string;
  salesmanName?: string;
  notes?: string;
};

export type SalesOrderItem = {
  _id?: string;
  productId?: ProductReference;
  shopProductId?: string | { _id?: string } | null;
  name?: string;
  sku?: string;
  itemCode?: string;
  batch?: string;
  unit?: string;
  mrp?: number;
  qty?: number;
  price?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  lineTotal?: number;
  imageUrl?: string;
};

export type SalesOrderRecord = {
  _id: string;
  orderNo?: string;
  source?: string;
  invoiceId?: {
    _id?: string;
    invoiceNo?: string;
    issuedAt?: string;
    grandTotal?: number;
    payment?: PaymentSummary;
  } | null;
  customerId?: CustomerRecord | null;
  shopId?: ShopRecord | null;
  items?: SalesOrderItem[];
  itemCount?: number;
  totalQty?: number;
  subtotal?: number;
  taxAmount?: number;
  shippingFee?: number;
  discount?: number;
  grandTotal?: number;
  customerNameSnapshot?: string;
  customerMobileSnapshot?: string;
  invoiceNo?: string;
  address?: Address;
  payment?: PaymentSummary;
  status?: string;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: string | null;
  deliveredAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SalesReturnItem = {
  _id?: string;
  orderItemId?: string;
  shopProductId?: string | null;
  productId?: string | null;
  itemCode?: string;
  productName?: string;
  batch?: string;
  soldQty?: number;
  returnQty?: number;
  unitPrice?: number;
  returnTotal?: number;
};

export type SalesReturnRecord = {
  _id: string;
  returnNo?: string;
  returnDate?: string | null;
  orderId?: {
    _id?: string;
    orderNo?: string;
    invoiceNo?: string;
    createdAt?: string;
    grandTotal?: number;
    status?: string;
    customerNameSnapshot?: string;
    customerMobileSnapshot?: string;
  } | null;
  orderNo?: string;
  invoiceNo?: string;
  customerId?: CustomerRecord | null;
  customerNameSnapshot?: string;
  reason?: string;
  notes?: string;
  items?: SalesReturnItem[];
  itemCount?: number;
  totalQty?: number;
  totalReturnAmount?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PdfColumn = {
  label: string;
  width: number;
  right?: boolean;
};

export const SALES_ALLOWED_SHOP_TYPES = [
  "WAREHOUSE_RETAIL_SHOP",
  "WHOLESALE_SHOP",
] as const;

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "CREDIT",
  "SPLIT",
] as const;

export const GST_OPTIONS = [
  { label: "GST 0%", percent: 0 },
  { label: "GST 5%", percent: 5 },
  { label: "GST 12%", percent: 12 },
  { label: "GST 18%", percent: 18 },
  { label: "GST 28%", percent: 28 },
] as const;

export const RETURN_REASON_OPTIONS = [
  "Customer Changed Mind",
  "Damaged Item",
  "Wrong Product",
  "Defective Product",
  "Other",
] as const;

export const SELECTED_SHOP_ID_KEY = "selected_shop_id_web";
export const SELECTED_SHOP_NAME_KEY = "selected_shop_name_web";
export const SELECTED_SHOP_TYPE_KEY = "selected_shop_type_web";

const SALES_PDF_DARK = "#112e87";

export function normalizeValue(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

export function normalizeSearchText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function isSalesAllowedShop(shopType?: string | null) {
  return SALES_ALLOWED_SHOP_TYPES.includes(
    normalizeValue(shopType) as (typeof SALES_ALLOWED_SHOP_TYPES)[number]
  );
}

export function getSalesShopLabel(shopType?: string | null) {
  const normalized = normalizeValue(shopType);

  if (normalized === "WHOLESALE_SHOP") return "Wholesale Shop";
  if (normalized === "WAREHOUSE_RETAIL_SHOP") return "Warehouse Retail Shop";

  return "Warehouse Retail Shop / Wholesale Shop";
}

export function readSelectedShop() {
  if (typeof window === "undefined") {
    return { id: "", name: "", type: "" };
  }

  return {
    id: window.localStorage.getItem(SELECTED_SHOP_ID_KEY) || "",
    name: window.localStorage.getItem(SELECTED_SHOP_NAME_KEY) || "",
    type: window.localStorage.getItem(SELECTED_SHOP_TYPE_KEY) || "",
  };
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(
  value?: string | null,
  variant: "short" | "long" = "short"
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(
    "en-IN",
    variant === "long"
      ? {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
  );
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function money(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function moneyPlain(value?: number | null) {
  return `Rs. ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value || 0))}`;
}

export function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return number;
}

export function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getReferenceId(
  value?: ProductReference | { _id?: string } | null
) {
  if (!value) return "";
  if (typeof value === "string") return value;

  return String(value._id || "");
}

export function getCustomerName(customer?: CustomerRecord | null) {
  return String(customer?.name || customer?.mobile || "Walk-in Customer").trim();
}

export function getCustomerLabel(customer?: CustomerRecord | null) {
  const name = getCustomerName(customer);
  const mobile = String(customer?.mobile || "").trim();

  return mobile ? `${name} (${mobile})` : name;
}

export function getShopName(shop?: ShopRecord | null, fallback = "Globo Green") {
  return String(shop?.name || fallback || "Globo Green").trim();
}

export function compactAddress(address?: Address | null) {
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

export function getShopProductName(item?: ShopProductRecord | null) {
  if (!item) return "";

  if (item.productId && typeof item.productId !== "string") {
    const name = item.productId.itemName || item.productId.itemKey || "Product";
    const model = item.productId.itemModelNumber || "";

    return model ? `${name} (${model})` : name;
  }

  return item.itemName || item.itemModelNumber || item.itemKey || "Product";
}

export function getShopProductProductId(item?: ShopProductRecord | null) {
  if (!item?.productId) return "";

  if (typeof item.productId === "string") return item.productId;

  return String(item.productId._id || "");
}

export function getShopProductCode(item?: ShopProductRecord | null) {
  if (!item) return "";

  const nestedProduct =
    item.productId && typeof item.productId !== "string" ? item.productId : null;

  return String(
    item.itemCode ||
      item.sku ||
      nestedProduct?.sku ||
      item.itemModelNumber ||
      item.itemKey ||
      ""
  );
}

export function getShopProductSearchText(item?: ShopProductRecord | null) {
  if (!item) return "";

  const nestedProduct =
    item.productId && typeof item.productId !== "string" ? item.productId : null;

  return normalizeSearchText(
    [
      getShopProductCode(item),
      getShopProductName(item),
      item.itemName,
      item.itemModelNumber,
      item.itemKey,
      item.sku,
      nestedProduct?.itemName,
      nestedProduct?.itemModelNumber,
      nestedProduct?.itemKey,
      nestedProduct?.sku,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function getShopProductMrp(item?: ShopProductRecord | null) {
  return round(
    toNumber(
      item?.singlePricing?.mrpPrice ?? item?.mrpPrice ?? item?.inputPrice,
      0
    )
  );
}

export function getShopProductSellingPrice(item?: ShopProductRecord | null) {
  return round(
    toNumber(
      item?.singlePricing?.sellingPrice ??
        item?.singlePricing?.unitSellingPrice ??
        item?.sellingPrice ??
        item?.inputPrice,
      0
    )
  );
}

export function getStatusLabel(status?: string | null) {
  const normalized = normalizeValue(status);

  if (!normalized) return "Open";

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function sanitizeFileName(value: unknown) {
  return cleanPdfText(value).replace(/[^a-z0-9_-]+/gi, "-") || "invoice";
}

function cleanPdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s*,\s*/g, ", ")
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

function wrapPdfText(value: unknown, maxChars: number) {
  const text = cleanPdfText(value);

  if (!text) return [];

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const nextLine = current ? `${current} ${word}` : word;

    if (nextLine.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = nextLine;
    }
  });

  if (current) lines.push(current);

  return lines;
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

export function buildSalesInvoicePdf(
  order: SalesOrderRecord,
  fallbackShopName = "Globo Green"
) {
  const commands: string[] = [];
  const pageWidth = 595.28;
  const margin = 46;
  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;

  const shop = order.shopId || null;
  const customer = order.customerId || null;

  const shopAddress = compactAddress(shop?.shopAddress || shop?.address);
  const invoiceNo =
    order.invoiceNo || order.invoiceId?.invoiceNo || order.orderNo || "-";
  const shopName = getShopName(shop, fallbackShopName);
  const owner = shop?.shopOwnerAccountId || null;
  const shopMobile = shop?.mobile || owner?.mobile || "";
  const shopEmail = shop?.email || owner?.email || "";

  const customerAddress = [
    order.address?.street || customer?.address,
    order.address?.area,
    order.address?.taluk,
    order.address?.district,
    order.address?.state || customer?.state,
    order.address?.pincode,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");

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

  function horizontalLine(y: number, color = SALES_PDF_DARK) {
    strokeColor(color);
    commands.push(`1.5 w ${margin} ${y} m ${pageWidth - margin} ${y} l S`);
  }

  text(shopName.toUpperCase(), pageWidth / 2, 790, {
    align: "center",
    bold: true,
    color: SALES_PDF_DARK,
    size: 20,
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

  text("SALES INVOICE / RECEIPT", pageWidth / 2, y, {
    align: "center",
    bold: true,
    color: SALES_PDF_DARK,
    size: 20,
  });

  y -= 42;

  text("Customer Details", margin, y, {
    bold: true,
    color: SALES_PDF_DARK,
    size: 11,
  });

  text(`Invoice Number: ${invoiceNo}`, pageWidth - margin, y, {
    align: "right",
    bold: true,
    size: 10,
  });

  y -= 16;

  text(order.customerNameSnapshot || getCustomerName(customer), margin, y, {
    bold: true,
    size: 10,
  });

  text(
    `Bill Date: ${formatDate(order.createdAt || order.deliveredAt, "long")}`,
    pageWidth - margin,
    y,
    {
      align: "right",
      bold: true,
      size: 10,
    }
  );

  y -= 14;

  const customerMobileText = customer?.mobile || order.customerMobileSnapshot;
  const customerEmailText = customer?.email;
  const customerGstText = customer?.gstNumber
    ? `GST - ${customer.gstNumber}`
    : "";

  [customerMobileText, customerEmailText]
    .filter(Boolean)
    .forEach((line) => {
      text(line, margin, y, { size: 9 });
      y -= 12;
    });

  if (customerAddress) {
    const addressLines = wrapPdfText(customerAddress, 58);

    addressLines.forEach((line) => {
      text(line, margin, y, { size: 9 });
      y -= 12;
    });
  }

  if (customerGstText) {
    text(customerGstText, margin, y, { size: 9 });
    y -= 12;
  }

  text(
    `Payment Method: ${String(order.payment?.method || "-").replace(
      /_/g,
      " "
    )}`,
    pageWidth - margin,
    y + 26,
    {
      align: "right",
      bold: true,
      size: 10,
    }
  );

  if (order.payment?.salesmanName) {
    text(`Salesman: ${order.payment.salesmanName}`, pageWidth - margin, y + 12, {
      align: "right",
      size: 9,
    });
  }

  y -= 24;

  const columns: PdfColumn[] = [
    { label: "S.No", width: 33 },
    { label: "Item", width: 174 },
    { label: "Qty", width: 34, right: true },
    { label: "MRP", width: 52, right: true },
    { label: "Rate", width: 52, right: true },
    { label: "Disc.", width: 52, right: true },
    { label: "Tax", width: 52, right: true },
    { label: "Total", width: 54, right: true },
  ];

  const rowHeight = 24;

  filledRect(tableX, y - rowHeight, tableWidth, rowHeight, SALES_PDF_DARK);

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

  (order.items || []).slice(0, 18).forEach((item, index) => {
    x = tableX;

    const values = [
      String(index + 1),
      truncateText(item.name || item.itemCode || "-", 30),
      String(Number(item.qty || 0)),
      moneyPlain(item.mrp),
      moneyPlain(item.price),
      moneyPlain(item.discountAmount),
      moneyPlain(item.taxAmount),
      moneyPlain(item.lineTotal),
    ];

    columns.forEach((column, columnIndex) => {
      strokedRect(x, y - rowHeight, column.width, rowHeight);

      text(values[columnIndex], column.right ? x + column.width - 5 : x + 5, y - 15, {
        align: column.right ? "right" : "left",
        bold: column.label === "Total",
        size: column.label === "Total" ? 7 : 8,
      });

      x += column.width;
    });

    y -= rowHeight;
  });

  if ((order.items || []).length > 18) {
    text(`+ ${(order.items || []).length - 18} more items`, tableX, y - 14, {
      color: SALES_PDF_DARK,
      size: 9,
    });

    y -= 24;
  }

  y -= 30;

  const totalsX = pageWidth - margin - 210;

  const totals = [
    ["Subtotal:", moneyPlain(order.subtotal), false],
    ["Tax Amount:", moneyPlain(order.taxAmount), false],
    ["Discount:", moneyPlain(order.discount), false],
    ["Total Amount:", moneyPlain(order.grandTotal), true],
  ] as const;

  totals.forEach(([label, value, isTotal]) => {
    if (isTotal) {
      filledRect(totalsX, y - 24, 210, 24, "#e8f0fb");
    }

    strokedRect(totalsX, y - 24, 115, 24);
    strokedRect(totalsX + 115, y - 24, 95, 24);

    text(label, totalsX + 7, y - 16, {
      bold: true,
      color: isTotal ? SALES_PDF_DARK : "#111827",
      size: isTotal ? 10 : 9,
    });

    text(value, totalsX + 203, y - 16, {
      align: "right",
      bold: true,
      color: isTotal ? SALES_PDF_DARK : "#111827",
      size: isTotal ? 10 : 9,
    });

    y -= 24;
  });

  text("Thank you for shopping with us!", pageWidth / 2, 82, {
    align: "center",
    bold: true,
    color: SALES_PDF_DARK,
    size: 11,
  });

  text(`This invoice was generated by ${shopName}.`, pageWidth / 2, 66, {
    align: "center",
    size: 8,
  });

  return buildPdfDocument(commands.join("\n"));
}