import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { airports as currentAirports } from "../src/shared/airports/index.ts";
import { buildCoverageReport, normalizeOurAirports, parseCsv, verifySnapshot } from "./lib/location-catalog-ingestion.mjs";

const values = process.argv.slice(2);
const args = {};
for (let index = 0; index < values.length; index += 1) {
  if (!values[index].startsWith("--")) continue;
  const key = values[index].slice(2);
  const next = values[index + 1];
  args[key] = !next || next.startsWith("--") ? true : next;
  if (args[key] !== true) index += 1;
}
if (!args.manifest || (!args.input && !args.url)) throw new Error("Usage: node scripts/location-catalog-ingest.mjs --manifest <snapshot.json> (--input <airports.csv> | --url https://ourairports.com/data/airports.csv) [--out-dir <ignored-dir>] [--dry-run]");
if (args.url && args.url !== "https://ourairports.com/data/airports.csv") throw new Error("Only the approved OurAirports HTTPS snapshot URL is accepted.");

const manifest = JSON.parse(await readFile(resolve(String(args.manifest)), "utf8"));
const csv = args.input ? await readFile(resolve(String(args.input)), "utf8") : await fetch(String(args.url), { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`); return response.text(); });
verifySnapshot(csv, manifest);
const normalized = normalizeOurAirports(parseCsv(csv));
const report = buildCoverageReport(currentAirports, normalized);
const output = { manifest: { ...manifest, sourceRecordCount: parseCsv(csv).length }, report, candidates: normalized.candidates, rejected: normalized.rejected };

if (args["dry-run"] === true || args["dry-run"] === "true") {
  console.log(JSON.stringify({ dryRun: true, manifest: output.manifest, report }, null, 2));
} else {
  const outDir = resolve(String(args["out-dir"] || ".artifacts/location-catalog"));
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, `candidates-${manifest.version}.json`), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ dryRun: false, outDir, report }, null, 2));
}
