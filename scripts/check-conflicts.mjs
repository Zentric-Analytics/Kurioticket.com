import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".next"]);
const EXCLUDED_FILES = new Set(["package.json", "package-lock.json"]);
const MARKERS = [`${"<".repeat(7)}`, `${"=".repeat(7)}`, `${">".repeat(7)}`];

async function walk(dir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await walk(fullPath, out);
      continue;
    }

    if (!entry.isFile()) continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;

    let content;
    try {
      content = await fs.readFile(fullPath, "utf8");
    } catch {
      continue;
    }

    if (MARKERS.some((marker) => content.includes(marker))) {
      out.push(relPath);
    }
  }
}

async function main() {
  try {
    const matches = [];
    await walk(ROOT, matches);

    if (matches.length > 0) {
      console.error("Conflict markers found in:");
      for (const file of matches.sort()) {
        console.error(` - ${file}`);
      }
      process.exit(1);
    }

    console.log("No merge conflict markers found.");
    process.exit(0);
  } catch (error) {
    console.error("Conflict scan failed.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await main();
