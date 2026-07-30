import {
  getAdminEmails,
  getAuthSecret,
  getDuffelApiMode,
  getFlightProviderPrimary,
  getHotelProviderPrimary,
  getHotelbedsApiMode,
  getKayakApiMode,
  getTravelProviderMode,
} from "@/lib/env";
import { getOptionalPrisma, isDatabaseConfigured, withOptionalDb } from "@/lib/prisma";

type ProviderStatus = {
  product: "Flights" | "Hotels" | "Cars";
  providerName: string;
  environment: string;
  credentialsPresent: boolean;
  searchEnabled: boolean;
  bookingEnabled: boolean;
  lastSuccessfulRequest?: string | null;
  lastFailedRequest?: string | null;
  notes: string;
};

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

  return {
    appEnvironment: safeAppEnvironment(),
    databaseConfigured: isDatabaseConfigured(),
    databaseConnected,
    authConfigured: Boolean(getAuthSecret()),
    sessionConfigured: Boolean(getAuthSecret()),
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    providerCredentialsPresent: hasAnyProviderCredentials(),
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    adminEmailsConfigured: getAdminEmails().length > 0,
  };
}

type AdminMetrics = {
  totalUsers: number | string;
  activeUsers: number | string;
  suspendedUsers: number | string;
  adminUsers: number | string;
  recentSearches: number | string;
  recentAdminActions: number | string;
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  return withOptionalDb<AdminMetrics>(async (db) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalUsers, activeUsers, suspendedUsers, adminUsers, recentSearches, recentAdminActions] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: "ACTIVE" } }),
      db.user.count({ where: { status: "SUSPENDED" } }),
      db.user.count({ where: { role: "ADMIN" } }),
      db.searchHistory.count({ where: { createdAt: { gte: since } } }),
      db.adminAuditLog.count({ where: { createdAt: { gte: since } } }),
    ]);

    return { totalUsers, activeUsers, suspendedUsers, adminUsers, recentSearches, recentAdminActions };
  }, unavailableMetrics());
}

type SearchHealth = {
  hasLogs: boolean;
  totalRecentSearches: number | string;
  noResultSearches: number | string;
  failedSearches: number | string;
  topProducts: Array<{ label: string; count: number }>;
};

export async function getSearchHealth(): Promise<SearchHealth> {
  return withOptionalDb<SearchHealth>(async (db) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalRecentSearches, noResultSearches, failedSearches, topProducts] = await Promise.all([
      db.searchHistory.count({ where: { createdAt: { gte: since } } }),
      db.searchHistory.count({ where: { createdAt: { gte: since }, resultCount: 0, status: "SUCCESS" } }),
      db.searchHistory.count({ where: { createdAt: { gte: since }, status: "FAILED" } }),
      db.searchHistory.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { type: "desc" } },
        take: 5,
      }),
    ]);

    return {
      hasLogs: totalRecentSearches > 0,
      totalRecentSearches,
      noResultSearches,
      failedSearches,
      topProducts: topProducts.map((item) => ({ label: item.type, count: item._count._all })),
    };
  }, { hasLogs: false, totalRecentSearches: "—", noResultSearches: "—", failedSearches: "—", topProducts: [] } satisfies SearchHealth);
}

export async function getRecentAdminActivity(limit = 6) {
  return withOptionalDb(async (db) => {
    const logs = await db.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    return logs.map((log) => ({
      id: log.id,
      title: log.action,
      detail: `${log.adminEmail} ${log.targetType ? `on ${log.targetType}` : ""}${log.targetEmail ? ` (${log.targetEmail})` : ""}`,
      timestamp: formatDateTime(log.createdAt),
    }));
  }, []);
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const [flightRequest, flightFailure, hotelRequest, hotelFailure] = await Promise.all([
    getLatestProviderLog("Duffel", "SUCCESS"),
    getLatestProviderLog("Duffel", "FAILED"),
    getLatestHotelSuccess(),
    getLatestHotelFailure(),
  ]);

  const flightPrimary = getFlightProviderPrimary();
  const flightCredentials = flightPrimary === "duffel" && Boolean(process.env.DUFFEL_API_KEY);
  const flightEnvironment = getDuffelApiMode() === "test" ? "Test mode" : "Production";

  const hotelPrimary = getHotelProviderPrimary();
  const hotelCredentials = getHotelCredentialsPresent(hotelPrimary);

  return [
    {
      product: "Flights",
      providerName: flightPrimary === "duffel" ? "Duffel" : "Not connected",
      environment: flightCredentials ? flightEnvironment : "Unavailable",
      credentialsPresent: flightCredentials,
      searchEnabled: flightCredentials,
      bookingEnabled: process.env.DUFFEL_BOOKING_ENABLED === "true" && flightCredentials,
      lastSuccessfulRequest: flightRequest,
      lastFailedRequest: flightFailure,
      notes: flightCredentials
        ? "Flight search can use configured Duffel credentials. Booking remains disabled unless a live booking workflow is explicitly enabled."
        : "No flight provider credentials are connected for admin readiness checks.",
    },
    {
      product: "Hotels",
      providerName: hotelProviderLabel(hotelPrimary),
      environment: hotelEnvironment(hotelPrimary),
      credentialsPresent: hotelCredentials,
      searchEnabled: hotelPrimary !== "none" && hotelCredentials,
      bookingEnabled: false,
      lastSuccessfulRequest: hotelRequest,
      lastFailedRequest: hotelFailure,
      notes: hotelCredentials
        ? "Hotel search credentials are present for the configured provider. Live inventory should display only after provider approval and environment configuration are confirmed."
        : "Hotels remain provider-ready; live inventory and prices stay unavailable until an approved provider is configured.",
    },
    {
      product: "Cars",
      providerName: process.env.CAR_PROVIDER_PRIMARY?.trim() || "Not connected",
      environment: process.env.CAR_PROVIDER_PRIMARY ? safeProviderEnvironment(process.env.CAR_PROVIDER_MODE) : "Unavailable",
      credentialsPresent: Boolean(process.env.CAR_PROVIDER_API_KEY),
      searchEnabled: Boolean(process.env.CAR_PROVIDER_PRIMARY && process.env.CAR_PROVIDER_API_KEY),
      bookingEnabled: false,
      lastSuccessfulRequest: null,
      lastFailedRequest: null,
      notes: process.env.CAR_PROVIDER_PRIMARY && process.env.CAR_PROVIDER_API_KEY
        ? "Car provider configuration is detected. Live inventory should display only after provider approval and environment configuration are confirmed."
        : "Cars remain provider-ready; live inventory and prices stay unavailable until an approved provider is configured.",
    },
  ];
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
    checkedAt: null,
    lastError: undefined,
    source: "configuration",
  };
}

