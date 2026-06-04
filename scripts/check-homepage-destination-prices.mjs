import { promises as fs } from "node:fs";

const ROUTE_PATH = "src/app/api/flights/destination-prices/route.ts";
const HOMEPAGE_PATH = "src/app/page.tsx";
const DATA_PATH = "src/data/homeDiscovery.ts";
const forbiddenProviderPatterns = [
  /searchDuffelFlights/,
  /duffelProvider/,
  /flightAggregator/,
];

const [routeSource, homepageSource, dataSource] = await Promise.all([
  fs.readFile(ROUTE_PATH, "utf8"),
  fs.readFile(HOMEPAGE_PATH, "utf8"),
  fs.readFile(DATA_PATH, "utf8"),
]);
const providerMatches = forbiddenProviderPatterns.filter((pattern) =>
  pattern.test(routeSource),
);

if (providerMatches.length > 0) {
  console.error(
    `${ROUTE_PATH} must read cached homepage fare snapshots only and must not import live flight providers.`,
  );
  process.exit(1);
}

if (!/readHomepageFareSnapshotResponseEntries/.test(routeSource)) {
  console.error(`${ROUTE_PATH} must continue reading homepage fare snapshots.`);
  process.exit(1);
}

if (/priceFromUsd/.test(homepageSource)) {
  console.error(`${HOMEPAGE_PATH} must not display priceFromUsd.`);
  process.exit(1);
}

if (/priceFromUsd/.test(routeSource)) {
  console.error(
    `${ROUTE_PATH} must not use static discovery priceFromUsd values.`,
  );
  process.exit(1);
}

if (/price:\s*priceFromUsd/.test(dataSource)) {
  console.error(
    "Home discovery static price fields must not be exposed for homepage fare snapshots.",
  );
  process.exit(1);
}

console.log(
  "Homepage destination-prices route is snapshot-only and homepage avoids static discovery price display.",
);
