import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const aggregatorPath = new URL("./flightAggregator.ts", import.meta.url);
const searchRoutePath = new URL("../../app/api/flights/search/route.ts", import.meta.url);
const resultsClientPath = new URL("../../components/results/FlightResultsClient.tsx", import.meta.url);

test("Flight Search propagates its response request ID into cache persistence", async () => {
  const [route, aggregator] = await Promise.all([
    readFile(searchRoutePath, "utf8"),
    readFile(aggregatorPath, "utf8"),
  ]);

  assert.match(route, /searchFlights\(parsed\.data,[\s\S]*requestId,/);
  assert.match(route, /resolveOptionalWebApiSession\(\)/);
  assert.doesNotMatch(route, /getServerSession\(/);
  assert.match(aggregator, /rememberFlights\(results, now, search, options\.requestId\)/);
});

test("Flight Search fails closed when provider results are not cache-confirmed", async () => {
  const aggregator = await readFile(aggregatorPath, "utf8");

  assert.match(aggregator, /const actionableResults = cacheResult\.persisted \? results : \[\]/);
  assert.match(aggregator, /results\.length > 0 && !cacheResult\.persisted/);
  assert.match(aggregator, /provider\.status !== "success" \|\| cacheUnavailable/);
});

test("browser snapshots require the server-owned cache validity from the same response", async () => {
  const [route, client] = await Promise.all([
    readFile(searchRoutePath, "utf8"),
    readFile(resultsClientPath, "utf8"),
  ]);

  assert.match(route, /resultsCacheValidForMs: aggregate\.resultsCacheValidForMs/);
  assert.match(route, /resultsCacheValidUntil: aggregate\.resultsCacheValidUntil/);
  assert.match(client, /data\.resultsCacheValidUntil/);
  assert.match(client, /writeFlightResultsSessionSnapshot\([\s\S]*data\.resultsCacheValidUntil/);
});
