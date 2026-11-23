import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { combinedSearchState } from "./combinedSearchState";
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProviderSearchStatus } from "./KayakResultsContext";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("all providers settle before combined offers are revealed", () => {
  assert.equal(combinedSearchState(2,["success","loading"]),"loading");
  for (const status of ["success","error","needs-input"] as const) {
    assert.equal(combinedSearchState(2,["success",status]),"results");
  }
});
test("zero offers are empty only after all providers finish successfully", () => {
  assert.equal(combinedSearchState(0,["success","success"]),"empty");
  assert.equal(combinedSearchState(0,["success","loading"]),"loading");
  assert.equal(combinedSearchState(0,["error","loading"]),"loading");
  assert.equal(combinedSearchState(0,["success","error"]),"error");
  assert.equal(combinedSearchState(0,["error","success"]),"error");
  assert.equal(combinedSearchState(0,["success","needs-input"]),"needs-input");
});
test("client-combined search screens use combined empty-state handling", () => {
  for (const name of ["FlightResultsClient","CarsResultsClient"]) {
    assert.match(readFileSync(`src/components/results/${name}.tsx`,"utf8"),/<CombinedSearchEmpty otherStatus=/);
  }
});

test("Hotels waits for the server-combined result before rendering an empty or failed search", () => {
  const client = readFileSync("src/components/results/HotelResultsClient.tsx", "utf8");
  const aggregate = readFileSync("src/services/travel/hotelAggregator.ts", "utf8");
  assert.match(aggregate, /const kayak = await \(options\.dependencies\?\.searchKayak \?\? searchKayakHotels\)/);
  assert.match(aggregate, /dedupeHotels\(kayak\.results\)/);
  assert.doesNotMatch(aggregate, /buildStaticHotelResults/);
  assert.match(client, /fetch\("\/api\/hotels\/search"/);
  assert.match(client, /readHotelSearchResponse\(response, t\("hotelResults\.searchUnavailableDetailed"\),/);
  const responseReader = readFileSync("src/lib/search/readHotelSearchResponse.ts", "utf8");
  assert.match(responseReader, /warningCategory\s*=== "provider_unavailable"/);
  assert.match(client, /setResults\(data\.results\)/);
  assert.match(client, /error && results\.length === 0/);
  assert.match(client, /hotelResults\.noStaysMatchFiltersInline/);
});

test("combined empty screen renders generic loading, failure and completed-empty messages", () => {
  for (const status of ["loading","success","error","needs-input"] as ProviderSearchStatus[]) {
    const source = readFileSync("src/components/results/CombinedSearchEmpty.tsx","utf8");
    const compiled = ts.transpileModule(source.replace(/^import .*;\r?$/gm,"").replace("export function","function"),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;
    const Component = runInNewContext(`${compiled}\nCombinedSearchEmpty`,{React,combinedSearchState,useKayakResults:()=>({status})});
    const html = renderToStaticMarkup(createElement(Component,{otherStatus:"success",retry:()=>{}}));
    assert.doesNotMatch(html,/KAYAK|provider/);
    assert.equal(html.includes("No results found"),status === "success");
    assert.equal(html.includes("Retry search"),status === "error");
    assert.equal(html.includes('role="alert"'),status === "error");
  }
});
