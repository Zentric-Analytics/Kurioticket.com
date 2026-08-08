import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { requirePreviewEnvironment } from "./config.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";
import { GitHubClient, RenderClient, EasClient } from "./remote-clients.mjs";
import { redactPreflightError, runPreviewPreflight } from "./preflight.mjs";
import { AppStoreConnectClient } from "./app-store-connect.mjs";
import { notifyFailedNativeBuilds, notifySuccessfulNativeBuilds } from "./build-notifications.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const config = requirePreviewEnvironment();
const ledger = new PreviewLedger(config.databaseUrl);
for (const migration of (await readdir(resolve(root, "services/preview-release/sql"))).filter((name) => /^\d+_.+\.sql$/.test(name)).sort()) {
  await ledger.migrate(await readFile(resolve(root, "services/preview-release/sql", migration), "utf8"));
}
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
console.log(JSON.stringify({ event: "preview-release-worker-started", mode: config.mode, repository: config.repository, branch: config.branch, sourceSha: await github.latestDevSha(), pollIntervalMs: config.pollIntervalMs }));
while (!stopping) {
  const started = Date.now();
  let cycleSourceSha = null;
  try {
    cycleSourceSha = await github.latestDevSha();
    const result = await orchestrator.cycle();
    const sourceSha = result.source_sha ?? result.sourceSha ?? cycleSourceSha;
    console.log(JSON.stringify({ event: "preview-release-cycle", sourceSha, state: result.state }));
    if (config.mode === "active" && sourceSha && result.state !== "NO_CHANGE" && result.state !== "LOCKED_OR_COMPLETE") {
      await notifySuccessfulNativeBuilds({ sourceSha, ledger, eas }).catch((error) => {
        console.error(JSON.stringify({ event: "preview-build-notification-failed", sourceSha, error: String(error?.message ?? error).slice(0, 500) }));
      });
    }
  } catch (error) {
    const message = String(error?.message ?? error).slice(0, 500);
    console.error(JSON.stringify({ event: "preview-release-cycle-failed", error: message }));
    const sourceSha = cycleSourceSha ?? await github.latestDevSha().catch(() => null);
    if (config.mode === "active" && sourceSha) {
      await notifyFailedNativeBuilds({ sourceSha, ledger, eas, failureReason: message }).catch((notifyError) => {
        console.error(JSON.stringify({ event: "preview-build-failure-notification-failed", sourceSha, error: String(notifyError?.message ?? notifyError).slice(0, 500) }));
      });
    }
  }
  const remaining = Math.max(0, config.pollIntervalMs - (Date.now() - started));
  if (remaining) await new Promise((resolveDelay) => setTimeout(resolveDelay, remaining));
}
await ledger.close();
