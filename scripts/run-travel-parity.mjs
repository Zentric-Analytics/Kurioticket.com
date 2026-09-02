import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const matrices = {
  root: [
    "scripts/travel-parity-program.test.mjs",
    "src/lib/travel/searchContract.test.ts",
    "src/services/travel/providers/duffelProvider.searchContract.test.ts",
    "src/lib/hotels/hotelDiscoveryIntent.test.ts",
    "src/lib/hotels/hotelExplorationSearch.test.ts",
    "src/lib/hotels/hotelResultsBoundary.test.ts",
    "src/data/hotelDestinations.test.ts",
    "src/data/homepageCountryDirectory.test.ts",
    "src/lib/cars/carCanonicalCatalog.test.ts",
    "src/lib/cars/carResults.test.ts",
    "src/services/travel/packageOrchestrator.test.ts",
    "src/app/api/packages/search/route.test.ts",
    "src/components/results/accountCapabilityContract.test.ts",
    "src/lib/price-alerts/hotelPriceAlerts.test.ts",
    "src/services/savedRecentService.test.ts",
  ],
  mobile: [
    "src/features/flow/canonicalResultAcceptance.test.ts",
    "src/features/flow/travelPipelineAlignment.test.ts",
    "src/features/flow/flightSearchModel.test.ts",
    "src/features/flow/flightResultsRoute.test.ts",
    "src/features/flow/hotelSearchModel.test.ts",
    "src/features/home/homepageCardNavigation.test.ts",
    "src/features/home/PopularDestinationStays.test.ts",
    "src/features/explore/exploreSearchHandoff.test.ts",
    "src/features/flow/carSearchModel.test.ts",
    "src/features/flow/carResultsRoute.test.ts",
    "src/features/search/carSavedState.test.ts",
    "src/features/flow/packageSearchModel.test.ts",
    "src/features/flow/packagesNavigation.test.ts",
    "src/features/flow/savedSearchContext.test.ts",
    "src/features/recent/recentSearchNavigation.test.ts",
    "src/features/flow/hotelPriceAlertModel.test.ts",
  ],
};

for (const [workspace, files] of Object.entries(matrices)) {
  const cwd = workspace === "root" ? root : path.join(root, "apps/mobile");
  for (const file of files) if (!existsSync(path.join(cwd, file))) throw new Error(`Missing ${workspace} parity contract: ${file}`);
  const args = workspace === "root"
    ? ["--test", "--import", "jiti/register", ...files]
    : ["--test", "--require", "./testAssetSetup.cjs", "--import", "jiti/register", ...files];
  const env = { ...process.env, JITI_TSCONFIG_PATHS: "true", TZ: "UTC" };
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Travel parity passed: ${matrices.root.length} web/server contracts and ${matrices.mobile.length} shared native contracts.`);
