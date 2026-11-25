import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const aggregatorPath = new URL("./flightAggregator.ts", import.meta.url);
const searchRoutePath = new URL("../../app/api/flights/search/handler.ts", import.meta.url);
const resultsClientPath = new URL("../../components/results/FlightResultsClient.tsx", import.meta.url);

test("Flight Search propagates its response request ID into cache persistence", async () => {
  const [route, aggregator] = await Promise.all([
    readFile(searchRoutePath, "utf8"),
    readFile(aggregatorPath, "utf8"),
  ]);

  assert.match(route, /searchFlights\(parsed\.data,[\s\S]*requestId,/);
  assert.match(route, /resolveRequestActivityIdentity\(request, undefined, operationalSession\)/);
  assert.doesNotMatch(route, /getServerSession\(/);
  assert.match(aggregator, /rememberFlights\(rows,now,search,options\.requestId\)/);
});

test("Flight Search fails closed when live provider results are not cache-confirmed; display-only inventory has no cache requirement", async () => {
  const aggregator = await readFile(aggregatorPath, "utf8");

  assert.match(aggregator, /productionSandboxInventory\(row\)\|\|certifiedIds.has\(row.id\)/);
  assert.match(aggregator, /liveResults.some\(row=>!certifiedIds.has\(row.id\)\)/);
  assert.match(aggregator, /providerStatuses.some\(provider=>provider.status === "failed"\) \|\| cacheUnavailable/);
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
