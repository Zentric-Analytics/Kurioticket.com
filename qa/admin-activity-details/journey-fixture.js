// QA ONLY: exercise the real Journey detail route with the same labelled records.
import { recorded } from "./activity.js";
export const adminJourneys = {
  async detail(id) {
    const rows = recorded.filter(row => row.journeyId === id).sort((a,b) => a.at-b.at);
    if (!rows.length) return { status: "not_found" };
    return { status: "ok", data: {
      scope: { environment: "staging" }, nextCursor: null,
      journey: { id, identity: {kind:"guest",visitorId:"qa-guest-activity-0001",userId:null},
        startedAt: rows[0].at.toISOString(), firstEventAt: rows[0].at.toISOString(), lastEventAt: rows.at(-1).at.toISOString(),
        products: [...new Set(rows.map(row => row.product))], providers: [...new Set(rows.map(row => row.provider).filter(Boolean))],
        searchCount: rows.filter(row => row.stage === "SEARCH_COMPLETED").length, eventCount: rows.length },
      events: rows.map(row => ({id:row.id,type:row.stage,createdAt:row.at.toISOString(),product:row.product,
        provider:row.provider,
        search: row.searchHistoryId || row.product === "FLIGHT" ? {id:row.searchHistoryId || "qa-flight-search",product:row.product,
          origin:row.product === "FLIGHT" ? "LOS" : null,destination:row.product === "FLIGHT" ? "IST" : "Johannesburg, South Africa",status:"SUCCESS",resultCount:90} : null,
        handoff:row.stage === "PROVIDER_HANDOFF_STARTED" ? {id:row.redirectLogId,provider:row.provider,destinationDomain:"example.invalid",searchCorrelation:"exact"} : null,
        sourcePage:row.stage === "SEARCH_COMPLETED" ? null : row.stage === "OFFER_SELECTED" ? "/flights/details/"+"long-recorded-source-".repeat(8) : "/flights/results"})),
    }};
  },
};
