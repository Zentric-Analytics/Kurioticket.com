#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const jiti = createJiti(import.meta.url);

const { imageRegistry } = jiti("../src/data/images/imageRegistry.ts");
const { imageInventory } = jiti("../src/data/images/imageInventory.ts");
const {
  phase3FirstSixtyPurchaseList,
  phase3LaunchCriticalPurchaseCandidatesByProduct,
  phase3PurchaseBatchCounts,
} = jiti("../src/data/images/imagePurchasePlan.ts");
const { getSourceIdentity, validateImageRegistry } = jiti("../src/data/images/imageRegistryValidation.ts");

const commonImageHostPattern = /https:\/\/(?:images\.unsplash\.com|images\.pexels\.com|images\.kiwi\.com|photos\.hotelbeds\.com)\/[^\s"'`<>)]*/g;
const localPublicImagePathPattern = /(?<![\w.-])\/images\/[\w./-]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^\s"'`<>)]*)?/gi;
const registeredLocalPublicImagePattern = /^\/images\/[\w./-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const textFileExtensions = new Set([
  ".css",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
]);
const ignoredFiles = new Set([
  "package-lock.json",
]);
const ignoredRelativePrefixes = [
  "src/data/images/",
];

const validation = validateImageRegistry(imageRegistry);
const registeredLocalPublicImages = imageRegistry.filter((image) => isRegisteredLocalPublicImage(image.url));
const missingRegisteredLocalPublicImages = registeredLocalPublicImages.filter(
  (image) => !registeredLocalPublicImageExists(image.url),
);
const discovered = discoverImageReferences(repoRoot);
const discoveredUrls = [...new Set(discovered.map((entry) => entry.url))].sort();
const classifiedImages = [...imageRegistry.map(normalizeRegistryClassification), ...imageInventory];
const registeredUrls = new Set(classifiedImages.map((image) => image.url));
const registeredIdentities = new Set(classifiedImages.map((image) => safeIdentity(image.url)));
const providerPrefixes = classifiedImages
  .filter((image) => image.status === "provider-real" && image.url.endsWith("/"))
  .map((image) => image.url);
const unregisteredUrls = discoveredUrls.filter((url) => !isRegistered(url));
const duplicateDiscoveredUrls = duplicateGroups(discovered, (entry) => entry.url);
const duplicateDiscoveredIdentities = duplicateGroups(discovered, (entry) => safeIdentity(entry.url));
const unregisteredFiles = filesForUrls(discovered, unregisteredUrls);
const launchCriticalBlocked = classifiedImages.filter(
  (image) => image.launchCritical && ["temporary", "replace-before-launch", "blocked"].includes(image.status),
);
const premiumReplacementCandidates = classifiedImages.filter((image) => image.premiumReplacementRequired);
const providerRealImages = classifiedImages.filter(
  (image) => image.contentRole === "provider-real" || image.status === "provider-real",
);
const fallbackOnlyImages = classifiedImages.filter((image) => image.contentRole === "fallback-only");
const phase3PurchaseCategories = summarizePhase3PurchaseCategories(premiumReplacementCandidates);
const launchCriticalStatusCounts = countByStatus(launchCriticalBlocked);

printReport();

if (!validation.valid) {
  process.exitCode = 1;
}

if (missingRegisteredLocalPublicImages.length > 0) {
  process.exitCode = 1;
}

function normalizeRegistryClassification(image) {
  const usages = Array.isArray(image.usage) ? image.usage : [image.usage];
  const contentRole =
    image.contentRole ??
    (image.status === "provider-real"
      ? "provider-real"
      : usages.includes("hotel-result-fallback")
        ? "fallback-only"
        : "marketing");

  return {
    ...image,
    contentRole,
    productionPriority:
      image.productionPriority ?? (image.launchCritical ? "p0-launch-critical" : "p1-public-important"),
    premiumReplacementRequired:
      image.premiumReplacementRequired ??
      (image.status === "free-approved" && ["marketing", "fallback-only"].includes(contentRole)),
  };
}

function discoverImageReferences(root) {
  const references = [];

  for (const filePath of walkFiles(root)) {
    const relativePath = toRepoRelative(filePath);
    if (shouldIgnoreFile(relativePath)) continue;

    const contents = readFileSync(filePath, "utf8");
    for (const url of matchAll(contents, commonImageHostPattern)) {
      references.push({ url, filePath: relativePath });
    }
    for (const url of matchAll(contents, localPublicImagePathPattern)) {
      references.push({ url, filePath: relativePath });
    }
  }

  return references;
}

function* walkFiles(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;

    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      yield* walkFiles(entryPath);
      continue;
    }

    if (!stats.isFile()) continue;
    if (ignoredFiles.has(entry)) continue;
    if (!textFileExtensions.has(path.extname(entryPath))) continue;

    yield entryPath;
  }
}

