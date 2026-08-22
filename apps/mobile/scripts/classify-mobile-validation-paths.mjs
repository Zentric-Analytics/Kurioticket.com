import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const exactRootFiles = new Set([
  ".node-version",
  ".npmrc",
  ".nvmrc",
  "npm-shrinkwrap.json",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
]);

const normalizedPath = (value) => value.replaceAll("\\", "/").replace(/^\.\//, "");

export function isMobileRelevantPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return true;
  const file = normalizedPath(value);
  if (file.startsWith("/") || /^[A-Za-z]:\//.test(file) || file.split("/").includes("..")) return true;

  return file.startsWith("apps/mobile/") ||
    file.startsWith("src/lib/") ||
    file.startsWith("src/shared/") ||
    file.startsWith("src/data/") ||
    file.startsWith(".github/actions/") ||
    file.startsWith(".github/workflows/") ||
    exactRootFiles.has(file);
}

export function classifyMobileValidationPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0 || paths.some((file) => typeof file !== "string" || file.length === 0)) {
    return { mobileRelevant: true, classification: "uncertain-paths" };
  }

  const relevant = paths.filter(isMobileRelevantPath).map(normalizedPath);
  return relevant.length > 0
    ? { mobileRelevant: true, classification: "mobile-relevant" }
    : { mobileRelevant: false, classification: "not-mobile-relevant" };
}

function runCli() {
  if (process.argv[2] !== "--stdin-null") throw new Error("Expected --stdin-null");
  const input = readFileSync(0);
  const paths = input.toString("utf8").split("\0");
  if (paths.at(-1) === "") paths.pop();
  const result = classifyMobileValidationPaths(paths);
  process.stdout.write(`mobile_relevant=${result.mobileRelevant}\nclassification=${result.classification}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
