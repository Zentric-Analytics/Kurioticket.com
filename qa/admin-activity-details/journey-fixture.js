// QA ONLY: exercise the real Journey detail route with the same labelled records.
import { recorded } from "./activity.js";
const journeyStages = ["SEARCH_COMPLETED","RESULTS_VIEWED","OFFER_SELECTED","PROVIDER_HANDOFF_STARTED"];
function scopedRows(scope) {
  const from = scope.from ? new Date(scope.from).getTime() : -Infinity;
  const to = scope.to ? new Date(scope.to).getTime() : Infinity;
  return recorded.filter(row => row.journeyId
    && row.at.getTime() >= from && row.at.getTime() < to
    && (!scope.product || row.product === scope.product)
    && (!scope.stage || row.stage === scope.stage));
}
function summaryRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const previous = grouped.get(row.journeyId) ?? {
      id:row.journeyId, startedAt:row.journeyStartedAt?.toISOString() ?? row.at.toISOString(),
      lastEventAt:row.at.toISOString(), products:[], providers:[],providerCount:0,
      searchCount:0,eventCount:0,
      stages:Object.fromEntries(journeyStages.map(key=>[key,0])),
    };
    previous.eventCount++;
    if(row.stage === "SEARCH_COMPLETED") previous.searchCount++;
    if(journeyStages.includes(row.stage)) previous.stages[row.stage]++;
    if(row.product && !previous.products.includes(row.product)) previous.products.push(row.product);
    if(row.provider && !previous.providers.includes(row.provider)) previous.providers.push(row.provider);
    if(new Date(previous.lastEventAt) < row.at) previous.lastEventAt=row.at.toISOString();
    previous.providerCount=previous.providers.length;
    grouped.set(row.journeyId,previous);
  }
  return [...grouped.values()].sort((a,b)=>Date.parse(b.lastEventAt)-Date.parse(a.lastEventAt));
}
export const adminJourneys = {
  async list(input) {
    const scope = {
      from:input.from, to:input.to, environment:input.environment,
      identity:input.identity, ...(input.userId ? {userId:input.userId} : {}),
      ...(input.visitorId ? {visitorId:input.visitorId} : {}),
      ...(input.product ? {product:input.product} : {}),
      ...(input.stage ? {stage:input.stage} : {}),
    };
    return {status:"ok",data:{scope,items:summaryRows(scopedRows(scope)),nextCursor:null}};
  },
  async summary(scope) {
    const rows = scopedRows(scope);
    const grouped = summaryRows(rows);
    const stageCounts = Object.fromEntries(journeyStages.map(stage=>[stage,{
      identities:1,journeys:grouped.filter(x=>x.stages[stage]>0).length,
      events:rows.filter(x=>x.stage===stage).length,
    }]));
    return {status:"ok",data:{
      scope,journeys:grouped.length,
      recordedSearches:{total:rows.filter(x=>x.stage==="SEARCH_COMPLETED").length},
      stages:stageCounts,
    }};
  },
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
