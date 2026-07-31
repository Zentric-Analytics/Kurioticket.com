import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airports } from "../flow/airportData";
import { countries, destinationCardLayout, exploreBottomPadding, REGION_BY_AIRPORT, regions, searchExplore } from "./exploreModels";
import { parseSavedDestinationIds, resolveSavedDestinationIds } from "../../storage/savedDestinationsModel";
const screen=()=>readFileSync("src/features/explore/ExploreScreen.tsx","utf8");

test("Explore search handles empty, exact, partial, code, countries, aliases, interests and unknown terms",()=>{
 assert.deepEqual(searchExplore(""),[]); assert.equal(searchExplore(" Paris ")[0]?.airport.code,"CDG");
 assert.equal(searchExplore("lon")[0]?.airport.code,"LHR"); assert.equal(searchExplore("dxb")[0]?.airport.city,"Dubai");
 assert.deepEqual(searchExplore("France").map(x=>x.airport.code),["CDG"]);
 assert.deepEqual(searchExplore("USA").map(x=>x.airport.code),["LAX","JFK"]);
 assert.deepEqual(searchExplore("United   States").map(x=>x.airport.code),["LAX","JFK"]);
 assert.equal(searchExplore("Beaches")[0]?.match,"interest"); assert.deepEqual(searchExplore("unknown"),[]);
});
test("ranking is exact, prefix, contains and deterministic",()=>{const r=searchExplore("on");assert.ok(r.every((x,i)=>i===0||r[i-1]!.rank<=x.rank));assert.deepEqual(searchExplore("usa"),searchExplore("USA"));});
test("saved identifiers migrate legacy cities and discard malformed or unknown data",()=>{
 assert.deepEqual(resolveSavedDestinationIds(parseSavedDestinationIds('["Paris","DXB","unknown",42]')),["CDG","DXB"]);
 assert.deepEqual(parseSavedDestinationIds("bad"),[]); assert.deepEqual(resolveSavedDestinationIds(["New York","JFK"]),["JFK"]);
});
test("countries and maintained regions cover the current catalogue",()=>{
 assert.equal(Object.keys(REGION_BY_AIRPORT).length,airports.length); assert.equal(countries().flatMap(x=>x.destinations).length,airports.length); assert.equal(regions().flatMap(x=>x.destinations).length,airports.length);
 assert.equal(countries().find(x=>x.name==="United States")?.destinations.length,2); assert.equal(REGION_BY_AIRPORT.IST,"Türkiye (catalogue grouping)");
});
test("responsive calculations support narrow phones and tab clearance",()=>{for(const w of [320,360,400]){const x=destinationCardLayout(w);assert.ok(x.cardWidth<w-36);assert.equal(x.snapInterval,x.cardWidth+x.gap);}assert.equal(exploreBottomPadding(65,24),107);});
test("destination actions and discovery surfaces use supported routes",()=>{const x=screen();for(const route of ["/flights","/hotels","/cars","/price-alerts"])assert.match(x,new RegExp(route));assert.match(x,/Destination actions/);assert.match(x,/Browse countries/);assert.match(x,/Browse regions/);assert.match(x,/Saved destinations/);assert.match(x,/Compare/);assert.doesNotMatch(x,/destination-detail|Coming soon|onPress=\{\(\) => undefined\}/);});
test("catalogue and inspiration remain truthful",()=>{const x=screen();assert.match(x,/destinations:airports/);assert.match(x,/Interest match/);assert.match(x,/Explore \{slide.destination\}/);assert.equal((x.match(/Quick destinations/g)||[]).length,1);assert.doesNotMatch(x,/destination.*Anywhere|Best Price|Trending|Top destinations/i);});
test("Hotels reads destination params while preserving editable state and result navigation",()=>{const x=readFileSync("src/features/flow/ProductScreens.tsx","utf8");assert.match(x,/initialDestination = Array\.isArray\(params\.destination\)/);assert.match(x,/useState\(initialDestination \?\? ""\)/);assert.match(x,/onChangeText=\{setDestination\}/);assert.match(x,/pathname: "\/hotel-results", params: \{ destination: destination\.trim\(\)/);});
