export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

export function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

export function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "";
}

export function getGoogleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "";
}


export type TravelProviderMode = "local" | "staging" | "production";
export type FlightProviderPrimary = "duffel" | "none";
export type HotelProviderPrimary =
  | "none"
  | "kayak_sandbox"
  | "hotelbeds"
  | "amadeus_hotels"
  | "generic_partner";
export type DuffelApiMode = "live" | "test";
export type KayakApiMode = "sandbox" | "live";
export type HotelbedsApiMode = "test" | "live";
export type ProviderApiMode = "live" | "sandbox" | "test";

function normalizedEnvValue(value: string | undefined) {
  return value?.trim().toLowerCase();
}

function readEnum<T extends string>(
  name: string,
  allowed: readonly T[],
  fallback: T,
) {
  const value = normalizedEnvValue(process.env[name]);
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

export function getTravelProviderMode(): TravelProviderMode {
  const fallback = process.env.NODE_ENV === "production" ? "production" : "local";
  return readEnum(
    "TRAVEL_PROVIDER_MODE",
    ["local", "staging", "production"] as const,
    fallback,
  );
}

export function isProductionProviderMode() {
  return getTravelProviderMode() === "production";
}

export function isStagingProviderMode() {
  return getTravelProviderMode() === "staging";
}

export function allowSandboxProviders() {
  return !isProductionProviderMode() && process.env.ALLOW_SANDBOX_PROVIDERS === "true";
}

export function getFlightProviderPrimary(): FlightProviderPrimary {
  return readEnum("FLIGHT_PROVIDER_PRIMARY", ["duffel", "none"] as const, "duffel");
}

export function getHotelProviderPrimary(): HotelProviderPrimary {
  return readEnum(
    "HOTEL_PROVIDER_PRIMARY",
    ["none", "kayak_sandbox", "hotelbeds", "amadeus_hotels", "generic_partner"] as const,
    "none",
  );
}

export function getDuffelApiMode(): DuffelApiMode {
  return readEnum("DUFFEL_API_MODE", ["live", "test"] as const, "live");
}

export function getKayakApiMode(): KayakApiMode {
  return readEnum("KAYAK_API_MODE", ["sandbox", "live"] as const, "sandbox");
}

export function getHotelbedsApiMode(): HotelbedsApiMode {
  return readEnum("HOTELBEDS_API_MODE", ["test", "live"] as const, "test");
}

export function assertSandboxProviderAllowed(providerName: string) {
  if (!allowSandboxProviders()) {
    throw new Error(`${providerName} sandbox provider is not allowed in this environment.`);
  }
}

export function assertProductionLiveProvider(
  providerName: string,
  apiMode: ProviderApiMode,
) {
  if (isProductionProviderMode() && apiMode !== "live") {
    throw new Error(`${providerName} must use live provider mode in production.`);
  }
}

export function hasTravelProviderKeys() {
  return Boolean(
    (
      process.env.AMADEUS_CLIENT_ID &&
      process.env.AMADEUS_CLIENT_SECRET
    ) ||
      process.env.DUFFEL_API_KEY ||
      process.env.KIWI_API_KEY
  );
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function canUseDevelopmentFallbacks() {
  // Strictly local development only: never allow fallback/mock data in staging,
  // preview, or production runtimes.
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_DEVELOPMENT_FALLBACKS ===
      "true"
  );
}

export function getHomepageFaresCronSecret() {
  return process.env.HOMEPAGE_FARES_CRON_SECRET?.trim() || "";
}

export function getAdminEmails() {
  return (
    process.env.ADMIN_EMAILS || ""
  )
    .split(",")
    .map((email) =>
      email.trim().toLowerCase()
    )
    .filter(Boolean);
}

export function requireServerEnv(
  name: string
) {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}
