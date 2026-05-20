"use client";

import { PRODUCT_UNITS } from "../constants";
import { formatCurrency } from "../pricing";

export function FieldLabel({
  htmlFor,
  label,
  helper,
}: {
  htmlFor: string;
  label: string;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[12px] font-bold text-slate-800"
      >
        {label}
      </label>
      {helper ? <p className="text-[11px] text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function FieldInput({
  id,
  value,
  onChange,
  type = "text",
  min,
  step,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      min={min}
      step={step}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-fuchsia-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    />
  );
}

export function MainUnitSelect({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value || "Pcs"}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-fuchsia-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    >
      {PRODUCT_UNITS.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}

export function CompactTextField({
  id,
  label,
  value,
  onChange,
  type = "number",
  min = 0,
  step,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-[128px]">
      <label
        htmlFor={id}
        className="mb-1 block truncate text-[10px] font-black uppercase tracking-[0.06em] text-slate-600"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={min}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-fuchsia-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

export function CompactReadOnlyCell({
  id,
  label,
  value,
  disabled = false,
}: {
  id: string;
  label: string;
  value: number;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-[135px]">
      <label
        htmlFor={id}
        className="mb-1 block truncate text-[10px] font-black uppercase tracking-[0.06em] text-slate-600"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        readOnly
        disabled={disabled}
        value={formatCurrency(value)}
        className="h-8 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] font-black text-slate-950 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

export function DiscountCell({
  id,
  label,
  value,
  amount,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  amount: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-[155px]">
      <label
        htmlFor={id}
        className="mb-1 block truncate text-[10px] font-black uppercase tracking-[0.06em] text-slate-600"
      >
        {label}
      </label>
      <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-fuchsia-100">
        <input
          id={id}
          type="number"
          min={0}
          step="0.01"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 min-w-0 px-2.5 text-[12px] font-semibold text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        />
        <div className="flex h-8 items-center border-l border-slate-200 bg-slate-50 px-2 text-[10px] font-black text-slate-600">
          {formatCurrency(amount)}
        </div>
      </div>
    </div>
  );
}