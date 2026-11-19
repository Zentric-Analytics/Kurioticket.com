import { alertSourceHref } from "@/lib/adminAlertNavigation";

export type AdminNotificationSummary = {
  activeCount: number;
  unreadCount: number;
  criticalCount: number;
  warningCount: number;
};

export type AdminNotificationSnapshot = AdminNotificationSummary & {
  alerts: Array<{
    id: string;
    key: string;
    signalToken: string;
    title: string;
    message: string;
    source: string;
    severity: "CRITICAL" | "WARNING";
    acknowledged: boolean;
    signalAt: string | null;
    actionHref: string | null;
  }>;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid notification response");
  }
  return value as Record<string, unknown>;
}

export function readAdminNotificationSummary(value: unknown): AdminNotificationSummary {
  const raw = record(value);
  const counts = ["activeCount", "unreadCount", "criticalCount", "warningCount"] as const;
  for (const field of counts) {
    if (typeof raw[field] !== "number" || !Number.isSafeInteger(raw[field]) || (raw[field] as number) < 0) {
      throw new Error("Invalid notification count");
    }
  }
  const summary = {
    activeCount: raw.activeCount as number,
    unreadCount: raw.unreadCount as number,
    criticalCount: raw.criticalCount as number,
    warningCount: raw.warningCount as number,
  };
  if (summary.unreadCount > summary.activeCount || summary.criticalCount + summary.warningCount !== summary.activeCount) {
    throw new Error("Inconsistent notification counts");
  }
  return summary;
}

export function readAdminNotificationSnapshot(value: unknown): AdminNotificationSnapshot {
  const raw = record(value);
  const summary = readAdminNotificationSummary(raw);
  if (!Array.isArray(raw.alerts) || raw.alerts.length !== summary.activeCount) {
    throw new Error("Incomplete notification list");
  }
  const alerts = raw.alerts.map((value): AdminNotificationSnapshot["alerts"][number] => {
    const alert = record(value);
    for (const field of ["id", "key", "signalToken", "title", "message", "source"] as const) {
      if (typeof alert[field] !== "string" || !(alert[field] as string).trim()) {
        throw new Error("Invalid notification");
      }
    }
    if ((alert.severity !== "CRITICAL" && alert.severity !== "WARNING") || typeof alert.acknowledged !== "boolean" || typeof alert.actionHref !== "string") {
      throw new Error("Invalid notification state");
    }
    return {
      id: alert.id as string,
      key: alert.key as string,
      signalToken: alert.signalToken as string,
      title: alert.title as string,
      message: alert.message as string,
      source: alert.source as string,
      severity: alert.severity,
      acknowledged: alert.acknowledged,
      signalAt: typeof alert.signalAt === "string" && Number.isFinite(Date.parse(alert.signalAt)) ? alert.signalAt : null,
      actionHref: alertSourceHref(alert.actionHref),
    };
  });
  if (alerts.filter(alert => !alert.acknowledged).length !== summary.unreadCount
    || alerts.filter(alert => alert.severity === "CRITICAL").length !== summary.criticalCount) {
    throw new Error("Inconsistent notification list");
  }
  return { ...summary, alerts };
}

export function adminNotificationSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    SYSTEM: "System", PROVIDER: "Provider", EMAIL: "Email delivery", CMS: "CMS",
    HOMEPAGE_FARES: "Homepage fares", FLIGHT_STATUS: "Flight status",
    CONFIRMED_TRIPS: "Confirmed trips", SEARCH: "Search", SUPPORT: "Support", USERS: "Accounts",
  };
  return Object.hasOwn(labels, source) ? labels[source] : source.replaceAll("_", " ").toLowerCase();
}
