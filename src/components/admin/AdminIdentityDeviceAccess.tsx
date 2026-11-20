import { Monitor, Smartphone, MapPin, Globe2, Laptop, Clock3, ShieldCheck } from "lucide-react";
import type { DeviceSessionResult, AdminDeviceSession } from "@/services/adminDeviceSessionsService";

const stamp = (value: Date) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
}).format(value) + " UTC";

function platformLabel(item: AdminDeviceSession) {
  if (item.client === "MOBILE") {
    if (item.platform === "ios") return "iOS app";
    if (item.platform === "android") return "Android app";
    return "Mobile app";
  }
  if (item.deviceLabel === "Mobile device" || /iPhone|iPad|Android/.test(item.deviceLabel ?? "")) return "Mobile web";
  if (item.deviceLabel === "Desktop device" || /computer|Mac$/.test(item.deviceLabel ?? "")) return "Desktop web";
  return "Web";
}
function sourceIcon(item: AdminDeviceSession) {
  return item.client === "MOBILE" || platformLabel(item) === "Mobile web" ? Smartphone : Monitor;
}
function value(input: string | null | undefined) {
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
export function AdminIdentityDeviceAccess({ kind, result }: {
  kind: string; result: DeviceSessionResult | null;
}) {
  const sessions = result?.status === "ok" ? result.sessions : [];
  const available = kind === "user" && result?.status === "ok";
  const latest = sessions[0];
  const lastLocated = sessions.find(session => session.locationLabel);
  const platforms = Array.from(new Set(sessions.map(platformLabel)));
  return <section data-testid="identity-device-access" aria-label="Platforms and devices"
    className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-3 sm:p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-[15px] font-semibold text-[#0F172A]">Platforms &amp; Devices</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
          Observed account sessions. Device labels may be generic; locations are approximate network estimates.
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
        <ShieldCheck size={14} aria-hidden="true" /> Account-scoped
      </span>
    </div>
    <div data-testid="device-overview" className="grid min-w-0 grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-[#E2E8F0]">
      <Detail label="Platforms used" Icon={Globe2}>
        {platforms.length ? platforms.join(" · ") : "Unavailable"}
      </Detail>
      <Detail label="Last recorded location" Icon={MapPin}>
        {value(lastLocated?.locationLabel)}
      </Detail>
      <Detail label="Most recent device" Icon={Laptop}>
        {value(latest?.deviceLabel)}
      </Detail>
      <Detail label="Browser" Icon={Globe2}>
        {latest?.client === "MOBILE" ? "Not applicable (native app)" : value(latest?.browser)}
      </Detail>
    </div>
    <section aria-labelledby="device-history-heading" className="min-w-0 border-t border-[#E2E8F0] pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 id="device-history-heading" className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
          <Clock3 size={16} aria-hidden="true" className="text-[#64748B]"/>Device &amp; Access History
        </h3>
        {available && sessions.length ? <span className="text-[11px] text-[#64748B]">Latest {sessions.length} sessions</span> : null}
      </div>
      {!available ? <p role="status" className="rounded-lg bg-[#F8FAFC] px-3 py-4 text-[13px] text-[#64748B]">
        {kind === "guest"
          ? "Device and access details are not linked to guest activity. No device or location is inferred."
          : "Device session data is temporarily unavailable."}
      </p> : sessions.length === 0 ? <p role="status" className="rounded-lg bg-[#F8FAFC] px-3 py-4 text-[13px] text-[#64748B]">
        No recorded account sessions are available.
      </p> : <div className="admin-responsive-records min-w-0 overflow-x-auto" role="region"
        aria-label="Device access history table" tabIndex={0}>
        <table className="w-full min-w-[730px] table-fixed text-left text-[12px]">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-medium uppercase tracking-wide text-[#64748B]">
            <tr>
              <th className="w-[16%] px-3 py-2.5 font-medium" scope="col">Platform</th>
              <th className="w-[20%] px-3 py-2.5 font-medium" scope="col">Device</th>
              <th className="w-[12%] px-3 py-2.5 font-medium" scope="col">OS</th>
              <th className="w-[15%] px-3 py-2.5 font-medium" scope="col">Browser</th>
              <th className="w-[17%] px-3 py-2.5 font-medium" scope="col">Location</th>
              <th className="w-[20%] px-3 py-2.5 font-medium" scope="col">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {sessions.map(session => {
              const Icon = sourceIcon(session);
              return <tr data-testid="device-session-row" key={session.id} className="align-top text-[#334155]">
                <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A]">
                  <Icon size={15} aria-hidden="true" />{platformLabel(session)}</span></td>
                <td className="break-words px-3 py-3">{value(session.deviceLabel)}</td>
                <td className="break-words px-3 py-3">{value(session.os)}</td>
                <td className="break-words px-3 py-3">{session.client === "MOBILE" ? "In-app" : value(session.browser)}</td>
                <td className="break-words px-3 py-3">{value(session.locationLabel)}</td>
                <td className="px-3 py-3 tabular-nums"><time dateTime={session.lastSeenAt.toISOString()}>{stamp(session.lastSeenAt)}</time>
                  {session.revokedAt ? <span className="mt-1 block text-[11px] text-[#64748B]">Revoked</span> : null}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
    </section>
  </section>;
}
