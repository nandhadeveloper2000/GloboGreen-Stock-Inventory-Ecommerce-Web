"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

type Option = {
  _id: string;
  name: string;
};

type Props = {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: Option[];
  loading?: boolean;
  placeholder?: string;
};

export default function SearchableDropdown({
  label,
  value,
  onChange,
  options,
  loading,
  placeholder = "Select option",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => o._id === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!search) return options;
    return options.filter((o) =>
      o.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  // close outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // focus search
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {/* SELECT BUTTON */}
      <div
        onClick={() => !loading && setOpen(!open)}
        className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 cursor-pointer"
      >
        <span className="text-sm text-slate-800">
          {loading
            ? "Loading..."
            : selected?.name || placeholder}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-300 bg-white shadow-xl">
          
          {/* SEARCH */}
          <div className="border-b p-3 flex items-center">
            <Search className="h-4 w-4 mr-2 text-slate-400" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="w-full text-sm outline-none"
            />
          </div>

          {/* LIST */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item._id}
                  onClick={() => {
                    onChange(item._id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex justify-between px-4 py-2 text-sm cursor-pointer ${
                    value === item._id
                      ? "bg-violet-50 text-violet-700"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {item.name}
                  {value === item._id && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-slate-400">
                No result
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}