import { ShieldOff, UsersRound, UserRoundCheck, UserRound, UserRoundPlus, UserPlus } from "lucide-react";
import type { UserPopulationMetrics } from "@/services/adminUserPopulationMetrics";
import { recordedAccountsAndGuestSessionsTotal } from "@/lib/adminRecordedPopulationTotal";

const number = new Intl.NumberFormat("en-US");

/** All-time identities are deliberately independent of the directory's activity/search filters. */

export function AdminUserPopulationCards({ metrics, period, operationalAllTimeCount, operationalNewCount }: {
  metrics: UserPopulationMetrics | null;
  period: string;
  operationalAllTimeCount: number | null;
  operationalNewCount: number | null;
}) {
  const combinedTotal = recordedAccountsAndGuestSessionsTotal(metrics, operationalAllTimeCount);
  const cards = [
    { label: "Total recorded accounts & guest sessions", value: combinedTotal, icon: UsersRound,
      scope: "All time" },
    { label: "Registered accounts", value: metrics?.registered, icon: UserRoundCheck, scope: "All time" },
    { label: "Consented guest", value: metrics?.guests, icon: UserRound, scope: "All time" },
    { label: "Guest", value: operationalAllTimeCount, icon: ShieldOff,
      scope: "Recorded sessions · All time" },
    { label: "New registrations", value: metrics?.newRegistrations, icon: UserPlus, scope: period },
    { label: "New consented guests", value: metrics?.newGuests, icon: UserRoundPlus, scope: period },
    { label: "New guest", value: operationalNewCount, icon: ShieldOff,
      scope: `New recorded sessions · ${period}` },
  ];
  const rows = [
    { key: "recorded", entries: cards.slice(0, 4),
      className: "grid min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[1200px]:grid-cols-4" },
    { key: "new", entries: cards.slice(4),
      className: "grid min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[900px]:grid-cols-3" },
  ];
  return <section aria-label="User population metrics" className="min-w-0 pb-3">
    <div className="flex min-w-0 flex-col gap-3">
      {rows.map(({ key, entries, className }) => <div key={key} data-testid="user-population-row" className={className}>
        {entries.map(({ label, value, icon: Icon, scope }) => <div key={label} data-testid="user-population-metric" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3">
          <div className="flex min-h-12 items-start gap-2 text-[12px] leading-4 text-[#64748B]">
            <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span className="min-w-0">{label}</span>
          </div>
          <p className="mt-1 text-[22px] font-semibold leading-7 tabular-nums tracking-tight text-[#0F172A]">
            {value !== null && value !== undefined && Number.isSafeInteger(value) && value >= 0
              ? number.format(value) : "Unavailable"}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[#64748B]">{scope}</p>
        </div>)}
      </div>)}
    </div>
  </section>;
}
