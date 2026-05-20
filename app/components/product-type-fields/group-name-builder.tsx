"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { getProductTypeFieldGroupSuggestions } from "@/lib/product-type-fields";
import type { ProductTypeFieldBuilderSection } from "@/types/product-type-fields";

export default function GroupNameBuilder({
  section,
  sectionIndex,
  productTypeName,
  selectedGroupId,
  disabled = false,
  onSelectGroup,
  onAddGroup,
  onAddSuggestedGroups,
  onRenameGroup,
  onRemoveGroup,
  onToggleGroup,
}: {
  section: ProductTypeFieldBuilderSection | null;
  sectionIndex?: number;
  productTypeName?: string;
  selectedGroupId?: string;
  disabled?: boolean;
  onSelectGroup: (groupId: string) => void;
  onAddGroup: (groupName: string) => void;
  onAddSuggestedGroups: (groupNames: string[]) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onToggleGroup: (groupId: string) => void;
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const suggestedGroupNames = getProductTypeFieldGroupSuggestions({
    productTypeName,
    headingName: section?.headingName,
    allowFallback: true,
  });
  const existingGroupNames = new Set(
    (section?.groups || []).map((group) => group.groupName.trim().toLowerCase())
  );
  const availableSuggestedGroupNames = suggestedGroupNames.filter(
    (groupName) => !existingGroupNames.has(groupName.trim().toLowerCase())
  );

  function handleAddGroup() {
    onAddGroup(newGroupName.trim());
    setNewGroupName("");
  }

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#00008b]">
                Step 2
              </p>
              <h3 className="mt-1 text-lg font-black text-slate-950">
                Groups For Selected Section
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {section
                  ? `Tab ${sectionIndex || 1}: ${section.headingName}${
                      productTypeName ? ` for ${productTypeName}` : ""
                    }. Add groups here, then open one group to manage its fields.`
                  : "Select a section first, then create groups under it."}
              </p>
            </div>

            <div className="flex w-full gap-2 xl:w-auto">
              <input
                type="text"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder={
                  section ? "Enter group name" : "Select a section first"
                }
                disabled={disabled || !section}
                className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 xl:w-80"
              />
              <button
                type="button"
                onClick={handleAddGroup}
                disabled={disabled || !section}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-4 text-sm font-bold text-white transition hover:bg-[#00006f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Add Group
              </button>
            </div>
          </div>

          {section && suggestedGroupNames.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Suggested Groups
                </p>

                {availableSuggestedGroupNames.length ? (
                  <button
                    type="button"
                    onClick={() => onAddSuggestedGroups(availableSuggestedGroupNames)}
                    disabled={disabled}
                    className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-700 transition hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add All Suggested Groups
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600">
                    All suggested groups already added
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestedGroupNames.map((groupName) => {
                  const alreadyAdded = existingGroupNames.has(
                    groupName.trim().toLowerCase()
                  );

                  return (
                    <button
                      key={groupName}
                      type="button"
                      onClick={() => onAddSuggestedGroups([groupName])}
                      disabled={disabled || alreadyAdded}
                      className={`inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        alreadyAdded
                          ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                      }`}
                    >
                      {groupName}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        {!section ? (
          <EmptyState message="Select a section / tab first to manage groups." />
        ) : section.groups.length ? (
          <div className="overflow-hidden rounded-[20px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <HeaderCell className="w-20">S.No</HeaderCell>
                    <HeaderCell className="min-w-[260px]">Group Name</HeaderCell>
                    <HeaderCell className="min-w-[220px]">Section Name</HeaderCell>
                    <HeaderCell className="w-24 text-center">Fields</HeaderCell>
                    <HeaderCell className="w-32 text-center">Status</HeaderCell>
                    <HeaderCell className="w-40 text-center">Action</HeaderCell>
                  </tr>
                </thead>

                <tbody>
                  {section.groups.map((group, index) => {
                    const selected = group._id === selectedGroupId;

                    return (
                      <tr
                        key={group._id || group.groupName}
                        className={`border-t border-slate-100 transition ${
                          selected ? "bg-[#00008b]/5" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-4 text-sm font-black text-slate-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={group.groupName}
                            onChange={(event) =>
                              onRenameGroup(
                                group._id || group.groupName,
                                event.target.value
                              )
                            }
                            disabled={disabled}
                            placeholder="Enter group name"
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-3 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700">
                          {section.headingName}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                            {group.fields.length}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <label className="inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={group.isActive !== false}
                              onChange={() => onToggleGroup(group._id || group.groupName)}
                              disabled={disabled}
                              className="h-4 w-4 rounded border-slate-300 text-[#00008b] focus:ring-[#00008b]"
                            />
                            {group.isActive !== false ? "Active" : "Inactive"}
                          </label>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectGroup(group._id || group.groupName)}
                              disabled={disabled}
                              className={`inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                selected
                                  ? "bg-[#00008b] text-white"
                                  : "border border-slate-200 bg-white text-slate-700 hover:border-[#00008b]/30 hover:bg-[#00008b]/5 hover:text-[#00008b]"
                              }`}
                            >
                              {selected ? "Selected" : "Open"}
                            </button>

                            <button
                              type="button"
                              onClick={() => onRemoveGroup(group._id || group.groupName)}
                              disabled={disabled}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Remove group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState message={`No groups added in ${section.headingName} yet. Create the first group here.`} />
        )}
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
      className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}
