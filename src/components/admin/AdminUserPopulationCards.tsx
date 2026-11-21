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
    { label: "Guest records", value: metrics?.guests, icon: UserRound, scope: "All time" },
    { label: "New registrations", value: metrics?.newRegistrations, icon: UserPlus, scope: period },
    { label: "New guest records", value: metrics?.newGuests, icon: UserRoundPlus, scope: period },
  ];
  return <section aria-label="User population metrics" className="min-w-0 pb-4">
    <div className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#D8E1EC] bg-[#D8E1EC] min-[1120px]:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, scope }) => <div key={label} className="min-w-0 bg-white px-3.5 py-3">
        <div className="flex min-h-9 items-start gap-2 text-[12px] leading-4 text-[#64748B]">
          <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0">{label}</span>
        </div>
        <p className="mt-1 text-[22px] font-semibold leading-7 tabular-nums tracking-tight text-[#0F172A]">
          {metrics ? number.format(value ?? 0) : "Unavailable"}
        </p>
        <p className="mt-1 text-[11px] leading-4 text-[#64748B]">{scope}</p>
      </div>)}
    </div>
    <p className="mt-2 text-[11px] leading-[17px] text-[#64748B]">
      Registered accounts include all account roles. Guest records combine eligible, unlinked consenting visitors
      with distinct unattributed operational session IDs; they do not prove unique people or devices.
      Counts are separate from directory search, role, status and activity filters.
      New counts use first registration or first recorded guest observation, not last activity.
      Account and consenting-visitor records are not environment-labelled; unattributed sessions use the current deployment.
    </p>
  </section>;
}
