import type { AdminJourneyEvent } from "@/services/adminJourneyContract";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "UTC" });
const readable = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());

/** Presentation only: retain the reader's event order and every recorded row. */
export function JourneyEventHistory({ events }: { events: AdminJourneyEvent[] }) {
  return <section aria-labelledby="journey-history-heading" className="min-w-0">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="journey-history-heading" className="text-base font-semibold text-[#0F172A]">Event History</h2>
      <p className="text-xs text-[#64748B]">{events.length} recorded {events.length === 1 ? "event" : "events"} in this view · UTC</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-left text-[13px] text-[#475569]">
        <caption className="sr-only">Journey event chronology in the recorded order</caption>
        <colgroup><col className="w-[17%]" /><col className="w-[21%]" /><col className="w-[38%]" /><col className="w-[24%]" /></colgroup>
        <thead className="border-y border-[#E2E8F0] text-xs text-[#64748B]">
          <tr>{["Time", "Event", "Search details", "Provider / handoff"].map(label =>
            <th key={label} scope="col" className="px-3 py-2.5 font-medium first:pl-0 last:pr-0">{label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {events.map(event => {
            const at = new Date(event.createdAt);
            const searchTitle = event.search ? [event.search.origin, event.search.destination].filter(Boolean).join(" → ") : "";
            return <tr key={event.id} data-journey-event={event.id} className="align-top">
              <td className="py-3 pr-3">
                <time dateTime={event.createdAt} className="block tabular-nums">
                  <span className="block text-[#0F172A]">{timeFormat.format(at)}</span>
                  <span className="mt-1 block text-xs text-[#64748B]">{dateFormat.format(at)}</span>
                </time>
              </td>
              <td className="px-3 py-3 [overflow-wrap:anywhere]">
                <span className="inline-block rounded border border-[#E2E8F0] px-1.5 py-0.5 text-xs font-medium text-[#475569]">{readable(event.type)}</span>
                {event.product ? <p className="mt-1 text-xs text-[#64748B]">{readable(event.product)}</p> : null}
              </td>
              <td className="px-3 py-3 [overflow-wrap:anywhere]">
                {event.search ? <>
                  {searchTitle ? <p className="font-medium text-[#0F172A]">{searchTitle}</p> : null}
                  <p className={searchTitle ? "mt-1 text-xs text-[#64748B]" : "text-xs text-[#64748B]"}>{readable(event.search.status)} · {event.search.resultCount} results</p>
                </> : <p className="text-xs text-[#64748B]">Search details not recorded</p>}
                {event.sourcePage ? <p className="mt-1.5 break-all text-[11px] leading-4 text-[#64748B]"><span className="mr-1">Source:</span>{event.sourcePage}</p> : null}
              </td>
              <td className="py-3 pl-3 [overflow-wrap:anywhere]">
                {event.provider && event.provider !== event.handoff?.provider ? <p className="mb-1 font-medium text-[#0F172A]">{event.provider}</p> : null}
                {event.handoff ? <div>
                  <p className="font-medium text-[#0F172A]">Handoff → {event.handoff.provider}</p>
                  {event.handoff.destinationDomain ? <p className="mt-1 text-xs">{event.handoff.destinationDomain}</p> : null}
                  <p className="mt-1 text-xs text-[#64748B]">{event.handoff.searchCorrelation === "exact" ? "exact search link" : "search link unavailable"}</p>
                </div> : !event.provider ? <span className="sr-only">No provider recorded</span> : null}
              </td>
            </tr>;
          })}
          {!events.length ? <tr><td colSpan={4} className="py-5 text-[#64748B]">No events recorded in this window.</td></tr> : null}
        </tbody>
      </table>
    </div>
  </section>;
}
