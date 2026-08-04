import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const FULL_SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = "Zentric-Analytics/Kurioticket.com";
const PREVIEW_MESSAGE = /^Automated safe Preview OTA for ([a-f0-9]{40}); audit run ([0-9]+)$/;
const FORMATTED_PREVIEW_MESSAGE = /^"Automated safe Preview OTA for ([a-f0-9]{40}); audit run ([0-9]+)" \(.+\)$/;
const PREVIEW_BRANCH = "preview";
const PREVIEW_RUNTIME = "preview-0.3.0";

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

function parsePlatforms(value) {
  requireValue(typeof value === "string", "EAS update platforms are malformed.");
  const platforms = value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  requireValue(platforms.length > 0 && platforms.every((item) => item === "android" || item === "ios"), "EAS update platforms are malformed.");
  return [...new Set(platforms)];
}

function parseGeneratedMessage(value) {
  requireValue(typeof value === "string", "EAS update message is malformed.");
  const raw = PREVIEW_MESSAGE.exec(value);
  const formatted = FORMATTED_PREVIEW_MESSAGE.exec(value);
  if (raw || formatted) return { targetSha: (raw ?? formatted)[1], auditRunId: (raw ?? formatted)[2] };
  requireValue(!value.includes("Automated safe Preview OTA"), "Generated Preview update message is malformed.");
  return null;
}

export function normalizePreviewUpdatePage(value) {
  requireValue(value && typeof value === "object" && !Array.isArray(value), "EAS update history page is malformed.");
  requireValue(value.name === PREVIEW_BRANCH, "EAS update history branch mismatch.");
  requireValue(Array.isArray(value.currentPage), "EAS update history currentPage is malformed.");
  return value.currentPage.map((entry) => {
    requireValue(entry && typeof entry === "object" && !Array.isArray(entry), "EAS update history entry is malformed.");
    requireValue(entry.branch === PREVIEW_BRANCH, "EAS update entry branch mismatch.");
    requireValue(entry.runtimeVersion === PREVIEW_RUNTIME, "EAS update entry runtime mismatch.");
    requireValue(typeof entry.group === "string" && entry.group.trim().length > 0, "EAS update group is missing.");
    return {
      branch: entry.branch,
      runtimeVersion: entry.runtimeVersion,
      group: entry.group,
      platforms: parsePlatforms(entry.platforms),
      generatedMessage: parseGeneratedMessage(entry.message),
    };
  });
}

export function inspectPreviewUpdateHistory(value, targetSha) {
  requireValue(FULL_SHA.test(targetSha ?? ""), "Replay target SHA is invalid.");
  requireValue(Array.isArray(value), "EAS update history is malformed.");
  const matching = value.filter((entry) => {
    requireValue(entry && typeof entry === "object" && !Array.isArray(entry), "Normalized EAS update history entry is malformed.");
    requireValue(typeof entry.branch === "string" && typeof entry.runtimeVersion === "string", "Normalized EAS update identity is malformed.");
    requireValue(Array.isArray(entry.platforms), "Normalized EAS update platforms are malformed.");
    return entry.branch === PREVIEW_BRANCH && entry.runtimeVersion === PREVIEW_RUNTIME && entry.platforms.includes("android") && entry.generatedMessage?.targetSha === targetSha;
  });
  return {
    alreadyPublished: matching.length > 0,
    matchingUpdates: matching.length,
    branch: PREVIEW_BRANCH,
    runtimeVersion: PREVIEW_RUNTIME,
    platform: "android",
    historyState: value.length === 0 ? "empty" : "queried",
  };
}

export function classifyReplayLookupFailure(stderr, exitCode) {
  requireValue(Number.isInteger(exitCode) && exitCode !== 0, "Replay lookup failure exit code is invalid.");
  const text = typeof stderr === "string" ? stderr : "";
  if (/nonexistent flag|unknown flag|unexpected argument|not a valid flag/i.test(text)) return "unsupported-command";
  if (/401|unauthorized|not authenticated|authentication/i.test(text)) return "authentication";
  if (/403|forbidden|permission|not authorized/i.test(text)) return "authorization";
  if (/404|project.*not found|could not find.*project/i.test(text)) return "project-resolution";
  if (/\b5\d\d\b|service unavailable|timed? out|network|fetch failed|graphql request failed/i.test(text)) return "service-or-network";
  return "cli-failure";
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
    const normalizedPage = normalizePreviewUpdatePage(page);
    const existing = JSON.parse(readFileSync(process.env.PREVIEW_UPDATE_HISTORY, "utf8"));
    requireValue(Array.isArray(existing), "Combined EAS update history is malformed.");
    writeFileSync(process.env.PREVIEW_UPDATE_HISTORY, `${JSON.stringify([...existing, ...normalizedPage])}\n`);
    if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `page_count=${normalizedPage.length}\n`, { flag: "a" });
    return;
  }
  if (command === "diagnose-replay-failure") {
    const stderr = readFileSync(process.env.PREVIEW_UPDATE_STDERR, "utf8");
    const exitCode = Number(process.env.PREVIEW_UPDATE_EXIT_CODE);
    const classification = classifyReplayLookupFailure(stderr, exitCode);
    console.error(`Preview replay lookup failed closed: category=${classification}; cli=eas-cli@16.17.4; branch=${PREVIEW_BRANCH}; platform=android(local-filter); runtime=${PREVIEW_RUNTIME}(local-filter); exit=${exitCode}.`);
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

