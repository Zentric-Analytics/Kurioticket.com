import React from "react";

export type SupplierFact = { label: string; value: string };

/** Sanitized customer facts only, never a raw provider response. */
export function SupplierInformation({ facts, title = "Supplier information" }: {
  facts?: SupplierFact[];
  title?: string;
}) {
  if (!facts?.length) return null;
  return <details className="my-3 rounded-lg border border-slate-200 bg-white p-3" data-supplier-information>
    <summary className="min-h-11 cursor-pointer text-sm font-semibold text-slate-900">{title}</summary>
    <dl className="mt-3 space-y-3 text-sm text-slate-700">
      {facts.map((fact, index) => <div key={`${fact.label}-${index}`} className="break-words">
        <dt className="font-semibold">{fact.label}</dt><dd className="whitespace-pre-wrap">{fact.value}</dd>
      </div>)}
    </dl>
  </details>;
}
