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
        products: [...new Set(rows.map(row => row.product))], providers: [],
        searchCount: rows.filter(row => row.stage === "SEARCH_COMPLETED").length, eventCount: rows.length },
      events: rows.map(row => ({id:row.id,type:row.stage,createdAt:row.at.toISOString(),product:row.product,
        provider:row.provider, search:null,handoff:null,sourcePage:null})),
    }};
  },
};
