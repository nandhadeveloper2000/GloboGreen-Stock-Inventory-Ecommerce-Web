"use client";

import type { ReactNode } from "react";

import {
  countProductTypeFields,
  sortProductTypeFieldDefinitions,
} from "@/lib/product-type-fields";
import type {
  ProductTypeFieldBuilderDocument,
  ProductTypeFieldBuilderSection,
} from "@/types/product-type-fields";

function getSectionFieldCount(section: ProductTypeFieldBuilderSection) {
  return (section.groups || []).reduce(
    (total, group) =>
      total +
      sortProductTypeFieldDefinitions(group.fields || []).filter(
        (field) => field.active !== false
      ).length,
    0
  );
}

export default function SectionHeadingSelector({
  builder,
  selectedSectionId,
  disabled = false,
  onSelect,
  onToggle,
}: {
  builder: ProductTypeFieldBuilderDocument;
  selectedSectionId?: string;
  disabled?: boolean;
  onSelect: (sectionId: string) => void;
  onToggle: (sectionId: string) => void;
}) {
  const totalFieldCount = countProductTypeFields(builder);

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#00008b]">
              Step 1
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              Sections / Tabs
            </h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              Select the tab first, then continue with groups and fields for that
              section.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>{builder.sectionHeadings.length} Sections</Badge>
            <Badge accent="primary">{totalFieldCount} Fields</Badge>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-b-[24px]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <HeaderCell className="w-20">Tab</HeaderCell>
                <HeaderCell className="min-w-[240px]">Section Name</HeaderCell>
                <HeaderCell className="w-28 text-center">Groups</HeaderCell>
                <HeaderCell className="w-28 text-center">Fields</HeaderCell>
                <HeaderCell className="w-36 text-center">Status</HeaderCell>
                <HeaderCell className="w-32 text-center">Action</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {builder.sectionHeadings.map((section, index) => {
                const selected = section._id === selectedSectionId;
                const isActive = section.isActive !== false;
                const groupCount = section.groups?.length || 0;
                const fieldCount = getSectionFieldCount(section);

                return (
                  <tr
                    key={section._id || section.headingName}
                    className={`border-t border-slate-100 transition ${
                      selected ? "bg-[#00008b]/5" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-3 py-3 text-sm font-black text-slate-900">
                      {index + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <p
                          className={`text-sm font-black ${
                            selected ? "text-[#00008b]" : "text-slate-900"
                          }`}
                        >
                          {section.headingName}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-black text-slate-700">
                        {groupCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex rounded-full border border-[#00008b]/15 bg-[#00008b]/5 px-2.5 py-0.5 text-xs font-black text-[#00008b]">
                        {fieldCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <label className="inline-flex items-center justify-center gap-2 text-[11px] font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => onToggle(section._id || section.headingName)}
                          disabled={disabled}
                          className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                        />
                        {isActive ? "Active" : "Inactive"}
                      </label>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelect(section._id || section.headingName)}
                        disabled={disabled}
                        className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? "bg-[#00008b] text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                        }`}
                      >
                        {selected ? "Selected" : "Open"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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
      className={`px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 ${className}`}
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
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-black ${
        accent === "primary"
          ? "border-[#00008b]/15 bg-[#00008b]/5 text-[#00008b]"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}
