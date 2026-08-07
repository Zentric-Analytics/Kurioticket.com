const EXACT_SHA = /^[0-9a-f]{40}$/;

export const PREVIEW_IDENTITY = Object.freeze({
  repository: "Zentric-Analytics/Kurioticket.com",
  branch: "dev",
  appName: "Kurioticket Preview",
  bundleIdentifier: "com.kurioticket.app.preview",
  scheme: "kurioticket-preview",
  easProjectId: "89f6fd88-c0d7-495a-9e2b-8301b09f407d",
  easProjectFullName: "@zentric-analytics/kurioticket-mobile",
  buildProfile: "preview",
  submitProfile: "preview",
  channel: "preview",
  runtime: "preview-0.3.0",
  apiOrigin: "https://staging.kurioticket.com",
  renderStagingServiceId: "srv-d86ulfgg4nts73bctt20",
});

export function requirePreviewEnvironment(env = process.env) {
  const required = [
    "DATABASE_URL",
    "GITHUB_READ_TOKEN",
    "RENDER_API_KEY",
    "RENDER_STAGING_SERVICE_ID",
    "EXPO_TOKEN",
  ];
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing Preview release-service environment: ${missing.join(", ")}`);
  if (env.RENDER_STAGING_SERVICE_ID !== PREVIEW_IDENTITY.renderStagingServiceId) {
    throw new Error("Render service identity does not match the approved Preview staging service.");
  }
  return Object.freeze({
    databaseUrl: env.DATABASE_URL,
    githubReadToken: env.GITHUB_READ_TOKEN,
    githubStatusToken: env.GITHUB_STATUS_TOKEN || null,
    renderApiKey: env.RENDER_API_KEY,
    renderServiceId: env.RENDER_STAGING_SERVICE_ID,
    expoToken: env.EXPO_TOKEN,
    repository: env.PREVIEW_REPOSITORY || PREVIEW_IDENTITY.repository,
    branch: env.PREVIEW_BRANCH || PREVIEW_IDENTITY.branch,
    pollIntervalMs: parseBoundedInteger(env.PREVIEW_POLL_INTERVAL_MS, 60_000, 15_000, 300_000),
    leaseMs: parseBoundedInteger(env.PREVIEW_LEASE_MS, 300_000, 60_000, 900_000),
    mode: env.PREVIEW_RELEASE_MODE === "active" ? "active" : "dry-run",
    workerId: env.RENDER_INSTANCE_ID || env.HOSTNAME || `worker-${process.pid}`,
  });
}

export function assertExactSha(value, label = "SHA") {
  if (!EXACT_SHA.test(value ?? "")) throw new Error(`${label} must be a full lowercase 40-character Git SHA.`);
  return value;
}

export function assertPreviewIdentity(value) {
  const checks = {
    appName: PREVIEW_IDENTITY.appName,
    bundleIdentifier: PREVIEW_IDENTITY.bundleIdentifier,
    scheme: PREVIEW_IDENTITY.scheme,
    projectId: PREVIEW_IDENTITY.easProjectId,
    profile: PREVIEW_IDENTITY.buildProfile,
    channel: PREVIEW_IDENTITY.channel,
    runtime: PREVIEW_IDENTITY.runtime,
    apiOrigin: PREVIEW_IDENTITY.apiOrigin,
  };
  for (const [key, expected] of Object.entries(checks)) {
    if (value?.[key] !== expected) throw new Error(`Preview identity mismatch for ${key}.`);
  }
  const serialized = JSON.stringify(value).toLowerCase();
  if (serialized.includes("com.kurioticket.app\"") || serialized.includes("production-0.3.0") || serialized.includes("https://kurioticket.com\"")) {
    throw new Error("Production identity is forbidden in Preview delivery.");
  }
  return true;
}

function parseBoundedInteger(raw, fallback, minimum, maximum) {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Configured integer must be between ${minimum} and ${maximum}.`);
  }
  return value;
}
