import Link from "next/link";
import { Monitor, Smartphone, MapPin, Globe2, Laptop, Clock3, ChevronRight } from "lucide-react";
import type { DeviceSessionResult, AdminDeviceSession } from "@/services/adminDeviceSessionsService";

const stamp = (value: Date) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
}).format(value) + " UTC";

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
function Detail({ label, children, Icon }: {
  label: string; children: React.ReactNode; Icon: typeof Monitor;
}) {
  return <div className="min-w-0 border-t border-[#E2E8F0] py-3 sm:border-t-0 sm:py-1">
    <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]"><Icon size={14} aria-hidden="true" />{label}</div>
    <p className="mt-1 break-words text-[13px] font-medium leading-5 text-[#0F172A]">{children}</p>
  </div>;
}

/** Identity-only account sessions. Guest presence is deliberately not promoted to a tracked device. */
export function AdminIdentityDeviceAccess({ kind, result, historyHref }: {
  kind: string; result: DeviceSessionResult | null; historyHref?: string;
}) {
  const sessions = result?.status === "ok" ? result.sessions : [];
  const available = kind === "user" && result?.status === "ok";
  const latest = sessions[0];
  const lastLocated = sessions.find(session => session.locationLabel);
  const platforms = Array.from(new Set(sessions.map(platformLabel)));
  return <section data-testid="identity-device-access" aria-label="Platforms and devices"
    className="min-w-0 space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
    <h2 className="text-[15px] font-semibold text-[#0F172A]">Platforms &amp; Devices</h2>
    <div data-testid="device-overview" className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-4 lg:divide-x lg:divide-[#E2E8F0]">
      <Detail label="Platforms today" Icon={Globe2}>{platforms.length ? platforms.join(" · ") : "Unavailable"}</Detail>
      <Detail label="Recent device" Icon={Laptop}>{deviceValue(latest?.deviceLabel)}</Detail>
      <Detail label="Browser" Icon={Globe2}>{latest?.client === "MOBILE" ? "In-app" : deviceValue(latest?.browser)}</Detail>
      <Detail label="Access location" Icon={MapPin}>{deviceValue(lastLocated?.locationLabel)}</Detail>
    </div>
    <section aria-labelledby="device-history-heading" className="min-w-0 border-t border-[#E2E8F0] pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 id="device-history-heading" className="text-[14px] font-semibold text-[#0F172A]">Device &amp; Access History</h3>
        <span className="rounded-md border border-[#E2E8F0] px-2 py-1 text-[11px] font-medium text-[#64748B]">Today (UTC)</span>
      </div>
      {!available ? <p role="status" className="rounded-lg bg-[#F8FAFC] px-3 py-3 text-[12px] text-[#64748B]">
        {kind === "guest" ? "Device and access details are not linked to guest activity. No device or location is inferred." : "Device session data is temporarily unavailable."}
      </p> : sessions.length === 0 ? <p role="status" className="rounded-lg bg-[#F8FAFC] px-3 py-3 text-[12px] text-[#64748B]">
        No recorded device activity today.
      </p> : <div className="divide-y divide-[#E2E8F0]" data-testid="device-today-list">
        {sessions.map(session => {
          const Icon = sourceIcon(session);
          return <div data-testid="device-session-row" key={session.id}
            className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 py-2.5 text-[12px] text-[#334155] sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium text-[#0F172A]">
                <Icon size={15} aria-hidden="true" />{platformLabel(session)}
              </div>
              <p className="mt-0.5 truncate pl-[23px] text-[11px] text-[#64748B]" title={[session.deviceLabel, session.os, session.browser].filter(Boolean).join(" · ")}>
                {deviceValue(session.deviceLabel)} · {deviceValue(session.os)}
                {session.client === "WEB" && session.browser ? " · " + session.browser : ""}
              </p>
            </div>
            <span className="min-w-0 truncate text-[#64748B]" title={session.locationLabel ?? "Unavailable"}>{deviceValue(session.locationLabel)}</span>
            <time dateTime={session.lastSeenAt.toISOString()} className="whitespace-nowrap tabular-nums text-[#64748B] sm:text-right">{stamp(session.lastSeenAt)}</time>
          </div>;
        })}
      </div>}
      {kind === "user" && historyHref ? <div className="mt-2 flex justify-end border-t border-[#E2E8F0] pt-2">
        <Link href={historyHref} className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">
          View full device &amp; access history <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div> : null}
    </section>
  </section>;
}
