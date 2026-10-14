/** Local-only full-app browser replay. Never mounts a public application route.
 * Start the built Next app on 127.0.0.1:3109 without live credentials, then run:
 * JITI_TSCONFIG_PATHS=./tsconfig.json node --import jiti/register qa/cars-provider-replay.ts
 * Only /api/cars/search is replayed from a sanitized real provider response.
 * This verifies the customer UI, not a live staging provider/database integration.
 */
import { createServer } from "node:http";
import { capturedKayakCars } from "../src/services/travel/fixtures/kayakCarsCaptured";
import { normalizeSandboxOffers } from "../src/services/travel/kayakSandbox";
import { scopeKayakOfferIds, groupKayakCarResults } from "../src/services/travel/kayakMetasearchProvider";
import { kayakCarCardModel } from "../src/components/results/kayakCardModels";
import { classifyCars } from "../src/lib/travel/searchContract";
import { getFallbackRatePayload } from "../src/lib/currency/exchangeRates";

const cars = groupKayakCarResults(scopeKayakOfferIds(normalizeSandboxOffers("cars", capturedKayakCars), "replay").map(offer => kayakCarCardModel(offer, 3, "LAX")));
const search = { pickupLocation: "LAX", dropoffLocation: "LAX", pickupDate: "2026-11-18", pickupTime: "10:00", dropoffDate: "2026-11-21", dropoffTime: "10:00", driverAge: "18-70" };
const searchPath = `/cars/results?${new URLSearchParams(search)}`;
createServer(async (request, response) => {
  try {
    if (request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html" }).end(`<h1>Local captured-response replay, not live inventory</h1><a href="${searchPath}">Run captured LAX car search</a>`);
      return;
    }
    const json = (value: unknown) => response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(value));
    if (request.url?.startsWith("/api/cars/search")) { json(classifyCars(cars, search, "captured-response-replay")); return; }
    if (request.url?.startsWith("/api/currency/rates")) { json(getFallbackRatePayload()); return; }
    if (request.url?.startsWith("/api/auth/session")) { json(null); return; }
    const target = new URL(request.url ?? "/", "http://127.0.0.1:3109");
    if (target.origin !== "http://127.0.0.1:3109") { response.writeHead(400).end(); return; }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (value && !["host", "connection", "content-length", "accept-encoding"].includes(name)) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }
    const upstream = await fetch(target, { method: request.method, headers, redirect: "manual",
      ...(chunks.length ? { body: Buffer.concat(chunks) } : {}), signal: AbortSignal.timeout(30000) });
    const outputHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => { if (!["content-length", "content-encoding", "transfer-encoding"].includes(key)) outputHeaders[key] = value; });
    response.writeHead(upstream.status, outputHeaders).end(Buffer.from(await upstream.arrayBuffer()));
  } catch { response.writeHead(502).end("Local application unavailable"); }
}).listen(3108, "127.0.0.1", () => console.log(`Local replay: http://127.0.0.1:3108${searchPath}`));
