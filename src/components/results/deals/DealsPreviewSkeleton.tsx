import { dealsPreviewLimit } from "@/lib/deals/dealsResultsPresentation";
import { DealsPreviewRail } from "./DealsPreviewRail";

export function DealsPreviewSkeleton() {
  return <DealsPreviewRail ariaHidden>{Array.from({ length: dealsPreviewLimit }, (_, index) => <div key={index} className="min-h-80 rounded-2xl bg-slate-100 motion-safe:animate-pulse"><div className="h-32 rounded-t-2xl bg-slate-200" /><div className="space-y-3 p-5"><div className="h-5 w-2/3 rounded bg-slate-200" /><div className="h-4 rounded bg-slate-200" /><div className="h-4 w-4/5 rounded bg-slate-200" /></div></div>)}</DealsPreviewRail>;
}
