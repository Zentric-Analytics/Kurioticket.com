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
const { getSourceIdentity, validateImageRegistry } = jiti("../src/data/images/imageRegistryValidation.ts");

const commonImageHostPattern = /https:\/\/(?:images\.unsplash\.com|images\.pexels\.com|images\.kiwi\.com|photos\.hotelbeds\.com)\/[^\s"'`<>)]*/g;
const localPublicImagePathPattern = /(?<![\w.-])\/images\/[\w./-]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^\s"'`<>)]*)?/gi;
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
const discovered = discoverImageReferences(repoRoot);
const discoveredUrls = [...new Set(discovered.map((entry) => entry.url))].sort();
const registeredUrls = new Set(imageRegistry.map((image) => image.url));
const registeredIdentities = new Set(imageRegistry.map((image) => safeIdentity(image.url)));
const providerPrefixes = imageRegistry
  .filter((image) => image.status === "provider-real" && image.url.endsWith("/"))
  .map((image) => image.url);
const unregisteredUrls = discoveredUrls.filter((url) => !isRegistered(url));
const duplicateDiscoveredUrls = duplicateGroups(discovered, (entry) => entry.url);
const duplicateDiscoveredIdentities = duplicateGroups(discovered, (entry) => safeIdentity(entry.url));
const unregisteredFiles = filesForUrls(discovered, unregisteredUrls);
const launchCriticalBlocked = imageRegistry.filter(
  (image) => image.launchCritical && ["temporary", "replace-before-launch", "blocked"].includes(image.status),
);

printReport();

if (!validation.valid) {
  process.exitCode = 1;
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

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function printReport() {
  console.log("Kurioticket image audit");
  console.log("========================");
  console.log(`Total discovered image URLs: ${discoveredUrls.length}`);
  console.log(`Total registered images: ${imageRegistry.length}`);
  console.log(`Unregistered URLs: ${unregisteredUrls.length}`);
  console.log(`Duplicate discovered exact URLs: ${duplicateDiscoveredUrls.length}`);
  console.log(`Duplicate discovered source identities: ${duplicateDiscoveredIdentities.length}`);
  console.log(`Registry validation errors: ${validation.errors.length}`);
  console.log(`Registry validation warnings: ${validation.warnings.length}`);
  console.log(`Temporary / replace-before-launch / blocked launch-critical images: ${launchCriticalBlocked.length}`);

  printIssues("\nRegistry validation errors", validation.errors, (issue) => formatIssue(issue));
  printIssues("\nRegistry validation warnings", validation.warnings, (issue) => formatIssue(issue));
  printIssues("\nUnregistered URLs", unregisteredUrls, (url) => `- ${url}`);
  printIssues("\nDuplicate discovered exact URLs", duplicateDiscoveredUrls, ([url, entries]) => `- ${url} (${entries.length} references)`);
  printIssues("\nDuplicate discovered source identities", duplicateDiscoveredIdentities, ([identity, entries]) => `- ${identity} (${entries.length} references)`);
  printIssues("\nFiles with unregistered images", unregisteredFiles, ([filePath, urls]) => `- ${filePath}: ${urls.length} unregistered URL(s)`);

  console.log("\nTODO for Phase 2");
  console.log("- Migrate hard-coded image constants to consume registered image ids where safe.");
  console.log("- Register remaining flight inspiration, deal, explore, recent-search, and documentation-only image references.");
  console.log("- Replace launch-critical free-approved marketing imagery with premium-approved or owned assets.");
  console.log("- Add CI enforcement once the current unregistered inventory is intentionally resolved.");
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

function formatIssue(issue) {
  const id = issue.id ? `${issue.id}: ` : "";
  const url = issue.url ? ` (${issue.url})` : "";
  return `- ${id}${issue.message}${url}`;
}
