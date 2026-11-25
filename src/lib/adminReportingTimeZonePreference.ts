import { ADMIN_DEFAULT_TIME_ZONE, normalizeAdminTimeZone, resolveAdminTimeZone } from "@/lib/adminLocalTime";

export type AdminReportingTimeZonePreference = {
  mode: "automatic" | "manual";
  timeZone: string;
};

export function parseAdminReportingTimeZonePreference(value: unknown): AdminReportingTimeZonePreference | null {
  if (typeof value !== "object" || value === null || !("mode" in value) || !("timeZone" in value)) return null;
  const { mode } = value;
  if (mode !== "automatic" && mode !== "manual") return null;
  const timeZone = normalizeAdminTimeZone(value.timeZone);
  return timeZone ? { mode, timeZone } : null;
}

export function detectAdminDeviceTimeZone(): string {
  try {
    return resolveAdminTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return ADMIN_DEFAULT_TIME_ZONE;
  }
}
