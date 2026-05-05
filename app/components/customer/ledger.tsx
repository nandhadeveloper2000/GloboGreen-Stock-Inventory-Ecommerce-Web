"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

import {
  type ApiResponse,
  type CustomerRecord,
  formatDate,
  money,
  moneyPlain,
  sanitizeFileName,
  readSelectedShop,
} from "../sales/shared";

type LedgerBucket = {
  count?: number;
  amount?: number;
};

type LedgerActivity = {
  id: string;
  date?: string | null;
  type: "SALE" | "RETURN";
  reference?: string;
  description?: string;
  paymentMethod?: string;
  status?: string;
  amount?: number;
};

type LedgerResponse = {
  customer?: CustomerRecord;
  filters?: {
    shopId?: string;
    startDate?: string;
    endDate?: string;
  };
  summary?: {
    sales?: LedgerBucket;
    quotations?: LedgerBucket;
    returns?: LedgerBucket;
    payments?: LedgerBucket;
  };
  activities?: LedgerActivity[];
};

const PDF_DARK = "#00008b";

function customerName(customer?: CustomerRecord | null) {
  return String(customer?.name || customer?.mobile || "Walk-in Customer").trim();
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
  const cleaned = cleanPdfText(value);

  if (cleaned.length <= maxLength) return cleaned;

  return `${cleaned.slice(0, Math.max(maxLength - 3, 0))}...`;
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

function buildLedgerPdf(options: {
  customer: CustomerRecord | null;
  selectedShopName: string;
  startDate: string;
  endDate: string;
  summary: Required<NonNullable<LedgerResponse["summary"]>>;
  activities: LedgerActivity[];
}) {
  const commands: string[] = [];

  const pageWidth = 595.28;
  const margin = 42;
  const tableWidth = pageWidth - margin * 2;

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
    commands.push(
      `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(
        2
      )} re f`
    );
  }

  function strokedRect(x: number, y: number, width: number, height: number) {
    strokeColor("#cbd5e1");
    commands.push(
      `0.75 w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(
        2
      )} ${height.toFixed(2)} re S`
    );
  }

  function horizontalLine(y: number, color = PDF_DARK) {
    strokeColor(color);
    commands.push(
      `1.2 w ${margin.toFixed(2)} ${y.toFixed(2)} m ${(
        pageWidth - margin
      ).toFixed(2)} ${y.toFixed(2)} l S`
    );
  }

  let y = 798;

  text("CUSTOMER LEDGER HISTORY", pageWidth / 2, y, {
    align: "center",
    bold: true,
    color: PDF_DARK,
    size: 18,
  });

  y -= 26;

  text(customerName(options.customer), margin, y, {
    bold: true,
    size: 12,
  });

  y -= 15;

  const contactLine = [
    options.customer?.mobile,
    options.customer?.email,
    options.customer?.state,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" | ");

  if (contactLine) {
    text(truncatePdfText(contactLine, 75), margin, y, {
      size: 9,
      color: "#111827",
    });
    y -= 14;
  }

  text(`Shop: ${options.selectedShopName || "All Shops"}`, margin, y, {
    size: 9,
    color: "#111827",
  });

  text(
    `Filter: ${options.startDate || "All"} to ${options.endDate || "All"}`,
    pageWidth - margin,
    y,
    {
      align: "right",
      size: 9,
      color: "#111827",
    }
  );

  y -= 18;
  horizontalLine(y);
  y -= 30;

  const cards = [
    {
      label: "Products Sold",
      value: String(options.summary.sales.count || 0),
      sub: moneyPlain(options.summary.sales.amount),
      color: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      label: "Quotations",
      value: String(options.summary.quotations.count || 0),
      sub: moneyPlain(options.summary.quotations.amount),
      color: "#f8fafc",
      border: "#cbd5e1",
    },
    {
      label: "Returns",
      value: String(options.summary.returns.count || 0),
      sub: moneyPlain(options.summary.returns.amount),
      color: "#fff7ed",
      border: "#fed7aa",
    },
    {
      label: "Payments",
      value: String(options.summary.payments.count || 0),
      sub: moneyPlain(options.summary.payments.amount),
      color: "#f0fdf4",
      border: "#bbf7d0",
    },
  ];

  const cardGap = 6;
  const cardWidth = (tableWidth - cardGap * 3) / 4;
  const cardHeight = 52;

  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + cardGap);

    filledRect(x, y - cardHeight, cardWidth, cardHeight, card.color);

    strokeColor(card.border);
    commands.push(
      `0.8 w ${x.toFixed(2)} ${(y - cardHeight).toFixed(
        2
      )} ${cardWidth.toFixed(2)} ${cardHeight.toFixed(2)} re S`
    );

    text(card.label, x + 8, y - 15, {
      size: 8,
      color: "#334155",
    });

    text(card.value, x + 8, y - 30, {
      bold: true,
      size: 13,
      color: "#0f172a",
    });

    text(card.sub, x + 8, y - 44, {
      size: 8,
      color: "#334155",
    });
  });

  y -= 84;

  const dateWidth = 58;
  const activityWidth = 52;
  const referenceWidth = 82;
  const descriptionWidth = 130;
  const paymentWidth = 70;
  const statusWidth = 58;
  const amountWidth = 61;

  const columns = [
    { label: "Date", width: dateWidth, right: false },
    { label: "Activity", width: activityWidth, right: false },
    { label: "Reference", width: referenceWidth, right: false },
    { label: "Description", width: descriptionWidth, right: false },
    { label: "Payment", width: paymentWidth, right: false },
    { label: "Status", width: statusWidth, right: false },
    { label: "Amount", width: amountWidth, right: true },
  ];

  const headerHeight = 23;
  const rowHeight = 22;

  filledRect(margin, y - headerHeight, tableWidth, headerHeight, PDF_DARK);

  let x = margin;

  columns.forEach((column) => {
    text(column.label, column.right ? x + column.width - 6 : x + 6, y - 15, {
      align: column.right ? "right" : "left",
      bold: true,
      color: "#ffffff",
      size: 8,
    });

    x += column.width;
  });

  y -= headerHeight;

  const visibleActivities = options.activities.slice(0, 17);

  visibleActivities.forEach((activity) => {
    x = margin;

    const values = [
      formatDate(activity.date || ""),
      activity.type || "-",
      truncatePdfText(activity.reference || "-", 18),
      truncatePdfText(activity.description || "-", 26),
      truncatePdfText(activity.paymentMethod || "-", 12),
      truncatePdfText(activity.status || "-", 12),
      moneyPlain(activity.amount),
    ];

    columns.forEach((column, columnIndex) => {
      strokedRect(x, y - rowHeight, column.width, rowHeight);

      text(values[columnIndex], column.right ? x + column.width - 5 : x + 5, y - 14, {
        align: column.right ? "right" : "left",
        bold: column.label === "Amount",
        size:
          column.label === "Description" ||
          column.label === "Payment" ||
          column.label === "Status"
            ? 7.4
            : 8,
        color:
          column.label === "Amount" && Number(activity.amount || 0) < 0
            ? "#b91c1c"
            : "#111827",
      });

      x += column.width;
    });

    y -= rowHeight;
  });

  if (!visibleActivities.length) {
    strokedRect(margin, y - 34, tableWidth, 34);

    text("No ledger activities found for the selected filter.", pageWidth / 2, y - 21, {
      align: "center",
      size: 9,
      color: "#64748b",
    });

    y -= 34;
  }

  if (options.activities.length > visibleActivities.length) {
    y -= 16;

    text(
      `+ ${
        options.activities.length - visibleActivities.length
      } more ledger activities not shown in this PDF`,
      margin,
      y,
      {
        size: 8,
        color: "#475569",
      }
    );
  }

  text("Generated from Globo Green customer ledger history.", pageWidth / 2, 58, {
    align: "center",
    size: 8,
    color: "#475569",
  });

  strokeColor("#e5e7eb");
  commands.push(
    `0.6 w ${margin.toFixed(2)} 46 ${(
      pageWidth - margin
    ).toFixed(2)} 46 l S`
  );

  return buildPdfDocument(commands.join("\n"));
}

