"use client";

import { useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import {
  countProductTypeFieldGroups,
  countProductTypeFields,
  getProductTypeFieldRefName,
  sortProductTypeFieldDefinitions,
  sortProductTypeFieldGroups,
  sortProductTypeFieldSections,
} from "@/lib/product-type-fields";
import type { ProductTypeFieldBuilderDocument } from "@/types/product-type-fields";

type ColumnKey =
  | "sno"
  | "section"
  | "group"
  | "fieldName"
  | "fieldKey"
  | "inputType"
  | "placeholder"
  | "options"
  | "unitOptions"
  | "sort"
  | "required"
  | "addMore"
  | "hasUnit"
  | "active";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "sno", label: "S.No" },
  { key: "section", label: "Section / Tab" },
  { key: "group", label: "Group Name" },
  { key: "fieldName", label: "Field Name" },
  { key: "fieldKey", label: "Field Key" },
  { key: "inputType", label: "Input Type" },
  { key: "placeholder", label: "Placeholder" },
  { key: "options", label: "Options" },
  { key: "unitOptions", label: "Unit Options" },
  { key: "sort", label: "Sort" },
  { key: "required", label: "Required" },
  { key: "addMore", label: "Add More" },
  { key: "hasUnit", label: "Has Unit" },
  { key: "active", label: "Active" },
];

const DEFAULT_VISIBLE = new Set<ColumnKey>([
  "sno",
  "group",
  "fieldName",
  "fieldKey",
  "inputType",
  "sort",
  "required",
  "active",
]);

type FlatRow = {
  sectionId: string;
  sectionName: string;
  groupName: string;
  fieldId: string;
  fieldName: string;
  fieldKey: string;
  inputType: string;
  placeholder: string;
  options: string[];
  unitOptions: string[];
  sort: number;
  required: boolean;
  addMore: boolean;
  hasUnit: boolean;
  active: boolean;
};

