import { hotelResultSummary } from "@/lib/hotels/hotelResultAccounting";
import type { AdminJourneyEvent } from "@/services/adminJourneyContract";

import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { journeySearchEditFieldLabels } from "@/lib/search-journey";
const readable = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
const searchStatusLabel = (status: string, resultCount: number) =>
  status === "PARTIAL"
    ? resultCount > 0 ? "Partial provider coverage (results received)" : "Partial provider coverage"
    : readable(status);
const searchCriteria = (search: NonNullable<AdminJourneyEvent["search"]>): string[] => {
  const details = search.details;
  if (!details) return [];
  if (details.product === "FLIGHT") return [
    details.tripType ? "Trip: " + readable(details.tripType) : "",
    details.departureDate ? "Departure: " + details.departureDate : "",
    details.returnDate ? "Return: " + details.returnDate : "",
    details.travelers !== undefined ? "Travelers: " + details.travelers : "",
    details.adults !== undefined ? "Adults: " + details.adults : "",
    details.children !== undefined ? "Children: " + details.children : "",
    details.infants !== undefined ? "Infants: " + details.infants : "",
    details.cabinClass ? "Cabin: " + readable(details.cabinClass) : "",
    ...(details.legs?.map(leg => leg.origin + " → " + leg.destination + " · " + leg.departureDate) ?? []),
  ].filter(Boolean);
  if (details.product === "HOTEL") return [
    details.checkIn ? "Check-in: " + details.checkIn : "",
    details.checkOut ? "Check-out: " + details.checkOut : "",
    details.rooms !== undefined ? "Rooms: " + details.rooms : "",
    details.guests !== undefined ? "Guests: " + details.guests : "",
    details.adults !== undefined ? "Adults: " + details.adults : "",
    details.children !== undefined ? "Children: " + details.children : "",
  ].filter(Boolean);
  return [
    details.pickupDate ? "Pickup: " + details.pickupDate + (details.pickupTime ? " " + details.pickupTime : "") : "",
    details.dropoffDate ? "Return: " + details.dropoffDate + (details.dropoffTime ? " " + details.dropoffTime : "") : "",
    details.driverAge ? "Driver age: " + details.driverAge : "",
  ].filter(Boolean);
};

