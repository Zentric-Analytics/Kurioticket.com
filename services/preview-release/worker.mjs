import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PREVIEW_IDENTITY, requirePreviewEnvironment } from "./config.mjs";
import { PreviewLedger } from "./ledger.mjs";
import { PreviewOrchestrator } from "./orchestrator.mjs";
import { GitHubClient, RenderClient, EasClient } from "./remote-clients.mjs";
import { redactPreflightError, runPreviewPreflight } from "./preflight.mjs";
import { AppStoreConnectClient } from "./app-store-connect.mjs";
import { notifyFailedNativeBuilds, notifySuccessfulNativeBuilds } from "./build-notifications.mjs";
import { runWorkerCycle } from "./worker-cycle.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const config = requirePreviewEnvironment();
const ledger = new PreviewLedger(config.databaseUrl);
for (const migration of (await readdir(resolve(root, "services/preview-release/sql"))).filter((name) => /^\d+_.+\.sql$/.test(name)).sort()) {
  await ledger.migrate(await readFile(resolve(root, "services/preview-release/sql", migration), "utf8"));
}
const github = new GitHubClient({ readToken: config.githubReadToken, statusToken: config.githubStatusToken, repository: config.repository });
const render = new RenderClient({ apiKey: config.renderApiKey, serviceId: config.renderServiceId });
const renderWorker = new RenderClient({ apiKey: config.renderApiKey, serviceId: PREVIEW_IDENTITY.renderWorkerServiceId });
const eas = new EasClient({ expoToken: config.expoToken, cwd: resolve(root, "apps/mobile") });
const apple = new AppStoreConnectClient(config.appStoreConnect);
try {
  const preflight = await runPreviewPreflight({ config, ledger, github, render, renderWorker, eas, apple });
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
  await runWorkerCycle({ mode: config.mode, github, orchestrator, reconcileNotifications: reconcileAllBuildNotifications });
  const remaining = Math.max(0, config.pollIntervalMs - (Date.now() - started));
  if (remaining) await new Promise((resolveDelay) => setTimeout(resolveDelay, remaining));
}
await ledger.close();

async function reconcileAllBuildNotifications() {
  await ledger.syncNativeNotificationCandidates();
  const candidates = await ledger.unresolvedNativeNotificationCandidates();
  for (const candidate of candidates) {
    const notify = candidate.outcome === "FAILED" ? notifyFailedNativeBuilds : notifySuccessfulNativeBuilds;
    const results = await notify({
      sourceSha: candidate.source_sha, ledger, eas,
      onlyBuildId: candidate.build_id,
      recipientMemberIds: candidate.recipient_ids,
    }).catch(async (error) => {
      console.error(JSON.stringify({ event: "preview-build-notification-failed", sourceSha: candidate.source_sha, buildId: candidate.build_id, error: String(error?.message ?? error).slice(0, 500) }));
      await ledger.recordNativeNotificationAttempt(candidate, { recipientOutcomes: [{ memberId: "transport", state: "retryable-failure" }], error: String(error?.message ?? error).slice(0, 500) });
      return [];
    });
    if (results[0]) await ledger.recordNativeNotificationAttempt(candidate, results[0]);
  }
}
