export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function getGoogleClientId() {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.AUTH_GOOGLE_ID ||
    ""
  );
}

export function getGoogleClientSecret() {
  return (
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.AUTH_GOOGLE_SECRET ||
    ""
  );
}

export function hasTravelProviderKeys() {
  return Boolean(
    (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) ||
      process.env.DUFFEL_API_KEY ||
      process.env.KIWI_API_KEY,
  );
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function canUseDevelopmentFallbacks() {
  return !isProductionRuntime() && process.env.ENABLE_DEVELOPMENT_FALLBACKS === "true";
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
