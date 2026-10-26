export type AdminAlertSeverity = "CRITICAL" | "WARNING";

export type AdminAlertSource =
  | "SYSTEM"
  | "PROVIDER"
  | "EMAIL"
  | "CMS"
  | "HOMEPAGE_FARES"
  | "FLIGHT_STATUS"
  | "CONFIRMED_TRIPS";

export type AdminAlertCandidate = {
  key: string;
  severity: AdminAlertSeverity;
  source: AdminAlertSource;
  title: string;
  message: string;
  actionHref: string;
  signalToken: string;
  signalAt?: string | null;
};

export type AdminAlertSignals = {
  system: {
    databaseConfigured: boolean;
    databaseConnected: boolean;
    authConfigured: boolean;
    sessionConfigured: boolean;
    emailConfigured: boolean;
  };
  providers:
    | Array<{
        id: string;
        provider: string;
        readinessState: string;
        operationalState: string;
        failedCalls: number;
        degradedCalls: number;
        lastFailureAt: string | null;
        lastAdverseAt: string | null;
      }>
    | null;
  email:
    | {
        dataAvailable: boolean;
        last24Hours: number;
        failures: number;
        delayed: number;
        latestProblemAt: string | Date | null;
        latestAdverseAt: string | Date | null;
        latest: Array<{ status: string; createdAt: string | Date }>;
      }
    | null;
  cms:
    | {
        available: boolean;
        totals: {
          scopes: number;
          unhealthy: number;
          unpublishedChanges: number;
        };
        unhealthyFingerprint: string;
        occurrenceToken: string;
      }
    | null;
  homepageFares:
    | {
        dataAvailable: boolean;
        globalReadinessStatus: string;
        underfilledMarkets: Array<{ market: string }>;
        lastRefreshAt?: string;
      }
    | null;
  telemetryOutageTokens: {
    providers: string;
    email: string;
    cms: string;
    homepageFares: string;
    flightStatus: string;
  };
  confirmedTrips?: {
    feedReady: boolean;
    health: null | {
      rejectedLast24h: number;
      lastRejectedAt: string | null;
    };
  };
  flightStatus: {
    feedReady: boolean;
    operations:
      | {
          metrics: {
            feedEligibleFlights: number;
            trackedFlights: number;
            missingSnapshots: number;
            currentSnapshots: number;
            staleSnapshots: number;
            monitoringFlights: number;
            monitoringTrackedFlights: number;
            monitoringMissingSnapshots: number;
            monitoringMissingSnapshotFingerprint: string;
            monitoringCurrentSnapshots: number;
            monitoringStaleSnapshots: number;
            monitoringStaleSnapshotFingerprint: string;
          };
        }
      | null;
  };
};

function providerAlerts(signals: AdminAlertSignals) {
  if (!signals.system.databaseConnected) return [] satisfies AdminAlertCandidate[];
  if (!signals.providers) {
    return [
      {
        key: "providers.telemetry.unavailable",
        severity: "WARNING",
        source: "PROVIDER",
        title: "Provider telemetry is unavailable",
        message: "Kurioticket could not read the authoritative provider operational snapshot.",
        actionHref: "/admin/providers",
        signalToken: signals.telemetryOutageTokens.providers,
      },
    ] satisfies AdminAlertCandidate[];
  }

  return signals.providers.flatMap((provider) => {
    if (provider.readinessState !== "READY") return [];
    if (provider.operationalState !== "FAILING" && provider.operationalState !== "DEGRADED") return [];

    const failing = provider.operationalState === "FAILING";
    return [
      {
        key: `provider.${provider.id}.operational`,
        severity: failing ? "CRITICAL" : "WARNING",
        source: "PROVIDER",
        title: failing
          ? `${provider.provider} provider is failing`
          : `${provider.provider} provider is degraded`,
        message: failing
          ? `${provider.failedCalls} failed provider call(s) and no successful observed calls were recorded in the operational window.`
          : `${provider.failedCalls} failed and ${provider.degradedCalls} degraded provider call(s) were recorded in the operational window.`,
        actionHref: "/admin/providers",
        signalToken: [
          provider.operationalState,
          provider.lastAdverseAt ?? "none",
        ].join(":"),
        signalAt: provider.lastAdverseAt,
      },
    ] satisfies AdminAlertCandidate[];
  });
}

