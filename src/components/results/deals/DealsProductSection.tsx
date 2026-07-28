import type { ReactNode } from "react";
import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { DealsPreviewSkeleton } from "./DealsPreviewSkeleton";

export function DealsProductSection({ id, headingLevel = 2, title, summary, icon, href, viewAll, status, loadingLabel, emptyLabel, errorLabel, retryLabel, onRetry, notice, children }: { id: string; headingLevel?: 1 | 2; title: string; summary: string; icon: ReactNode; href: string; viewAll: string; status: string; loadingLabel: string; emptyLabel: string; errorLabel?: string; retryLabel: string; onRetry: () => void; notice?: string; children?: ReactNode }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return <section aria-labelledby={id} aria-busy={status === "loading"} className="min-w-0">
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row"><div><Heading id={id} tabIndex={-1} className="flex items-center gap-2 rounded-sm text-xl font-extrabold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40">{icon}{title}</Heading><p className="mt-1 text-sm text-slate-600">{summary}</p></div><Link href={href} className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-[#004BB8] px-5 py-2 text-center font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{viewAll}</Link></div>
    {notice && <p role="status" className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><CircleAlert aria-hidden className="h-5 w-5 shrink-0" />{notice}</p>}
    {status === "loading" && <><span className="sr-only" aria-live="polite">{loadingLabel}</span><DealsPreviewSkeleton /></>}
    {status === "empty" && <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-slate-700">{emptyLabel}</div>}
    {status === "error" && <div className="mt-5 rounded-2xl bg-rose-50 p-6 text-center"><p role="alert" className="text-rose-800">{errorLabel}</p><button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><RefreshCw aria-hidden className="h-4 w-4" />{retryLabel}</button></div>}
    {status === "success" && <>{children}</>}
  </section>;
}
