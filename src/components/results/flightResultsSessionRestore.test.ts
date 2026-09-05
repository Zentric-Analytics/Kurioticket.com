import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const resultsClientPath = new URL("./FlightResultsClient.tsx", import.meta.url);
const detailsClientPath = new URL("./FlightDetailsClient.tsx", import.meta.url);

test("FlightResultsClient restores a matching snapshot before its no-cache request path", async () => {
  const source = await readFile(resultsClientPath, "utf8");
  const keyIndex = source.indexOf("buildFlightResultsSearchKey(body)");
  const readIndex = source.indexOf("readFlightResultsSessionSnapshotForRefresh(searchKey)");
  const clearIndex = source.indexOf("setResults([]);", readIndex);
  const fetchIndex = source.indexOf('fetch("/api/flights/search"', readIndex);
  const restoreBlock = source.slice(readIndex, clearIndex);

  assert.ok(keyIndex >= 0 && keyIndex < readIndex);
  assert.ok(readIndex < clearIndex && clearIndex < fetchIndex);
  assert.match(
    restoreBlock,
    /filterResultsByRequestedOutboundDate\([\s\S]*snapshot\.results/,
  );
  assert.match(restoreBlock, /setWarnings\(snapshot\.warnings\)/);
  assert.match(restoreBlock, /setError\(""\)/);
  assert.match(restoreBlock, /setLoading\(false\)/);
  assert.match(restoreBlock, /setBackgroundRefreshing\(refreshingStaleSnapshot\)/);
  assert.match(restoreBlock, /if \(!refreshingStaleSnapshot\) return/);
  assert.match(restoreBlock, /activeFlightSearchKeyRef\.current !== searchKey/);
  assert.match(restoreBlock, /return;/);
});

test("stale results refresh in place without clearing cards or surfacing a blocking error", async () => {
  const source = await readFile(resultsClientPath, "utf8");
  const staleIndex = source.indexOf("const refreshingStaleSnapshot");
  const emptySnapshotIndex = source.indexOf("} else {", staleIndex);
  const fetchIndex = source.indexOf('fetch("/api/flights/search"', staleIndex);
  const catchIndex = source.indexOf(".catch((searchError)", fetchIndex);
  const finallyIndex = source.indexOf(".finally(()", catchIndex);
  const staleRestore = source.slice(staleIndex, emptySnapshotIndex);
  const failure = source.slice(catchIndex, finallyIndex);

  assert.ok(staleIndex >= 0 && staleIndex < emptySnapshotIndex && emptySnapshotIndex < fetchIndex);
  assert.doesNotMatch(staleRestore, /setResults\(\[\]\)/);
  assert.doesNotMatch(staleRestore, /setLoading\(true\)/);
  assert.match(failure, /if \(!refreshingStaleSnapshot\)/);
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