function emailAlerts(signals: AdminAlertSignals) {
  if (!signals.system.databaseConnected) return [] satisfies AdminAlertCandidate[];

  if (!signals.email) {
    return [
      {
        key: "email.telemetry.unavailable",
        severity: "WARNING",
        source: "EMAIL",
        title: "Email delivery telemetry is unavailable",
        message: "Kurioticket could not read the authoritative email-delivery health snapshot.",
        actionHref: "/admin/email-delivery",
        signalToken: signals.telemetryOutageTokens.email,
      },
    ] satisfies AdminAlertCandidate[];
  }

  if (!signals.email.dataAvailable) {
    return [
      {
        key: "email.telemetry.unavailable",
        severity: "WARNING",
        source: "EMAIL",
        title: "Email delivery telemetry is unavailable",
        message: "Delivery counts are unavailable and are not being treated as zero.",
        actionHref: "/admin/email-delivery",
        signalToken: signals.telemetryOutageTokens.email,
      },
    ] satisfies AdminAlertCandidate[];
  }

  if (signals.email.failures === 0 && signals.email.delayed === 0) {
    return [] satisfies AdminAlertCandidate[];
  }

  const signalAt = signals.email.latestAdverseAt
    ? new Date(signals.email.latestAdverseAt).toISOString()
    : signals.email.latestProblemAt
      ? new Date(signals.email.latestProblemAt).toISOString()
      : null;

  return [
    {
      key: "email.delivery.degraded",
      severity: "WARNING",
      source: "EMAIL",
      title: "Email delivery needs attention",
      message: `${signals.email.failures} failed/problem delivery event(s) and ${signals.email.delayed} delayed delivery event(s) were recorded in the last 24 hours.`,
      actionHref: "/admin/email-delivery",
      signalToken: `email-delivery:${signalAt ?? "problem-present"}`,
      signalAt,
    },
  ] satisfies AdminAlertCandidate[];
}

function cmsAlerts(signals: AdminAlertSignals) {
  if (!signals.system.databaseConnected) return [] satisfies AdminAlertCandidate[];

  if (!signals.cms) {
    return [
      {
        key: "cms.health.unavailable",
        severity: "WARNING",
        source: "CMS",
        title: "CMS health could not be verified",
        message: "The CMS integrity overview could not be read from the authoritative store.",
        actionHref: "/admin/content/health",
        signalToken: signals.telemetryOutageTokens.cms,
      },
    ] satisfies AdminAlertCandidate[];
  }

  if (!signals.cms.available) return [] satisfies AdminAlertCandidate[];
  if (signals.cms.totals.unhealthy === 0) return [] satisfies AdminAlertCandidate[];

  return [
    {
      key: "cms.integrity.unhealthy",
      severity: "WARNING",
      source: "CMS",
      title: "CMS integrity needs attention",
      message: `${signals.cms.totals.unhealthy} of ${signals.cms.totals.scopes} managed CMS scope(s) currently fail integrity checks.`,
      actionHref: "/admin/content/health",
      signalToken: signals.cms.occurrenceToken,
    },
  ] satisfies AdminAlertCandidate[];
}

function homepageFareAlerts(signals: AdminAlertSignals) {
  if (!signals.system.databaseConnected) return [] satisfies AdminAlertCandidate[];

  if (!signals.homepageFares) {
    return [
      {
        key: "homepage-fares.telemetry.unavailable",
        severity: "WARNING",
        source: "HOMEPAGE_FARES",
        title: "Homepage fare telemetry is unavailable",
        message: "Homepage fare readiness could not be read from the authoritative snapshot store.",
        actionHref: "/admin/homepage-fares",
        signalToken: signals.telemetryOutageTokens.homepageFares,
      },
    ] satisfies AdminAlertCandidate[];
  }

  if (!signals.homepageFares.dataAvailable) {
    return [
      {
        key: "homepage-fares.telemetry.unavailable",
        severity: "WARNING",
        source: "HOMEPAGE_FARES",
        title: "Homepage fare telemetry is unavailable",
        message: "Homepage fare coverage is unavailable and is not being treated as zero.",
        actionHref: "/admin/homepage-fares",
        signalToken: signals.telemetryOutageTokens.homepageFares,
      },
    ] satisfies AdminAlertCandidate[];
  }

  if (signals.homepageFares.globalReadinessStatus === "ready") {
    return [] satisfies AdminAlertCandidate[];
  }

  const notReady = signals.homepageFares.globalReadinessStatus === "not_ready";
  const markets = signals.homepageFares.underfilledMarkets.map((entry) => entry.market).sort();

  return [
    {
      key: "homepage-fares.readiness",
      severity: notReady ? "CRITICAL" : "WARNING",
      source: "HOMEPAGE_FARES",
      title: notReady
        ? "Homepage fares are not ready"
        : "Homepage fare coverage is partial",
      message: markets.length
        ? `${markets.length} required market(s) are underfilled: ${markets.join(", ")}.`
        : "Homepage fare readiness is below the required public coverage target.",
      actionHref: "/admin/homepage-fares",
      signalToken: [
        signals.homepageFares.globalReadinessStatus,
        markets.join(","),
      ].join(":"),
      signalAt: signals.homepageFares.lastRefreshAt ?? null,
    },
  ] satisfies AdminAlertCandidate[];
}

