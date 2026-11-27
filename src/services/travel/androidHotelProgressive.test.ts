import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {runInNewContext} from "node:vm";
import ts from "typescript";

const read = (path: string) => readFileSync(path, "utf8");

test("Android progressive Hotel starts with one verified provider page and continues in bounded batches", () => {
  const server = read("src/services/travel/kayakSandbox.ts");
  const route = read("src/app/api/mobile/v1/hotels/progressive/route.ts");
  assert.match(server, /const batchSize = firstPage === 0 \? 1 : 3/);
  assert.match(server, /if \(response\.isComplete === true\) \{ completedPage = response; break; \}/);
  assert.match(server, /if \(offset === total\)/);
  assert.match(server, /if \(count !== pageSize\) throw new KayakError\("invalid_response"\)/);
  assert.match(route, /timingSafeEqual\(expected, actual\)/);
  assert.match(route, /request\.headers\.get\("x-mobile-platform"\) !== "android"/);
  assert.match(route, /hotelSearchSchema\.safeParse/);
  const service = read("src/services/travel/hotelAggregator.ts");
  assert.match(route, /await searchHotelBatch\(search/);
  assert.doesNotMatch(route, /new KayakSandboxClient|kayakHotelCardModel/);
  assert.match(service, /persistHotelProviderResults\)\(cumulative,search,options\.defer,outcome\.results\)/);
  assert.match(route, /state\?\.checkpoint,\{defer:after\}/);
  assert.match(route, /logSearchHistory\(/);
  assert.match(route, /trackAnalyticsEvent\(/);
  assert.match(route, /logProviderCall\(/);
  assert.match(route, /nextCursor, progressive: true/);
});

test("Android Hotel app renders first verified batch and appends only current search pages", () => {
  const api = read("apps/mobile/src/api/travelApi.ts");
  const screen = read("apps/mobile/src/features/search/ApprovedResultsScreen.tsx");
  assert.match(api, /searchHotelsProgressive: \(body:/);
  assert.match(screen, /Platform\.OS === "android"\s*\? await travelApi\.searchHotelsProgressive/);
  assert.match(screen, /setResults\(valid\);/);
  assert.match(screen, /while \(cursor && isCurrent\(\)\)/);
  assert.match(screen, /canonicalResultsWereSilentlyLost\(accepted\)/);
  assert.match(screen, /for \(const hotel of accepted\.accepted\) merged\.set\(hotel\.id, hotel\)/);
  assert.match(screen, /setHotelProgressivePending\(false\)/);
  assert.match(screen, /Loading more hotels/);
  assert.match(screen, /: await travelApi\.searchHotels\(plan\.plan\.payload/);
});

test("Android progressive Hotel returns a generic failure but retains the diagnostic in operational logging", () => {
  const route = read("src/app/api/mobile/v1/hotels/progressive/route.ts");
  assert.match(route, /errorMessage: unavailable/);
  assert.match(route, /NextResponse\.json\(\{ error: "Hotel search is temporarily unavailable\. Please try again\.", status: "unavailable", results: \[\] \}/);
  assert.doesNotMatch(route, /code: unavailable|error: resolved\.reason/);
});

test("actual Android compatibility route delegates additional-provider plans to canonical admission without changing old cursors",async()=>{
  const source=read("src/app/api/mobile/v1/hotels/progressive/route.ts");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exported:{POST?:(request:Request)=>Promise<Response>}={};
  const requests:Request[]=[];
  runInNewContext(compiled,{exports:exported,Request,Response,Headers,URL,require:(name:string)=>{
    if(name==="@/lib/productionSandboxPolicy")return {productionSandboxHost:()=>false};
    if(name==="@/services/travel/hotelAggregator")return {hotelSearchRequiresCanonicalResponse:()=>true,searchHotelBatch:()=>{throw Error("must use central provider plan");}};
    if(name==="@/app/api/hotels/search/route")return {POST:async(request:Request)=>{requests.push(request);return Response.json({results:[{id:"new-provider:fixture"}],status:"available"});}};
    if(name==="next/server")return {NextResponse:{json:Response.json}};
    if(name==="@/lib/feature-controls/service")return {isFeatureEnabled:async()=>false};
    return new Proxy({},{get:()=>()=>{throw Error(`Unexpected compatibility execution: ${name}`);}});
  }});
  const search={destination:"New York",checkIn:"2026-12-25",checkOut:"2026-12-29",guests:2,rooms:1};
  const headers={"x-mobile-platform":"android","user-agent":"KurioticketMobile/fixture (Android; Native) OkHttp","x-sandbox-results-policy":"1","x-search-request-id":"00000000-0000-4000-8000-000000000001"};
  const response=await exported.POST!(new Request("https://fixture.invalid/api/mobile/v1/hotels/progressive",{method:"POST",headers,body:JSON.stringify({search})}));
  assert.equal(response.status,200);assert.equal(requests.length,1);
  assert.deepEqual(await requests[0].json(),search);
  for(const [name,value] of Object.entries(headers))assert.equal(requests[0].headers.get(name),value);
  const continued=await exported.POST!(new Request("https://fixture.invalid/api/mobile/v1/hotels/progressive",{method:"POST",headers,body:JSON.stringify({cursor:"old-signed-cursor"})}));
  assert.equal(continued.status,503,"old cursor remains on its original gated protocol");
  assert.equal(requests.length,1,"a continuation cannot become an unrelated replacement search");
});
