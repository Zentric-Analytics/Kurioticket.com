import { getAuthSecret, getAdminEmails } from "@/lib/env";
import { getOptionalPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function getSafeSystemStatus() {
  const db = getOptionalPrisma();
  let databaseConnected = false;

  if (db) {
    try {
      await db.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch (error) {
      console.error("[admin:system-db]", error);
    }
  }

  const renderService = process.env.RENDER_SERVICE_NAME || process.env.RENDER_EXTERNAL_HOSTNAME || "";
  return {
    appEnvironment: process.env.RENDER
      ? renderService.toLowerCase().includes("staging")
        ? "staging"
        : "production"
      : process.env.NODE_ENV || "local",
    nodeEnv: process.env.NODE_ENV || "development",
    renderService: renderService || "Not detected",
    appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL),
    databaseConfigured: isDatabaseConfigured(),
    databaseConnected,
    authSecretConfigured: Boolean(getAuthSecret()),
    googleAuthConfigured: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    duffelConfigured: Boolean(process.env.DUFFEL_API_KEY),
    adminEmailsConfigured: getAdminEmails().length > 0,
  };
}

export async function getDuffelAdminHealth() {
  const latestLog = await getOptionalPrisma()?.providerHealthLog.findFirst({
    where: { provider: "Duffel" },
    orderBy: { checkedAt: "desc" },
  });

  if (latestLog) {
    return {
      configured: Boolean(process.env.DUFFEL_API_KEY),
      connected: latestLog.status === "SUCCESS",
      latencyMs: latestLog.latencyMs || 0,
      checkedAt: latestLog.checkedAt.toISOString(),
      lastError: latestLog.status === "FAILED" ? "Duffel health check failed. Check provider credentials and server logs." : undefined,
      source: "latest-log",
    };
  }

  return {
    configured: Boolean(process.env.DUFFEL_API_KEY),
    connected: false,
    latencyMs: 0,
    checkedAt: new Date().toISOString(),
    lastError: undefined,
    source: "configuration",
  };
}

export const pausedProviderRows = [
  { name: "Sabre", status: "Future integration", note: "Not configured yet." },
  { name: "Travelport", status: "Future integration", note: "Not configured yet." },
  { name: "Amadeus", status: "Paused", note: "Not active for current metasearch operations." },
  { name: "Skyscanner", status: "Future integration", note: "Not configured yet." },
  { name: "Kiwi / Tequila", status: "Paused", note: "Not active for current metasearch operations." },
  { name: "Travelpayouts", status: "Paused", note: "Disabled as an active provider; optional future discovery integration only." },
];
