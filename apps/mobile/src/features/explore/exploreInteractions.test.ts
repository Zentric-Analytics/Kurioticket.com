import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
import { ALL_DESTINATIONS, countries, destinationCardLayout, exactExploreResult, EXPLORE_TABS, exploreBottomPadding, REGION_BY_AIRPORT, regions, searchExplore } from "./exploreModels";
import { INTEREST_DESTINATIONS } from "./interestMappings";
import { parseSavedDestinationIds, resolveSavedDestinationIds } from "../../storage/savedDestinationsModel";
import { SavedDestinationsStore } from "../../storage/savedDestinationsStore";
import { navigateFromDestination, selectFromBrowser } from "./exploreInteractionModels";
const screen=()=>readFileSync("src/features/explore/ExploreScreen.tsx","utf8");

test("Explore search handles empty, exact, partial, code, countries, aliases, interests and unknown terms",()=>{
 assert.deepEqual(searchExplore(""),[]); assert.equal(searchExplore(" Paris ")[0]?.airport.code,"CDG");
 assert.equal(searchExplore("lon")[0]?.airport.code,"LHR"); assert.equal(searchExplore("dxb")[0]?.airport.city,"Dubai");
 assert.deepEqual(searchExplore("France").map(x=>x.airport.code),["CDG"]);
 assert.deepEqual(searchExplore("USA").map(x=>x.airport.code),["LAX","JFK"]);
 assert.deepEqual(searchExplore("United   States").map(x=>x.airport.code),["LAX","JFK"]);
 for(const query of ["United","United St","States"]){const codes=searchExplore(query).map(x=>x.airport.code);assert.ok(codes.includes("LAX"));assert.ok(codes.includes("JFK"));}
 {const codes=searchExplore("United").map(x=>x.airport.code);assert.equal(new Set(codes).size,codes.length);}
 assert.equal(searchExplore("Beach escapes")[0]?.match,"interest"); assert.deepEqual(searchExplore("unknown"),[]);
});
test("ranking is exact, prefix, contains and deterministic",()=>{const r=searchExplore("on");assert.ok(r.every((x,i)=>i===0||r[i-1]!.rank<=x.rank));assert.deepEqual(searchExplore("usa"),searchExplore("USA"));});
test("exact search submission only resolves one exact result",()=>{assert.equal(exactExploreResult(searchExplore("Paris"))?.code,"CDG");assert.equal(exactExploreResult(searchExplore("Par")),undefined);assert.equal(exactExploreResult([]),undefined);});
test("country, code, and interest searches remain supported",()=>{
 assert.deepEqual(searchExplore("United Kingdom").map(x=>x.airport.code),["LHR"]);
 assert.deepEqual(searchExplore("Dubai").map(x=>x.airport.code),["DXB"]);
 assert.equal(searchExplore("Beach escapes")[0]?.match,"interest");
});
test("saved identifiers migrate legacy cities and discard malformed or unknown data",()=>{
 assert.deepEqual(resolveSavedDestinationIds(parseSavedDestinationIds('["Paris","DXB","unknown",42]')),["CDG","DXB"]);
 assert.deepEqual(parseSavedDestinationIds("bad"),[]); assert.deepEqual(resolveSavedDestinationIds(["New York","JFK"]),["JFK"]);
});
test("countries and maintained regions cover the current catalogue",()=>{
 assert.equal(Object.keys(REGION_BY_AIRPORT).length,airports.length); assert.equal(countries().flatMap(x=>x.destinations).length,airports.length); assert.equal(regions().flatMap(x=>x.destinations).length,airports.length);
 assert.equal(countries().find(x=>x.name==="United States")?.destinations.length,2); assert.equal(REGION_BY_AIRPORT.IST,"Türkiye (catalogue grouping)");
});
test("responsive calculations support narrow phones and tab clearance",()=>{for(const w of [320,360,400]){const x=destinationCardLayout(w);assert.ok(x.cardWidth<w-36);assert.equal(x.snapInterval,x.cardWidth+x.gap);}assert.equal(exploreBottomPadding(65,24),107);});
test("Explore exposes only the focused tabs",()=>{assert.deepEqual(EXPLORE_TABS,["Destinations","Inspiration"]);});
test("removed discovery and header actions are absent",()=>{const x=screen();for(const copy of ["Compare","Price alerts","Quick destinations","Explore more","Browse countries","Browse regions","Track prices","Explore destinations using the maintained interests above."])assert.doesNotMatch(x,new RegExp(copy,"i"));});
test("destination actions retain only supported planning routes",()=>{const x=screen();assert.match(x,/Destination actions/);assert.match(x,/label="Search flights"/);assert.match(x,/label="Search hotels"/);assert.match(x,/Save destination/);assert.match(x,/Remove from saved destinations/);assert.doesNotMatch(x,/destination-detail|Coming soon|onPress=\{\(\) => undefined\}|\/cars|\/price-alerts/);});
test("Browse all uses the complete current catalogue",()=>{assert.equal(ALL_DESTINATIONS,airports);assert.equal(ALL_DESTINATIONS.length,airports.length);const x=screen();assert.match(x,/Browse all destinations/);assert.match(x,/destinations:ALL_DESTINATIONS/);});
test("catalogue and inspiration remain truthful",()=>{const x=screen();assert.match(x,/Interest match/);assert.match(x,/Explore \{slide.destination\}/);for(const [interest,city] of INTEREST_DESTINATIONS){assert.equal(searchExplore(interest)[0]?.airport.city,city);assert.ok(airports.some(airport=>airport.city===city));}assert.doesNotMatch(x,/destination.*Anywhere|Best Price|Trending|Top destinations|Popular|deal|ranking|price/i);});
test("Hotels delegates complete route state and featured selections to its focused panel",()=>{const x=readFileSync("src/features/flow/ProductScreens.tsx","utf8");assert.match(x,/checkIn\?: string \| string\[\]/);assert.match(x,/<HotelSearchPanel ref=\{panel\} params=\{params\}/);assert.match(x,/panel\.current\?\.useDestination\(destination\)/);});

