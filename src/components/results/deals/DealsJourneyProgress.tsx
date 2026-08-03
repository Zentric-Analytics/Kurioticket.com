"use client";

import Link from "next/link";
import { AlertTriangle, BedDouble, Car, Check, Circle, Plane } from "lucide-react";
import type { DealsJourneyProgress, DealsJourneyStep } from "@/lib/deals/dealsJourneyProgress";

type Props = { progress: DealsJourneyProgress; t: (key: string) => string; actions?: Partial<Record<DealsJourneyStep["id"], string>>; announcement?: string };
const icons = { hotel: BedDouble, flight: Plane, car: Car, review: Circle };

export function DealsJourneyProgress({ progress, t, actions, announcement = "" }: Props) {
  const current = progress.steps[progress.currentStepIndex - 1];
  const label = (step: DealsJourneyStep) => t(`deals.journey.step.${step.id}`);
  const statusLabel = (step: DealsJourneyStep) => t(`deals.journey.status.${step.status}`);
  const substate = current?.substate ? t(`deals.journey.substate.${current.substate}`) : "";
  return <nav aria-label={t("deals.journey.navigationLabel")} className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-6">
    <p className="sr-only" aria-live="polite">{announcement}</p>
    <div className="sm:hidden">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#004BB8]">{t("deals.journey.stepCount").replace("{{current}}", String(progress.currentStepIndex)).replace("{{total}}", String(progress.total))}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-950">{label(current)}</p>
      {substate && <p className="text-sm font-medium text-slate-600">{substate}</p>}
    </div>
    <ol className="mt-4 flex min-w-0 overflow-x-auto pb-1 sm:mt-0 sm:overflow-visible" dir="auto">
      {progress.steps.map((step, index) => {
        const Icon = step.status === "completed" ? Check : step.status === "needs-attention" ? AlertTriangle : icons[step.id];
        const href = actions?.[step.id];
        const content = <>
          <span aria-hidden="true" className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 ${step.status === "completed" ? "border-emerald-700 bg-emerald-700 text-white" : step.status === "current" ? "border-[#004BB8] bg-[#004BB8] text-white ring-4 ring-blue-100" : step.status === "needs-attention" ? "border-amber-600 bg-amber-50 text-amber-800" : "border-slate-300 bg-white text-slate-500"}`}><Icon className="size-4" /></span>
          <span className="mt-2 min-w-max text-center text-sm font-extrabold text-slate-900">{label(step)}</span>
          <span className="text-center text-[11px] font-semibold text-slate-500">{statusLabel(step)}</span>
          {step.summary && <span className="max-w-36 text-center text-xs text-slate-500">{step.summary}</span>}
        </>;
        return <li key={step.id} aria-current={step.status === "current" ? "step" : undefined} aria-label={`${label(step)}: ${statusLabel(step)}`} className="relative flex min-w-[7rem] flex-1 flex-col items-center px-2 first:ps-0 last:pe-0">
          {index > 0 && <span aria-hidden="true" className="absolute end-1/2 top-[1.1rem] h-0.5 w-full bg-slate-200" />}
          {href ? <Link href={href} className="focus-ring relative z-10 flex flex-col items-center rounded-lg">{content}</Link> : <div className="relative z-10 flex flex-col items-center">{content}</div>}
        </li>;
      })}
    </ol>
  </nav>;
}
