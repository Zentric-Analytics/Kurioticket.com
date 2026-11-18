// Synthetic test-only Journeys records. Never load real account or visitor data.
const scope = {
  from: "2026-11-10T00:00:00.000Z",
  to: "2026-11-18T00:00:00.000Z",
  environment: "staging",
  identity: "all",
};
function record({id,identity,products,providers,stages,at,eventCount,searchCount}) {
  return {
    id, identity, products, providers, providerCount: providers.length,
    stages: {
      SEARCH_COMPLETED: stages[0], RESULTS_VIEWED: stages[1],
      OFFER_SELECTED: stages[2], PROVIDER_HANDOFF_STARTED: stages[3],
    },
    lastEventAt: at, firstEventAt: "2026-11-16T06:00:00.000Z",
    startedAt: "2026-11-16T06:00:00.000Z",
    eventCount, searchCount,
  };
}
const items = [
  record({id:"qa-journey-0001",
    identity:{kind:"guest",visitorId:"qa-guest-visitor-0001-extended-identifier",userId:null},
    products:["FLIGHT","HOTEL"],providers:["KAYAK sandbox","Mytip"],
    stages:[2,2,4,2],at:"2026-11-17T19:09:00.000Z",eventCount:10,searchCount:2}),
  record({id:"qa-journey-0002",
    identity:{kind:"registered",visitorId:"qa-visitor-0002",userId:"qa-registered-user-0002-extended-identifier"},
    products:["FLIGHT","HOTEL","CAR"],
    providers:["CheapOair","Duffel","KAYAK sandbox","Priceline"],
    stages:[8,6,10,4],at:"2026-11-17T11:12:00.000Z",eventCount:28,searchCount:8}),
  record({id:"qa-journey-0003",
    identity:{kind:"guest",visitorId:"qa-guest-visitor-0003",userId:null},
    products:["FLIGHT"],providers:[],stages:[1,0,0,0],
    at:"2026-11-17T07:58:00.000Z",eventCount:1,searchCount:1}),
  record({id:"qa-journey-0004",
    identity:{kind:"guest",visitorId:"qa-guest-visitor-0004",userId:null},
    products:["CAR","FLIGHT","HOTEL"],providers:["KAYAK sandbox","Priceline"],
    stages:[3,3,5,2],at:"2026-11-16T08:49:00.000Z",eventCount:13,searchCount:3}),
];
export const adminJourneys = {
  async list() { return {status:"ok",data:{scope,items,nextCursor:null}}; },
  async summary() { return {status:"ok",data:{
    journeys:items.length, recordedSearches:{total:14},
    stages:{RESULTS_VIEWED:{events:11},OFFER_SELECTED:{events:19},PROVIDER_HANDOFF_STARTED:{events:8}},
    operationalHandoffs:{total:20,inConsentedJourneys:8,outsideConsentedJourneys:12},
  }}; },
};
