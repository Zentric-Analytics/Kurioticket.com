import assert from "node:assert/strict";import test from "node:test";import type {FlightResult} from "../../api/travelApi";import {activeFlightFilterCount,emptyFlightFilters,filterAndSortFlights,flightFacetCounts,flightFilterDurationMinutes,flightFilterInsight,flightFilterOptions,flightMaximumLayoverMinutes,flightMaximumStops,flightStopBucket,hasPositiveFareFlexibility,matchingFlightCount,timeBucket,withAirlinePreview,withAirportPreview,withStopsPreview,withTimePreview} from "./flightFilters";
const result=(id:string,legs:any[]=[],extra:any={})=>({id,provider:"p",airlineName:extra.airlineName??"Air",originAirport:"LOS",destinationAirport:"ABV",departureTime:"2026-01-01T06:00:00+01:00",arrivalTime:"2026-01-01T07:00:00+01:00",duration:"1h",durationMinutes:60,stops:0,layovers:[],price:extra.price??100,currency:extra.currency??"NGN",valueScore:1,...extra,legs}) as FlightResult;
const leg=(direction:"outbound"|"return"|"leg",index:number,stops:number,departure="2026-01-01T06:00:00+01:00",arrival="2026-01-01T07:00:00+01:00",durationMinutes=60,layovers:any[]=[])=>({direction,legIndex:index,originAirport:index?"ABV":"LOS",destinationAirport:index?"LHR":"ABV",departureTime:departure,arrivalTime:arrival,duration:"1h",durationMinutes,stops,layovers,segments:[]});
test("exact stop buckets use the worst authoritative itinerary leg",()=>{const flights=[0,1,2,3].map(n=>result(String(n),[leg("outbound",0,n)]));assert.equal(matchingFlightCount(flights,emptyFlightFilters()),4);assert.deepEqual(flights.map(flightStopBucket),["nonstop","one","twoPlus","twoPlus"]);assert.deepEqual(filterAndSortFlights(flights,{...emptyFlightFilters(),stops:["nonstop","one"]},"best").map(x=>x.id),["0","1"]);assert.deepEqual(filterAndSortFlights(flights,{...emptyFlightFilters(),stops:["one","twoPlus"]},"best").map(x=>x.id),["1","2","3"]);assert.equal(flightMaximumStops(result("rt",[leg("outbound",0,0),leg("return",1,2)])),2);assert.equal(flightStopBucket(result("rt",[leg("outbound",0,0),leg("return",1,2)])),"twoPlus");assert.equal(flightMaximumStops(result("mc",[leg("leg",0,1),leg("leg",1,3)])),3)});
test("legacy maximum-stop state keeps historical limits until bucket interaction wins",()=>{const flights=[0,1,2,3].map(n=>result(String(n),[leg("outbound",0,n)]));for(const n of [0,1,2])assert.equal(matchingFlightCount(flights,{...emptyFlightFilters(),maxStops:n as 0|1|2}),n+1);assert.equal(matchingFlightCount(flights,{...emptyFlightFilters(),maxStops:0,stops:["twoPlus"]}),2);assert.deepEqual(withStopsPreview({...emptyFlightFilters(),maxStops:1},"twoPlus"),{...emptyFlightFilters(),stops:["twoPlus"]})});
test("time boundaries are provider-local",()=>{for(const [clock,bucket] of [["00:00","overnight"],["05:59","overnight"],["06:00","morning"],["11:59","morning"],["12:00","afternoon"],["17:59","afternoon"],["18:00","evening"],["23:59","evening"]])assert.equal(timeBucket(`2026-01-01T${clock}:00+10:00`),bucket);assert.equal(timeBucket("bad"),undefined)});
test("journey departure and arrival groups OR internally and AND across legs",()=>{const f=result("rt",[leg("outbound",0,0,"2026-01-01T06:00:00Z","2026-01-01T18:00:00Z"),leg("return",1,0,"2026-01-02T12:00:00Z","2026-01-02T23:59:00Z")]);const filters={...emptyFlightFilters(),journeyTimes:{outbound:{departure:["morning","afternoon"] as any,arrival:["evening"] as any},return:{departure:["afternoon"] as any,arrival:[]}}};assert.equal(matchingFlightCount([f],filters),1);assert.equal(matchingFlightCount([f],{...filters,journeyTimes:{...filters.journeyTimes,return:{departure:["morning"] as any,arrival:[]}}}),0)});
test("multi-city journey identities remain independent",()=>{const f=result("mc",[leg("leg",0,0,"2026-01-01T06:00:00Z"),leg("leg",1,0,"2026-01-02T18:00:00Z")]);assert.equal(matchingFlightCount([f],{...emptyFlightFilters(),journeyTimes:{"leg:0":{departure:["morning"],arrival:[]},"leg:1":{departure:["evening"],arrival:[]}}}),1)});
test("travel and layover maxima use longest individual structured value",()=>{const f=result("x",[leg("outbound",0,0,undefined,undefined,60,[{duration:"1h 20m"}]),leg("return",1,1,undefined,undefined,180,[{duration:"bad"},{duration:"4h"}])]);assert.equal(flightFilterDurationMinutes(f),180);assert.equal(flightMaximumLayoverMinutes(f),240);assert.equal(flightMaximumLayoverMinutes(result("nonstop")),0);assert.equal(matchingFlightCount([f],{...emptyFlightFilters(),maximumDuration:179}),0);assert.equal(matchingFlightCount([f],{...emptyFlightFilters(),maximumLayover:240}),1)});
test("price maximum, airlines, composition, sort and immutability",()=>{const source=[result("a",[],{price:100,airlineName:"A"}),result("b",[],{price:200,airlineName:"B"})],snapshot=[...source];assert.equal(matchingFlightCount(source,{...emptyFlightFilters(),maximumPrice:100}),1);assert.equal(matchingFlightCount(source,{...emptyFlightFilters(),airlines:["A","B"]}),2);assert.deepEqual(filterAndSortFlights(source,{...emptyFlightFilters(),airlines:["B"],maximumPrice:200},"price").map(x=>x.id),["b"]);assert.deepEqual(source,snapshot);assert.equal(activeFlightFilterCount({...emptyFlightFilters(),airlines:["A","B"]},{airlines:["A","B"]} as any),0)});
test("stop previews are exact, clear legacy maximums, and preserve other facets",()=>{const flights=[
 result("bd",[leg("outbound",0,0)],{airlineName:"British Airways"}),result("b1",[leg("outbound",0,1)],{airlineName:"British Airways"}),
 result("d0",[leg("outbound",0,0)],{airlineName:"Duffel Airways"}),result("d2",[leg("outbound",0,2)],{airlineName:"Duffel Airways"}),result("d3",[leg("outbound",0,3)],{airlineName:"Duffel Airways"})];
 const all=emptyFlightFilters();assert.deepEqual((["nonstop","one","twoPlus"] as const).map(stop=>flightFilterInsight(flights.slice(0,2).concat(flights.slice(3)),withStopsPreview(all,stop)).count),[1,1,2]);
 const british={...all,airlines:["British Airways"],stops:["one" as const]};assert.equal(flightFilterInsight(flights,withStopsPreview(british,"nonstop")).count,1)
});
test("stop buckets OR together, AND with other facets, and count individually",()=>{const flights=[result("a0",[leg("outbound",0,0)],{airlineName:"A"}),result("a1",[leg("outbound",0,1)],{airlineName:"A"}),result("b2",[leg("outbound",0,2)],{airlineName:"B"})];const stops={...emptyFlightFilters(),stops:["nonstop","one"] as const,airlines:["A"]};assert.deepEqual(filterAndSortFlights(flights,{...stops,stops:[...stops.stops]},"best").map(x=>x.id),["a0","a1"]);assert.equal(activeFlightFilterCount({...stops,stops:[...stops.stops]}),3);assert.deepEqual(emptyFlightFilters().stops,[])});
test("same-facet airline and time previews replace selection while preserving other filters",()=>{const flights=[
 result("bm",[leg("outbound",0,0,"2026-01-01T06:00:00Z","2026-01-01T18:00:00Z")],{airlineName:"British Airways"}),
 result("ba",[leg("outbound",0,0,"2026-01-01T12:00:00Z","2026-01-01T18:00:00Z")],{airlineName:"British Airways"}),
 result("dm",[leg("outbound",0,0,"2026-01-01T06:00:00Z","2026-01-01T18:00:00Z")],{airlineName:"Duffel Airways"})];
 const draft={...emptyFlightFilters(),airlines:["British Airways"],journeyTimes:{outbound:{departure:["morning","afternoon"] as any,arrival:["evening"] as any}},maxStops:0 as const};
 assert.equal(flightFilterInsight(flights,withAirlinePreview(draft,"Duffel Airways")).count,1);
 assert.equal(flightFilterInsight(flights,withTimePreview(draft,"outbound","departure","morning")).count,1)
});
test("insight counts every match but takes only the lowest finite comparable price",()=>{const flights=[result("a",[],{price:100}),result("b",[],{price:125}),result("c",[],{price:180})];assert.deepEqual(flightFilterInsight(flights,emptyFlightFilters(),x=>x.price),{count:3,lowestPrice:100});assert.deepEqual(flightFilterInsight(flights.slice(0,2),emptyFlightFilters(),x=>x.id==="a"?null:125),{count:2,lowestPrice:125});assert.deepEqual(flightFilterInsight(flights,emptyFlightFilters()),{count:3,lowestPrice:null})});
test("continuous takeoff and landing maxima stay provider-local and independent by journey",()=>{const early=result("early",[leg("outbound",0,0,"2026-01-01T06:15:00+10:00","2026-01-01T08:30:00+10:00"),leg("return",1,0,"2026-01-02T18:00:00-05:00","2026-01-02T20:00:00-05:00")]);const late=result("late",[leg("outbound",0,0,"2026-01-01T12:00:00+10:00","2026-01-01T14:00:00+10:00"),leg("return",1,0,"2026-01-02T09:00:00-05:00","2026-01-02T11:00:00-05:00")]);assert.equal(matchingFlightCount([early,late],{...emptyFlightFilters(),journeyTimeMaximums:{outbound:{departure:600,arrival:null}}}),1);assert.equal(matchingFlightCount([early,late],{...emptyFlightFilters(),journeyTimeMaximums:{outbound:{departure:null,arrival:900},return:{departure:600,arrival:null}}}),1);assert.equal(activeFlightFilterCount({...emptyFlightFilters(),journeyTimeMaximums:{outbound:{departure:600,arrival:900}}}),2)});
test("inactive journey time maxima do not require a matching structured leg",()=>{const fallbackOnly=result("fallback",[]);const partial=result("partial",[leg("outbound",0,0)]);const clearedReturn={...emptyFlightFilters(),journeyTimeMaximums:{return:{departure:null,arrival:null}}};assert.equal(activeFlightFilterCount(clearedReturn),0);assert.equal(matchingFlightCount([fallbackOnly,partial],clearedReturn),2);assert.equal(matchingFlightCount([partial],{...emptyFlightFilters(),journeyTimeMaximums:{return:{departure:600,arrival:null}}}),0)});

