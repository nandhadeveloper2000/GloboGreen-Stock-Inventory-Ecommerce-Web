"use client";

import type { FormState, VariantEntryFormState } from "../types";
import { buildPricePreview, formatCurrency } from "../pricing";
import {
  CompactReadOnlyCell,
  CompactTextField,
  DiscountCell,
} from "./FormFields";

type PricePreview = ReturnType<typeof buildPricePreview>;

function SummaryMetric({
  label,
  index,
  value,
  tone = "slate",
}: {
  label: string;
  index: number;
  value: string | number;
  tone?: "slate" | "violet" | "emerald" | "fuchsia";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : tone === "violet"
        ? "border-violet-200 bg-violet-50 text-violet-950"
        : tone === "fuchsia"
          ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950"
          : "border-slate-200 bg-slate-50 text-slate-950";

  return (
    <div className={"rounded-xl border px-2.5 py-2 " + toneClass}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.08em] opacity-70">
          {label}
        </p>
        <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-black">
          {index}
        </span>
      </div>
      <p className="mt-1 truncate text-[13px] font-black leading-none">
        {value}
      </p>
    </div>
  );
}

function PricingSummary({
  singlePreview,
  bulkPreview,
  isWholesaleShop,
}: {
  singlePreview: PricePreview;
  bulkPreview: PricePreview;
  isWholesaleShop: boolean;
}) {
  return (
    <div
      className={
        isWholesaleShop
          ? "mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8"
          : "mb-3 grid grid-cols-2 gap-2 md:grid-cols-4"
      }
    >
      <SummaryMetric label="Single Qty" index={1} value={singlePreview.purchaseQty} />
      <SummaryMetric
        label="1Qty Purchase"
        index={2}
        value={formatCurrency(singlePreview.inputPrice)}
      />
      <SummaryMetric
        label="1Qty Selling"
        index={3}
        value={formatCurrency(singlePreview.unitSellingPrice)}
        tone="violet"
      />
      <SummaryMetric
        label="Final Selling"
        index={4}
        value={formatCurrency(singlePreview.sellingPrice)}
        tone="emerald"
      />

      {isWholesaleShop ? (
        <>
          <SummaryMetric label="Bulk Qty" index={5} value={bulkPreview.purchaseQty} />
          <SummaryMetric
            label="Bulk Purchase"
            index={6}
            value={formatCurrency(bulkPreview.totalPurchasePrice)}
          />
          <SummaryMetric
            label="Bulk 1Qty Sell"
            index={7}
            value={formatCurrency(bulkPreview.unitSellingPrice)}
            tone="violet"
          />
          <SummaryMetric
            label="Bulk Total"
            index={8}
            value={formatCurrency(bulkPreview.sellingPrice)}
            tone="emerald"
          />
        </>
      ) : null}
    </div>
  );
}

