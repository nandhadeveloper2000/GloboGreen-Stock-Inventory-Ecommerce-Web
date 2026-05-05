"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import type {
  ChangeEventHandler,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <>
      {label} {required ? <span className="text-rose-500">*</span> : null}
    </>
  );
}

export function TopLabelInput({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  disabled = false,
  required = false,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  icon?: LucideIcon;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  maxLength?: number;
}) {
  const leftPadding = Icon ? "pl-11" : "pl-4";
  const labelInset = Icon ? "left-11" : "left-4";

  return (
    <div className="space-y-1.5">
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={disabled ? "" : placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={classNames(
            "h-14 w-full rounded-2xl border border-slate-200 bg-white pb-2 pt-6 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            leftPadding
          )}
        />

        <label
          className={classNames(
            "pointer-events-none absolute top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500",
            labelInset
          )}
        >
          <FieldLabel label={label} required={required} />
        </label>
      </div>
    </div>
  );
}

export function TopLabelSelectButton({
  label,
  text,
  onClick,
  icon: Icon,
  open = false,
  disabled = false,
  required = false,
  muted = false,
}: {
  label: string;
  text: string;
  onClick: () => void;
  icon?: LucideIcon;
  open?: boolean;
  disabled?: boolean;
  required?: boolean;
  muted?: boolean;
}) {
  const labelInset = Icon ? "left-11" : "left-4";

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex h-14 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 pb-2 pt-6 text-left text-sm shadow-sm outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400" /> : null}
            <span
              className={classNames(
                "truncate",
                muted ? "text-slate-400" : "text-slate-900"
              )}
            >
              {text}
            </span>
          </div>

          <ChevronDown
            className={classNames(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        <label
          className={classNames(
            "pointer-events-none absolute top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500",
            labelInset
          )}
        >
          <FieldLabel label={label} required={required} />
        </label>
      </div>
    </div>
  );
}

export function TopLabelNativeSelect({
  label,
  value,
  onChange,
  icon: Icon,
  disabled = false,
  required = false,
  children,
}: {
  label: string;
  value: string;
  onChange: SelectHTMLAttributes<HTMLSelectElement>["onChange"];
  icon?: LucideIcon;
  disabled?: boolean;
  required?: boolean;
  children: ReactNode;
}) {
  const leftPadding = Icon ? "pl-11" : "pl-4";
  const labelInset = Icon ? "left-11" : "left-4";

  return (
    <div className="space-y-1.5">
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}

        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={classNames(
            "h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white pb-2 pt-6 pr-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            leftPadding
          )}
        >
          {children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <label
          className={classNames(
            "pointer-events-none absolute top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500",
            labelInset
          )}
        >
          <FieldLabel label={label} required={required} />
        </label>
      </div>
    </div>
  );
}

export function TopLabelPanel({
  label,
  required = false,
  children,
  className,
  contentClassName,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={classNames(
          "relative min-h-14 rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-6",
          className
        )}
      >
        <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500">
          <FieldLabel label={label} required={required} />
        </label>

        <div className={classNames("flex min-h-6 items-center", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
