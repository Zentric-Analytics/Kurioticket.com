#!/usr/bin/env node
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

const { marketImageRegistry } = jiti("../src/data/images/marketImageRegistry.ts");
const { resolveMarketImage } = jiti("../src/data/images/marketImageResolver.ts");
const { priorityMarketCodes } = jiti("../src/data/images/marketImagePacks/index.ts");

const launchCriticalRequests = [
  {
    product: "global",
    usage: "homepage-hero",
    audience: "local",
  },
];

const marketCoverage = [];
const missingCoverage = [];
const unresolvedRegionalCoverage = [];
const replacementRequired = [];

for (const market of priorityMarketCodes) {
  for (const request of launchCriticalRequests) {
    const resolution = resolveMarketImage({ market, ...request }, marketImageRegistry);

    if (!resolution) {
      missingCoverage.push({ market, request });
      continue;
    }

    marketCoverage.push({ market, request, resolution });

    if (resolution.level !== "market") {
      unresolvedRegionalCoverage.push({ market, request, resolution });
    }

    if (resolution.image.premiumReplacementRequired || resolution.image.status === "replace-before-launch") {
      replacementRequired.push({ market, request, resolution });
    }
  }
}

printReport();

if (missingCoverage.length > 0 || unresolvedRegionalCoverage.length > 0) {
  process.exitCode = 1;
}

function printReport() {
  console.log("Kurioticket market image coverage audit");
  console.log("======================================");
  console.log(`Priority markets checked: ${priorityMarketCodes.length}`);
  console.log(`Launch-critical request types checked: ${launchCriticalRequests.length}`);
  console.log(`Resolved market request count: ${marketCoverage.length}`);
  console.log(`Missing coverage count: ${missingCoverage.length}`);
  console.log(`Non-market-level coverage count: ${unresolvedRegionalCoverage.length}`);
  console.log(`Replacement-required resolved images: ${replacementRequired.length}`);

  printIssues("\nMissing market image coverage", missingCoverage, ({ market, request }) => {
    return `- ${market}: ${request.product}/${request.usage}/${request.audience}`;
  });

  printIssues("\nResolved below market level", unresolvedRegionalCoverage, ({ market, request, resolution }) => {
    return `- ${market}: ${request.product}/${request.usage}/${request.audience} -> ${resolution.level} (${resolution.image.id})`;
  });

  printIssues("\nReplacement-required market images", replacementRequired, ({ market, resolution }) => {
    return `- ${market}: ${resolution.image.id} (${resolution.image.status})`;
  });

  console.log("\nNotes");
  console.log("- This audit fails only when a priority market cannot resolve to a market-level image.");
  console.log("- Replacement-required records are reported but do not fail yet because current market packs are scaffold entries.");
  console.log("- Once real premium or owned assets are approved, this audit should fail launch-critical replace-before-launch records.");
}

function printIssues(title, issues, formatter) {
  if (issues.length === 0) return;

  console.log(title);
  for (const issue of issues) console.log(formatter(issue));
}
