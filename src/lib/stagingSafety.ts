export type PublicEnvironment = "staging" | "production";

const STAGING_HOST = "staging.kurioticket.com";
const EMAIL_ADDRESS = /^[^\s,@<>]+@[^\s,@<>]+\.[^\s,@<>]+$/;

function normalized(value: string | undefined) {
  return value?.trim().toLowerCase() || "";
}

function configuredHost(value: string | undefined) {
  try {
    return new URL(value || "").hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isStagingEnvironment() {
  return (
    normalized(process.env.TRAVEL_PROVIDER_MODE) === "staging" ||
    configuredHost(process.env.NEXT_PUBLIC_APP_URL) === STAGING_HOST ||
    configuredHost(process.env.NEXTAUTH_URL) === STAGING_HOST
  );
}

export function getPublicEnvironment(): PublicEnvironment {
  return isStagingEnvironment() ? "staging" : "production";
}

export function getStagingProviderSafety() {
  if (!isStagingEnvironment()) return { safe: true as const };

  if (
    configuredHost(process.env.NEXT_PUBLIC_APP_URL) !== STAGING_HOST ||
    configuredHost(process.env.NEXTAUTH_URL) !== STAGING_HOST
  ) {
    return { safe: false as const, reason: "staging_canonical_urls_required" };
  }
  if (normalized(process.env.TRAVEL_PROVIDER_MODE) !== "staging") {
    return { safe: false as const, reason: "staging_provider_mode_required" };
  }
  if (normalized(process.env.DUFFEL_API_MODE) !== "test") {
    return { safe: false as const, reason: "staging_provider_test_mode_required" };
  }
  if (normalized(process.env.ALLOW_SANDBOX_PROVIDERS) !== "true") {
    return { safe: false as const, reason: "staging_sandbox_permission_required" };
  }
  if (!process.env.DUFFEL_API_KEY?.trim()) {
    return { safe: false as const, reason: "staging_provider_credential_required" };
  }

  return { safe: true as const };
}

export function assertStagingAuthenticationSafety() {
  if (!isStagingEnvironment()) return;

  if (
    configuredHost(process.env.NEXT_PUBLIC_APP_URL) !== STAGING_HOST ||
    configuredHost(process.env.NEXTAUTH_URL) !== STAGING_HOST
  ) {
    throw new Error("Staging authentication URLs are not safely configured.");
  }

  if (!process.env.AUTH_SECRET?.trim() || !process.env.NEXTAUTH_SECRET?.trim()) {
    throw new Error("Staging authentication secrets are not configured.");
  }
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;
  if (!googleClientId?.trim() || !googleClientSecret?.trim()) {
    throw new Error("Staging authentication provider credentials are not configured.");
  }
}

function stagingEmailAllowlist() {
  const configured = process.env.STAGING_EMAIL_ALLOWED_RECIPIENTS || "";
  const entries = configured.split(",").map((value) => value.trim().toLowerCase());
  if (!configured.trim() || entries.some((value) => !value || !EMAIL_ADDRESS.test(value))) {
    throw new Error("Staging email allowlist is not safely configured.");
  }
  return new Set(entries);
}

function singleEmailAddress(value: string, allowDisplayName = false) {
  const normalizedValue = value.trim().toLowerCase();
  const displayNameMatch = normalizedValue.match(/^[^<>,]+<([^<>,]+)>$/);
  if (displayNameMatch && !allowDisplayName) return "";
  const address = displayNameMatch?.[1]?.trim() || normalizedValue;
  return EMAIL_ADDRESS.test(address) && !/[;,]/.test(normalizedValue) ? address : "";
}

function isStagingLabelledSender(sender: string) {
  const normalizedAddress = singleEmailAddress(sender, true);
  if (!normalizedAddress) return false;
  const [local = "", domain = ""] = normalizedAddress.split("@");
  const labelledLocal = /^(staging|preview)([._+-].+)?$/.test(local);
  const labelledDomain = domain.split(".").some((label) => label === "staging" || label === "preview");
  return labelledLocal || labelledDomain;
}

export function assertStagingEmailSafety(input: { to: string; from: string }) {
  if (!isStagingEnvironment()) return;

  const allowlist = stagingEmailAllowlist();
  const recipient = singleEmailAddress(input.to);

  if (!recipient || !allowlist.has(recipient)) {
    throw new Error("Staging email recipient is not permitted.");
  }
  if (!isStagingLabelledSender(input.from)) {
    throw new Error("Staging email sender is not safely labelled.");
  }
}

export function withEnvironmentMetadata(metadata?: Record<string, unknown>) {
  return { ...(metadata || {}), environment: getPublicEnvironment() };
}
