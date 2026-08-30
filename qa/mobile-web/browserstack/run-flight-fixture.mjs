import { spawn } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const suite = process.argv[2] ?? "flights";
const proxy = spawn(process.execPath, [resolve(import.meta.dirname, "flight-fixture-proxy.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
  windowsHide: true,
});

try {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:3011/api/flights/search", { method: "POST" });
      if (response.ok) break;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }

  const run = spawn(process.execPath, [resolve(import.meta.dirname, "run.mjs"), suite], {
    cwd: repoRoot,
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      QA_BASE_URL: "http://bs-local.com:3011",
      QA_FLIGHT_RESULTS_PATH: "/qa-only/mobile-results/flights",
    },
  });
  const status = await new Promise((resolveStatus) => run.on("exit", resolveStatus));
  process.exitCode = typeof status === "number" ? status : 1;
} finally {
  proxy.kill();
}
