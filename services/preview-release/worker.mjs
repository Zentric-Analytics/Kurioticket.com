import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requirePreviewEnvironment } from "./config.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";
import { GitHubClient, RenderClient, EasClient } from "./remote-clients.mjs";
import { redactPreflightError, runPreviewPreflight } from "./preflight.mjs";
import { AppStoreConnectClient } from "./app-store-connect.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const config = requirePreviewEnvironment();
const ledger = new PreviewLedger(config.databaseUrl);
await ledger.migrate(await readFile(resolve(root, "services/preview-release/sql/001_init.sql"), "utf8"));
const github = new GitHubClient({ readToken: config.githubReadToken, statusToken: config.githubStatusToken, repository: config.repository });
const render = new RenderClient({ apiKey: config.renderApiKey, serviceId: config.renderServiceId });
const eas = new EasClient({ expoToken: config.expoToken, cwd: resolve(root, "apps/mobile") });
const apple = new AppStoreConnectClient(config.appStoreConnect);
try {
  const preflight = await runPreviewPreflight({ config, ledger, github, render, eas, apple });
  console.log(JSON.stringify({ event: "preview-release-preflight", ...preflight }));
} catch (error) {
  console.error(JSON.stringify({ event: "preview-release-preflight-failed", error: redactPreflightError(error, [config.githubReadToken, config.renderApiKey, config.expoToken, config.databaseUrl, config.appStoreConnect.privateKey, config.appStoreConnect.issuerId, config.appStoreConnect.keyId]) }));
  await ledger.close();
  process.exit(1);
}
const orchestrator = new PreviewOrchestrator({
  config,
  ledger,
  github,
  render,
  appleFactory: () => apple,
});

let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { stopping = true; });
console.log(JSON.stringify({ event: "preview-release-worker-started", mode: config.mode, repository: config.repository, branch: config.branch, pollIntervalMs: config.pollIntervalMs }));
while (!stopping) {
  const started = Date.now();
  try {
    const result = await orchestrator.cycle();
    console.log(JSON.stringify({ event: "preview-release-cycle", sourceSha: result.source_sha ?? result.sourceSha, state: result.state }));
  } catch (error) {
    console.error(JSON.stringify({ event: "preview-release-cycle-failed", error: String(error?.message ?? error).slice(0, 500) }));
  }
  const remaining = Math.max(0, config.pollIntervalMs - (Date.now() - started));
  if (remaining) await new Promise((resolveDelay) => setTimeout(resolveDelay, remaining));
}
await ledger.close();
