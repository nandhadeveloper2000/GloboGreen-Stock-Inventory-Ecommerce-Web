"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import type { ProductTypeFieldDefinition } from "@/types/product-type-fields";
import DynamicFieldRow from "./dynamic-field-row";

export default function DynamicFieldBuilderTable({
  sectionName,
  sectionIndex,
  groupName,
  fields,
  sectionSelected = false,
  groupSelected = false,
  disabled = false,
  onAddField,
  onDownloadWorkbookTemplate,
  onUploadWorkbook,
  onChangeField,
  onRemoveField,
}: {
  sectionName?: string;
  sectionIndex?: number;
  groupName?: string;
  fields: ProductTypeFieldDefinition[];
  sectionSelected?: boolean;
  groupSelected?: boolean;
  disabled?: boolean;
  onAddField: () => void;
  onDownloadWorkbookTemplate: () => void;
  onUploadWorkbook: () => void;
  onChangeField: (index: number, nextField: ProductTypeFieldDefinition) => void;
  onRemoveField: (index: number) => void;
}) {
  const activeFieldCount = fields.filter((field) => field.active !== false).length;
  const addFieldDisabled = disabled || !groupSelected;
  const workbookActionsDisabled = disabled || !sectionSelected;

  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#00008b]">
              Step 3
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">
                Dynamic Field Builder
              </h3>
              <Badge accent="primary">{fields.length} Rows</Badge>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {groupName
                ? `Tab ${sectionIndex || 1}: ${
                    sectionName || "Selected Section"
                  } / Group: ${groupName}. Add field rows directly in the table or import them from the workbook.`
                : "Select or create a group to add rows directly, or use workbook import for the full builder."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownloadWorkbookTemplate}
              disabled={workbookActionsDisabled}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Download Workbook Template
            </button>

            <button
              type="button"
              onClick={onUploadWorkbook}
              disabled={workbookActionsDisabled}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Upload Workbook
            </button>

            <button
              type="button"
              onClick={onAddField}
              disabled={addFieldDisabled}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#6c63d8] px-4 text-sm font-bold text-white transition hover:bg-[#5b52ca] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add Field
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge>{activeFieldCount} Active</Badge>
          {groupName ? <Badge>{groupName}</Badge> : null}
          {sectionName ? <Badge>{sectionName}</Badge> : null}
        </div>
      </div>

      {!groupSelected ? (
        <div className="p-4">
          <EmptyState
              message={
              sectionSelected
                ? "Select or create a group first to add fields. Workbook import is available now for the full builder."
                : "Select a section first to start building fields."
            }
          />
        </div>
      ) : (
        <div className="p-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-440 border-collapse">
                <thead className="bg-[#0f1495]">
                  <tr>
                    <HeaderCell className="w-18">S.No.</HeaderCell>
                    <HeaderCell className="min-w-47.5">Section / Tab Name</HeaderCell>
                    <HeaderCell className="min-w-47.5">Group Name</HeaderCell>
                    <HeaderCell className="min-w-55">Field Name</HeaderCell>
                    <HeaderCell className="min-w-55">Field Key</HeaderCell>
                    <HeaderCell className="min-w-42.5">Input Type</HeaderCell>
                    <HeaderCell className="min-w-55">Placeholder</HeaderCell>
                    <HeaderCell className="min-w-62.5">Options</HeaderCell>
                    <HeaderCell className="min-w-62.5">Unit Options</HeaderCell>
                    <HeaderCell className="w-28 text-center">Sort</HeaderCell>
                    <HeaderCell className="w-28 text-center">Required</HeaderCell>
                    <HeaderCell className="min-w-35 text-center">Add More</HeaderCell>
                    <HeaderCell className="w-28 text-center">Has Unit</HeaderCell>
                    <HeaderCell className="w-28 text-center">Active</HeaderCell>
                    <HeaderCell className="min-w-30 text-center">Action</HeaderCell>
                  </tr>
                </thead>

                <tbody>
                  {fields.length ? (
                    fields.map((field, index) => (
                      <DynamicFieldRow
                        key={field._id || `${field.key || "field"}-${index}`}
                        index={index}
                        sectionName={sectionName}
                        sectionIndex={sectionIndex}
                        groupName={groupName}
                        field={field}
                        disabled={disabled}
                        canRemove
                        onChange={(nextField) => onChangeField(index, nextField)}
                        onRemove={() => onRemoveField(index)}
                      />
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={15}
                        className="px-6 py-16 text-center text-sm font-semibold text-slate-500"
                      >
                        No fields added in this group yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function HeaderCell({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white ${className}`}
    >
      {children}
    </th>
  );
}

function Badge({
  children,
  accent = "neutral",
}: {
  children: ReactNode;
  accent?: "neutral" | "primary";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
        accent === "primary"
          ? "border-[#6c63d8]/15 bg-[#6c63d8]/10 text-[#2d268d]"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}
