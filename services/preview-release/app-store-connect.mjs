import { createPrivateKey, sign } from "node:crypto";
import { PREVIEW_IDENTITY } from "./config.mjs";
import { fetchWithDeadline } from "./deadlines.mjs";

const API = "https://api.appstoreconnect.apple.com";

export class AppStoreConnectClient {
  constructor({ issuerId, keyId, privateKey, appId, betaGroupId, betaGroupName, fetchImpl = fetch, now = () => Date.now() }) {
    this.issuerId = issuerId; this.keyId = keyId; this.privateKey = privateKey.replaceAll("\\n", "\n");
    this.appId = appId; this.betaGroupId = betaGroupId; this.betaGroupName = betaGroupName; this.fetch = fetchImpl; this.now = now;
  }

  token() {
    const header = encode({ alg: "ES256", kid: this.keyId, typ: "JWT" });
    const issued = Math.floor(this.now() / 1000);
    const payload = encode({ iss: this.issuerId, iat: issued, exp: issued + 600, aud: "appstoreconnect-v1" });
    const input = `${header}.${payload}`;
    const signature = sign("sha256", Buffer.from(input), { key: createPrivateKey(this.privateKey), dsaEncoding: "ieee-p1363" }).toString("base64url");
    return `${input}.${signature}`;
  }

  async previewContext() {
    const app = await this.request(`/v1/apps/${encodeURIComponent(this.appId)}?fields[apps]=name,bundleId`);
    if (app?.data?.id !== this.appId || app.data?.type !== "apps" || app.data?.attributes?.bundleId !== PREVIEW_IDENTITY.bundleIdentifier) throw new Error("App Store Connect Preview app identity mismatch.");
    const groups = await this.request(`/v1/apps/${encodeURIComponent(this.appId)}/betaGroups?fields[betaGroups]=name,isInternalGroup&limit=200`);
    if (!Array.isArray(groups?.data)) throw new Error("App Store Connect beta-group response is malformed.");
    const exact = groups.data.filter((group) => group?.id === this.betaGroupId && group?.attributes?.name === this.betaGroupName && group?.attributes?.isInternalGroup === true);
    if (exact.length !== 1) throw new Error("Preview internal beta group is missing, ambiguous, or mismatched.");
    return { app: app.data, group: exact[0] };
  }

  async resolveBuild({ version, buildNumber }) {
    if (!/^\d+(?:\.\d+){1,3}$/.test(version) || !/^\d+$/.test(String(buildNumber))) throw new Error("Apple build identity is malformed.");
    const path = `/v1/builds?filter[app]=${encodeURIComponent(this.appId)}&filter[version]=${encodeURIComponent(String(buildNumber))}&include=preReleaseVersion&fields[builds]=version,uploadedDate,processingState,preReleaseVersion&fields[preReleaseVersions]=version,platform&limit=200`;
    const response = await this.request(path);
    if (!Array.isArray(response?.data) || !Array.isArray(response?.included)) throw new Error("App Store Connect build response is malformed.");
    const candidates = response.data.filter((build) => {
      const relation = build?.relationships?.preReleaseVersion?.data;
      const prerelease = response.included.find((item) => item?.type === "preReleaseVersions" && item?.id === relation?.id);
      return build?.type === "builds" && build?.attributes?.version === String(buildNumber) && prerelease?.attributes?.version === version && String(prerelease?.attributes?.platform).toUpperCase() === "IOS";
    });
    if (!candidates.length) return { state: "PROCESSING" };
    if (candidates.length !== 1) throw new Error("App Store Connect returned multiple exact Apple build candidates.");
    const build = candidates[0];
    const state = String(build.attributes?.processingState ?? "").toUpperCase();
    if (state === "PROCESSING") return { state, build };
    if (state !== "VALID") throw new Error(`Apple build processing ended in ${state || "UNKNOWN"}.`);
    return { state: "VALID", build };
  }

  async isAssociated(buildId) {
    for (let page = 0, path = `/v1/betaGroups/${encodeURIComponent(this.betaGroupId)}/relationships/builds?limit=200`; path && page < 10; page += 1) {
      const response = await this.request(path);
      if (!Array.isArray(response?.data)) throw new Error("Apple beta-group build membership is malformed.");
      if (response.data.some((item) => item?.type === "builds" && item?.id === buildId)) return true;
      path = response.links?.next ? new URL(response.links.next).pathname + new URL(response.links.next).search : null;
    }
    return false;
  }

  async associate(buildId) {
    await this.request(`/v1/betaGroups/${encodeURIComponent(this.betaGroupId)}/relationships/builds`, { method: "POST", body: { data: [{ type: "builds", id: buildId }] }, expectNoContent: true });
  }

  async request(path, { method = "GET", body, expectNoContent = false } = {}) {
    const response = await fetchWithDeadline(this.fetch, `${API}${path}`, { method, headers: { Authorization: `Bearer ${this.token()}`, Accept: "application/json", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }, { label: `App Store Connect ${method} ${path.split("?")[0]}` });
    if (!response.ok) throw new Error(`App Store Connect ${method} ${path.split("?")[0]} failed with HTTP ${response.status}.`);
    if (expectNoContent) {
      if (response.status !== 204) throw new Error("App Store Connect association returned an unexpected response.");
      return null;
    }
    const raw = await response.text();
    try { return JSON.parse(raw); } catch { throw new Error("App Store Connect returned malformed JSON."); }
  }
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