export const pausedProviderRows = [
  { name: "Additional flight providers", status: "Not active", note: "Duffel is the only active working flight provider path today." },
  { name: "Hotel providers", status: "Provider-ready", note: "Enable only after an approved provider is configured for the environment." },
  { name: "Car providers", status: "Provider-ready", note: "Enable only after an approved provider is configured for the environment." },
];

function unavailableMetrics(): AdminMetrics {
  return {
    totalUsers: "—",
    activeUsers: "—",
    suspendedUsers: "—",
    adminUsers: "—",
    recentSearches: "—",
    recentAdminActions: "—",
  };
}

function hasAnyProviderCredentials() {
  return Boolean(
    process.env.DUFFEL_API_KEY ||
      process.env.HOTELBEDS_API_KEY ||
      process.env.HOTEL_API_KEY ||
      process.env.TRAVELPAYOUTS_API_KEY ||
      process.env.CAR_PROVIDER_API_KEY,
  );
}

function safeAppEnvironment() {
  if (process.env.RENDER) return process.env.RENDER_SERVICE_NAME?.toLowerCase().includes("staging") ? "Staging" : "Production";
  return process.env.NODE_ENV === "production" ? "Production" : process.env.NODE_ENV === "test" ? "Test" : "Local development";
}

function safeProviderEnvironment(value?: string) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "production" || normalized === "live") return "Production";
  if (normalized === "sandbox") return "Sandbox";
  if (normalized === "test") return "Test mode";
  return getTravelProviderMode() === "production" ? "Production" : "Sandbox/Test";
}

function getHotelCredentialsPresent(provider: string) {
  if (provider === "hotelbeds") return Boolean(process.env.HOTELBEDS_API_KEY && process.env.HOTELBEDS_SECRET);
  if (provider === "generic_partner") return Boolean(process.env.HOTEL_API_KEY || process.env.TRAVELPAYOUTS_API_KEY);
  if (provider === "kayak_sandbox") return Boolean(process.env.HOTEL_API_KEY || process.env.TRAVELPAYOUTS_API_KEY);
  if (provider === "amadeus_hotels") return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
  return false;
}

function hotelProviderLabel(provider: string) {
  return {
    none: "Not connected",
    kayak_sandbox: "Configured hotel provider",
    hotelbeds: "Hotelbeds",
    amadeus_hotels: "Configured hotel provider",
    generic_partner: "Configured hotel provider",
  }[provider] || "Not connected";
}

function hotelEnvironment(provider: string) {
  if (provider === "none") return "Unavailable";
  if (provider === "hotelbeds") return getHotelbedsApiMode() === "live" ? "Production" : "Test mode";
  if (provider === "kayak_sandbox") return getKayakApiMode() === "live" ? "Production" : "Sandbox";
  return safeProviderEnvironment();
}

async function getLatestProviderLog(provider: string, status: "SUCCESS" | "FAILED") {
  return withOptionalDb(async (db) => {
    const apiLog = await db.apiProviderLog.findFirst({ where: { provider, status }, orderBy: { createdAt: "desc" } });
    const healthLog = await db.providerHealthLog.findFirst({ where: { provider, status }, orderBy: { checkedAt: "desc" } });
    const date = apiLog?.createdAt || healthLog?.checkedAt;
    return date ? formatDateTime(date) : null;
  }, null as string | null);
}

async function getLatestHotelSuccess() {
  return withOptionalDb(async (db) => {
    const log = await db.apiProviderLog.findFirst({ where: { service: { contains: "hotel", mode: "insensitive" }, status: "SUCCESS" }, orderBy: { createdAt: "desc" } });
    return log ? formatDateTime(log.createdAt) : null;
  }, null as string | null);
}

async function getLatestHotelFailure() {
  return withOptionalDb(async (db) => {
    const log = await db.apiProviderLog.findFirst({ where: { service: { contains: "hotel", mode: "insensitive" }, status: "FAILED" }, orderBy: { createdAt: "desc" } });
    return log ? formatDateTime(log.createdAt) : null;
  }, null as string | null);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