test("multi-city airport options contain every journey endpoint but no segment connection",()=>{const legs=[leg("leg",0,0),leg("leg",1,0),leg("leg",2,0)];Object.assign(legs[0],{originAirport:"LOS",destinationAirport:"LHR",segments:[{originAirport:"LOS",destinationAirport:"ACC"},{originAirport:"ACC",destinationAirport:"LHR"}]});Object.assign(legs[1],{originAirport:"LHR",destinationAirport:"JFK"});Object.assign(legs[2],{originAirport:"JFK",destinationAirport:"LAX"});const options=flightFilterOptions([result("mc",legs)]);assert.deepEqual(options.fromAirports,["JFK","LHR","LOS"]);assert.deepEqual(options.toAirports,["JFK","LAX","LHR"]);assert.equal(options.fromAirports.includes("ACC"),false);assert.equal(options.toAirports.includes("ACC"),false)});
test("multi-city airport matching uses ANY within a facet and AND between facets",()=>{const legs=[leg("leg",0,0),leg("leg",1,0),leg("leg",2,0)];Object.assign(legs[0],{originAirport:"LOS",destinationAirport:"LHR"});Object.assign(legs[1],{originAirport:"LHR",destinationAirport:"JFK"});Object.assign(legs[2],{originAirport:"JFK",destinationAirport:"LAX"});const flight=result("mc",legs),all=emptyFlightFilters();assert.equal(matchingFlightCount([flight],{...all,fromAirports:["JFK"]}),1);assert.equal(matchingFlightCount([flight],{...all,toAirports:["LAX"]}),1);assert.equal(matchingFlightCount([flight],{...all,fromAirports:["ABV"]}),0);assert.equal(matchingFlightCount([flight],{...all,toAirports:["ABV"]}),0);assert.equal(matchingFlightCount([flight],{...all,fromAirports:["ABV","JFK"],toAirports:["LAX"]}),1);assert.equal(matchingFlightCount([flight],{...all,fromAirports:["JFK"],toAirports:["ABV"]}),0)});
test("airport preview and facet counts use the same multi-city predicate",()=>{const legs=[leg("leg",0,0),leg("leg",1,0)];Object.assign(legs[0],{originAirport:"LOS",destinationAirport:"LHR"});Object.assign(legs[1],{originAirport:"LHR",destinationAirport:"JFK"});const flights=[result("mc",legs),result("ow")],filters=emptyFlightFilters();assert.equal(flightFilterInsight(flights,withAirportPreview(filters,"fromAirports","LHR")).count,1);assert.equal(flightFacetCounts(flights,filters).fromAirports.LHR,1)});
test("one-way and round-trip airport facets retain top-level endpoint semantics",()=>{const roundTrip=result("rt",[leg("outbound",0,0),leg("return",1,0)]);assert.deepEqual(flightFilterOptions([roundTrip]).fromAirports,["LOS"]);assert.deepEqual(flightFilterOptions([roundTrip]).toAirports,["ABV"]);assert.equal(matchingFlightCount([roundTrip],{...emptyFlightFilters(),fromAirports:["ABV"]}),0);assert.equal(matchingFlightCount([result("ow")],{...emptyFlightFilters(),fromAirports:["LOS"],toAirports:["ABV"]}),1)});