export function ProductPricingTable({
  form,
  singlePreview,
  bulkPreview,
  isWholesaleShop,
  disabledForm,
  updateSingleField,
}: {
  form: FormState;
  singlePreview: PricePreview;
  bulkPreview: PricePreview;
  isWholesaleShop: boolean;
  disabledForm: boolean;
  updateSingleField: (key: keyof FormState, value: string) => void;
}) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <div className="mb-3">
        <h2 className="text-[15px] font-black text-slate-950">
          Product Pricing
        </h2>
        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
          Single pricing for retail. Wholesale shop supports single + bulk pricing.
        </p>
      </div>

      <PricingSummary
        singlePreview={singlePreview}
        bulkPreview={bulkPreview}
        isWholesaleShop={isWholesaleShop}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1120px] border-collapse bg-white text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">
            <tr>
              <th className="w-[100px] border-b border-slate-200 px-2.5 py-2">Type</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Purchase Qty</th>
              <th className="border-b border-slate-200 px-2.5 py-2">MRP</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Purchase Price</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Margin %</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Selling Max</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Discount</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Selling Min</th>
            </tr>
          </thead>

          <tbody>
            <tr className="align-top">
              <td className="border-b border-slate-100 px-2.5 py-2">
                <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
                  SINGLE
                </span>
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactTextField
                  id="single-purchaseQty"
                  label="Single Qty"
                  value={form.purchaseQty}
                  disabled={disabledForm}
                  onChange={(value) => {
                    updateSingleField("purchaseQty", value);
                    updateSingleField("minQty", value);
                  }}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactTextField
                  id="single-mrpPrice"
                  label="MRP Price"
                  value={form.mrpPrice}
                  step="0.01"
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("mrpPrice", value)}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactTextField
                  id="single-inputPrice"
                  label="Purchase"
                  value={form.inputPrice}
                  step="0.01"
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("inputPrice", value)}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactTextField
                  id="single-margin"
                  label="Margin %"
                  value={form.baseRangeDownPercent}
                  step="0.01"
                  disabled={disabledForm}
                  onChange={(value) =>
                    updateSingleField("baseRangeDownPercent", value)
                  }
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactReadOnlyCell
                  id="single-max"
                  label="Selling Max"
                  value={singlePreview.sellingPrice}
                  disabled={disabledForm}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <DiscountCell
                  id="single-negotiation"
                  label="% / ₹"
                  value={form.rangeDownPercent}
                  amount={singlePreview.negotiationAmount}
                  disabled={disabledForm}
                  onChange={(value) => updateSingleField("rangeDownPercent", value)}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactReadOnlyCell
                  id="single-min"
                  label="Selling Min"
                  value={singlePreview.minSellingPrice}
                  disabled={disabledForm}
                />
              </td>
            </tr>

            {isWholesaleShop ? (
              <tr className="align-top">
                <td className="px-2.5 py-2">
                  <span className="inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-[10px] font-black text-fuchsia-700">
                    BULK
                  </span>
                </td>

                <td className="px-2.5 py-2">
                  <CompactTextField
                    id="bulk-purchaseQty"
                    label="Bulk Qty"
                    value={form.bulkPurchaseQty}
                    disabled={disabledForm}
                    onChange={(value) => {
                      updateSingleField("bulkPurchaseQty", value);
                      updateSingleField("bulkMinQty", value);
                    }}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactTextField
                    id="bulk-mrpPrice"
                    label="MRP Price"
                    value={form.bulkMrpPrice}
                    step="0.01"
                    disabled={disabledForm}
                    onChange={(value) => updateSingleField("bulkMrpPrice", value)}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactTextField
                    id="bulk-inputPrice"
                    label="1Qty Purchase"
                    value={form.bulkInputPrice}
                    step="0.01"
                    disabled={disabledForm}
                    onChange={(value) => updateSingleField("bulkInputPrice", value)}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactTextField
                    id="bulk-margin"
                    label="Margin %"
                    value={form.bulkBaseRangeDownPercent}
                    step="0.01"
                    disabled={disabledForm}
                    onChange={(value) =>
                      updateSingleField("bulkBaseRangeDownPercent", value)
                    }
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactReadOnlyCell
                    id="bulk-max"
                    label="Bulk Max"
                    value={bulkPreview.sellingPrice}
                    disabled={disabledForm}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <DiscountCell
                    id="bulk-negotiation"
                    label="% / ₹"
                    value={form.bulkRangeDownPercent}
                    amount={bulkPreview.negotiationAmount}
                    disabled={disabledForm}
                    onChange={(value) =>
                      updateSingleField("bulkRangeDownPercent", value)
                    }
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactReadOnlyCell
                    id="bulk-min"
                    label="Bulk Min"
                    value={bulkPreview.minSellingPrice}
                    disabled={disabledForm}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function VariantPricingTable({
  entry,
  singlePreview,
  bulkPreview,
  isWholesaleShop,
  disabledForm,
  updateVariantEntry,
}: {
  entry: VariantEntryFormState;
  singlePreview: PricePreview;
  bulkPreview: PricePreview;
  isWholesaleShop: boolean;
  disabledForm: boolean;
  updateVariantEntry: (
    variantIndex: number,
    patch: Partial<VariantEntryFormState>
  ) => void;
}) {
  const disabled = disabledForm || !entry.isSelected;

  const updateField = (key: keyof VariantEntryFormState, value: string) => {
    updateVariantEntry(entry.variantIndex, {
      [key]: value,
    } as Partial<VariantEntryFormState>);
  };

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <div className="mb-3">
        <h4 className="text-[15px] font-black text-slate-950">
          Variant Pricing
        </h4>
        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
          Compact table format for selected variant stock and pricing.
        </p>
      </div>

      <PricingSummary
        singlePreview={singlePreview}
        bulkPreview={bulkPreview}
        isWholesaleShop={isWholesaleShop}
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1120px] border-collapse bg-white text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">
            <tr>
              <th className="w-[100px] border-b border-slate-200 px-2.5 py-2">Type</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Purchase Qty</th>
              <th className="border-b border-slate-200 px-2.5 py-2">MRP</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Purchase Price</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Margin %</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Selling Max</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Discount</th>
              <th className="border-b border-slate-200 px-2.5 py-2">Selling Min</th>
            </tr>
          </thead>

          <tbody>
            <tr className="align-top">
              <td className="border-b border-slate-100 px-2.5 py-2">
                <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
                  SINGLE
                </span>
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactTextField
                  id={`variant-${entry.variantIndex}-single-qty`}
                  label="Single Qty"
                  value={entry.purchaseQty}
                  disabled={disabled}
                  onChange={(value) => {
                    updateField("purchaseQty", value);
                    updateField("minQty", value);
                  }}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactTextField
                  id={`variant-${entry.variantIndex}-single-mrp`}
                  label="MRP Price"
                  value={entry.mrpPrice}
                  step="0.01"
                  disabled={disabled}
                  onChange={(value) => updateField("mrpPrice", value)}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactTextField
                  id={`variant-${entry.variantIndex}-single-input`}
                  label="Purchase"
                  value={entry.inputPrice}
                  step="0.01"
                  disabled={disabled}
                  onChange={(value) => updateField("inputPrice", value)}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactTextField
                  id={`variant-${entry.variantIndex}-single-margin`}
                  label="Margin %"
                  value={entry.baseRangeDownPercent}
                  step="0.01"
                  disabled={disabled}
                  onChange={(value) => updateField("baseRangeDownPercent", value)}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactReadOnlyCell
                  id={`variant-${entry.variantIndex}-single-max`}
                  label="Selling Max"
                  value={singlePreview.sellingPrice}
                  disabled={disabled}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <DiscountCell
                  id={`variant-${entry.variantIndex}-single-negotiation`}
                  label="% / ₹"
                  value={entry.rangeDownPercent}
                  amount={singlePreview.negotiationAmount}
                  disabled={disabled}
                  onChange={(value) => updateField("rangeDownPercent", value)}
                />
              </td>

              <td className="border-b border-slate-100 px-2.5 py-2">
                <CompactReadOnlyCell
                  id={`variant-${entry.variantIndex}-single-min`}
                  label="Selling Min"
                  value={singlePreview.minSellingPrice}
                  disabled={disabled}
                />
              </td>
            </tr>

            {isWholesaleShop ? (
              <tr className="align-top">
                <td className="px-2.5 py-2">
                  <span className="inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-[10px] font-black text-fuchsia-700">
                    BULK
                  </span>
                </td>

                <td className="px-2.5 py-2">
                  <CompactTextField
                    id={`variant-${entry.variantIndex}-bulk-qty`}
                    label="Bulk Qty"
                    value={entry.bulkPurchaseQty}
                    disabled={disabled}
                    onChange={(value) => {
                      updateField("bulkPurchaseQty", value);
                      updateField("bulkMinQty", value);
                    }}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactTextField
                    id={`variant-${entry.variantIndex}-bulk-mrp`}
                    label="MRP Price"
                    value={entry.bulkMrpPrice}
                    step="0.01"
                    disabled={disabled}
                    onChange={(value) => updateField("bulkMrpPrice", value)}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactTextField
                    id={`variant-${entry.variantIndex}-bulk-input`}
                    label="1Qty Purchase"
                    value={entry.bulkInputPrice}
                    step="0.01"
                    disabled={disabled}
                    onChange={(value) => updateField("bulkInputPrice", value)}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactTextField
                    id={`variant-${entry.variantIndex}-bulk-margin`}
                    label="Margin %"
                    value={entry.bulkBaseRangeDownPercent}
                    step="0.01"
                    disabled={disabled}
                    onChange={(value) =>
                      updateField("bulkBaseRangeDownPercent", value)
                    }
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactReadOnlyCell
                    id={`variant-${entry.variantIndex}-bulk-max`}
                    label="Bulk Max"
                    value={bulkPreview.sellingPrice}
                    disabled={disabled}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <DiscountCell
                    id={`variant-${entry.variantIndex}-bulk-negotiation`}
                    label="% / ₹"
                    value={entry.bulkRangeDownPercent}
                    amount={bulkPreview.negotiationAmount}
                    disabled={disabled}
                    onChange={(value) => updateField("bulkRangeDownPercent", value)}
                  />
                </td>

                <td className="px-2.5 py-2">
                  <CompactReadOnlyCell
                    id={`variant-${entry.variantIndex}-bulk-min`}
                    label="Bulk Min"
                    value={bulkPreview.minSellingPrice}
                    disabled={disabled}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}