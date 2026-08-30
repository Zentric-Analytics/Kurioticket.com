import { createServer } from "node:http";

const listenPort = Number(process.env.QA_FIXTURE_PROXY_PORT ?? 3011);
const upstream = new URL(process.env.QA_FIXTURE_UPSTREAM ?? "http://127.0.0.1:3010");

const leg = (index, returning = false) => {
  const day = returning ? "12" : "10";
  const origin = returning ? "LAX" : "SFO";
  const destination = returning ? "SFO" : "LAX";
  const departureTime = `2026-09-${day}T${String(8 + index).padStart(2, "0")}:00:00.000Z`;
  const arrivalTime = `2026-09-${day}T${String(10 + index).padStart(2, "0")}:00:00.000Z`;
  return {
    direction: returning ? "return" : "outbound",
    originAirport: origin,
    destinationAirport: destination,
    departureTime,
    arrivalTime,
    duration: "2h",
    durationMinutes: 120,
    stops: 0,
    layovers: [],
    segments: [{ originAirport: origin, destinationAirport: destination, departureTime, arrivalTime, airlineName: "Kurioticket Air", flightNumber: `KT${100 + index}`, duration: "2h" }],
  };
};

const flightResults = Array.from({ length: 12 }, (_, index) => ({
  id: `qa-flight-${index + 1}`,
  provider: "QA Fixture",
  airlineName: index % 2 ? "Pacific Air" : "Kurioticket Air",
  airlineCode: index % 2 ? "PA" : "KT",
  originAirport: "SFO",
  destinationAirport: "LAX",
  departureTime: `2026-09-10T${String(8 + index).padStart(2, "0")}:00:00.000Z`,
  arrivalTime: `2026-09-10T${String(10 + index).padStart(2, "0")}:00:00.000Z`,
  duration: "2h",
  durationMinutes: 120,
  stops: 0,
  layovers: [],
  cabinClass: "economy",
  baggageInfo: "Carry-on included",
  refundInfo: "Changes permitted",
  price: 149 + index * 11,
  currency: "USD",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 90 - index,
  riskScore: 5,
  comfortScore: 80,
  travelConfidenceScore: 90,
  travelEffortScore: 15,
  recommendationReasons: [],
  badges: [],
  legs: [leg(index), leg(index, true)],
  searchPolicy: { source: "duffel", bookable: true, action: { kind: "internal-detail", href: `/flights/details/qa-flight-${index + 1}`, enabled: true } },
}));

const fixtureBody = JSON.stringify({
  results: flightResults,
  warnings: [],
  status: "success",
  source: "qa-fixture",
  requestId: "qa-flight-results",
  resultsCacheValidUntil: Date.now() + 30 * 60 * 1000,
});

createServer(async (request, response) => {
  if (request.url?.startsWith("/api/flights/search")) {
    console.log(`[qa-flight-fixture] ${request.method} ${request.url} -> fixture`);
    request.resume();
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(fixtureBody) });
    response.end(fixtureBody);
    return;
  }

  const target = new URL(request.url ?? "/", upstream);
  const proxyRequest = (await import("node:http")).request(target, {
    method: request.method,
    headers: { ...request.headers, host: upstream.host },
  }, (proxyResponse) => {
    response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
    proxyResponse.pipe(response);
  });
  proxyRequest.on("error", (error) => {
    response.writeHead(502, { "content-type": "text/plain" });
    response.end(`QA fixture proxy error: ${error.message}`);
  });
  request.pipe(proxyRequest);
}).listen(listenPort, "0.0.0.0", () => {
  console.log(`[qa-flight-fixture] listening on ${listenPort}, proxying ${upstream.origin}`);
});
