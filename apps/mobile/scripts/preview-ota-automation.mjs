import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const FULL_SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = "Zentric-Analytics/Kurioticket.com";
const PREVIEW_MESSAGE = /^Automated safe Preview OTA for ([a-f0-9]{40}); audit run ([0-9]+)$/;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function resolveTrustedPreviewTarget({ mode, event, targetSha, repository = REPOSITORY }) {
  requireValue(repository === REPOSITORY, "Automatic Preview OTA repository mismatch.");
  requireValue(FULL_SHA.test(targetSha ?? ""), "Preview OTA target must be an exact lowercase SHA.");

  if (mode === "automatic") {
    requireValue(event?.ref === "refs/heads/dev", "Automatic Preview OTA requires a dev push.");
    requireValue(event?.after === targetSha, "Automatic Preview OTA target does not match trusted push metadata.");
    requireValue(event?.repository?.full_name === REPOSITORY, "Automatic Preview OTA event repository mismatch.");
    requireValue(event?.deleted !== true && event?.forced !== true, "Deleted or force-pushed dev events cannot publish Preview OTA.");
    requireValue(FULL_SHA.test(event?.before ?? ""), "Automatic Preview OTA push range is invalid.");
    return { triggerType: "validated-dev-push", targetSha, baselineRef: event.before };
  }

  requireValue(mode === "manual", "Unknown Preview OTA trigger mode.");
  return { triggerType: "manual-break-glass", targetSha, baselineRef: null };
}

function messages(value, result = []) {
  if (Array.isArray(value)) for (const item of value) messages(item, result);
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "message" && typeof item === "string") result.push(item);
      else messages(item, result);
    }
  }
  return result;
}

export function inspectPreviewUpdateHistory(value, targetSha) {
  requireValue(FULL_SHA.test(targetSha ?? ""), "Replay target SHA is invalid.");
  requireValue(value && (Array.isArray(value) || typeof value === "object"), "EAS update history is malformed.");
  const matching = messages(value).filter((message) => PREVIEW_MESSAGE.test(message) && message.includes(targetSha));
  return { alreadyPublished: matching.length > 0, matchingMessages: matching.length };
}

export function validateStagingReadiness({ health, config, targetSha }) {
  requireValue(FULL_SHA.test(targetSha ?? ""), "Staging target SHA is invalid.");
  for (const [name, body] of [["health", health], ["config", config]]) {
    requireValue(body?.data?.environment === "staging", `Staging ${name} environment mismatch.`);
    requireValue(body?.data?.releaseReadiness?.commitSha === targetSha, `Staging ${name} has not deployed the target SHA.`);
    requireValue(body?.data?.releaseReadiness?.sandboxTravelSafe === true, `Staging ${name} travel safety is not ready.`);
    requireValue(body?.data?.releaseReadiness?.emailPolicyRestricted === true, `Staging ${name} email policy is not restricted.`);
  }
  requireValue(config?.data?.features?.externalCheckout === false, "Staging external checkout is enabled.");
  return { ready: true, commitSha: targetSha, externalCheckoutDisabled: true, sandboxTravelSafe: true, emailPolicyRestricted: true };
}

export async function waitForStaging({ origin, targetSha, attempts = 20, delayMs = 30000, fetchImpl = fetch, sleep = (ms) => new Promise((done) => setTimeout(done, ms)) }) {
  requireValue(origin === "https://staging.kurioticket.com", "Unexpected staging origin.");
  requireValue(Number.isInteger(attempts) && attempts > 0 && attempts <= 30, "Staging retry count is invalid.");
  let lastError = new Error("Staging readiness was not checked.");
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const [healthResponse, configResponse] = await Promise.all([
        fetchImpl(`${origin}/api/mobile/v1/health`, { cache: "no-store" }),
        fetchImpl(`${origin}/api/mobile/v1/config`, { cache: "no-store" }),
      ]);
      requireValue(healthResponse.ok, `Staging health returned HTTP ${healthResponse.status}.`);
      requireValue(configResponse.ok, `Staging config returned HTTP ${configResponse.status}.`);
      const result = validateStagingReadiness({ health: await healthResponse.json(), config: await configResponse.json(), targetSha });
      return { ...result, attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < attempts) await sleep(delayMs);
    }
  }
  throw new Error(`Staging did not reach the approved Preview SHA within the bounded wait: ${lastError.message}`);
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

async function main() {
  const [command] = process.argv.slice(2);
  const root = resolve(import.meta.dirname, "../../..");
  const targetSha = process.env.PREVIEW_TARGET_SHA;
  if (command === "context") {
    const mode = process.env.PREVIEW_TRIGGER_MODE;
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    const context = resolveTrustedPreviewTarget({ mode, event, targetSha, repository: process.env.GITHUB_REPOSITORY });
    requireValue(git(root, "rev-parse", "HEAD") === targetSha, "Checked-out Preview SHA mismatch.");
    git(root, "merge-base", "--is-ancestor", targetSha, "origin/dev");
    writeFileSync(process.env.PREVIEW_CONTEXT_OUTPUT, `${JSON.stringify(context, null, 2)}\n`);
    if (process.env.GITHUB_OUTPUT) {
      writeFileSync(process.env.GITHUB_OUTPUT, `target_sha=${targetSha}\ntrigger_type=${context.triggerType}\n`, { flag: "a" });
    }
    return;
  }
  if (command === "replay") {
    const history = JSON.parse(readFileSync(process.env.PREVIEW_UPDATE_HISTORY, "utf8"));
    const result = inspectPreviewUpdateHistory(history, targetSha);
    writeFileSync(process.env.PREVIEW_REPLAY_OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
    if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `already_published=${result.alreadyPublished}\n`, { flag: "a" });
    return;
  }
  if (command === "merge-history-page") {
    const page = JSON.parse(readFileSync(process.env.PREVIEW_UPDATE_PAGE, "utf8"));
    requireValue(Array.isArray(page), "EAS update history page is malformed.");
    const existing = JSON.parse(readFileSync(process.env.PREVIEW_UPDATE_HISTORY, "utf8"));
    requireValue(Array.isArray(existing), "Combined EAS update history is malformed.");
    writeFileSync(process.env.PREVIEW_UPDATE_HISTORY, `${JSON.stringify([...existing, ...page])}\n`);
    if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `page_count=${page.length}\n`, { flag: "a" });
    return;
  }
  if (command === "wait-staging") {
    const result = await waitForStaging({ origin: "https://staging.kurioticket.com", targetSha });
    writeFileSync(process.env.PREVIEW_STAGING_OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  throw new Error("Unknown Preview OTA automation command.");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
