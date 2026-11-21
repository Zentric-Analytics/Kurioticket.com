import { Info, ShieldOff, UsersRound, UserRoundCheck, UserRound, UserRoundPlus, UserPlus } from "lucide-react";
import type { UserPopulationMetrics } from "@/services/adminUserPopulationMetrics";
import { recordedAccountsAndGuestSessionsTotal } from "@/lib/adminRecordedPopulationTotal";

const number = new Intl.NumberFormat("en-US");

/** All-time identities are deliberately independent of the directory's activity/search filters. */
const nonConsentedGuestSource = "Counts unique unlinked operational session IDs recorded through searches and provider handoffs, not verified individual people or explicit consent refusals. A search without verified session attribution is not counted as a guest session.";
const combinedTotalSource = "All-time registered accounts + eligible consented guest identities + distinct unlinked operational guest sessions. These are different record types, not unique people. Missing source data makes this total unavailable.";

export function AdminUserPopulationCards({ metrics, period, operationalAllTimeCount, operationalNewCount }: {
  metrics: UserPopulationMetrics | null;
  period: string;
  operationalAllTimeCount: number | null;
  operationalNewCount: number | null;
}) {
  const combinedTotal = recordedAccountsAndGuestSessionsTotal(metrics, operationalAllTimeCount);
  const cards = [
    { label: "Total recorded accounts & guest sessions", value: combinedTotal, icon: UsersRound,
      scope: "All time", detail: combinedTotalSource },
    { label: "Registered accounts", value: metrics?.registered, icon: UserRoundCheck, scope: "All time" },
    { label: "Consented guest", value: metrics?.guests, icon: UserRound, scope: "All time" },
    { label: "Non consented guest", value: operationalAllTimeCount, icon: ShieldOff,
      scope: "Recorded sessions · All time", detail: nonConsentedGuestSource },
    { label: "New registrations", value: metrics?.newRegistrations, icon: UserPlus, scope: period },
    { label: "New consented guests", value: metrics?.newGuests, icon: UserRoundPlus, scope: period },
    { label: "New non consented guest", value: operationalNewCount, icon: ShieldOff,
      scope: `New recorded sessions · ${period}`, detail: nonConsentedGuestSource },
  ];
  return <section aria-label="User population metrics" className="min-w-0 pb-3">
    <div className="grid min-w-0 grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[1420px]:grid-cols-7">
      {cards.map(({ label, value, icon: Icon, scope, detail }) => <div key={label} data-testid="user-population-metric" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3">
        <div className="flex min-h-9 items-start gap-2 text-[12px] leading-4 text-[#64748B]">
          <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0">{label}</span>
          {detail ? <span role="note" tabIndex={0} title={detail} aria-label={detail}
            className="ml-auto shrink-0 rounded-sm text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
            <Info size={13} aria-hidden="true" />
          </span> : null}
        </div>
        <p className="mt-1 text-[22px] font-semibold leading-7 tabular-nums tracking-tight text-[#0F172A]">
          {(detail || metrics) && value !== null && value !== undefined && Number.isSafeInteger(value) && value >= 0
            ? number.format(value) : "Unavailable"}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-[#64748B]">{scope}</p>
      </div>)}
    </div>
  </section>;
}
