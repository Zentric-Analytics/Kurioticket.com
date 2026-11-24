import Link from "next/link";
import { ChevronRight, Clock3, Monitor, Smartphone } from "lucide-react";
import type { DeviceSessionResult, AdminDeviceSession } from "@/services/adminDeviceSessionsService";

const timeToday = (date: Date) => new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
}).format(date) + " UTC";

export function platformLabel(item: AdminDeviceSession) {
  if (item.client === "MOBILE") {
    if (item.platform === "ios") return "iOS app";
    if (item.platform === "android") return "Android app";
    return "Mobile app";
  }
  if (item.deviceLabel === "Mobile device" || /iPhone|iPad|Android/.test(item.deviceLabel ?? "")) return "Mobile web";
  if (item.deviceLabel === "Desktop device" || /computer|Mac$/.test(item.deviceLabel ?? "")) return "Desktop web";
  return "Web";
}
export function sourceIcon(item: AdminDeviceSession) {
  return item.client === "MOBILE" || platformLabel(item) === "Mobile web" ? Smartphone : Monitor;
}
export function deviceValue(input: string | null | undefined) {
  return input?.trim() || "Unavailable";
}

/** An account-only, Today (UTC) preview. The dedicated history page owns full records.
 *  Do not infer guest devices or substitute older sessions for an empty Today. */
export function AdminIdentityDeviceAccess({ kind, result, historyHref }: {
  kind: string; result: DeviceSessionResult | null; historyHref?: string;
}) {
  if (kind !== "user") return null;
  const available = result?.status === "ok";
  const sessions = available ? result.sessions : [];
  return <section data-testid="identity-device-access" aria-label="Today's account device access"
    className="min-w-0 space-y-2 py-1">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#64748B]">
        <Clock3 size={14} aria-hidden="true" /> Today (UTC)
      </span>
      {historyHref ? <Link href={historyHref}
        className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">
        View full history <ChevronRight size={14} aria-hidden="true" />
      </Link> : null}
    </div>
    {!available ? <p role="status" className="rounded-lg bg-[#F8FAFC] px-3 py-3 text-[12px] text-[#64748B]">
      Device records temporarily unavailable.
    </p> : sessions.length === 0 ? <p role="status" className="rounded-lg bg-[#F8FAFC] px-3 py-3 text-[12px] text-[#64748B]">
      No recorded device activity today.
    </p> : <div className="min-w-0 divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]"
      data-testid="device-today-list">
      <div aria-hidden="true" className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 px-1 py-2 text-[11px] font-medium text-[#64748B] sm:grid">
        <span>Platform / device</span><span>Location</span><span className="text-right">Last seen</span>
      </div>
      {sessions.map(session => {
        const Icon = sourceIcon(session);
        const description = [
          session.deviceLabel, session.os, session.client === "WEB" ? session.browser : null,
        ].filter(Boolean).join(" · ") || "Device details unavailable";
        return <div data-testid="device-session-row" key={session.id}
          className="grid min-w-0 grid-cols-1 items-center gap-x-4 gap-y-1 px-1 py-2.5 text-[12px] sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-medium text-[#0F172A]">
              <Icon size={15} aria-hidden="true" />{platformLabel(session)}
            </div>
            <p className="mt-0.5 min-w-0 break-words pl-[23px] text-[11px] text-[#64748B]">{description}</p>
          </div>
          <span className="min-w-0 break-words pl-[23px] text-[#64748B] sm:pl-0"
            title={session.locationLabel ? "Approximate network location" : "Location unavailable"}>
            {deviceValue(session.locationLabel)}
          </span>
          <time dateTime={session.lastSeenAt.toISOString()}
            className="whitespace-nowrap pl-[23px] tabular-nums text-[#64748B] sm:pl-0 sm:text-right">
            {timeToday(session.lastSeenAt)}
          </time>
        </div>;
      })}
    </div>}
  </section>;
}
