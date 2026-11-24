"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TIME_ZONE_COOKIE, safeAdminTimeZone, adminDisplayDateTime } from "@/lib/adminTimeZone";

const AdminTimeZoneContext = createContext("UTC");

function browserTimeZone() {
  return safeAdminTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/** Browser/device zone, not customer IP. Sync to a path-scoped cookie so
 * server-side Today and custom date filters share the same calendar. */
export function AdminTimeZoneProvider({ children }: { children: ReactNode }) {
  const [timeZone, setTimeZone] = useState("UTC");
  const router = useRouter();

  useEffect(() => {
    const synchronize = () => {
      const zone = browserTimeZone();
      setTimeZone(zone);
      const cookie = document.cookie.split("; ").find(part => part.startsWith(ADMIN_TIME_ZONE_COOKIE + "="));
      const current = cookie ? decodeURIComponent(cookie.slice(ADMIN_TIME_ZONE_COOKIE.length + 1)) : null;
      if (current !== zone) {
        document.cookie = ADMIN_TIME_ZONE_COOKIE + "=" + encodeURIComponent(zone) + "; Path=/admin; Max-Age=31536000; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
        router.refresh();
      }
    };
    synchronize();
    window.addEventListener("focus", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      window.removeEventListener("focus", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, [router]);

  return <AdminTimeZoneContext.Provider value={timeZone}>{children}</AdminTimeZoneContext.Provider>;
}

export function useAdminTimeZone() {
  return useContext(AdminTimeZoneContext);
}

/** Hydration-safe: the server and first render agree on UTC, then use the
 * operator's actual time zone. Preserve semantic UTC datetime for machines. */
export function AdminLocalDateTime({ value, style = "datetime", referenceNow, className }: {
  value: string | number | Date | null | undefined;
  style?: "datetime" | "date" | "time" | "relative" | "split" | "compact";
  referenceNow?: string;
  className?: string;
}) {
  const timeZone = useAdminTimeZone();
  if (value == null) return <>—</>;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return <>—</>;
  if (style === "split") return <time dateTime={date.toISOString()} className={className} title={timeZone}>
    <span className="block">{adminDisplayDateTime(date, timeZone, "date")}</span>
    <span className="mt-0.5 block text-[12px] font-normal text-[#64748B]">{adminDisplayDateTime(date, timeZone, "time")}</span>
  </time>;
  const formatted = adminDisplayDateTime(date, timeZone, style, referenceNow ? new Date(referenceNow) : undefined);
  return <time dateTime={date.toISOString()} className={className} title={timeZone}>{formatted}</time>;
}
