import Image from "next/image";
import {
  Check,
  ChevronDown,
  Film,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from "react";

import { formatFileSize } from "./create-config";
import type {
  DropdownConfig,
  ModelCheckboxSelectorProps,
  PresetValueOption,
  ProductImageItem,
  ProductMediaItem,
  ProductInformationSection,
  ProductVideoItem,
  VariantAttribute,
} from "./create-types";

export function ProductDropdown({
  config,
  onToggle,
  onSearchChange,
  onSelect,
  dropdownRef,
  searchInputRef,
}: {
  config: DropdownConfig;
  onToggle: (key: DropdownConfig["key"]) => void;
  onSearchChange: (key: DropdownConfig["key"], value: string) => void;
  onSelect: (key: DropdownConfig["key"], value: string) => void;
  dropdownRef?: RefObject<HTMLDivElement | null>;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const Icon = config.icon;
  const query = config.search.trim().toLowerCase();

  const filteredOptions = query
    ? config.options.filter((item) =>
        item.name.toLowerCase().includes(query)
      )
    : config.options;

  const selectedItem =
    config.options.find((item) => item._id === config.value) || null;

  return (
    <div className="space-y-1.5">
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => onToggle(config.key)}
          disabled={config.loading || config.disabled}
          className="flex h-14 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 pb-2 pt-6 text-left text-sm text-slate-900 shadow-sm transition outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">
              {config.loading
                ? "Loading..."
                : selectedItem?.name || config.placeholder}
            </span>
          </div>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              config.open ? "rotate-180" : ""
            }`}
          />
        </button>

        <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500">
          {config.label} <span className="text-rose-500">*</span>
        </label>

        {config.open && !config.loading ? (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-200 p-3">
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={config.search}
                  onChange={(e) => onSearchChange(config.key, e.target.value)}
                  placeholder={`Search ${config.label.toLowerCase()}`}
                  className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((item) => {
                  const isSelected = config.value === item._id;

                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => onSelect(config.key, item._id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        isSelected
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-sm text-slate-400">
                  No {config.label.toLowerCase()} found
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ModelCheckboxSelector({
  options,
  values,
  onChange,
  disabled = false,
  emptyText,
  allLabel,
}: ModelCheckboxSelectorProps) {
  const optionIds = options.map((item) => item._id);
  const allSelected =
    optionIds.length > 0 && optionIds.every((id) => values.includes(id));

  const toggleOne = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter((item) => item !== id));
      return;
    }

    onChange([...values, id]);
  };

  const toggleAll = () => {
    if (!optionIds.length) return;

    if (allSelected) {
      onChange(values.filter((id) => !optionIds.includes(id)));
      return;
    }

    onChange(Array.from(new Set([...values, ...optionIds])));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      {disabled ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
          {emptyText}
        </div>
      ) : options.length ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              {allLabel}
            </label>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {values.length ? `${values.length} selected` : "No models selected"}
            </span>
          </div>

          <div className="max-h-28 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              {options.map((item) => {
                const checked = values.includes(item._id);

                return (
                  <label
                    key={item._id}
                    className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      checked
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-sky-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(item._id)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>{item.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
          No models found
        </div>
      )}
    </div>
  );
}

function OptionSwatch({
  option,
  selected = false,
}: {
  option: PresetValueOption;
  selected?: boolean;
}) {
  if (!option.swatch) {
    return null;
  }

  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 rounded-full border ${
        selected ? "border-white/70" : "border-slate-300"
      }`}
      style={{ background: option.swatch }}
    />
  );
}

