import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";

const panels = [
  "Detailed product and provider breakdowns",
  "Confirmation integration readiness",
  "Confirmation delivery health and alerts",
  "Flight status monitoring",
] as const;

export default function TripOperationsLoading() {
  return (
    <AdminPageShell title="Trip operations" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <nav aria-label="Trip operations navigation" className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <Link href="/admin/confirmed-trips" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-semibold text-slate-700">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Trips
          </Link>
          <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center rounded-lg border border-indigo-200 bg-white px-3 text-xs font-semibold text-indigo-700">
            Browse confirmed trips
          </Link>
        </nav>
        <div role="status" aria-live="polite" className="sr-only">Loading trip operations…</div>
        <section aria-labelledby="trip-operations-loading-heading" aria-busy="true" className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <h2 id="trip-operations-loading-heading" className="text-base font-semibold text-slate-950">Trip operations</h2>
          <p className="mt-1 text-xs text-slate-600">Loading provider and confirmation monitoring…</p>
          <div aria-hidden="true" className="mt-3 space-y-2">
            {panels.map(label => (
              <div key={label} className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-600">
                {label}
                <span className="h-3 w-3 rounded bg-slate-100 motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
