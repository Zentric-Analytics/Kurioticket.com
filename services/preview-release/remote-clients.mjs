import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { PREVIEW_IDENTITY, assertExactSha } from "./config.mjs";
import { normalizePreviewUpdatePage } from "../../apps/mobile/scripts/preview-ota-automation.mjs";

const exec = promisify(execFile);

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
  async createDeploy(sha) {
    assertExactSha(sha);
    const deploy = await this.request(`/services/${this.serviceId}/deploys`, { method: "POST", body: { commitId: sha, clearCache: "do_not_clear" } });
    if (!deploy?.id) throw new Error("Render create-deploy response has no deployment ID.");
    return deploy;
  }
  async getDeploy(id) { return this.request(`/services/${this.serviceId}/deploys/${id}`); }
  async getService() {
    if (this.serviceId !== PREVIEW_IDENTITY.renderStagingServiceId) throw new Error("Unapproved Render service identity.");
    const service = await this.request(`/services/${this.serviceId}`);
    if (service?.id !== this.serviceId || typeof service?.name !== "string") throw new Error("Render service response is malformed or mismatched.");
    return service;
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
  async request(path, { method = "GET", body } = {}) {
    const response = await this.fetch(`https://api.render.com/v1${path}`, { method, headers: { Accept: "application/json", Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`Render API ${method} ${path} failed with HTTP ${response.status}.`);
    return response.json();
  }
}

export class EasClient {
  constructor({ expoToken, cwd, command = process.platform === "win32" ? "npx.cmd" : "npx" }) { this.expoToken = expoToken; this.cwd = cwd; this.command = command; }
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
      all.push(...page);
      if (page.length < 50) return all;
    }
    throw new Error("EAS build history exceeded the bounded pagination limit.");
  }
  async createIosBuild() {
    const value = await this.run(["eas-cli@16.17.4", "build", "--platform", "ios", "--profile", "preview", "--non-interactive", "--freeze-credentials", "--no-wait", "--auto-submit-with-profile", "preview", "--json"]);
    const builds = Array.isArray(value) ? value : [value];
    if (builds.length !== 1 || typeof builds[0]?.id !== "string") throw new Error("EAS build creation returned an ambiguous build ID.");
    return builds[0];
  }
  async createAndroidBuild() {
    const value = await this.run(["eas-cli@16.17.4", "build", "--platform", "android", "--profile", "preview", "--non-interactive", "--freeze-credentials", "--no-wait", "--json"]);
    const builds = Array.isArray(value) ? value : [value];
    if (builds.length !== 1 || typeof builds[0]?.id !== "string") throw new Error("EAS Android build creation returned an ambiguous build ID.");
    return builds[0];
  }
  async viewBuild(id) { return this.run(["eas-cli@16.17.4", "build:view", id, "--json"]); }
  async publishUpdate(message) {
    const value = await this.run(["eas-cli@16.17.4", "update", "--channel", "preview", "--platform", "all", "--message", message, "--non-interactive", "--json"]);
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
  async submitIosBuild(buildId) {
    const value = await this.run(["eas-cli@16.17.4", "submit", "--platform", "ios", "--profile", "preview", "--id", buildId, "--no-wait", "--non-interactive", "--json"]);
    if (!value?.id && !Array.isArray(value)) throw new Error("EAS recovery submission response is malformed.");
    return Array.isArray(value) ? value[0] : value;
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
      const { stdout } = await exec(this.command, args, {
        cwd: this.cwd,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          EXPO_TOKEN: this.expoToken,
          APP_VARIANT: "preview",
          APP_BUILD_MODE: "release",
          EXPO_PUBLIC_API_BASE_URL: PREVIEW_IDENTITY.apiOrigin,
        },
      });
      await import("node:fs/promises").then(({ writeFile }) => writeFile(stdoutPath, stdout, { mode: 0o600 }));
      return readFile(stdoutPath, "utf8");
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}

export async function exactCheckout({ repository, token, sha }) {
  assertExactSha(sha);
  const directory = await mkdtemp(join(tmpdir(), "kurioticket-preview-"));
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

export async function prepareCheckout(directory) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  await exec(npm, ["ci", "--ignore-scripts"], { cwd: directory, maxBuffer: 10 * 1024 * 1024 });
  await exec(npm, ["ci", "--ignore-scripts"], { cwd: join(directory, "apps/mobile"), maxBuffer: 10 * 1024 * 1024 });
}

export async function nativeFingerprints(directory) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const cwd = join(directory, "apps/mobile");
  const result = {};
  for (const platform of ["ios", "android"]) {
    const { stdout } = await exec(command, ["fingerprint", "fingerprint:generate", "--platform", platform], { cwd, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
    let value;
    try { value = JSON.parse(stdout); } catch { throw new Error(`Expo ${platform} fingerprint output is malformed.`); }
    if (!/^[0-9a-f]{40,128}$/.test(value?.hash ?? "")) throw new Error(`Expo ${platform} fingerprint has no valid hash.`);
    result[platform] = value.hash;
  }
  return Object.freeze(result);
}
