import Link from "next/link";

type Props = {
  active: "trips" | "monitoring";
};

const tabClass =
  "inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] font-medium text-[#020617] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] ";

export function TripWorkspaceNavigation({ active }: Props) {
  return (
    <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b border-[#D8E1EC]">
      <nav aria-label="Trip reporting sections" className="flex min-w-0 gap-6">
        <Link
          href="/admin/confirmed-trips"
          aria-current={active === "trips" ? "page" : undefined}
          className={tabClass + (active === "trips" ? "border-[#004BB8]" : "border-transparent hover:border-[#D8E1EC]")}
        >
          Trips
        </Link>
        <Link
          href="/admin/confirmed-trips/monitoring"
          aria-current={active === "monitoring" ? "page" : undefined}
          className={tabClass + (active === "monitoring" ? "border-[#004BB8]" : "border-transparent hover:border-[#D8E1EC]")}
        >
          Trip monitoring
        </Link>
      </nav>
    </div>
  );
}