function activityBadgeClasses(type: LedgerActivity["type"]) {
  return type === "RETURN"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-blue-200 bg-blue-50 text-blue-700";
}

function metaBadgeClasses(kind: "payment" | "status") {
  return kind === "payment"
    ? "border-slate-200 bg-slate-100 text-slate-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartInput() {
  const date = new Date();
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  return monthStart.toISOString().slice(0, 10);
}

export default function CustomerLedgerPage() {
  const { accessToken } = useAuth();
  const params = useParams<{ id: string }>();

  const customerId = useMemo(() => String(params?.id || "").trim(), [params]);

  const [selectedShopId, setSelectedShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);

  const [summary, setSummary] = useState<
    Required<NonNullable<LedgerResponse["summary"]>>
  >({
    sales: { count: 0, amount: 0 },
    quotations: { count: 0, amount: 0 },
    returns: { count: 0, amount: 0 },
    payments: { count: 0, amount: 0 },
  });

  const [activities, setActivities] = useState<LedgerActivity[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const syncSelectedShop = useCallback(() => {
    const selectedShop = readSelectedShop();

    setSelectedShopId(selectedShop.id);
    setSelectedShopName(selectedShop.name);
  }, []);

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

  const fetchLedger = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !customerId) {
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

        const response = await fetch(
          `${baseURL}${SummaryApi.shop_customer_ledger.url(customerId, {
            shopId: selectedShopId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          })}`,
          {
            method: SummaryApi.shop_customer_ledger.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
            credentials: "include",
            cache: "no-store",
          }
        );

        const result = (await response
          .json()
          .catch(() => ({}))) as ApiResponse<LedgerResponse>;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message || "Failed to load customer ledger");
        }

        setCustomer(result.data.customer || null);

        setSummary({
          sales: {
            count: Number(result.data.summary?.sales?.count || 0),
            amount: Number(result.data.summary?.sales?.amount || 0),
          },
          quotations: {
            count: Number(result.data.summary?.quotations?.count || 0),
            amount: Number(result.data.summary?.quotations?.amount || 0),
          },
          returns: {
            count: Number(result.data.summary?.returns?.count || 0),
            amount: Number(result.data.summary?.returns?.amount || 0),
          },
          payments: {
            count: Number(result.data.summary?.payments?.count || 0),
            amount: Number(result.data.summary?.payments?.amount || 0),
          },
        });

        setActivities(
          Array.isArray(result.data.activities) ? result.data.activities : []
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load customer ledger"
        );
        setActivities([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, customerId, endDate, selectedShopId, startDate]
  );

  useEffect(() => {
    void fetchLedger();
  }, [fetchLedger]);

  const totalCount = activities.length;

  async function handleExportPdf() {
    if (!customer) {
      toast.error("Customer data not ready yet");
      return;
    }

    try {
      setExportingPdf(true);

      const pdfBlob = buildLedgerPdf({
        customer,
        selectedShopName,
        startDate,
        endDate,
        summary,
        activities,
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `Customer-Ledger-${sanitizeFileName(
        customerName(customer)
      )}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export ledger PDF"
      );
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Customer Ledger History
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Customer sales and return activity for the selected shop.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={exportingPdf || loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF
            </button>

            <Link
              href="/shopowner/customer/list"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Customers
            </Link>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                {customerName(customer)}
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {[customer?.mobile, customer?.email].filter(Boolean).join(" | ") ||
                  "-"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {customer?.address || customer?.state || "-"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <FileText className="h-4 w-4 text-[#00008b]" />
                <span>{selectedShopName || "All Shops"}</span>
              </div>

              <button
                type="button"
                onClick={() => void fetchLedger(true)}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_180px]">
            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Start Date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 block w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-900 outline-none"
              />
            </label>

            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                End Date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 block w-full border-none bg-transparent p-0 text-sm font-semibold text-slate-900 outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setStartDate(monthStartInput());
                setEndDate(todayInput());
              }}
              className="inline-flex h-full min-h-[74px] items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              <CalendarDays className="h-4 w-4" />
              This Month
            </button>

            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="inline-flex h-full min-h-[74px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Filter
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-blue-200 bg-blue-50/70 p-4 shadow-sm">
            <p className="text-sm text-blue-700">Products Sold</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {summary.sales.count}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {money(summary.sales.amount)}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Quotations</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {summary.quotations.count}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {money(summary.quotations.amount)}
            </p>
          </div>

          <div className="rounded-[24px] border border-orange-200 bg-orange-50/70 p-4 shadow-sm">
            <p className="text-sm text-orange-700">Returns</p>
            <p className="mt-2 text-3xl font-black text-orange-900">
              {summary.returns.count}
            </p>
            <p className="mt-2 text-sm font-semibold text-orange-700">
              {money(summary.returns.amount)}
            </p>
          </div>

          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
            <p className="text-sm text-emerald-700">Payments</p>
            <p className="mt-2 text-3xl font-black text-emerald-900">
              {summary.payments.count}
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              {money(summary.payments.amount)}
            </p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-[#00008b]">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Loading customer ledger...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-[30px] border border-rose-200 bg-rose-50 px-6 py-14 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-rose-900">
              Unable to load customer ledger
            </h3>
            <p className="mt-2 text-sm text-rose-700">{errorMessage}</p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead className="bg-[#00008b]">
                  <tr>
                    {[
                      "Date",
                      "Activity",
                      "Reference",
                      "Description",
                      "Payment",
                      "Status",
                      "Amount",
                    ].map(
                      (heading) => (
                        <th
                          key={heading}
                          className={`border-b border-[#00008b] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white ${
                            heading === "Amount" ? "text-right" : "text-left"
                          }`}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {activities.length ? (
                    activities.map((activity) => (
                      <tr key={activity.id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {formatDate(activity.date || "")}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${activityBadgeClasses(
                              activity.type
                            )}`}
                          >
                            {activity.type}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                          {activity.reference || "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {activity.description || "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {activity.paymentMethod && activity.paymentMethod !== "-" ? (
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${metaBadgeClasses(
                                "payment"
                              )}`}
                            >
                              {activity.paymentMethod}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {activity.status && activity.status !== "-" ? (
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${metaBadgeClasses(
                                "status"
                              )}`}
                            >
                              {activity.status}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td
                          className={`px-4 py-4 text-right text-sm font-bold ${
                            Number(activity.amount || 0) < 0
                              ? "text-rose-700"
                              : "text-slate-950"
                          }`}
                        >
                          {money(activity.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-14 text-center text-sm text-slate-500"
                      >
                        No activities found in the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {activities.length ? `1-${activities.length}` : "0-0"} of{" "}
                {totalCount}
              </p>

              <p>
                Filter:{" "}
                {startDate || endDate
                  ? `${startDate || "All"} to ${endDate || "All"}`
                  : "All dates"}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
