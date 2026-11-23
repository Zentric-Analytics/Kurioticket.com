import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
loadEnv({ path: resolve(repoRoot, ".env.browserstack.local"), quiet: true });

for (const name of ["BROWSERSTACK_USERNAME", "BROWSERSTACK_ACCESS_KEY"]) {
  if (!process.env[name]) {
    console.error(`${name} is not configured. Add it to .env.browserstack.local or the process environment.`);
    process.exit(2);
  }
}

const suites = {
  all: [],
  smoke: ["smoke.spec.ts"],
  cars: ["cars.spec.ts", "cars-stress.spec.ts"],
  "cars-nested": ["cars.spec.ts"],
  "cars-stress": ["cars-stress.spec.ts"],
  flights: ["flights.spec.ts"],
  hotels: ["hotels.spec.ts"],
  stress: ["results-stress.spec.ts"],
  "stress-flights": ["results-stress.spec.ts", "--grep=flights"],
  "stress-hotels": ["results-stress.spec.ts", "--grep=hotels"],
};
const suite = process.argv[2] ?? "all";
if (!(suite in suites)) {
  console.error(`Unknown iOS Safari QA suite: ${suite}`);
  process.exit(2);
}

mkdirSync(resolve(repoRoot, "qa/mobile-web/artifacts"), { recursive: true });
const sdk = resolve(repoRoot, "node_modules/browserstack-node-sdk/src/bin/runner.js");
const args = [
  sdk,
  "playwright",
  "test",
  `--config=${resolve(here, "playwright.config.ts")}`,
  ...suites[suite],
];
const run = spawnSync(process.execPath, args, {
  cwd: here,
  env: process.env,
  stdio: "inherit",
  shell: false,
});

if (run.error) throw run.error;
process.exit(run.status ?? 1);
