import { UsersRound, UserRoundCheck, UserRound, UserRoundPlus, UserPlus } from "lucide-react";
import type { UserPopulationMetrics } from "@/services/adminUserPopulationMetrics";

const number = new Intl.NumberFormat("en-US");

/** All-time identities are deliberately independent of the directory's activity/search filters. */
export function AdminUserPopulationCards({ metrics, period }: {
  metrics: UserPopulationMetrics | null;
  period: string;
}) {
  const cards = [
    { label: "Total recorded identities", value: metrics?.total, icon: UsersRound, scope: "All time" },
    { label: "Registered accounts", value: metrics?.registered, icon: UserRoundCheck, scope: "All time" },
    { label: "Consented guest identities", value: metrics?.guests, icon: UserRound, scope: "All time" },
    { label: "New registrations", value: metrics?.newRegistrations, icon: UserPlus, scope: period },
    { label: "New consented guests", value: metrics?.newGuests, icon: UserRoundPlus, scope: period },
  ];
  return <section aria-label="User population metrics" className="min-w-0 pb-3">
    <div className="grid min-w-0 grid-cols-2 gap-3 min-[640px]:grid-cols-3 min-[1120px]:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, scope }) => <div key={label} data-testid="user-population-metric" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3">
        <div className="flex min-h-9 items-start gap-2 text-[12px] leading-4 text-[#64748B]">
          <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0">{label}</span>
        </div>
        <p className="mt-1 text-[22px] font-semibold leading-7 tabular-nums tracking-tight text-[#0F172A]">
          {metrics && value !== undefined ? number.format(value) : "Unavailable"}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-[#64748B]">{scope}</p>
      </div>)}
    </div>
  </section>;
}
