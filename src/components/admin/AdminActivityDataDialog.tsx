"use client";

import { useId, useRef } from "react";
import { Info, X } from "lucide-react";

export type ActivityCoverage = "registered" | "consented" | "operational" | "live";

/** Keep data definitions available without interrupting the everyday workflow. */
export function AdminActivityDataDialog({ coverage = "registered" }: { coverage?: ActivityCoverage }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()}
      className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#004BB8]">
      <Info size={16} aria-hidden="true"/> About this data
    </button>
    <dialog ref={dialog} aria-labelledby={heading}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-0 text-[#0F172A] shadow-xl backdrop:bg-slate-950/35">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id={heading} className="pt-2 text-lg font-semibold">About this data</h2>
          <button type="button" aria-label="Close data information" onClick={() => dialog.current?.close()}
            className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-[#F1F5F9]"><X size={20} aria-hidden="true"/></button>
        </div>
        <div className="mt-3 space-y-4 text-sm leading-6 text-[#475569]">
          <p>{coverage === "live"
            ? "This temporary guest view can show current access only while it is verified. Recorded history needs a verified identity link. A dash means unavailable, never zero."
            : coverage === "operational"
              ? "This guest session has essential search and provider handoff records. Consented page visits, journey details and other interactions are unavailable. A dash means unavailable, never zero."
              : "Activity contains retained records that can be attributed to this identity. Collection depends on consent and the actions supported by the website or app. An empty period does not prove that a person did nothing."}</p>
          <p>The reporting period applies to activity counts and records. Identity dates and the latest device, access and location observation provide separate context across all time.</p>
          <p>Recent activity shows up to five newest recorded actions. Device access observations are shown separately to avoid repeating the same search or page visit as another action. View all activity opens the complete available history in pages of 20.</p>
          <p>Account status describes whether an account is enabled. Last seen and recorded location are dated observations; they do not establish that someone is online now. A provider handoff does not confirm a completed booking.</p>
          <p>Open Users views check for updates automatically while connected and visible. Older activity pages keep their position; use Newest activity to return to incoming actions.</p>
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => dialog.current?.close()}
          className="focus-ring min-h-11 rounded-lg bg-[#004BB8] px-5 text-sm font-medium text-white hover:bg-[#003D97]">Done</button></div>
      </div>
    </dialog>
  </>;
}