const deferred=<T>()=>{let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((ok,no)=>{resolve=ok;reject=no});return {promise,resolve,reject}};
test("a stale read cannot replace a newer optimistic toggle",async()=>{
 const read=deferred<string[]>(),writes:string[][]=[];const store=new SavedDestinationsStore(()=>read.promise,async ids=>{writes.push([...ids])});
 const refreshing=store.refresh();await Promise.resolve();await store.toggle("CDG");read.resolve([]);await refreshing;
 assert.deepEqual([...store.snapshot()],["CDG"]);assert.deepEqual(writes,[["CDG"]]);
});
test("a focus refresh waits for a pending write",async()=>{
 let stored:string[]=[];const write=deferred<void>();const store=new SavedDestinationsStore(async()=>stored,async ids=>{await write.promise;stored=[...ids]});
 const saving=store.toggle("CDG");const refresh=store.refresh();assert.deepEqual([...store.snapshot()],["CDG"]);
 write.resolve();await saving;await refresh;assert.deepEqual([...store.snapshot()],["CDG"]);
});
test("rapid toggles and saves serialize final intent",async()=>{
 let stored:string[]=[];const store=new SavedDestinationsStore(async()=>stored,async ids=>{stored=[...ids]});
 await Promise.all([store.toggle("CDG").catch(()=>undefined),store.toggle("CDG").catch(()=>undefined)]);assert.deepEqual(stored,[]);
 await Promise.all([store.toggle("CDG"),store.toggle("DXB")]);assert.deepEqual(new Set(stored),new Set(["CDG","DXB"]));
});
test("failed writes reconcile and later actions recover",async()=>{
 let stored:string[]=[];let fail=true;const store=new SavedDestinationsStore(async()=>stored,async ids=>{if(fail){fail=false;throw new Error("write failed")}stored=[...ids]});
 await assert.rejects(store.toggle("CDG"));await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual([...store.snapshot()],[]);
 await store.toggle("DXB");assert.deepEqual(stored,["DXB"]);
});
test("subscribers share updates and unsubscribed consumers stop receiving them",async()=>{
 const store=new SavedDestinationsStore(async()=>[],async()=>undefined);const first:string[][]=[],second:string[][]=[];
 store.subscribe(ids=>first.push([...ids]));const unsubscribe=store.subscribe(ids=>second.push([...ids]));await store.toggle("CDG");unsubscribe();await store.toggle("DXB");
 assert.deepEqual(first,[["CDG"],["CDG","DXB"]]);assert.deepEqual(second,[["CDG"]]);
});
test("destination navigation captures params and closes first",()=>{
 const airport=airports.find(item=>item.code==="CDG")!;for(const product of ["flights","hotels"] as const){const events:string[]=[],lock={current:false};navigateFromDestination(airport,product,()=>events.push("close"),(route,destination)=>events.push(`${route}:${destination}`),lock);navigateFromDestination(airport,product,()=>events.push("close"),(route,destination)=>events.push(`${route}:${destination}`),lock);assert.deepEqual(events,["close",`${product}:Paris`]);}
});
test("browser selection closes before opening destination actions",()=>{
 const events:string[]=[];selectFromBrowser(airports[0]!,()=>events.push("close"),airport=>events.push(`open:${airport.code}`));assert.deepEqual(events,["close",`open:${airports[0]!.code}`]);
});
test("browser selection can defer actions until its close render is scheduled",()=>{
 const events:string[]=[],scheduled:(()=>void)[]=[];selectFromBrowser(airports[0]!,()=>events.push("close"),airport=>events.push(`open:${airport.code}`),open=>scheduled.push(open));assert.deepEqual(events,["close"]);scheduled[0]?.();assert.deepEqual(events,["close",`open:${airports[0]!.code}`]);
});
