import { spawn } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const suite = process.argv[2] ?? "flights";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const fixturePage = "http://127.0.0.1:3010/qa-only/mobile-results/flights";

const waitForUrl = async (url, attempts = 100) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  return false;
};

const runCommand = (command, args, env = process.env) =>
  new Promise((resolveStatus, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      windowsHide: true,
      env,
    });
    child.once("error", reject);
    child.once("exit", (status) => resolveStatus(status ?? 1));
  });

let application = null;
if (!(await waitForUrl(fixturePage, 1))) {
  const fixtureEnv = { ...process.env, QA_MOBILE_RESULTS_FIXTURE: "1" };
  const buildStatus = await runCommand(npmCommand, ["run", "build"], fixtureEnv);
  if (buildStatus !== 0) process.exit(buildStatus);

  application = spawn(npmCommand, ["run", "start", "--", "-p", "3010"], {
    cwd: repoRoot,
    stdio: "inherit",
    windowsHide: true,
    env: fixtureEnv,
  });
  if (!(await waitForUrl(fixturePage))) {
    application.kill();
    throw new Error(`QA Flight fixture application did not become ready at ${fixturePage}`);
  }
}

const proxy = spawn(process.execPath, [resolve(import.meta.dirname, "flight-fixture-proxy.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
  windowsHide: true,
});

try {
  let proxyReady = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:3011/api/flights/search", { method: "POST" });
      if (response.ok) {
        proxyReady = true;
        break;
      }
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  if (!proxyReady || !(await waitForUrl("http://127.0.0.1:3011/qa-only/mobile-results/flights", 1))) {
    throw new Error("QA Flight fixture proxy or upstream application is not ready");
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
  application?.kill();
}
