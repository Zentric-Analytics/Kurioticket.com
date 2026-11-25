import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { validViewerTimeZone } from "@/lib/adminLocalTime";
import type { AdminReportingTimeZonePreference } from "@/lib/adminReportingTimeZonePreference";
import { authOptions } from "@/lib/auth";

function timeZoneCookieNames(userId: string) {
  const account = createHash("sha256").update(userId).digest("hex").slice(0, 32);
  return {
    manual: "admin_reporting_tz_manual_" + account,
    automatic: "admin_reporting_tz_auto_" + account,
  };
}

export async function getAdminReportingTimeZonePreference(userId?: string): Promise<AdminReportingTimeZonePreference> {
  const accountId = userId ?? (await getServerSession(authOptions))?.user?.id;
  if (!accountId) return { mode: "automatic", timeZone: "UTC" };

  const names = timeZoneCookieNames(accountId);
  const jar = await cookies();
  const manual = validViewerTimeZone(jar.get(names.manual)?.value);
  if (manual) return { mode: "manual", timeZone: manual };

  const automatic = validViewerTimeZone(jar.get(names.automatic)?.value);
  return { mode: "automatic", timeZone: automatic ?? "UTC" };
}

export async function getAdminViewerTimeZone(userId?: string): Promise<string> {
  return (await getAdminReportingTimeZonePreference(userId)).timeZone;
}

export async function setAdminReportingTimeZoneCookie(
  userId: string,
  preference: AdminReportingTimeZonePreference,
  { synchronize = false }: { synchronize?: boolean } = {},
) {
  const names = timeZoneCookieNames(userId);
  const jar = await cookies();
  const options = {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 365 * 24 * 60 * 60,
  };

  if (synchronize) {
    jar.set(names.automatic, preference.timeZone, options);
  } else if (preference.mode === "manual") {
    jar.set(names.manual, preference.timeZone, options);
  } else {
    jar.set(names.manual, "", { ...options, maxAge: 0 });
    jar.set(names.automatic, preference.timeZone, options);
  }
}
