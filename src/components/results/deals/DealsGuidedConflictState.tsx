"use client";

import { AlertTriangle } from "lucide-react";

export function DealsGuidedConflictState({ t, onRestart }: { t: (key: string) => string; onRestart: () => void }) {
  return <div data-deals-guided-conflict role="status" className="rounded-2xl border border-amber-300 bg-white p-6 shadow-sm sm:p-8">
    <AlertTriangle aria-hidden className="size-8 text-amber-700" />
    <h2 className="mt-4 text-xl font-bold text-slate-950">{t("deals.guided.conflict.title")}</h2>
    <p className="mt-2 max-w-xl leading-7 text-slate-600">{t("deals.guided.conflict.body")}</p>
    <p id="deals-guided-conflict-disclosure" className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{t("deals.guided.conflict.restartDisclosure")}</p>
    <button type="button" aria-describedby="deals-guided-conflict-disclosure" onClick={onRestart} className="focus-ring mt-6 min-h-11 rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white">{t("deals.guided.conflict.restart")}</button>
  </div>;
}
