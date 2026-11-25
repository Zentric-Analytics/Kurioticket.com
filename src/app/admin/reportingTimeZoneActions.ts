"use server";

import { getAdminReportingTimeZonePreference, setAdminReportingTimeZoneCookie } from "@/lib/adminViewerTimeZone.server";
import { parseAdminReportingTimeZonePreference, type AdminReportingTimeZonePreference } from "@/lib/adminReportingTimeZonePreference";
import { requireAdminSession } from "@/lib/auth-guards";

export async function setAdminReportingTimeZone(value: AdminReportingTimeZonePreference, intent: "select" | "synchronize") {
  const preference = parseAdminReportingTimeZonePreference(value);
  if (!preference || (intent !== "select" && intent !== "synchronize")) return { ok: false } as const;
  if (intent === "synchronize" && preference.mode !== "automatic") return { ok: false } as const;

  const { user } = await requireAdminSession("/admin");
  const current = await getAdminReportingTimeZonePreference(user.id);
  if (intent === "synchronize" && current.mode === "manual") return { ok: true, preference: current, changed: false } as const;
  if (current.mode === preference.mode && current.timeZone === preference.timeZone) {
    return { ok: true, preference: current, changed: false } as const;
  }

  await setAdminReportingTimeZoneCookie(user.id, preference, { synchronize: intent === "synchronize" });
  return { ok: true, preference, changed: true } as const;
}
