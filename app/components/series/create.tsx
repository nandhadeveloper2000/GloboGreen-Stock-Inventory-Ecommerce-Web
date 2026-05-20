"use client";

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgePlus, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

import SummaryApi from "@/constants/SummaryApi";
import apiClient from "@/lib/api-client";
import { useAuth } from "@/context/auth/AuthProvider";

type PageMode = "create" | "edit";

type BrandOption = { _id: string; name: string };
type SeriesItem = { _id?: string; name?: string; brandId?: string | BrandOption; isActive?: boolean };

type CreateSeriesPageProps = {
  mode?: PageMode;
  seriesId?: string;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
};

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const msg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function isValidMongoId(id: unknown): id is string {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id.trim());
}

function TopLabelInput({
  label, value, placeholder, required, disabled, onChange,
}: {
  label: string; value: string; placeholder?: string; required?: boolean; disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
      <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}{required ? <span className="text-rose-500"> *</span> : null}
      </label>
    </div>
  );
}

function TopLabelSelect({
  label, value, required, disabled, onChange, children,
}: {
  label: string; value: string; required?: boolean; disabled?: boolean;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pb-1.5 pt-5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00008b] focus:ring-4 focus:ring-[#00008b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      >
        {children}
      </select>
      <label className="pointer-events-none absolute left-4 top-2 bg-white px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}{required ? <span className="text-rose-500"> *</span> : null}
      </label>
    </div>
  );
}

export default function CreateSeriesPage({
  mode = "create", seriesId = "", isModal = false, onClose, onSuccess,
}: CreateSeriesPageProps) {
  const router = useRouter();
  const { role } = useAuth();

  const isEditMode = mode === "edit";
  const listPath = "/master/series/list";

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingBrands(true);
        const res = await apiClient.get<{ data?: BrandOption[]; brands?: BrandOption[] }>(
          SummaryApi.brand_list.url
        );
        const list = res.data?.data || res.data?.brands || [];
        setBrands(Array.isArray(list) ? list : []);
      } catch {
        toast.error("Failed to load brands");
      } finally {
        setLoadingBrands(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEditMode) { setLoading(false); return; }
    let active = true;
    void (async () => {
      try {
        if (!isValidMongoId(seriesId)) { toast.error("Invalid series id"); router.push(listPath); return; }
        setLoading(true);
        const url = typeof SummaryApi.series_get.url === "function" ? SummaryApi.series_get.url(seriesId) : `${SummaryApi.series_get.url}/${seriesId}`;
        const res = await apiClient.get<{ success?: boolean; message?: string; data?: SeriesItem }>(url);
        if (!res.data?.success || !res.data?.data) throw new Error(res.data?.message || "Failed to fetch series");
        if (!active) return;
        const d = res.data.data;
        setName(d.name || "");
        const bid = typeof d.brandId === "object" ? d.brandId?._id : d.brandId;
        setBrandId(bid || "");
      } catch (err) {
        if (active) { toast.error(getErrorMessage(err)); router.push(listPath); }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isEditMode, seriesId, router, role]);

  function handleClose() {
    if (isModal && onClose) { onClose(); return; }
    router.push(listPath);
  }

  async function handleSuccess() {
    if (isModal && onSuccess) { await onSuccess(); return; }
    router.push(listPath);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { toast.error("Series name is required"); return; }
    if (!brandId) { toast.error("Please select a brand"); return; }
    if (isEditMode && !isValidMongoId(seriesId)) { toast.error("Invalid series id"); return; }

    try {
      setSubmitting(true);
      if (isEditMode) {
        const url = typeof SummaryApi.series_update.url === "function" ? SummaryApi.series_update.url(seriesId) : `${SummaryApi.series_update.url}/${seriesId}`;
        const res = await apiClient.put<{ success?: boolean; message?: string }>(url, { name: trimmedName, brandId });
        if (!res.data?.success) throw new Error(res.data?.message || "Failed to update series");
        toast.success(res.data?.message || "Series updated successfully");
      } else {
        const res = await apiClient.post<{ success?: boolean; message?: string }>(SummaryApi.series_create.url, { name: trimmedName, brandId });
        if (!res.data?.success) throw new Error(res.data?.message || "Failed to create series");
        toast.success(res.data?.message || "Series created successfully");
        setName(""); setBrandId("");
      }
      await handleSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || loading || loadingBrands;
  const pageTitle = isEditMode ? "Edit Series" : "Create Series";
  const buttonText = isEditMode ? "Update Series" : "Save Series";
  const submittingText = isEditMode ? "Updating..." : "Creating...";

  if (loading || loadingBrands) {
    return (
      <div className={isModal ? "flex w-full items-center justify-center bg-white px-4 py-8" : "min-h-screen bg-slate-50 px-3 py-4 sm:px-4 lg:px-6"}>
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center rounded-[26px] border border-slate-200 bg-white py-14 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-[#00008b]" />
            <span className="text-sm font-black">Loading series details...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isModal ? "w-full bg-white" : "min-h-screen bg-slate-50 px-3 py-4 sm:px-4 lg:px-6"}>
      <div className={isModal ? "w-full" : "mx-auto w-full max-w-5xl"}>
        <form
          onSubmit={handleSubmit}
          className={isModal
            ? "flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden bg-white"
            : "flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]"}
        >
          {isModal ? (
            <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black text-slate-950">{pageTitle}</h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">Fill in series details.</p>
              </div>
              <button type="button" onClick={handleClose} disabled={disabled} aria-label="Close"
                className="ml-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
              <button type="button" onClick={handleClose} disabled={disabled}
                className="mb-4 inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60">
                <ArrowLeft className="h-4 w-4" /> Back to List
              </button>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{pageTitle}</h1>
                <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  {isEditMode ? "Update series name and brand association." : "Assign a series to a brand."}
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-4 sm:p-5">
              <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] md:p-5">
                <div className="flex items-start gap-3 mb-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00008b]/10 text-[#00008b]">
                    <BadgePlus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-slate-950">Series Details</h2>
                    <p className="mt-0.5 text-sm font-semibold leading-6 text-slate-500">Select a brand and enter the series name.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <TopLabelSelect label="Brand" value={brandId} onChange={(e) => setBrandId(e.target.value)} required disabled={disabled}>
                    <option value="">Select a brand</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </TopLabelSelect>

                  <TopLabelInput
                    label="Series Name" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Enter series name" disabled={disabled} required
                  />
                </div>
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={() => { setName(""); setBrandId(""); }} disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                Reset
              </button>
              <button type="button" onClick={handleClose} disabled={disabled}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-[#00008b] hover:bg-[#00008b]/5 hover:text-[#00008b] disabled:cursor-not-allowed disabled:opacity-60">
                Cancel
              </button>
              <button type="submit" disabled={disabled}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00008b] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,139,0.22)] transition hover:bg-[#000070] disabled:cursor-not-allowed disabled:opacity-70">
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" />{submittingText}</>) : (<><Save className="h-4 w-4" />{buttonText}</>)}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