test("authoritative journey duration drives one-way, round-trip, and multi-city filtering and sorting", () => {
  const oneWay = result("one-way", [leg("outbound", 0, 0, undefined, undefined, 120)], { durationMinutes: 10 });
  const oneWaySlower = result("one-way-slower", [leg("outbound", 0, 0, undefined, undefined, 180)], { durationMinutes: 5 });
  assert.equal(flightFilterDurationMinutes(oneWay), 120);
  assert.deepEqual(filterAndSortFlights([oneWaySlower, oneWay], { ...emptyFlightFilters(), maximumDuration: 150 }, "duration").map(({ id }) => id), ["one-way"]);
  assert.deepEqual(filterAndSortFlights([oneWaySlower, oneWay], emptyFlightFilters(), "duration").map(({ id }) => id), ["one-way", "one-way-slower"]);

  const roundTripA = result("round-trip-a", [leg("outbound", 0, 0, undefined, undefined, 60), leg("return", 1, 0, undefined, undefined, 300)], { durationMinutes: 60 });
  const roundTripB = result("round-trip-b", [leg("outbound", 0, 0, undefined, undefined, 180), leg("return", 1, 0, undefined, undefined, 180)], { durationMinutes: 180 });
  assert.deepEqual([roundTripA, roundTripB].map(flightFilterDurationMinutes), [300, 180]);
  assert.deepEqual(filterAndSortFlights([roundTripA, roundTripB], { ...emptyFlightFilters(), maximumDuration: 200 }, "duration").map(({ id }) => id), ["round-trip-b"]);
  assert.deepEqual(filterAndSortFlights([roundTripA, roundTripB], emptyFlightFilters(), "duration").map(({ id }) => id), ["round-trip-b", "round-trip-a"]);

  const multiCityAggregateShorter = result("multi-city-aggregate-shorter", [leg("leg", 0, 0, undefined, undefined, 60), leg("leg", 1, 0, undefined, undefined, 300), leg("leg", 2, 0, undefined, undefined, 60)], { durationMinutes: 420 });
  const multiCityLongestShorter = result("multi-city-longest-shorter", [leg("leg", 0, 0, undefined, undefined, 180), leg("leg", 1, 0, undefined, undefined, 180), leg("leg", 2, 0, undefined, undefined, 180)], { durationMinutes: 540 });
  assert.deepEqual([multiCityAggregateShorter, multiCityLongestShorter].map(flightFilterDurationMinutes), [300, 180]);
  assert.deepEqual(filterAndSortFlights([multiCityAggregateShorter, multiCityLongestShorter], { ...emptyFlightFilters(), maximumDuration: 200 }, "duration").map(({ id }) => id), ["multi-city-longest-shorter"]);
  assert.deepEqual(filterAndSortFlights([multiCityAggregateShorter, multiCityLongestShorter], emptyFlightFilters(), "duration").map(({ id }) => id), ["multi-city-longest-shorter", "multi-city-aggregate-shorter"]);
});

