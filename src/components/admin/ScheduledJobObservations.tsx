import { formatViewerTimestamp } from "@/lib/adminLocalTime";
import type { ScheduledJobRun } from "@/services/platformOperationsContract";
import { AdminStatusBadge } from "./AdminPageShell";
import { OperationalStatus } from "./OperationalStatus";
const labels = { RUNNING: "Running", SUCCESS: "Completed successfully", FAILED: "Completed with failure", DEGRADED: "Completed with degraded outcome", DISABLED: "Completed · disabled", UNKNOWN: "Unknown" };
export function ScheduledJobObservations({ state, runs, timeZone }: {
    state: string;
    runs: ScheduledJobRun[] | null;
    timeZone: string;
}) {
    return <section id="scheduled-job-observations" className="min-w-0 overflow-hidden border-t border-[#D8E1EC] bg-white py-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-semibold text-slate-950">Scheduled-job observations</h2>{state === "OBSERVED" ? <AdminStatusBadge tone="info">Invocations observed</AdminStatusBadge> : <OperationalStatus state={state}/>}</div>
  <p className="mt-2 text-xs leading-5 text-slate-500">Latest 100 invocations in this environment and window; not proof of scheduling uptime.</p>
  {!runs?.length ? <p role="status" className="mt-4 border-y border-[#E7ECF5] py-4 text-[12px] text-[#64748B]">{state === "MONITORING_UNAVAILABLE" ? "Job observations are unavailable." : "No job invocations observed in this window."}</p> : <div role="region" aria-label="Scheduled-job observations table" tabIndex={0} className="admin-responsive-records focus-ring mt-4 max-w-full overflow-x-auto rounded-lg"><table className="w-full min-w-0 table-fixed text-left text-xs"><caption className="sr-only">Persisted job invocation evidence</caption><thead className="border-y border-slate-200 bg-slate-50 text-slate-500"><tr>{["Job / environment", "Outcome", "Observed", "Completed", "Duration"].map(title => <th scope="col" key={title} className="px-3 py-3 font-semibold">{title}</th>)}</tr></thead><tbody>{runs.map((run, index) => <tr key={run.job + run.observedAt + index} className="border-b border-slate-100"><td data-label="Job / environment" className="px-3 py-3 font-medium">{run.job}<span className="mt-1 block text-slate-500">{run.environment}</span></td><td data-label="Outcome" className="px-3 py-3">{labels[run.outcome]}</td><td data-label="Observed" className="whitespace-nowrap px-3 py-3"><time dateTime={run.observedAt}>{formatViewerTimestamp(run.observedAt, timeZone)}</time></td><td data-label="Completed" className="whitespace-nowrap px-3 py-3">{run.completedAt ? <time dateTime={run.completedAt}>{formatViewerTimestamp(run.completedAt, timeZone)}</time> : "Not recorded"}</td><td data-label="Duration" className="px-3 py-3">{run.durationMs === null ? "Not measured" : run.durationMs.toLocaleString() + " ms"}</td></tr>)}</tbody></table></div>}
 </section>;
}