/** Presentation only: retain the reader's event order and every recorded row. */
export function JourneyEventHistory({ events, timeZone = "UTC" }: { events: AdminJourneyEvent[]; timeZone?: string }) {
  const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone });
  const timeFormat = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone });
  return <section aria-labelledby="journey-history-heading" className="min-w-0">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="journey-history-heading" className="text-[15px] font-semibold text-[#020617]">Event History</h2>
      <p className="text-xs text-[#64748B]">{events.length} recorded {events.length === 1 ? "event" : "events"} in this view · {formatAdminTimeZoneLabel(timeZone)}</p>
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
                <span className="mt-1 inline-flex rounded-md border border-[#D8E1EC] bg-white px-2 py-1 text-[11px] font-medium text-[#475569]">{event.type === "PAGE_VIEW" ? event.pageView?.label ?? "Page visited" : event.type === "RESULTS_VIEWED" ? "Results page viewed" : event.type === "RESULT_SHARED"
                  ? event.action === "share_link_copied" ? "Result link copied" : event.action === "share_sheet_completed" ? "Share sheet completed" : event.action === "share_sheet_requested" ? "Share sheet requested" : "Result shared"
                   : event.type === "PRICE_ALERT_CREATED" ? "Price alert created"
                  : event.type === "RESULT_SAVED"
                    ? event.action === "local_saved" ? "Saved locally" : event.action === "saved_item_confirmed" ? "Saved to account" : "Result saved"
                    : event.type === "RESULT_UNSAVED"
                      ? event.action === "local_unsaved" ? "Removed local save" : event.action === "saved_item_removed" ? "Removed saved item" : "Result unsaved"
                      : event.type === "OFFER_SELECTED" && event.product === "FLIGHT" && event.resultReference && event.sourcePage === "/flight-details"
                        ? "Fare selected"
                      : readable(event.type)}</span>
                {event.product ? <p className="mt-1 text-xs text-[#64748B]">{readable(event.product)}</p> : null}
              </td>
              <td className="px-3 py-3 [overflow-wrap:anywhere]">
                {event.search ? <>
                  {searchTitle ? <p className="font-medium text-[#020617]">{searchTitle}</p> : null}
                  <p className={searchTitle ? "mt-1 text-xs text-[#64748B]" : "text-xs text-[#64748B]"}>Search status: {searchStatusLabel(event.search.status, event.search.resultCount)} · {event.search.product === "HOTEL" ? hotelResultSummary(event.search.resultCount, event.search.hotelPropertyCount) : event.search.resultCount + " results"}</p>
                  {searchCriteria(event.search).length ? <p className="mt-1.5 text-xs leading-5 text-[#475569]">{searchCriteria(event.search).join(" · ")}</p> : null}
                </> : <p className="text-xs text-[#64748B]">Search details not recorded</p>}
                {event.editFields?.length ? <p className="mt-1 text-xs text-[#475569]">Changed fields · {event.editFields.map(field => journeySearchEditFieldLabels[field]).join(", ")}</p> : null}
                {event.filterSelections?.length ? <div className="mt-1 text-xs text-[#475569]">
                  <p className="font-medium">Selected filters (observed on customer device):</p>
                  <ul className="mt-1 space-y-0.5">{event.filterSelections.map((choice, index) =>
                    <li key={`${choice.group}:${choice.option}:${index}`}>{choice.group.replace(/([a-z])([A-Z])/g, "$1 $2")}: {choice.option.replace(/([a-z])([A-Z])/g, "$1 $2")}</li>)}</ul>
                </div> : event.filterGroup ? <p className="mt-1 text-xs text-[#64748B]">Filter category: {readable(event.filterGroup)} · Exact options not recorded</p> : null}
                {event.sortChoice ? <p className="mt-1 text-xs text-[#64748B]">Selected sort: {({
                  best: "Best", cheapest: "Cheapest", fastest: "Fastest", stops: "Fewest stops",
                  bestValue: "Best value", topRated: "Top rated", recommended: "Recommended", lowestTotal: "Lowest total price", price: "Cheapest", duration: "Fastest", "departure-asc": "Earliest departure", "departure-desc": "Latest departure",
                } as Record<string, string>)[event.sortChoice] ?? "Not recorded"}</p>
                  : event.sortMode ? <p className="mt-1 text-xs text-[#64748B]">Sort category: {readable(event.sortMode)}</p> : null}
                {event.observedResult ? <div className="mt-2 space-y-1 rounded-lg border border-[#E7ECF5] px-2.5 py-2 text-xs text-[#334155]">
                  <p className="font-medium text-[#020617]">Result shown when details opened</p>
                  <p>{event.observedResult.label} · {event.observedResult.provider}</p>
                  <p>Displayed quote: {event.observedResult.currency} {event.observedResult.amount.toLocaleString("en", { maximumFractionDigits: 2 })}
                    {event.observedResult.priceBasis === "per_night" ? " per night" : event.observedResult.priceBasis === "per_day" ? " per day" : " total"}</p>
                  {event.observedResult.totalAmount !== undefined ? <p>Displayed total: {event.observedResult.currency} {event.observedResult.totalAmount.toLocaleString("en", { maximumFractionDigits: 2 })}</p> : null}
                  <p className="text-[#64748B]">Captured from the displayed result at this action; not independently confirmed by the provider.</p>
                </div> : null}
                {event.alertDetails ? <div className="mt-2 space-y-1 text-xs text-[#475569]">
                  <p>Alert mode: {event.alertDetails.mode === "TARGET" ? "Target price" : "Automatic price tracking"}</p>
                  <p>Selected target: {event.alertDetails.targetPrice ? `${event.alertDetails.currency} ${event.alertDetails.targetPrice}` : "Not set"}</p>
                  <p>Recorded baseline: {event.alertDetails.baselinePrice ? `${event.alertDetails.currency} ${event.alertDetails.baselinePrice}` : "Not recorded"}</p>
                </div> : null}
                {event.resultReference ? <p className="mt-1.5 break-all text-[11px] leading-4 text-[#64748B]">
                  Recorded result reference: {event.resultReference}
                </p> : null}
                {event.pageView ? <p className="mt-1 text-xs break-all text-[#475569]">{event.pageView.href ? <a href={event.pageView.href} target="_blank" rel="noopener noreferrer" className="text-[#004BB8] underline">{event.pageView.href}</a> : event.pageView.path} · {event.pageView.platform}{event.pageView.originalIdentity === "guest" ? " · Recorded as a guest" : null}</p> : null}
                {event.pageView?.previousPath ? <p className="mt-1 text-xs break-all text-[#475569]">{event.pageView.transport === "native" ? "Previous observed screen" : "Previous observed page"}: {event.pageView.previousPath}</p> : null}
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