test("duration fallback, invalid safety, stable ties, and immutable sorting are preserved", () => {
  const legacy = result("legacy", [], { durationMinutes: 75 });
  const invalid = result("invalid", [], { durationMinutes: Number.NaN });
  const negative = result("negative", [], { durationMinutes: -1 });
  const tiedFirst = result("tied-first", [leg("outbound", 0, 0, undefined, undefined, 90)], { durationMinutes: 1 });
  const tiedSecond = result("tied-second", [leg("outbound", 0, 0, undefined, undefined, 90)], { durationMinutes: 999 });
  const input = [invalid, tiedFirst, tiedSecond, legacy, negative];
  const before = input.slice();
  assert.equal(flightFilterDurationMinutes(legacy), 75);
  assert.equal(flightFilterDurationMinutes(invalid), null);
  assert.equal(flightFilterDurationMinutes(negative), null);
  assert.deepEqual(filterAndSortFlights(input, emptyFlightFilters(), "duration").map(({ id }) => id), ["legacy", "tied-first", "tied-second", "invalid", "negative"]);
  assert.deepEqual(input, before);
});

test("Flexible / refundable uses only positive structured refund or change terms", () => {
  const fare = (id: string, fareTerms?: FlightResult["fareTerms"], refundInfo = "") => result(id, [], { fareTerms, refundInfo });
  const positive = (category: "refund" | "change") => ({ category, semantic: "positive" as const, text: "provider term" });
  const negative = (category: "refund" | "change") => ({ category, semantic: "negative" as const, text: "provider term" });
  const informational = (category: "refund" | "change") => ({ category, semantic: "informational" as const, text: "provider term" });
  const fares = [
    fare("refund-positive", [positive("refund"), negative("change")]),
    fare("change-positive", [negative("refund"), positive("change")]),
    fare("both-positive", [positive("refund"), positive("change")]),
    fare("both-negative", [negative("refund"), negative("change")]),
    fare("informational", [informational("refund"), informational("change")]),
    fare("missing"),
    fare("misleading-text", undefined, "Not refundable before departure"),
  ];
  assert.deepEqual(fares.map(hasPositiveFareFlexibility), [true, true, true, false, false, false, false]);
  const filters = { ...emptyFlightFilters(), refundable: true };
  const filtered = filterAndSortFlights(fares, filters, "best");
  assert.deepEqual(filtered.map(({ id }) => id), ["refund-positive", "change-positive", "both-positive"]);
  assert.equal(matchingFlightCount(fares, filters), filtered.length);
  assert.equal(flightFilterInsight(fares, filters, (flight) => flight.price).count, filtered.length);
});

test("Flexible / refundable availability shares the matching predicate and baggage stays separate", () => {
  const changeable = result("changeable", [], { fareTerms: [
    { category: "refund", semantic: "negative", text: "Not refundable" },
    { category: "change", semantic: "positive", text: "Changes allowed" },
  ] });
  const baggageOnly = result("bag", [], { fareTerms: [{ category: "baggage", semantic: "positive", text: "Bag included" }] });
  assert.equal(flightFilterOptions([changeable]).refundable, true);
  assert.equal(flightFilterOptions([changeable]).baggage, false);
  assert.equal(flightFilterOptions([baggageOnly]).refundable, false);
  assert.equal(flightFilterOptions([baggageOnly]).baggage, true);
});
