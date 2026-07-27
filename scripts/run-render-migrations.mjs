import { spawnSync } from "node:child_process";
import process from "node:process";

const maxAttempts = 2;

function runAttempt(attempt) {
  console.log(
    `[render-migrate] Starting migration deployment attempt ${attempt}/${maxAttempts}.`,
  );

  const result = spawnSync(
    process.execPath,
    ["scripts/deploy-render-migrations.mjs"],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.error) {
    console.error("[render-migrate] Failed to start migration process.");
    console.error(result.error);
    return false;
  }

  return result.status === 0;
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  if (runAttempt(attempt)) {
    console.log("[render-migrate] Migration deployment completed successfully.");
    process.exit(0);
  }

  if (attempt < maxAttempts) {
    console.warn(
      "[render-migrate] Migration deployment failed; retrying once.",
    );
  }
}

console.error(
  `[render-migrate] Migration deployment failed after ${maxAttempts} attempts.`,
);
process.exit(1);
