"use client";

import { Trash2 } from "lucide-react";

import { PRODUCT_TYPE_FIELD_INPUT_TYPES } from "@/lib/product-type-fields";
import type { ProductTypeFieldDefinition } from "@/types/product-type-fields";

const inputClassName =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-3 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const textareaClassName =
  "min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-3 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function supportsOptions(field: ProductTypeFieldDefinition) {
  return ["select", "multiSelect", "radio"].includes(field.inputType);
}

export default function DynamicFieldRow({
  index,
  sectionName,
  sectionIndex,
  groupName,
  field,
  disabled = false,
  canRemove = true,
  onChange,
  onRemove,
}: {
  index: number;
  sectionName?: string;
  sectionIndex?: number;
  groupName?: string;
  field: ProductTypeFieldDefinition;
  disabled?: boolean;
  canRemove?: boolean;
  onChange: (nextField: ProductTypeFieldDefinition) => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-t border-slate-100 align-top transition hover:bg-slate-50/60">
      <td className="px-3 py-4 text-sm font-black text-slate-700">{index + 1}</td>

      <td className="px-3 py-4">
        <InfoCard
          eyebrow={`Tab ${sectionIndex || 1}`}
          value={sectionName || "Selected Section"}
        />
      </td>

      <td className="px-3 py-4">
        <InfoCard eyebrow="Group" value={groupName || "Selected Group"} />
      </td>

      <td className="px-3 py-4">
        <input
          type="text"
          value={field.label}
          onChange={(event) =>
            onChange({
              ...field,
              label: event.target.value,
            })
          }
          disabled={disabled}
          placeholder="Field name"
          className={inputClassName}
        />
      </td>

      <td className="px-3 py-4">
        <input
          type="text"
          value={field.key}
          onChange={(event) =>
            onChange({
              ...field,
              key: event.target.value,
            })
          }
          disabled={disabled}
          placeholder="fieldKey"
          className={inputClassName}
        />
      </td>

      <td className="px-3 py-4">
        <select
          value={field.inputType}
          onChange={(event) =>
            onChange({
              ...field,
              inputType: event.target.value as ProductTypeFieldDefinition["inputType"],
              options: supportsOptions({
                ...field,
                inputType: event.target.value as ProductTypeFieldDefinition["inputType"],
              })
                ? field.options || []
                : [],
            })
          }
          disabled={disabled}
          className={inputClassName}
        >
          {PRODUCT_TYPE_FIELD_INPUT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </td>

      <td className="px-3 py-4">
        <input
          type="text"
          value={field.placeholder || ""}
          onChange={(event) =>
            onChange({
              ...field,
              placeholder: event.target.value,
            })
          }
          disabled={disabled}
          placeholder="Placeholder"
          className={inputClassName}
        />
      </td>

      <td className="px-3 py-4">
        {supportsOptions(field) ? (
          <textarea
            value={(field.options || []).join(", ")}
            onChange={(event) =>
              onChange({
                ...field,
                options: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            disabled={disabled}
            placeholder="Option 1, Option 2"
            className={textareaClassName}
          />
        ) : (
          <MutedText text="Only used for select, multiSelect, and radio fields." />
        )}
      </td>

      <td className="px-3 py-4">
        {field.hasUnit ? (
          <textarea
            value={(field.unitOptions || []).join(", ")}
            onChange={(event) =>
              onChange({
                ...field,
                unitOptions: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            disabled={disabled}
            placeholder="GB, Inch, Watt"
            className={textareaClassName}
          />
        ) : (
          <MutedText text="Turn on Has Unit to add unit choices." />
        )}
      </td>

      <td className="px-3 py-4">
        <input
          type="number"
          value={String(field.sortOrder)}
          onChange={(event) =>
            onChange({
              ...field,
              sortOrder: Number(event.target.value) || 0,
            })
          }
          disabled={disabled}
          placeholder="1"
          className={`${inputClassName} text-center`}
        />
      </td>

      <td className="px-3 py-4 text-center">
        <CheckboxControl
          label="Required"
          checked={field.required}
          disabled={disabled}
          onChange={(checked) =>
            onChange({
              ...field,
              required: checked,
            })
          }
        />
      </td>

      <td className="px-3 py-4 text-center">
        <CheckboxControl
          label="Add More"
          checked={field.addMore}
          disabled={disabled}
          onChange={(checked) =>
            onChange({
              ...field,
              addMore: checked,
            })
          }
        />
      </td>

      <td className="px-3 py-4 text-center">
        <CheckboxControl
          label="Has Unit"
          checked={field.hasUnit}
          disabled={disabled}
          onChange={(checked) =>
            onChange({
              ...field,
              hasUnit: checked,
              unitOptions: checked ? field.unitOptions || [] : [],
            })
          }
        />
      </td>

      <td className="px-3 py-4 text-center">
        <CheckboxControl
          label="Active"
          checked={field.active}
          disabled={disabled}
          onChange={(checked) =>
            onChange({
              ...field,
              active: checked,
            })
          }
        />
      </td>

      <td className="px-3 py-4">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || !canRemove}
            title="Remove field"
            className="inline-flex h-10 min-w-[100px] items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function InfoCard({
  eyebrow,
  value,
}: {
  eyebrow: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {eyebrow}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function CheckboxControl({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center justify-center">
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        aria-label={label}
        className="h-5 w-5 rounded border-slate-300 text-[#00008b] focus:ring-2 focus:ring-[#00008b]/30 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function MutedText({ text }: { text: string }) {
  return (
    <div className="flex min-h-[96px] items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-400">
      {text}
    </div>
  );
}
