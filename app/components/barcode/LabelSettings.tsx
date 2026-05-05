"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Plus,
  Save,
  Settings,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type BarcodeType = "CODE128" | "QR";

type LabelFormat = {
  _id?: string;
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

const defaultForm: LabelFormat = {
  name: "1",
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
  fields: ["NAME", "BARCODE", "MRP"],
  isUse: true,
};

const fieldOptions = [
  { key: "NAME", label: "Product Name" },
  { key: "SKU", label: "SKU" },
  { key: "BARCODE", label: "Barcode / QR" },
  { key: "MRP", label: "MRP" },
  { key: "CURRENCY", label: "Currency" },
  { key: "SHOP_NAME", label: "Shop Name" },
];

const getShopId = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("selected_shop_id_web") || "";
};

const getResponseData = <T,>(res: unknown): T => {
  const response = res as { data?: ApiResponse<T> | T };
  const data = response?.data;

  if (data && typeof data === "object" && "data" in data) {
    return (data as ApiResponse<T>).data as T;
  }

  return data as T;
};

export default function LabelSettings() {
  const router = useRouter();

  const [shopId, setShopId] = useState("");
  const [formats, setFormats] = useState<LabelFormat[]>([]);
  const [selectedId, setSelectedId] = useState("create");
  const [form, setForm] = useState<LabelFormat>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = selectedId !== "create";

  const selectedFormat = useMemo(
    () => formats.find((item) => item._id === selectedId),
    [formats, selectedId]
  );

  const fetchFormats = useCallback(async () => {
    const currentShopId = getShopId();
    setShopId(currentShopId);

    if (!currentShopId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient({
        method: SummaryApi.barcode_label_formats.method,
        url: SummaryApi.barcode_label_formats.url,
        params: { shopId: currentShopId },
      });

      const data = getResponseData<LabelFormat[]>(res) || [];
      setFormats(data);

      if (data.length > 0) {
        const active = data.find((item) => item.isUse) || data[0];
        setSelectedId(active._id || "create");
        setForm({ ...defaultForm, ...active });
      } else {
        setSelectedId("create");
        setForm(defaultForm);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormats();
  }, [fetchFormats]);

  useEffect(() => {
    if (selectedId === "create") {
      setForm({
        ...defaultForm,
        name: String(formats.length + 1),
        isUse: formats.length === 0,
      });
      return;
    }

    if (selectedFormat) {
      setForm({ ...defaultForm, ...selectedFormat });
    }
  }, [selectedId, selectedFormat, formats.length]);

  const updateForm = <K extends keyof LabelFormat>(
    key: K,
    value: LabelFormat[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateNumber = (key: keyof LabelFormat, value: string) => {
    const num = Number(value || 0);

    setForm((prev) => ({
      ...prev,
      [key]: Number.isFinite(num) ? num : 0,
    }));
  };

  const toggleField = (field: string) => {
    setForm((prev) => {
      const exists = prev.fields.includes(field);

      return {
        ...prev,
        fields: exists
          ? prev.fields.filter((item) => item !== field)
          : [...prev.fields, field],
      };
    });
  };

  const saveFormat = async () => {
    if (!shopId) {
      alert("Valid shopId required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        shopId,
      };

      if (isEdit && form._id) {
        await apiClient({
          method: SummaryApi.barcode_label_format_update.method,
          url: SummaryApi.barcode_label_format_update.url(form._id),
          data: payload,
        });
      } else {
        await apiClient({
          method: SummaryApi.barcode_label_format_create.method,
          url: SummaryApi.barcode_label_format_create.url,
          data: payload,
        });
      }

      await fetchFormats();
    } finally {
      setSaving(false);
    }
  };

  const deleteFormat = async () => {
    if (!form._id) return;

    const ok = window.confirm("Delete this label format?");
    if (!ok) return;

    setSaving(true);

    try {
      await apiClient({
        method: SummaryApi.barcode_label_format_delete.method,
        url: SummaryApi.barcode_label_format_delete.url(form._id),
      });

      await fetchFormats();
    } finally {
      setSaving(false);
    }
  };

  const setUseFormat = async () => {
    if (!form._id) return;

    setSaving(true);

    try {
      await apiClient({
        method: SummaryApi.barcode_label_format_set_use.method,
        url: SummaryApi.barcode_label_format_set_use.url(form._id),
      });

      await fetchFormats();
    } finally {
      setSaving(false);
    }
  };

  const showPreview = () => {
    const popup = window.open("", "_blank", "width=600,height=500");

    if (!popup) {
      alert("Popup blocked. Please allow popup for preview.");
      return;
    }

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Label Preview</title>
          <style>
            body {
              margin: 0;
              padding: 30px;
              font-family: Arial, Helvetica, sans-serif;
              background: #f5f5f5;
            }

            .label {
              width: ${form.labelWidth}mm;
              height: ${form.labelHeight}mm;
              background: white;
              border: 1px dashed #999;
              padding: 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              overflow: hidden;
            }

            .name {
              font-weight: 700;
              font-size: 12px;
              margin-bottom: 4px;
            }

            .bar {
              width: 90%;
              height: 30px;
              background: repeating-linear-gradient(
                90deg,
                #111,
                #111 2px,
                #fff 2px,
                #fff 4px
              );
              margin-bottom: 4px;
            }

            .qr {
              width: 60px;
              height: 60px;
              background:
                linear-gradient(90deg,#111 50%,transparent 0) 0 0/10px 10px,
                linear-gradient(#111 50%,transparent 0) 0 0/10px 10px;
              margin-bottom: 4px;
            }

            .text {
              font-size: 11px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="label">
            ${
              form.fields.includes("NAME")
                ? `<div class="name">Sample Product</div>`
                : ""
            }
            ${
              form.fields.includes("BARCODE")
                ? form.barcodeType === "QR"
                  ? `<div class="qr"></div><div class="text">BC4497</div>`
                  : `<div class="bar"></div><div class="text">BC4497</div>`
                : ""
            }
            ${
              form.fields.includes("SKU")
                ? `<div class="text">SKU: SKU001</div>`
                : ""
            }
            ${
              form.fields.includes("MRP")
                ? `<div class="text">${form.currency} 19200</div>`
                : ""
            }
          </div>
        </body>
      </html>
    `);
    popup.document.close();
  };

  return (
    <main className="min-h-screen bg-[#f5f5f5] p-4 text-sm text-black">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-[#1976d2] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </button>

          <h1 className="text-2xl font-bold">Label settings (Barcode / QR)</h1>
        </div>

        <button
          type="button"
          onClick={() => setSelectedId("create")}
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#1976d2] px-4 font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add format
        </button>
      </div>

      <p className="mb-4 text-gray-600">
        Choose which label format to use for printing, or add/edit formats.
      </p>

      {!shopId && (
        <div className="mb-4 border border-red-100 bg-red-50 px-4 py-3 text-red-700">
          Valid shopId required. Please select shop first.
        </div>
      )}

      {loading ? (
        <section className="rounded-sm border border-gray-300 bg-white p-10 text-center text-gray-500 shadow-sm">
          Loading...
        </section>
      ) : formats.length === 0 && selectedId !== "create" ? (
        <section className="rounded-sm border border-gray-300 bg-white p-10 text-center shadow-sm">
          <p className="mb-5 text-gray-600">
            No label formats yet. Create one to get started.
          </p>

          <button
            type="button"
            onClick={() => setSelectedId("create")}
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#1976d2] px-5 font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add format
          </button>
        </section>
      ) : (
        <section className="rounded-sm border border-gray-300 bg-white p-4 shadow-sm">
          <div className="mb-5 max-w-[950px]">
            <label className="mb-1 block text-xs text-gray-600">
              Select format
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-10 w-full rounded-sm border border-[#1976d2] bg-white px-3 outline-none"
            >
              <option value="create">Create new format</option>
              {formats.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} {item.isUse ? "(In use)" : ""}
                </option>
              ))}
            </select>
          </div>

          <h2 className="mb-3 font-bold">Label settings</h2>
          <p className="mb-4 text-xs text-gray-500">All units in millimetre (mm)</p>

          <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Format name
              </label>
              <input
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">Scheme</label>
              <select
                value={form.scheme}
                onChange={(e) => updateForm("scheme", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              >
                <option value="4x4">4x4</option>
                <option value="5x5">5x5</option>
                <option value="3x8">3x8</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Paper size
              </label>
              <select
                value={form.paperSize}
                onChange={(e) => updateForm("paperSize", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Label width (mm)
              </label>
              <input
                type="number"
                value={form.labelWidth}
                onChange={(e) => updateNumber("labelWidth", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Label height (mm)
              </label>
              <input
                type="number"
                value={form.labelHeight}
                onChange={(e) => updateNumber("labelHeight", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Left margin (mm)
              </label>
              <input
                type="number"
                value={form.leftMargin}
                onChange={(e) => updateNumber("leftMargin", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Top margin (mm)
              </label>
              <input
                type="number"
                value={form.topMargin}
                onChange={(e) => updateNumber("topMargin", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Horizontal gap (mm)
              </label>
              <input
                type="number"
                value={form.horizontalGap}
                onChange={(e) => updateNumber("horizontalGap", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Vertical gap (mm)
              </label>
              <input
                type="number"
                value={form.verticalGap}
                onChange={(e) => updateNumber("verticalGap", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                No of columns
              </label>
              <input
                type="number"
                value={form.noOfColumns}
                onChange={(e) => updateNumber("noOfColumns", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-600">
                Currency
              </label>
              <input
                value={form.currency}
                onChange={(e) => updateForm("currency", e.target.value)}
                className="h-10 w-full rounded-sm border border-gray-300 px-3 outline-none focus:border-[#1976d2]"
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-gray-700">Barcode type</p>

            <div className="flex flex-wrap gap-6">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={form.barcodeType === "CODE128"}
                  onChange={() => updateForm("barcodeType", "CODE128")}
                />
                Code 128
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={form.barcodeType === "QR"}
                  onChange={() => updateForm("barcodeType", "QR")}
                />
                QR Code
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isUse}
                  onChange={(e) => updateForm("isUse", e.target.checked)}
                />
                Use it for printing
              </label>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="mb-3 font-semibold">
              Fields on label{" "}
              <span className="font-normal text-gray-500">
                (saved together with label settings)
              </span>
            </p>

            <div className="flex flex-wrap gap-3">
              {fieldOptions.map((item) => (
                <label
                  key={item.key}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-gray-300 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={form.fields.includes(item.key)}
                    onChange={() => toggleField(item.key)}
                  />
                  {item.label}
                </label>
              ))}
            </div>

            {form.fields.length === 0 && (
              <p className="mt-3 text-gray-500">
                No fields selected. Use field settings to choose which fields
                appear on the label.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
            {isEdit && !form.isUse && (
              <button
                type="button"
                onClick={setUseFormat}
                disabled={saving}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-[#2e7d32] bg-white px-4 text-[#2e7d32] disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Use it
              </button>
            )}

            {isEdit && (
              <button
                type="button"
                onClick={deleteFormat}
                disabled={saving}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-red-500 bg-white px-4 text-red-600 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={showPreview}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-[#1976d2] px-4 font-semibold text-white"
            >
              <Eye className="h-4 w-4" />
              Show preview
            </button>

            <button
              type="button"
              onClick={saveFormat}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-[#1976d2] bg-white px-4 text-[#1976d2] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}