import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { airports } from "../flow/airportData";
import { destinations, destinationByAirportCode, deriveDestinations } from "./destinationCatalogue";
import { ALL_DESTINATIONS, exactExploreResult, searchExplore } from "./exploreModels";
import { FEATURED_DESTINATIONS } from "./exploreData";
import { DESTINATION_MEDIA, assertDestinationMediaIsValid } from "./destinationMedia";
import { navigateFromDestination, selectFromBrowser } from "./exploreInteractionModels";
import { parseSavedDestinationIds, resolveSavedDestinationIds } from "../../storage/savedDestinationsModel";
import { SavedDestinationsStore } from "../../storage/savedDestinationsStore";

const screen=()=>readFileSync("src/features/explore/ExploreScreen.tsx","utf8");
const result=(query:string)=>searchExplore(query).map((item)=>item.destination);

test("global airports derive a stable, unique, complete destination catalogue",()=>{
 assert.equal(airports.length,248);assert.equal(destinations.length,234);assert.equal(new Set(destinations.map(x=>x.countryCode)).size,162);assert.equal(destinations.filter(x=>x.airportCodes.length>1).length,11);assert.equal(ALL_DESTINATIONS,destinations);
 assert.equal(new Set(destinations.map(x=>x.id)).size,destinations.length);
 assert.equal(new Set(destinations.map(x=>x.countryCode)).size>1,true);
 const codes=destinations.flatMap(x=>x.airportCodes);assert.equal(new Set(codes).size,codes.length);
 for(const d of destinations){assert.match(d.id,/^[a-z]{2}-[a-z0-9-]+$/);assert.match(d.countryCode,/^[A-Z]{2}$/);assert.ok(d.airportCodes.length);assert.ok(d.airportCodes.includes(d.primaryAirportCode));}
 assert.deepEqual(deriveDestinations([...airports].reverse()),destinations);
});
test("metropolitan grouping and maintained naming are correct",()=>{
 const london=destinationByAirportCode.get("LHR")!;for(const code of ["LHR","LGW","LCY","STN","LTN"])assert.equal(destinationByAirportCode.get(code)?.id,london.id);
 assert.equal(destinationByAirportCode.get("CDG")?.id,destinationByAirportCode.get("ORY")?.id);
 assert.equal(destinationByAirportCode.get("DPS")?.name,"Bali");assert.ok(result("Denpasar").some(x=>x.id==="id-bali"));assert.ok(result("Ngurah Rai").some(x=>x.id==="id-bali"));
 assert.equal(destinationByAirportCode.get("IST")?.name,"Istanbul");assert.notEqual(destinationByAirportCode.get("IST")?.name,"Cappadocia");
});
test("search covers names, countries, ISO codes, all airport codes/names, aliases, interests and accents",()=>{
 for(const [q,id] of [["London","gb-london"],["LHR","gb-london"],["Gatwick","gb-london"],["ORY","fr-paris"],["Bali","id-bali"],["DPS","id-bali"],["IST","tr-istanbul"],["Beach escapes","id-bali"]])assert.equal(result(q)[0]?.id,id);
 assert.ok(result("United Kingdom").every(x=>x.countryCode==="GB"));assert.ok(result("GB").every(x=>x.countryCode==="GB"));assert.equal(result("Nigeria").length,airports.filter(x=>x.countryCode==="NG").length);
 assert.deepEqual(searchExplore("sao"),searchExplore("São"));assert.equal(new Set(result("United").map(x=>x.id)).size,result("United").length);
 const ranks=searchExplore("on").map(x=>x.rank);assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b));assert.equal(exactExploreResult(searchExplore("LHR"))?.id,"gb-london");
});
test("featured IDs and media manifest are explicit and valid",()=>{assert.deepEqual(FEATURED_DESTINATIONS.map(x=>x.destination.id),["fr-paris","id-bali","gb-london","us-new-york"]);assert.doesNotThrow(assertDestinationMediaIsValid);assert.equal(DESTINATION_MEDIA.length,4);});
test("saved v1 values migrate to v2 destination IDs safely and idempotently",()=>{
 assert.deepEqual(parseSavedDestinationIds('not json'),[]);assert.deepEqual(parseSavedDestinationIds('["LHR",2,null]'),["LHR"]);
 const migrated=resolveSavedDestinationIds(["LHR","LGW","London","bad","","gb-london"]);assert.deepEqual(migrated,["gb-london"]);assert.deepEqual(resolveSavedDestinationIds(migrated),migrated);assert.equal(resolveSavedDestinationIds(["ORY"])[0],"fr-paris");
});
test("browse all is virtualized and retains action selection",()=>{const x=screen();assert.match(x,/FlatList/);assert.match(x,/data=\{browser\?\.destinations/);assert.match(x,/selectFromBrowser/);assert.match(x,/Browse all destinations/);});
test("handoff closes first, preserves grouped codes, and blocks duplicate navigation",()=>{const d=destinationByAirportCode.get("LHR")!,events:string[]=[],lock={current:false};const nav=(p:string,n:string,h:{airportCodes:readonly string[]})=>events.push(`${p}:${n}:${h.airportCodes.join(",")}`);navigateFromDestination(d,"flights",()=>events.push("close"),nav,lock);navigateFromDestination(d,"flights",()=>events.push("close"),nav,lock);assert.equal(events[0],"close");assert.match(events[1]!,/LHR,LGW,LCY,STN,LTN/);const selection:string[]=[];selectFromBrowser(d,()=>selection.push("close"),x=>selection.push(x.id));assert.deepEqual(selection,["close","gb-london"]);});
test("saved store keeps ordered concurrency protection",async()=>{let persisted:string[]=[];const store=new SavedDestinationsStore(async()=>persisted,async ids=>{persisted=[...ids]});await store.toggle("gb-london");await store.toggle("fr-paris");assert.deepEqual(persisted,["gb-london","fr-paris"]);});
test("Explore remains factual",()=>{const x=screen();for(const claim of ["Best Price","Trending","Top destinations","ranking","deal"])assert.doesNotMatch(x,new RegExp(claim,"i"));});