export default function ProductTypeFieldViewModal({
  item,
  onClose,
}: {
  item: ProductTypeFieldBuilderDocument;
  onClose: () => void;
}) {
  const sections = useMemo(
    () => sortProductTypeFieldSections(item.sectionHeadings || []),
    [item.sectionHeadings]
  );

  const [selectedSectionId, setSelectedSectionId] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(DEFAULT_VISIBLE)
  );

  const allRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];

    for (const section of sections) {
      for (const group of sortProductTypeFieldGroups(section.groups || [])) {
        for (const field of sortProductTypeFieldDefinitions(group.fields || [])) {
          rows.push({
            sectionId: section._id || section.headingName,
            sectionName: section.headingName,
            groupName: group.groupName || "Untitled Group",
            fieldId: field._id || field.key || `${group.groupName}-${rows.length}`,
            fieldName: field.label || "",
            fieldKey: field.key || "",
            inputType: field.inputType || "text",
            placeholder: field.placeholder || "",
            options: field.options || [],
            unitOptions: field.unitOptions || [],
            sort: Number(field.sortOrder) || rows.length + 1,
            required: Boolean(field.required),
            addMore: Boolean(field.addMore),
            hasUnit: Boolean(field.hasUnit),
            active: field.active !== false,
          });
        }
      }
    }

    return rows;
  }, [sections]);

  const filteredRows = useMemo(() => {
    if (selectedSectionId === "all") return allRows;
    return allRows.filter((row) => row.sectionId === selectedSectionId);
  }, [allRows, selectedSectionId]);

  const visibleCols = COLUMNS.filter((col) => visibleColumns.has(col.key));

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const activeSection = sections.find(
    (s) => (s._id || s.headingName) === selectedSectionId
  );

  return (
    <div className="flex max-h-[90vh] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            {getProductTypeFieldRefName(item.productTypeId) ||
              "Product Type Field Builder"}
          </h2>
          <p className="mt-0.5 text-sm font-semibold text-slate-500">
            {[
              getProductTypeFieldRefName(item.categoryId),
              getProductTypeFieldRefName(item.subcategoryId),
            ]
              .filter(Boolean)
              .join(" / ") || "No category path"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-5 sm:flex">
            <StatPill label="Sections" value={sections.length} />
            <StatPill
              label="Groups"
              value={countProductTypeFieldGroups(item)}
            />
            <StatPill label="Fields" value={countProductTypeFields(item)} />
            <StatusPill active={item.isActive !== false} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Controls: section tabs + column toggles */}
      <div className="shrink-0 space-y-3 border-b border-slate-200 bg-slate-50/80 px-6 py-3">
        {/* Section tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Section
          </span>

          <button
            type="button"
            onClick={() => setSelectedSectionId("all")}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-black transition ${
              selectedSectionId === "all"
                ? "border-[#00008b] bg-[#00008b] text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#00008b]/30 hover:text-[#00008b]"
            }`}
          >
            All&nbsp;
            <span
              className={`${selectedSectionId === "all" ? "opacity-80" : "text-slate-400"}`}
            >
              ({allRows.length})
            </span>
          </button>

          {sections.map((section) => {
            const sectionId = section._id || section.headingName;
            const count = allRows.filter(
              (row) => row.sectionId === sectionId
            ).length;
            const isSelected = selectedSectionId === sectionId;

            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => setSelectedSectionId(sectionId)}
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-black transition ${
                  isSelected
                    ? "border-[#00008b] bg-[#00008b] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#00008b]/30 hover:text-[#00008b]"
                }`}
              >
                {section.headingName}&nbsp;
                <span className={isSelected ? "opacity-80" : "text-slate-400"}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Column toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Columns
          </span>

          {COLUMNS.map((col) => {
            const isOn = visibleColumns.has(col.key);

            return (
              <button
                key={col.key}
                type="button"
                onClick={() => toggleColumn(col.key)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black transition ${
                  isOn
                    ? "border-[#6c63d8]/30 bg-[#6c63d8]/10 text-[#2d268d]"
                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${isOn ? "bg-[#6c63d8]" : "bg-slate-300"}`}
                />
                {col.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-500">
              No fields found for this section.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-max border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0f1495]">
              <tr>
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row, rowIndex) => (
                <tr
                  key={`${row.fieldId}-${rowIndex}`}
                  className={`border-t border-slate-100 transition hover:bg-[#00008b]/5 ${
                    rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  }`}
                >
                  {visibleCols.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {renderCell(row, col.key, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-3">
        <p className="text-sm font-semibold text-slate-500">
          Showing{" "}
          <span className="font-black text-slate-800">{filteredRows.length}</span>{" "}
          field{filteredRows.length === 1 ? "" : "s"}
          {selectedSectionId !== "all" && activeSection
            ? ` in ${activeSection.headingName}`
            : " across all sections"}
          {" · "}
          <span className="font-black text-slate-800">{visibleCols.length}</span>{" "}
          column{visibleCols.length === 1 ? "" : "s"} visible
        </p>
      </div>
    </div>
  );
}

function renderCell(
  row: FlatRow,
  key: ColumnKey,
  rowIndex: number
): ReactNode {
  switch (key) {
    case "sno":
      return (
        <span className="font-black text-slate-500">{rowIndex + 1}</span>
      );
    case "section":
      return (
        <span className="whitespace-nowrap font-semibold text-slate-600">
          {row.sectionName}
        </span>
      );
    case "group":
      return (
        <span className="inline-flex whitespace-nowrap rounded-full border border-[#00008b]/10 bg-[#00008b]/5 px-2.5 py-1 text-xs font-black text-[#00008b]">
          {row.groupName}
        </span>
      );
    case "fieldName":
      return (
        <span className="whitespace-nowrap font-black text-slate-900">
          {row.fieldName}
        </span>
      );
    case "fieldKey":
      return (
        <code className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-700">
          {row.fieldKey}
        </code>
      );
    case "inputType":
      return (
        <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
          {row.inputType}
        </span>
      );
    case "placeholder":
      return (
        <span className="text-slate-500">
          {row.placeholder || (
            <span className="text-slate-300">—</span>
          )}
        </span>
      );
    case "options":
      return row.options.length ? (
        <span className="text-slate-700">{row.options.join(", ")}</span>
      ) : (
        <span className="text-slate-300">—</span>
      );
    case "unitOptions":
      return row.unitOptions.length ? (
        <span className="text-slate-700">{row.unitOptions.join(", ")}</span>
      ) : (
        <span className="text-slate-300">—</span>
      );
    case "sort":
      return (
        <span className="font-bold text-slate-700">{row.sort}</span>
      );
    case "required":
      return <BoolPill value={row.required} />;
    case "addMore":
      return <BoolPill value={row.addMore} />;
    case "hasUnit":
      return <BoolPill value={row.hasUnit} />;
    case "active":
      return (
        <BoolPill
          value={row.active}
          positiveLabel="Active"
          negativeLabel="Inactive"
        />
      );
    default:
      return null;
  }
}

function BoolPill({
  value,
  positiveLabel = "Yes",
  negativeLabel = "No",
}: {
  value: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-black ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-400"
      }`}
    >
      {value ? positiveLabel : negativeLabel}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