export function PresetValueDropdown({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  allowCustom = false,
  resolveCustomOption,
}: {
  options: PresetValueOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  allowCustom?: boolean;
  resolveCustomOption?: (value: string) => PresetValueOption | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const normalizedValue = value.trim().toLowerCase();

  const selectedOption =
    options.find(
      (option) =>
        option.value.toLowerCase() === normalizedValue ||
        option.label.toLowerCase() === normalizedValue
    ) ||
    (resolveCustomOption ? resolveCustomOption(value) : null);

  const filteredOptions = query.trim()
    ? options.filter((option) =>
        `${option.label} ${option.value}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : options;

  const customOption =
    allowCustom && resolveCustomOption && query.trim()
      ? resolveCustomOption(query.trim())
      : null;

  const hasMatchingPreset = options.some(
    (option) =>
      option.value.toLowerCase() === query.trim().toLowerCase() ||
      option.label.toLowerCase() === query.trim().toLowerCase()
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
        }}
        disabled={disabled}
        className="premium-select flex items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          {selectedOption ? <OptionSwatch option={selectedOption} /> : null}
          <span className="truncate">
            {selectedOption?.label || value || placeholder}
          </span>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-200 p-3">
            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3">
              <Search className="mr-2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  allowCustom ? "Type or search value" : "Search options"
                }
                className="w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected =
                  option.value.toLowerCase() ===
                  (selectedOption?.value.toLowerCase() || normalizedValue);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      isSelected
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3 truncate">
                      <OptionSwatch option={option} selected={isSelected} />
                      <span className="truncate">{option.label}</span>
                    </span>

                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-slate-400">
                No matching options found
              </div>
            )}

            {allowCustom && customOption && !hasMatchingPreset ? (
              <button
                type="button"
                onClick={() => {
                  onChange(customOption.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <span className="flex min-w-0 items-center gap-3 truncate">
                  <OptionSwatch option={customOption} />
                  <span className="truncate">Use “{customOption.label}”</span>
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductMediaUploader({
  inputId,
  items,
  accept,
  mediaType,
  disabled = false,
  title,
  description,
  emptyStateText,
  onFilesSelected,
  onRemove,
}: {
  inputId: string;
  items: Array<
    ProductMediaItem & {
      mediaKind: "image" | "video";
    }
  >;
  accept: string;
  mediaType: "image" | "video" | "mixed";
  disabled?: boolean;
  title: string;
  description: string;
  emptyStateText: string;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemove: (
    item: ProductMediaItem & {
      mediaKind: "image" | "video";
    }
  ) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    onFilesSelected(event.target.files ?? []);
    event.target.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) return;

    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) return;

    dragDepthRef.current = Math.max(dragDepthRef.current - 1, 0);

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = 0;
    setIsDragging(false);

    if (disabled) return;

    onFilesSelected(event.dataTransfer.files);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-37.5 cursor-pointer flex-col items-center justify-center rounded-[26px] border-2 border-dashed px-5 py-7 text-center transition ${
          isDragging
            ? "border-violet-400 bg-violet-50"
            : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/50"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleSelect}
          disabled={disabled}
          className="hidden"
        />

        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
          {items.length ? (
            mediaType === "image" ? (
              <ImagePlus className="h-6 w-6 text-violet-600" />
            ) : mediaType === "mixed" ? (
              <div className="flex items-center gap-1.5 text-violet-600">
                <ImagePlus className="h-5 w-5" />
                <Film className="h-5 w-5" />
              </div>
            ) : (
              <Film className="h-6 w-6 text-violet-600" />
            )
          ) : (
            <UploadCloud className="h-6 w-6 text-slate-500" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            {title}
          </p>
          <p className="text-sm text-slate-500">
            {description}
          </p>
        </div>
      </label>

      {items.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative h-44 overflow-hidden bg-slate-100">
                {item.mediaKind === "image" ? (
                  <Image
                    src={item.previewUrl}
                    alt={item.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <video
                    src={item.previewUrl}
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                )}

                {mediaType === "mixed" ? (
                  <span
                    className={`absolute left-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm ${
                      item.mediaKind === "image"
                        ? "bg-sky-600/90"
                        : "bg-emerald-600/90"
                    }`}
                  >
                    {item.mediaKind}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  disabled={disabled}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-rose-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.name}
                </p>
                <p className="text-xs text-slate-500">
                  {mediaType === "mixed"
                    ? `${item.mediaKind === "image" ? "Image" : "Video"}${
                        item.size > 0
                          ? ` - ${formatFileSize(item.size)}`
                          : item.isExisting
                            ? " - Existing file"
                            : ""
                      }`
                    : item.size > 0
                      ? formatFileSize(item.size)
                      : item.isExisting
                        ? "Existing file"
                        : formatFileSize(item.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
          {emptyStateText}
        </div>
      )}
    </div>
  );
}

export function VariantImageUploader({
  inputId,
  images,
  accept,
  disabled = false,
  title = "Upload variant images",
  description = "Drag and drop or click to browse PNG, JPG, JPEG, or WEBP files.",
  emptyStateText = "Preview images will appear here after upload.",
  onFilesSelected,
  onRemove,
}: {
  inputId: string;
  images: ProductImageItem[];
  accept: string;
  disabled?: boolean;
  title?: string;
  description?: string;
  emptyStateText?: string;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemove: (imageId: string) => void;
}) {
  return (
    <ProductMediaUploader
      inputId={inputId}
      items={images.map((item) => ({
        ...item,
        mediaKind: "image" as const,
      }))}
      accept={accept}
      mediaType="image"
      disabled={disabled}
      title={title}
      description={description}
      emptyStateText={emptyStateText}
      onFilesSelected={onFilesSelected}
      onRemove={(item) => onRemove(item.id)}
    />
  );
}

export function VariantVideoUploader({
  inputId,
  videos,
  accept,
  disabled = false,
  title = "Upload variant videos",
  description = "Drag and drop or click to browse MP4, MOV, or WEBM files.",
  emptyStateText = "Preview videos will appear here after upload.",
  onFilesSelected,
  onRemove,
}: {
  inputId: string;
  videos: ProductVideoItem[];
  accept: string;
  disabled?: boolean;
  title?: string;
  description?: string;
  emptyStateText?: string;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemove: (videoId: string) => void;
}) {
  return (
    <ProductMediaUploader
      inputId={inputId}
      items={videos.map((item) => ({
        ...item,
        mediaKind: "video" as const,
      }))}
      accept={accept}
      mediaType="video"
      disabled={disabled}
      title={title}
      description={description}
      emptyStateText={emptyStateText}
      onFilesSelected={onFilesSelected}
      onRemove={(item) => onRemove(item.id)}
    />
  );
}

export function VariantMediaUploader({
  inputId,
  images,
  videos,
  accept,
  disabled = false,
  title = "Upload variant images & media",
  description = "Drag and drop or click to browse PNG, JPG, JPEG, WEBP, MP4, MOV, or WEBM files.",
  emptyStateText = "Preview media will appear here after upload.",
  onFilesSelected,
  onRemove,
}: {
  inputId: string;
  images: ProductImageItem[];
  videos: ProductVideoItem[];
  accept: string;
  disabled?: boolean;
  title?: string;
  description?: string;
  emptyStateText?: string;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemove: (mediaKind: "image" | "video", itemId: string) => void;
}) {
  return (
    <ProductMediaUploader
      inputId={inputId}
      items={[
        ...images.map((item) => ({
          ...item,
          mediaKind: "image" as const,
        })),
        ...videos.map((item) => ({
          ...item,
          mediaKind: "video" as const,
        })),
      ]}
      accept={accept}
      mediaType="mixed"
      disabled={disabled}
      title={title}
      description={description}
      emptyStateText={emptyStateText}
      onFilesSelected={onFilesSelected}
      onRemove={(item) => onRemove(item.mediaKind, item.id)}
    />
  );
}

export function VariantAttributesEditor({
  attributes,
  disabled = false,
  onChangeLabel,
  onChangeValue,
  onAddAttribute,
  onRemoveAttribute,
  resolveOptions,
  allowCustom,
  resolveCustomOption,
}: {
  attributes: VariantAttribute[];
  disabled?: boolean;
  onChangeLabel: (attributeId: string, value: string) => void;
  onChangeValue: (attributeId: string, value: string) => void;
  onAddAttribute: () => void;
  onRemoveAttribute: (attributeId: string) => void;
  resolveOptions: (label: string) => PresetValueOption[];
  allowCustom?: (label: string) => boolean;
  resolveCustomOption?: (label: string, value: string) => PresetValueOption | null;
}) {
  return (
    <div className="space-y-3">
      {attributes.map((attribute) => {
        const presetOptions = resolveOptions(attribute.label);
        const canUsePresetDropdown = presetOptions.length > 0;
        const canUseCustom = allowCustom ? allowCustom(attribute.label) : false;

        return (
          <div
            key={attribute.id}
            className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <input
              value={attribute.label}
              onChange={(e) => onChangeLabel(attribute.id, e.target.value)}
              placeholder="e.g. Colour"
              className="premium-input"
              disabled={disabled}
            />

            {canUsePresetDropdown ? (
              <PresetValueDropdown
                options={presetOptions}
                value={attribute.value}
                onChange={(value) => onChangeValue(attribute.id, value)}
                placeholder={`Select ${attribute.label.toLowerCase() || "value"}`}
                disabled={disabled}
                allowCustom={canUseCustom}
                resolveCustomOption={(value) =>
                  resolveCustomOption ? resolveCustomOption(attribute.label, value) : null
                }
              />
            ) : (
              <input
                value={attribute.value}
                onChange={(e) => onChangeValue(attribute.id, e.target.value)}
                placeholder="Enter value"
                className="premium-input"
                disabled={disabled}
              />
            )}

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={onAddAttribute}
                disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onRemoveAttribute(attribute.id)}
                disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-rose-600 transition hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VariantProductInformationEditor({
  sections,
  disabled = false,
  onChangeSectionTitle,
  onAddSection,
  onRemoveSection,
  onAddField,
  onRemoveField,
  onChangeField,
  resolveOptions,
  allowCustomValue,
  resolveCustomValueOption,
}: {
  sections: ProductInformationSection[];
  disabled?: boolean;
  onChangeSectionTitle: (sectionIndex: number, value: string) => void;
  onAddSection: () => void;
  onRemoveSection: (sectionIndex: number) => void;
  onAddField: (sectionIndex: number) => void;
  onRemoveField: (sectionIndex: number, fieldIndex: number) => void;
  onChangeField: (
    sectionIndex: number,
    fieldIndex: number,
    key: "label" | "value",
    value: string
  ) => void;
  resolveOptions?: (label: string) => PresetValueOption[];
  allowCustomValue?: (label: string) => boolean;
  resolveCustomValueOption?: (
    label: string,
    value: string
  ) => PresetValueOption | null;
}) {
  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div
          key={`${section.title}-${sectionIndex}`}
          className="rounded-[22px] border border-slate-200 bg-white p-4"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <input
              value={section.title}
              onChange={(e) =>
                onChangeSectionTitle(sectionIndex, e.target.value)
              }
              placeholder="Section title"
              className="premium-input"
              disabled={disabled}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAddField(sectionIndex)}
                disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onRemoveSection(sectionIndex)}
                disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-rose-600 transition hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {section.fields.map((field, fieldIndex) => {
              const presetOptions = resolveOptions ? resolveOptions(field.label) : [];
              const canUsePresetDropdown = presetOptions.length > 0;
              const canUseCustom = allowCustomValue
                ? allowCustomValue(field.label)
                : false;

              return (
                <div
                  key={`${field.label}-${fieldIndex}`}
                  className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    value={field.label}
                    onChange={(e) =>
                      onChangeField(
                        sectionIndex,
                        fieldIndex,
                        "label",
                        e.target.value
                      )
                    }
                    placeholder="Field label"
                    className="premium-input"
                    disabled={disabled}
                  />

                  {canUsePresetDropdown ? (
                    <PresetValueDropdown
                      options={presetOptions}
                      value={field.value}
                      onChange={(value) =>
                        onChangeField(sectionIndex, fieldIndex, "value", value)
                      }
                      placeholder={`Select ${
                        field.label.toLowerCase() || "field value"
                      }`}
                      disabled={disabled}
                      allowCustom={canUseCustom}
                      resolveCustomOption={(value) =>
                        resolveCustomValueOption
                          ? resolveCustomValueOption(field.label, value)
                          : null
                      }
                    />
                  ) : (
                    <input
                      value={field.value}
                      onChange={(e) =>
                        onChangeField(
                          sectionIndex,
                          fieldIndex,
                          "value",
                          e.target.value
                        )
                      }
                      placeholder="Field value"
                      className="premium-input"
                      disabled={disabled}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => onRemoveField(sectionIndex, fieldIndex)}
                    disabled={disabled}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-rose-600 transition hover:bg-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddSection}
        disabled={disabled}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
        Add Section
      </button>
    </div>
  );
}
