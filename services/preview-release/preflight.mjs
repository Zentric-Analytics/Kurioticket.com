import { PREVIEW_IDENTITY, assertPreviewIdentity } from "./config.mjs";

export async function runPreviewPreflight({ config, ledger, github, render, eas }) {
  if (config.mode !== "dry-run") throw new Error("Provider preflight must run in dry-run mode.");
  const sourceSha = await github.latestDevSha();
  const database = await ledger.healthCheck();
  const service = await render.getService();
  const deploy = await render.latestDeploy();
  const project = await eas.projectInfo();
  const builds = await eas.previewBuildHistory();
  const updates = await eas.listUpdates();
  assertPreviewIdentity({
    appName: PREVIEW_IDENTITY.appName,
    bundleIdentifier: PREVIEW_IDENTITY.bundleIdentifier,
    scheme: PREVIEW_IDENTITY.scheme,
    projectId: project.projectId,
    profile: PREVIEW_IDENTITY.buildProfile,
    channel: PREVIEW_IDENTITY.channel,
    runtime: PREVIEW_IDENTITY.runtime,
    apiOrigin: PREVIEW_IDENTITY.apiOrigin,
  });
  return Object.freeze({
    status: "PASS",
    mode: "dry-run",
    sourceSha,
    databaseConnected: database.connected === true,
    renderServiceId: service.id,
    renderServiceName: service.name,
    renderDeployId: deploy?.id ?? null,
    renderDeployStatus: deploy?.status ?? "none",
    easProjectId: project.projectId,
    easBuildHistoryReadable: Array.isArray(builds),
    easUpdateHistoryReadable: Array.isArray(updates),
    previewIdentityValid: true,
    submissionPerformed: false,
  });
}

export function redactPreflightError(error, secrets = []) {
  let message = String(error?.message ?? error);
  for (const secret of secrets) if (typeof secret === "string" && secret) message = message.split(secret).join("[REDACTED]");
  return message.slice(0, 500);
}