function flightStatusAlerts(signals: AdminAlertSignals) {
  if (!signals.system.databaseConnected || !signals.flightStatus.feedReady) {
    return [] satisfies AdminAlertCandidate[];
  }

  if (!signals.flightStatus.operations) {
    return [
      {
        key: "flight-status.telemetry.unavailable",
        severity: "WARNING",
        source: "FLIGHT_STATUS",
        title: "Flight-status telemetry is unavailable",
        message: "The configured flight-status feed is ready, but its operational snapshot could not be read.",
        actionHref: "/admin/flight-status",
        signalToken: signals.telemetryOutageTokens.flightStatus,
      },
    ] satisfies AdminAlertCandidate[];
  }

  const metrics = signals.flightStatus.operations.metrics;
  const alerts: AdminAlertCandidate[] = [];

  if (metrics.monitoringMissingSnapshots > 0) {
    alerts.push({
      key: "flight-status.missing",
      severity: "WARNING",
      source: "FLIGHT_STATUS",
      title: "Some flight-status snapshots are missing",
      message: `${metrics.monitoringMissingSnapshots} of ${metrics.monitoringFlights} actively monitored flight(s) are still awaiting their first status snapshot.`,
      actionHref: "/admin/flight-status",
      signalToken: `flight-status-missing:${metrics.monitoringMissingSnapshotFingerprint}`,
    });
  }

  if (metrics.monitoringStaleSnapshots > 0) {
    const allTrackedStale =
      metrics.monitoringTrackedFlights > 0 &&
      metrics.monitoringCurrentSnapshots === 0 &&
      metrics.monitoringStaleSnapshots >= metrics.monitoringTrackedFlights;

    alerts.push({
      key: "flight-status.stale",
      severity: allTrackedStale ? "CRITICAL" : "WARNING",
      source: "FLIGHT_STATUS",
      title: allTrackedStale
        ? "All tracked flight-status snapshots are stale"
        : "Some flight-status snapshots are stale",
      message: `${metrics.monitoringStaleSnapshots} stale snapshot(s) are recorded across ${metrics.monitoringTrackedFlights} tracked provider-matched flight(s).`,
      actionHref: "/admin/flight-status",
      signalToken: `flight-status-stale:${metrics.monitoringStaleSnapshotFingerprint}`,
    });
  }

  return alerts;
}

function confirmedTripAlerts(signals: AdminAlertSignals): AdminAlertCandidate[] {
  if (!signals.system.databaseConnected || !signals.confirmedTrips?.feedReady) return [];
  const health = signals.confirmedTrips.health;
  if (!health) return [{
    key: "confirmed-trips.telemetry.unavailable", severity: "WARNING", source: "CONFIRMED_TRIPS",
    title: "Confirmation delivery telemetry unavailable",
    message: "An authenticated confirmation provider is configured, but delivery receipts could not be queried.",
    actionHref: "/admin/confirmed-trips", signalToken: "confirmation-telemetry-unavailable",
  }];
  if (health.rejectedLast24h <= 0) return [];
  return [{
    key: "confirmed-trips.deliveries.rejected", severity: "WARNING", source: "CONFIRMED_TRIPS",
    title: "Partner confirmation deliveries were rejected",
    message: `${health.rejectedLast24h} authenticated confirmation callback(s) were rejected in the last 24 hours. Review the provider delivery receipts.`,
    actionHref: "/admin/confirmed-trips",
    signalToken: `confirmation-rejected:${health.lastRejectedAt ?? "unknown"}`,
    signalAt: health.lastRejectedAt,
  }];
}

export function deriveAdminAlertCandidates(signals: AdminAlertSignals): AdminAlertCandidate[] {
  const alerts: AdminAlertCandidate[] = [];

  if (!signals.system.databaseConfigured) {
    alerts.push({
      key: "system.database.not-configured",
      severity: "CRITICAL",
      source: "SYSTEM",
      title: "Database is not configured",
      message: "The current environment does not have an authoritative database configuration.",
      actionHref: "/admin/system",
      signalToken: "not-configured",
    });
  } else if (!signals.system.databaseConnected) {
    alerts.push({
      key: "system.database.unavailable",
      severity: "CRITICAL",
      source: "SYSTEM",
      title: "Database is unavailable",
      message: "The configured database did not respond to the admin health check.",
      actionHref: "/admin/system",
      signalToken: "unavailable",
    });
  }

  if (!signals.system.authConfigured || !signals.system.sessionConfigured) {
    alerts.push({
      key: "system.auth.incomplete",
      severity: "CRITICAL",
      source: "SYSTEM",
      title: "Authentication configuration is incomplete",
      message: "The authentication/session secret configuration is incomplete for this environment.",
      actionHref: "/admin/system",
      signalToken: [
        signals.system.authConfigured ? "auth-ready" : "auth-missing",
        signals.system.sessionConfigured ? "session-ready" : "session-missing",
      ].join(":"),
    });
  }

  if (!signals.system.emailConfigured) {
    alerts.push({
      key: "email.configuration.incomplete",
      severity: "WARNING",
      source: "EMAIL",
      title: "Transactional email is not configured",
      message: "The Resend API key and sender address are not both configured for this environment.",
      actionHref: "/admin/email-delivery",
      signalToken: "not-configured",
    });
  }

  alerts.push(
    ...providerAlerts(signals),
    ...emailAlerts(signals),
    ...cmsAlerts(signals),
    ...homepageFareAlerts(signals),
    ...flightStatusAlerts(signals),
    ...confirmedTripAlerts(signals),
  );

  return alerts;
}
