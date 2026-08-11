import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { PREVIEW_IDENTITY, assertExactSha } from "./config.mjs";
import { normalizePreviewUpdatePage } from "../../apps/mobile/scripts/preview-ota-automation.mjs";

const exec = promisify(execFile);
const runtimeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function withSourceAttestedPreviewIdentity(build, platform = "ios") {
  return {
    ...build,
    sourceAttestedProjectId: PREVIEW_IDENTITY.easProjectId,
    sourceAttestedPlatform: platform,
    sourceAttestedBuildProfile: "preview",
    sourceAttestedAppIdentifier: PREVIEW_IDENTITY.bundleIdentifier,
    sourceAttestedRuntimeVersion: PREVIEW_IDENTITY.runtimeVersion,
    sourceAttestedChannel: PREVIEW_IDENTITY.channel,
  };
}

export class GitHubClient {
  constructor({ readToken, statusToken = null, repository = PREVIEW_IDENTITY.repository, fetchImpl = fetch }) {
    this.readToken = readToken; this.statusToken = statusToken; this.repository = repository; this.fetch = fetchImpl;
  }
  async latestDevSha() {
    const value = await this.request(`/repos/${this.repository}/git/ref/heads/dev`);
    return assertExactSha(value?.object?.sha, "GitHub dev SHA");
  }
  async compare(base, head) {
    assertExactSha(base, "Compare base"); assertExactSha(head, "Compare head");
    const value = await this.request(`/repos/${this.repository}/compare/${base}...${head}`);
    if (value.status !== "ahead" && value.status !== "identical") throw new Error("Target SHA is not a forward dev descendant.");
    if (!Array.isArray(value.files)) throw new Error("GitHub compare response is malformed.");
    return value.files.map(({ filename }) => filename);
  }
  async report(sha, state, description, targetUrl) {
    if (!this.statusToken) return { skipped: true, reason: "GITHUB_STATUS_TOKEN is not configured" };
    assertExactSha(sha);
    return this.request(`/repos/${this.repository}/statuses/${sha}`, { method: "POST", token: this.statusToken, body: { state, description: description.slice(0, 140), context: "kurioticket/preview-release", target_url: targetUrl || undefined } });
  }
  async request(path, { method = "GET", body, token = this.readToken } = {}) {
    const response = await this.fetch(`https://api.github.com${path}`, { method, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`GitHub API ${method} ${path} failed with HTTP ${response.status}.`);
    return response.status === 204 ? null : response.json();
  }
}

export class RenderClient {
  constructor({ apiKey, serviceId, fetchImpl = fetch }) { this.apiKey = apiKey; this.serviceId = serviceId; this.fetch = fetchImpl; }
  async createDeploy(sha, { excludeIds = [], attempts = 4, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
    assertExactSha(sha);
    const excluded = new Set(excludeIds);
    for (const deploy of await this.findDeploysBySha(sha)) excluded.add(deploy.id);
    try {
      const deploy = await this.request(`/services/${this.serviceId}/deploys`, { method: "POST", body: { commitId: sha, clearCache: "do_not_clear" } });
      if (!deploy?.id) throw new Error("Render create-deploy response has no deployment ID.");
      return deploy;
    } catch (error) {
      // A failed/truncated response does not prove the mutation failed. Reconcile
      // remote history before returning so a later cycle cannot create a duplicate.
      // Only a deployment absent before the POST can prove this mutation was accepted.
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const matches = (await this.findDeploysBySha(sha)).filter((deploy) => !excluded.has(deploy.id));
        if (matches.length) return matches[0];
        if (attempt + 1 < attempts) await sleep(1_000);
      }
      throw error;
    }
  }
  async getDeploy(id) { return this.request(`/services/${this.serviceId}/deploys/${id}`); }
  async getService() {
    if (this.serviceId !== PREVIEW_IDENTITY.renderStagingServiceId) throw new Error("Unapproved Render service identity.");
    const service = await this.request(`/services/${this.serviceId}`);
    if (service?.id !== this.serviceId || typeof service?.name !== "string") throw new Error("Render service response is malformed or mismatched.");
    return service;
  }
  async getPreviewWorkerService() {
    if (this.serviceId !== PREVIEW_IDENTITY.renderWorkerServiceId) throw new Error("Unapproved Render worker identity.");
    const service = await this.request(`/services/${this.serviceId}`);
    const repository = String(service?.repo ?? "").replace(/\.git$/, "").replace(/^https?:\/\//, "");
    const expectedRepository = `github.com/${PREVIEW_IDENTITY.repository}`;
    const autoDeployOnCommit = service?.autoDeployTrigger === "commit"
      || (service?.autoDeployTrigger === undefined && service?.autoDeploy === true);
    const checks = [
      [service?.id === this.serviceId, "Render Preview worker ID mismatch."],
      [service?.type === "background_worker", "Render Preview worker type mismatch."],
      [service?.branch === PREVIEW_IDENTITY.branch, "Render Preview worker branch mismatch."],
      [repository === expectedRepository, "Render Preview worker repository mismatch."],
      [autoDeployOnCommit, "Render Preview worker auto-deploy must be On Commit."],
    ];
    for (const [passes, message] of checks) if (!passes) throw new Error(message);
    return { ...service, autoDeployOnCommit };
  }
  async latestDeploy() {
    if (this.serviceId !== PREVIEW_IDENTITY.renderStagingServiceId) throw new Error("Unapproved Render service identity.");
    const value = await this.request(`/services/${this.serviceId}/deploys?limit=1`);
    if (!Array.isArray(value)) throw new Error("Render deploy history response is malformed.");
    if (!value.length) return null;
    const deploy = value[0]?.deploy ?? value[0];
    if (typeof deploy?.id !== "string" || typeof deploy?.status !== "string") throw new Error("Render latest deployment response is malformed.");
    return deploy;
  }
  async findDeploysBySha(sha) {
    assertExactSha(sha);
    const value = await this.request(`/services/${this.serviceId}/deploys?limit=50`);
    if (!Array.isArray(value)) throw new Error("Render deploy history response is malformed.");
    return value.map((entry) => entry?.deploy ?? entry).filter((deploy) => {
      if (!deploy?.id || typeof deploy?.status !== "string") throw new Error("Render deploy history entry is malformed.");
      const commit = deploy.commit?.id ?? deploy.commitId;
      if (typeof commit !== "string") throw new Error("Render deploy history entry has no commit identity.");
      return commit === sha;
    });
  }
  async request(path, { method = "GET", body } = {}) {
    const response = await this.fetch(`https://api.render.com/v1${path}`, { method, headers: { Accept: "application/json", Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`Render API ${method} ${path} failed with HTTP ${response.status}.`);
    const raw = await response.text();
    if (!raw.trim()) throw new Error(`Render API ${method} ${path} returned empty JSON.`);
    try { return JSON.parse(raw); } catch { throw new Error(`Render API ${method} ${path} returned malformed JSON.`); }
  }
}

export class EasClient {
  constructor({ expoToken, cwd, command = process.platform === "win32" ? "npx.cmd" : "npx", fetchImpl = fetch }) { this.expoToken = expoToken; this.cwd = cwd; this.command = command; this.fetch = fetchImpl; }
  async listIosBuilds(targetSha) {
    return this.listBuilds("ios", targetSha);
  }
  async listAndroidBuilds(targetSha) {
    return this.listBuilds("android", targetSha);
  }
  async projectInfo() {
    const raw = await this.runText(["eas-cli@16.17.4", "project:info"]);
    const text = raw.replace(/\u001b\[[0-9;]*m/g, "");
    const names = [...text.matchAll(/^fullName\s+(.+)$/gmi)].map((match) => match[1].trim());
    const ids = [...text.matchAll(/^ID\s+([0-9a-f-]{36})$/gmi)].map((match) => match[1]);
    if (names.length !== 1 || ids.length !== 1 || names[0] !== PREVIEW_IDENTITY.easProjectFullName || ids[0] !== PREVIEW_IDENTITY.easProjectId) {
      throw new Error("EAS project response is malformed or mismatched.");
    }
    return { projectId: ids[0], fullName: names[0] };
  }
  async previewBuildHistory() {
    const value = await this.run(["eas-cli@16.17.4", "build:list", "--platform", "ios", "--profile", "preview", "--limit", "1", "--json", "--non-interactive"]);
    if (!Array.isArray(value)) throw new Error("EAS Preview build history response is malformed.");
    return value;
  }
  async listBuilds(platform, targetSha) {
    assertExactSha(targetSha);
    const all = [];
    for (let offset = 0; offset < 500; offset += 50) {
      const page = await this.run(["eas-cli@16.17.4", "build:list", "--platform", platform, "--profile", "preview", "--git-commit-hash", targetSha, "--limit", "50", "--offset", String(offset), "--json", "--non-interactive"]);
      if (!Array.isArray(page)) throw new Error("EAS build:list response must be an array.");
      all.push(...page.map((build) => withSourceAttestedPreviewIdentity(build, platform)));
      if (page.length < 50) return all;
    }
    throw new Error("EAS build history exceeded the bounded pagination limit.");
  }
  async createIosBuild() {
    const value = await this.run(["eas-cli@16.17.4", "build", "--platform", "ios", "--profile", "preview", "--non-interactive", "--freeze-credentials", "--no-wait", "--auto-submit-with-profile", "preview", "--json"]);
    const builds = Array.isArray(value) ? value : [value];
    if (builds.length !== 1 || typeof builds[0]?.id !== "string") throw new Error("EAS build creation returned an ambiguous build ID.");
    console.log(JSON.stringify({ event: "preview-release-eas-build-created", platform: "ios", buildId: builds[0].id }));
    return builds[0];
  }
  async createAndroidBuild() {
    const value = await this.run(["eas-cli@16.17.4", "build", "--platform", "android", "--profile", "preview", "--non-interactive", "--freeze-credentials", "--no-wait", "--json"]);
    const builds = Array.isArray(value) ? value : [value];
    if (builds.length !== 1 || typeof builds[0]?.id !== "string") throw new Error("EAS Android build creation returned an ambiguous build ID.");
    console.log(JSON.stringify({ event: "preview-release-eas-build-created", platform: "android", buildId: builds[0].id }));
    return builds[0];
  }
  async viewBuild(id) {
    let build;
    try { build = await this.run(["eas-cli@16.17.4", "build:view", id, "--json"]); }
    catch (error) {
      if (isExactEasObjectMissing(error, "build", id)) throw new EasRemoteObjectUnavailableError("build", id, error);
      throw error;
    }
    if (!build || typeof build !== "object" || Array.isArray(build)) throw new Error("EAS build:view response must be an object.");
    const platform = String(build.platform ?? "").toLowerCase();
    if (!['ios', 'android'].includes(platform)) throw new Error("EAS build:view response has an invalid platform.");
    return withSourceAttestedPreviewIdentity(build, platform);
  }
  async compareBuildFingerprint(buildId, expectedFingerprint) {
    // Supplying a hash and one build makes EAS compare the uploaded hash with
    // the local directory. Comparing the build to itself reads the uploaded
    // build fingerprint twice and avoids any checkout/platform line-ending drift.
    const value = await this.run(["eas-cli@16.17.4", "fingerprint:compare", "--build-id", buildId, "--build-id", buildId, "--json", "--non-interactive"]);
    const expectedHash = value?.fingerprint1?.hash;
    const buildHash = value?.fingerprint2?.hash;
    if (expectedHash !== expectedFingerprint || buildHash !== expectedFingerprint) {
      throw new Error(`EAS build ${buildId} fingerprint does not match the canonical Preview fingerprint.`);
    }
    return Object.freeze({ expectedHash, buildHash });
  }
  async listIosSubmissions() {
    const query = `query PreviewIosSubmissions($appId: String!, $limit: Int!, $offset: Int!) {
      app { byId(appId: $appId) { id submissions(filter: { platform: IOS }, limit: $limit, offset: $offset) {
        id status platform createdAt completedAt app { id } submittedBuild { id }
      } } }
    }`;
    const all = [];
    for (let offset = 0; offset < 500; offset += 50) {
      const response = await this.fetch("https://api.expo.dev/graphql", {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${this.expoToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { appId: PREVIEW_IDENTITY.easProjectId, limit: 50, offset } }),
      });
      if (!response.ok) throw new Error(`Expo GraphQL submission history failed with HTTP ${response.status}.`);
      const raw = await response.text();
      let value;
      try { value = JSON.parse(raw); } catch { throw new Error("Expo GraphQL submission history returned malformed JSON."); }
      if (Array.isArray(value?.errors) && value.errors.length) throw new Error("Expo GraphQL submission history returned errors.");
      const app = value?.data?.app?.byId;
      if (app?.id !== PREVIEW_IDENTITY.easProjectId || !Array.isArray(app?.submissions)) throw new Error("Expo GraphQL submission history is malformed or project-mismatched.");
      all.push(...app.submissions);
      if (app.submissions.length < 50) return all;
    }
    throw new Error("Expo submission history exceeded the bounded pagination limit.");
  }
  async publishUpdate(message, platform) {
    if (platform !== "ios" && platform !== "android") throw new Error("EAS Update platform is invalid.");
    const value = await this.run(["eas-cli@16.17.4", "update", "--channel", "preview", "--platform", platform, "--message", message, "--non-interactive", "--json"]);
    const entries = Array.isArray(value) ? value : [value];
    if (!entries.length || entries.some((entry) => !entry?.id && !entry?.group)) throw new Error("EAS Update result is malformed.");
    return entries;
  }
  async listUpdates() {
    const all = [];
    for (let offset = 0; offset < 500; offset += 50) {
      const value = await this.run(["eas-cli@16.17.4", "update:list", "--branch", "preview", "--limit", "50", "--offset", String(offset), "--json", "--non-interactive"]);
      const page = Array.isArray(value) ? value : normalizePreviewUpdatePage(value);
      if (!Array.isArray(page)) throw new Error("EAS update:list response is malformed.");
      all.push(...page);
      if (page.length < 50) return all;
    }
    throw new Error("EAS update history exceeded the bounded pagination limit.");
  }
  async run(args) {
    const raw = await this.runText(args);
    if (!raw.trim()) throw new Error(`EAS command ${args[1]} returned empty stdout.`);
    return JSON.parse(raw);
  }
  async runText(args) {
    const directory = await mkdtemp(join(tmpdir(), "kurioticket-eas-"));
    try {
      const stdoutPath = join(directory, "stdout.json");
      const isUpdatePublish = args[1] === "update";
      const platformIndex = args.indexOf("--platform");
      const platform = platformIndex >= 0 ? args[platformIndex + 1] : null;
      const startedAt = Date.now();
      console.log(JSON.stringify({ event: "preview-release-eas-command-started", command: args[1], platform, rssBytes: process.memoryUsage().rss }));
      const { stdout } = await exec(this.command, args, {
        cwd: this.cwd,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: isUpdatePublish ? 20 * 60 * 1000 : 5 * 60 * 1000,
        env: {
          ...process.env,
          EXPO_TOKEN: this.expoToken,
          APP_VARIANT: "preview",
          APP_BUILD_MODE: "release",
          EXPO_PUBLIC_API_BASE_URL: PREVIEW_IDENTITY.apiOrigin,
          // Metro needs more heap than the lightweight EAS inspection commands.
          // Keep the publish child bounded well below the Standard worker's 2 GB
          // instance limit while leaving headroom for npm, the worker, and native
          // allocator overhead.
          NODE_OPTIONS: `--max-old-space-size=${isUpdatePublish ? 512 : 128}`,
          MALLOC_ARENA_MAX: "2",
        },
      });
      await import("node:fs/promises").then(({ writeFile }) => writeFile(stdoutPath, stdout, { mode: 0o600 }));
      console.log(JSON.stringify({ event: "preview-release-eas-command-complete", command: args[1], platform, durationMs: Date.now() - startedAt, rssBytes: process.memoryUsage().rss }));
      return readFile(stdoutPath, "utf8");
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}

export class EasRemoteObjectUnavailableError extends Error {
  constructor(kind, remoteId, cause) {
    super(`EAS ${kind} ${remoteId} is permanently unavailable.`);
    this.name = "EasRemoteObjectUnavailableError";
    this.kind = kind;
    this.remoteId = remoteId;
    this.cause = cause;
  }
}

export function isExactEasObjectMissing(error, kind, remoteId) {
  if (kind !== "build" || !/^[0-9a-f-]{36}$/i.test(String(remoteId ?? ""))) return false;
  const output = [error?.stderr, error?.stdout, error?.message].filter((value) => typeof value === "string").join("\n");
  const escaped = String(remoteId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^Build with id ['\"]${escaped}['\"] does not exist\\.$`, "mi").test(output);
}

export function createExactCheckoutDirectory(workspaceRoot = runtimeRoot) {
  return mkdtemp(join(workspaceRoot, ".kurioticket-preview-"));
}

export async function exactCheckout({ repository, token, sha }) {
  assertExactSha(sha);
  // Keep exact checkouts on the immutable worker artifact's filesystem. Render
  // mounts /tmp separately, which prevents prepareCheckout from hard-linking the
  // already-built dependency trees without copying their full storage footprint.
  const directory = await createExactCheckoutDirectory();
  const remote = `https://github.com/${repository}.git`;
  try {
    await exec("git", ["init", "--quiet"], { cwd: directory });
    await exec("git", ["remote", "add", "origin", remote], { cwd: directory });
    await exec("git", ["fetch", "--quiet", "--depth", "1", "origin", sha], {
      cwd: directory,
      env: gitAuthEnvironment(token),
    });
    await exec("git", ["checkout", "--quiet", "--detach", "FETCH_HEAD"], { cwd: directory });
    const { stdout } = await exec("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" });
    if (stdout.trim() !== sha) throw new Error("Exact checkout SHA verification failed.");
    return { directory, cleanup: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
}

export async function exactChangeSet({ directory, repository, token, previousSha, targetSha }) {
  assertExactSha(previousSha, "Previous SHA");
  assertExactSha(targetSha, "Target SHA");
  const auth = gitAuthEnvironment(token);
  await exec("git", ["fetch", "--quiet", "--unshallow", "origin", PREVIEW_IDENTITY.branch], { cwd: directory, env: auth });
  await exec("git", ["cat-file", "-e", `${previousSha}^{commit}`], { cwd: directory });
  const { stdout: ancestor } = await exec("git", ["merge-base", "--is-ancestor", previousSha, targetSha], { cwd: directory, encoding: "utf8" }).catch((error) => {
    throw new Error(`Previous completed SHA is not an ancestor of target SHA: ${error.code ?? "unknown"}.`);
  });
  void ancestor;
  const { stdout } = await exec("git", ["diff", "--name-only", "--no-renames", `${previousSha}..${targetSha}`], { cwd: directory, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const files = stdout.split(/\r?\n/).filter(Boolean);
  if (files.some((file) => file.includes("\\"))) throw new Error("Exact change-set output is malformed.");
  return files;
}

export function gitAuthEnvironment(token, baseEnvironment = process.env) {
  if (typeof token !== "string" || token.length < 8) throw new Error("GitHub read token is missing or malformed.");
  const credentials = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
  return {
    ...baseEnvironment,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.extraHeader",
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${credentials}`,
  };
}

export async function prepareCheckout(directory, { dependencyRoot = runtimeRoot, commandRunner = exec, allowRootScriptDrift = false } = {}) {
  const manifests = ["package.json", "package-lock.json", "apps/mobile/package.json", "apps/mobile/package-lock.json"];
  for (const manifest of manifests) {
    const [built, target] = await Promise.all([
      readFile(join(dependencyRoot, manifest)),
      readFile(join(directory, manifest)),
    ]);
    if (built.equals(target)) continue;
    if (manifest === "package.json" && allowRootScriptDrift) {
      const dependencyFields = ["packageManager", "engines", "workspaces", "dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "overrides"];
      const builtPackage = JSON.parse(built.toString("utf8"));
      const targetPackage = JSON.parse(target.toString("utf8"));
      const builtDependencies = Object.fromEntries(dependencyFields.map((field) => [field, builtPackage[field] ?? null]));
      const targetDependencies = Object.fromEntries(dependencyFields.map((field) => [field, targetPackage[field] ?? null]));
      if (JSON.stringify(builtDependencies) === JSON.stringify(targetDependencies)) continue;
    }
    throw new Error(`Exact checkout dependency manifest differs from the immutable worker build: ${manifest}.`);
  }
  // Exact-checkout validation and delivery execute only mobile tooling. Reusing
  // the unrelated root dependency tree doubles filesystem traversal pressure on
  // the 512 MB Starter worker without participating in Expo resolution.
  for (const relative of ["apps/mobile/node_modules"]) {
    const source = join(dependencyRoot, relative);
    const destination = join(directory, relative);
    const metadata = await stat(source);
    if (!metadata.isDirectory()) throw new Error(`Immutable worker dependency tree is missing: ${relative}.`);
    // Hard-linked files retain checkout-local paths for Expo fingerprint stability while
    // sharing the immutable Render build artifact's storage and avoiding another npm ci.
    await commandRunner("cp", ["-al", "--", source, destination], { maxBuffer: 10 * 1024 * 1024 });
  }
}

export async function nativeFingerprints(directory, { commandRunner = exec, expoToken = process.env.EXPO_TOKEN } = {}) {
  if (!expoToken?.trim()) throw new Error("Canonical Preview fingerprinting requires EXPO_TOKEN to load the EAS Preview environment.");
  const cwd = join(directory, "apps/mobile");
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const platforms = ["ios", "android"];
  const batchStartedAt = Date.now();
  console.log(JSON.stringify({ event: "preview-release-fingerprints-started", platforms, rssBytes: process.memoryUsage().rss }));

  const settled = await Promise.allSettled(platforms.map(async (platform) => {
    const startedAt = Date.now();
    console.log(JSON.stringify({ event: "preview-release-fingerprint-started", platform, rssBytes: process.memoryUsage().rss }));
    const fingerprintCommand = `npx eas-cli@16.17.4 fingerprint:generate --build-profile preview --platform ${platform} --json --non-interactive`;
    const { stdout } = await commandRunner(command, ["eas-cli@16.17.4", "env:exec", "preview", fingerprintCommand, "--non-interactive"], {
      cwd,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 5 * 60 * 1000,
      env: {
        ...process.env,
        EXPO_TOKEN: expoToken,
        APP_VARIANT: "preview",
        APP_BUILD_MODE: "release",
        EXPO_PUBLIC_API_BASE_URL: PREVIEW_IDENTITY.apiOrigin,
        NODE_OPTIONS: "--max-old-space-size=192",
        MALLOC_ARENA_MAX: "2",
      },
    });
    let value;
    try { value = JSON.parse(stdout.slice(stdout.indexOf("{"))); } catch { throw new Error(`Expo ${platform} fingerprint output is malformed.`); }
    if (!/^[0-9a-f]{40,128}$/.test(value?.hash ?? "")) throw new Error(`Expo ${platform} fingerprint has no valid hash.`);
    console.log(JSON.stringify({ event: "preview-release-fingerprint-complete", platform, durationMs: Date.now() - startedAt, rssBytes: process.memoryUsage().rss }));
    return [platform, value.hash];
  }));

  const result = {};
  const failures = [];
  for (let index = 0; index < platforms.length; index += 1) {
    const platform = platforms[index];
    const outcome = settled[index];
    if (outcome.status === "fulfilled") {
      const [, hash] = outcome.value;
      result[platform] = hash;
    } else {
      failures.push({ platform, error: outcome.reason });
    }
  }

  if (failures.length === 1) throw failures[0].error;
  if (failures.length > 1) {
    const details = failures.map(({ platform, error }) => `${platform}: ${error instanceof Error ? error.message : String(error)}`).join("; ");
    throw new AggregateError(failures.map(({ error }) => error), `Parallel native fingerprint generation failed for ${failures.map(({ platform }) => platform).join(", ")}: ${details}`);
  }

  console.log(JSON.stringify({ event: "preview-release-fingerprints-complete", platforms, durationMs: Date.now() - batchStartedAt, rssBytes: process.memoryUsage().rss }));
  return Object.freeze(result);
}