function shouldIgnoreFile(relativePath) {
  return ignoredRelativePrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function matchAll(contents, pattern) {
  pattern.lastIndex = 0;
  return [...contents.matchAll(pattern)].map((match) => stripTrailingPunctuation(match[0]));
}

function stripTrailingPunctuation(value) {
  return value.replace(/[.,;:]+$/g, "");
}

function isRegistered(url) {
  if (registeredUrls.has(url)) return true;
  if (providerPrefixes.some((prefix) => url.startsWith(prefix))) return true;
  return registeredIdentities.has(safeIdentity(url));
}

function isRegisteredLocalPublicImage(value) {
  return registeredLocalPublicImagePattern.test(value);
}

function registeredLocalPublicImageExists(value) {
  try {
    return statSync(registeredLocalPublicImageFilePath(value)).isFile();
  } catch {
    return false;
  }
}

function registeredLocalPublicImageFilePath(value) {
  return path.join(repoRoot, "public", value.replace(/^\//, ""));
}

function safeIdentity(url) {
  try {
    return getSourceIdentity(url);
  } catch {
    return url;
  }
}

function duplicateGroups(items, keyForItem) {
  const groups = new Map();
  for (const item of items) {
    const key = keyForItem(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .filter(([, entries]) => entries.length > 1)
    .sort(([left], [right]) => left.localeCompare(right));
}

function filesForUrls(entries, urls) {
  const urlSet = new Set(urls);
  const files = new Map();

  for (const entry of entries) {
    if (!urlSet.has(entry.url)) continue;
    const matches = files.get(entry.filePath) ?? [];
    matches.push(entry.url);
    files.set(entry.filePath, [...new Set(matches)].sort());
  }

  return [...files.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function countByStatus(images) {
  return images.reduce((counts, image) => {
    counts[image.status] = (counts[image.status] ?? 0) + 1;
    return counts;
  }, {});
}

function topFilesByUnregisteredCount(files) {
  return [...files].sort(([, leftUrls], [, rightUrls]) => rightUrls.length - leftUrls.length);
}

function summarizePhase3PurchaseCategories(images) {
  const groups = new Map();

  for (const image of images) {
    const label = `${image.productionPriority ?? "unprioritized"} / ${image.product} / ${Array.isArray(image.usage) ? image.usage.join("+") : image.usage}`;
    const group = groups.get(label) ?? { label, count: 0, surfaces: new Set() };
    group.count += 1;
    for (const surface of image.pageSurfaces ?? []) group.surfaces.add(surface);
    groups.set(label, group);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, surfaces: [...group.surfaces].sort() }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function printReport() {
  console.log("Kurioticket image audit");
  console.log("========================");
  console.log(`Total discovered image URLs: ${discoveredUrls.length}`);
  console.log(`Total registered images: ${imageRegistry.length}`);
  console.log(`Registered local public images: ${registeredLocalPublicImages.length}`);
  console.log(`Missing registered local public images: ${missingRegisteredLocalPublicImages.length}`);
  console.log(`Total inventoried images: ${imageInventory.length}`);
  console.log(`Total registered/inventoried URLs: ${registeredUrls.size}`);
  console.log(`Unregistered URLs: ${unregisteredUrls.length}`);
  console.log(`Duplicate discovered exact URLs: ${duplicateDiscoveredUrls.length}`);
  console.log(`Duplicate discovered source identities: ${duplicateDiscoveredIdentities.length}`);
  console.log(`Registry validation errors: ${validation.errors.length}`);
  console.log(`Registry validation warnings: ${validation.warnings.length}`);
  console.log(`Launch-critical temporary / replace-before-launch / blocked images: ${launchCriticalBlocked.length}`);
  console.log(`Launch-critical temporary images: ${launchCriticalStatusCounts.temporary ?? 0}`);
  console.log(`Launch-critical replace-before-launch images: ${launchCriticalStatusCounts["replace-before-launch"] ?? 0}`);
  console.log(`Launch-critical blocked images: ${launchCriticalStatusCounts.blocked ?? 0}`);
  console.log(`Premium replacement candidates: ${premiumReplacementCandidates.length}`);
  console.log(`First-60 premium purchase candidates: ${phase3FirstSixtyPurchaseList.length}`);
  console.log(`Phase 3 Batch A / B / C counts: ${phase3PurchaseBatchCounts.A} / ${phase3PurchaseBatchCounts.B} / ${phase3PurchaseBatchCounts.C}`);
  console.log(
    `Launch-critical purchase candidates by product: ${formatCountsByKey(phase3LaunchCriticalPurchaseCandidatesByProduct)}`,
  );
  console.log(`Provider-real classified images: ${providerRealImages.length}`);
  console.log(`Fallback-only classified images: ${fallbackOnlyImages.length}`);

  printIssues("\nRegistry validation errors", validation.errors, (issue) => formatIssue(issue));
  printIssues("\nRegistry validation warnings", validation.warnings, (issue) => formatIssue(issue));
  printIssues(
    "\nMissing registered local public images",
    missingRegisteredLocalPublicImages,
    (image) => `- ${image.id}: ${image.url} -> ${toRepoRelative(registeredLocalPublicImageFilePath(image.url))}`,
  );
  printIssues("\nUnregistered URLs", unregisteredUrls, (url) => `- ${url}`);
  printIssues("\nDuplicate discovered exact URLs", duplicateDiscoveredUrls, ([url, entries]) => `- ${url} (${entries.length} references)`);
  printIssues("\nDuplicate discovered source identities", duplicateDiscoveredIdentities, ([identity, entries]) => `- ${identity} (${entries.length} references)`);
  printIssues("\nTop files by unregistered images", topFilesByUnregisteredCount(unregisteredFiles), ([filePath, urls]) => `- ${filePath}: ${urls.length} unregistered URL(s)`);
  printIssues("\nSuggested Phase 3 purchase categories", phase3PurchaseCategories, (category) => `- ${category.label}: ${category.count} candidate(s) across ${category.surfaces.join(", ")}`);

  console.log("\nTODO for Phase 3 / Phase 4");
  console.log("- Shop and approve the first-60 premium image purchase list before URL replacement work begins.");
  console.log("- Preserve current UI output until purchased images have license records and desktop/mobile crop approval.");
  console.log("- Replace launch-critical free-approved marketing imagery with premium-approved or owned assets in focused Phase 4 PRs.");
  console.log("- Add CI enforcement once approved premium replacements are registered and migrated safely.");
}

function printIssues(title, issues, formatter) {
  if (issues.length === 0) return;

  console.log(title);
  for (const issue of issues.slice(0, 80)) {
    console.log(formatter(issue));
  }
  if (issues.length > 80) {
    console.log(`- ...and ${issues.length - 80} more`);
  }
}

function formatCountsByKey(counts) {
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return "none";
  return entries.map(([key, count]) => `${key}: ${count}`).join(", ");
}

function formatIssue(issue) {
  const id = issue.id ? `${issue.id}: ` : "";
  const url = issue.url ? ` (${issue.url})` : "";
  return `- ${id}${issue.message}${url}`;
}
