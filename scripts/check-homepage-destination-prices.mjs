import { promises as fs } from "node:fs";

const ROUTE_PATH = "src/app/api/flights/destination-prices/route.ts";
const forbiddenPatterns = [
  /searchDuffelFlights/,
  /duffelProvider/,
  /flightAggregator/,
];

const source = await fs.readFile(ROUTE_PATH, "utf8");
const matches = forbiddenPatterns.filter((pattern) => pattern.test(source));

if (matches.length > 0) {
  console.error(
    `${ROUTE_PATH} must read cached homepage fare snapshots only and must not import live flight providers.`,
  );
  process.exit(1);
}

console.log("Homepage destination-prices route has no live provider imports.");
