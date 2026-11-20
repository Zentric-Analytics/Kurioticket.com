import type { AdminJourneyEvent } from "@/services/adminJourneyContract";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "UTC" });
const readable = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());

/** Presentation only: retain the reader's event order and every recorded row. */
export function JourneyEventHistory({ events }: { events: AdminJourneyEvent[] }) {
  return <section aria-labelledby="journey-history-heading" className="min-w-0">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="journey-history-heading" className="text-[15px] font-semibold text-[#020617]">Event History</h2>
      <p className="text-xs text-[#64748B]">{events.length} recorded {events.length === 1 ? "event" : "events"} in this view · UTC</p>
    </div>
    <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" role="region" aria-label="Journey event history" tabIndex={0}>
      <table className="w-full min-w-[820px] table-fixed text-left text-[13px] text-[#334155]">
        <caption className="sr-only">Journey event chronology in the recorded order</caption>
        <colgroup><col className="w-[17%]" /><col className="w-[21%]" /><col className="w-[38%]" /><col className="w-[24%]" /></colgroup>
        <thead className="border-b border-[#D8E1EC] bg-white text-[12px] text-[#475569]">
          <tr>{["Time", "Event", "Search details", "Provider / handoff"].map(label =>
            <th key={label} scope="col" className="px-3 py-3 font-medium uppercase">{label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7ECF5]">
          {events.map((event, index) => {
            const at = new Date(event.createdAt);
            const searchTitle = event.search ? [event.search.origin, event.search.destination].filter(Boolean).join(" → ") : "";
            return <tr key={event.id} data-journey-event={event.id} className="align-top transition-colors hover:bg-[#F8FAFC]">
              <td className="px-3 py-3">
                <time dateTime={event.createdAt} className="block tabular-nums">
                  <span className="block font-medium text-[#020617]">{timeFormat.format(at)}</span>
                  <span className="mt-1 block text-xs text-[#64748B]">{dateFormat.format(at)}</span>
                </time>
              </td>
              <td className="px-3 py-3 [overflow-wrap:anywhere]">
                <span className="block text-[11px] font-semibold tabular-nums text-[#64748B]">Step {index + 1}</span>
                <span className="mt-1 inline-flex rounded-md border border-[#D8E1EC] bg-white px-2 py-1 text-[11px] font-medium text-[#475569]">{event.type === "RESULT_SHARED"
                  ? event.action === "share_link_copied" ? "Result link copied" : event.action === "share_sheet_completed" ? "Share sheet completed" : "Result shared"
                   : event.type === "PRICE_ALERT_CREATED" ? "Price alert created"
                  : event.type === "RESULT_SAVED"
                    ? event.action === "local_saved" ? "Saved locally" : event.action === "saved_item_confirmed" ? "Saved to account" : "Result saved"
                    : event.type === "RESULT_UNSAVED"
                      ? event.action === "local_unsaved" ? "Removed local save" : event.action === "saved_item_removed" ? "Removed saved item" : "Result unsaved"
                      : readable(event.type)}</span>
                {event.product ? <p className="mt-1 text-xs text-[#64748B]">{readable(event.product)}</p> : null}
              </td>
              <td className="px-3 py-3 [overflow-wrap:anywhere]">
                {event.search ? <>
                  {searchTitle ? <p className="font-medium text-[#020617]">{searchTitle}</p> : null}
                  <p className={searchTitle ? "mt-1 text-xs text-[#64748B]" : "text-xs text-[#64748B]"}>{readable(event.search.status)} · {event.search.resultCount} results</p>
                </> : <p className="text-xs text-[#64748B]">Search details not recorded</p>}
                {event.resultReference ? <p className="mt-1.5 break-all text-[11px] leading-4 text-[#64748B]">
                  Recorded result reference: {event.resultReference}
                </p> : null}
                {event.sourcePage ? <p className="mt-1.5 break-all text-[11px] leading-4 text-[#64748B]"><span className="mr-1">Source:</span>{event.sourcePage}</p> : null}
              </td>
              <td className="px-3 py-3 [overflow-wrap:anywhere]">
                {event.provider && event.provider !== event.handoff?.provider ? <p className="mb-1 font-medium text-[#0F172A]">{event.provider}</p> : null}
                {event.handoff ? <div>
                  <p className="font-medium text-[#020617]">Handoff → {event.handoff.provider}</p>
                  {event.handoff.destinationDomain ? <p className="mt-1 text-xs">{event.handoff.destinationDomain}</p> : null}
                  <p className="mt-1 text-xs text-[#64748B]">{event.handoff.searchCorrelation === "exact" ? "exact search link" : "search link unavailable"}</p>
                </div> : !event.provider ? <span className="sr-only">No provider recorded</span> : null}
              </td>
            </tr>;
          })}
          {!events.length ? <tr><td colSpan={4} className="px-3 py-8 text-[#64748B]">No events recorded in this window.</td></tr> : null}
        </tbody>
      </table>
    </div>
  </section>;
}
