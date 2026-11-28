"use client";

import { useId, useRef, type ReactNode } from "react";
import { reportLink, reportPanel } from "../report-ui";

export function RequestEvidence({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();

  return <>
    <button type="button" className={reportLink + " whitespace-nowrap"} aria-haspopup="dialog"
      onClick={() => dialog.current?.showModal()}>View evidence</button>
    <dialog ref={dialog} aria-labelledby={heading}
      className={reportPanel + " fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-5 text-slate-950 shadow-lg backdrop:bg-slate-950/40"}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 id={heading} className="text-base font-semibold">Request evidence</h3>
        <form method="dialog">
          <button type="submit" className={reportLink}>Close</button>
        </form>
      </div>
      {children}
    </dialog>
  </>;
}
