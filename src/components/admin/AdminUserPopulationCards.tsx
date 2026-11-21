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
  return <section aria-label="User population metrics" className="min-w-0 pb-4">
    <div className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#D8E1EC] bg-[#D8E1EC] min-[1120px]:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, scope }) => <div key={label} className="min-w-0 bg-white px-3.5 py-3">
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
    <p className="mt-2 text-[11px] leading-[17px] text-[#64748B]">
      Registered counts include all account roles. Guest metrics count only eligible, unlinked consenting
      visitor identities; anonymous operational session IDs remain in the directory but are excluded because
      they cannot establish distinct people. The all-time totals are independent of directory search, role
      and status filters. New counts use account creation or first visitor observation during the selected period,
      not last activity. Account and visitor records have no deployment-environment label.
    </p>
  </section>;
}
