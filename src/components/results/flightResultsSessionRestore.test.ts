import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const resultsClientPath = new URL("./FlightResultsClient.tsx", import.meta.url);
const detailsClientPath = new URL("./FlightDetailsClient.tsx", import.meta.url);

test("FlightResultsClient reuses a fresh result snapshot without another search", async () => {
  const source = await readFile(resultsClientPath, "utf8");
  const keyIndex = source.indexOf("buildFlightResultsSearchKey(body)");
  const readIndex = source.indexOf("readFlightResultsSessionSnapshotForRefresh(searchKey)");
  const restoreIndex = source.indexOf("if (snapshot) {", readIndex);
  const fetchIndex = source.indexOf('fetch("/api/flights/search"', readIndex);
  const restoreBlock = source.slice(restoreIndex, fetchIndex);
  assert.ok(keyIndex >= 0 && keyIndex < readIndex && readIndex < restoreIndex && restoreIndex < fetchIndex);
  assert.match(restoreBlock, /filterResultsByRequestedOutboundDate\([\s\S]*snapshot\.results/);
  assert.match(restoreBlock, /setError\(""\)/);
  assert.match(restoreBlock, /setLoading\(refreshingStaleSnapshot\)/);
  assert.match(restoreBlock, /setBackgroundRefreshing\(refreshingStaleSnapshot\)/);
  assert.match(restoreBlock, /if \(!refreshingStaleSnapshot\) \{\s*mainInventoryReadyRef\.current = true;\s*return;/);
});
test("Back navigation with expired or missing flight results asks before calling providers", async () => {
  const source = await readFile(resultsClientPath, "utf8");
  const guardIndex = source.indexOf("if (!shouldBypassSnapshot && returnIntentRef.current?.returning");
  const fetchIndex = source.indexOf('fetch("/api/flights/search"', guardIndex);
  assert.ok(guardIndex > 0 && guardIndex < fetchIndex);
  const guard = source.slice(guardIndex, fetchIndex);
  assert.match(guard, /!snapshotState\?\.isFresh/);
  assert.match(guard, /setJourneyResponse\(null\)/);
  assert.match(guard, /setLoading\(false\)/);
  assert.match(guard, /setError\("Your previous flight results have expired/);
  assert.match(guard, /return;/);
  assert.match(source, /onClick=\{retryMainInventorySearch\}/);
});
test("stale results stay retained but blocked from scrolling until refresh settles", async () => {
  const source = await readFile(resultsClientPath, "utf8");
  const staleIndex = source.indexOf("const refreshingStaleSnapshot");
  const emptySnapshotIndex = source.indexOf("} else {", staleIndex);
  const fetchIndex = source.indexOf('fetch("/api/flights/search"', staleIndex);
  const catchIndex = source.indexOf(".catch((searchError)", fetchIndex);
  const finallyIndex = source.indexOf(".finally(()", catchIndex);
  const staleRestore = source.slice(staleIndex, emptySnapshotIndex);
  const failure = source.slice(catchIndex, finallyIndex);

  assert.ok(staleIndex >= 0 && staleIndex < emptySnapshotIndex && emptySnapshotIndex < fetchIndex);
  assert.match(staleRestore, /if \(!shouldBypassSnapshot && returnIntentRef\.current\?\.returning/);
  assert.match(staleRestore, /!snapshotState\?\.isFresh/);
  assert.match(staleRestore, /setLoading\(refreshingStaleSnapshot\)/);
  assert.match(staleRestore, /setBackgroundRefreshing\(refreshingStaleSnapshot\)/);
  assert.match(failure, /if \(!refreshingStaleSnapshot\)/);
  assert.match(source, /\.finally\(\(\) => \{[\s\S]*setLoading\(false\)[\s\S]*setBackgroundRefreshing\(false\)/);
  assert.match(source, /backgroundRefreshing \? t\("updatingResults"\) : ""/);
});

test("successful date-filtered responses are cached while errors retain existing handling", async () => {
  const source = await readFile(resultsClientPath, "utf8");
  const responseIndex = source.indexOf("const filteredResults = filterResultsByRequestedOutboundDate(");
  const writeIndex = source.indexOf("writeFlightResultsSessionSnapshot(", responseIndex);
  const catchIndex = source.indexOf(".catch((searchError)", responseIndex);
  const finallyIndex = source.indexOf(".finally(()", catchIndex);

  assert.ok(responseIndex >= 0 && responseIndex < writeIndex && writeIndex < catchIndex);
  assert.match(
    source.slice(writeIndex, catchIndex),
    /searchKey,[\s\S]*filteredResults,[\s\S]*warnings,[\s\S]*data\.resultsCacheValidUntil/,
  );
  assert.match(source.slice(responseIndex, catchIndex), /typeof data\.resultsCacheValidUntil === "number"/);
  assert.doesNotMatch(source.slice(catchIndex, finallyIndex), /writeFlightResultsSessionSnapshot/);
  assert.match(source.slice(catchIndex, finallyIndex), /setError\(/);
  assert.match(source.slice(responseIndex, finallyIndex), /activeFlightSearchKeyRef\.current !== searchKey/);
});

test("complete query strings remain in both navigation directions", async () => {
  const [resultsSource, detailsSource] = await Promise.all([
    readFile(resultsClientPath, "utf8"),
    readFile(detailsClientPath, "utf8"),
  ]);
  assert.match(resultsSource, /const detailsQuery = params\.toString\(\)/);
  assert.match(resultsSource, /detailsQuery \? `\?\$\{detailsQuery\}`/);
  assert.match(detailsSource, /const resultsQuery = searchParams\.toString\(\)/);
  assert.match(detailsSource, /`\/flights\/results\?\$\{resultsQuery\}`/);
});
