import {
  getAdminEmails,
  getAuthSecret,
  getDuffelApiMode,
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
  const [flightRequest, flightFailure] = await Promise.all([
    getLatestProviderLog("Duffel", "SUCCESS"),
    getLatestProviderLog("Duffel", "FAILED"),
  ]);

  const flightPrimary = "duffel";
  const flightCredentials = Boolean(process.env.DUFFEL_API_KEY);
  const flightEnvironment = getDuffelApiMode() === "test" ? "Test mode" : "Production";

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
      providerName: "Kurioticket static catalogue",
      environment: "Server-owned catalogue",
      credentialsPresent: false,
      searchEnabled: true,
      bookingEnabled: false,
      lastSuccessfulRequest: null,
      lastFailedRequest: null,
      notes: "Destination-relevant static catalogue search and internal details are available without credentials. Prices are indicative and external booking is disabled.",
    },
    {
      product: "Cars",
      providerName: "Kurioticket static catalogue",
      environment: "Server-owned catalogue",
      credentialsPresent: false,
      searchEnabled: true,
      bookingEnabled: false,
      lastSuccessfulRequest: null,
      lastFailedRequest: null,
      notes: "Static catalogue search and internal details are available without provider credentials. External booking is not offered.",
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
  { name: "Hotels", status: "Static catalogue", note: "Internal search and details are active; external booking is not offered." },
  { name: "Cars", status: "Static catalogue", note: "Internal search and details are active; external booking is not offered." },
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
  return Boolean(process.env.DUFFEL_API_KEY);
}

function safeAppEnvironment() {
  if (process.env.RENDER) return process.env.RENDER_SERVICE_NAME?.toLowerCase().includes("staging") ? "Staging" : "Production";
  return process.env.NODE_ENV === "production" ? "Production" : process.env.NODE_ENV === "test" ? "Test" : "Local development";
}

async function getLatestProviderLog(provider: string, status: "SUCCESS" | "FAILED") {
  return withOptionalDb(async (db) => {
    const apiLog = await db.apiProviderLog.findFirst({ where: { provider, status }, orderBy: { createdAt: "desc" } });
    const healthLog = await db.providerHealthLog.findFirst({ where: { provider, status }, orderBy: { checkedAt: "desc" } });
    const date = apiLog?.createdAt || healthLog?.checkedAt;
    return date ? formatDateTime(date) : null;
  }, null as string | null);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
