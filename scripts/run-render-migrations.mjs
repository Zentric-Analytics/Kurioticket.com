import { spawnSync } from "node:child_process";
import process from "node:process";

const scriptPath = "scripts/deploy-render-migrations.mjs";

function runAttempt(attempt) {
  console.log(`[render-migrate] Starting migration attempt ${attempt} of 2.`);

  const result = spawnSync(process.execPath, [scriptPath], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  return result.status ?? 1;
}

const firstStatus = runAttempt(1);
if (firstStatus === 0) {
  process.exit(0);
}

console.warn(
  "[render-migrate] First attempt failed. Retrying once so the migration guard can reconcile a known failed migration record.",
);

const secondStatus = runAttempt(2);
if (secondStatus !== 0) {
  console.error(
    "[render-migrate] Migration deployment failed after the guarded retry. Refusing to continue the application build.",
  );
}

process.exit(secondStatus);
