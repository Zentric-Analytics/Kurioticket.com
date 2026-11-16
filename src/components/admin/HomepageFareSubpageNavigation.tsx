import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type FareSubpage = "routes" | "diagnostics";

const tabs: { key: FareSubpage; href: string; label: string }[] = [
  { key: "routes", href: "/admin/homepage-fares/routes", label: "Route Inspector" },
  { key: "diagnostics", href: "/admin/homepage-fares/diagnostics", label: "Fare Diagnostics" },
];

const descriptions: Record<FareSubpage, string> = {
  routes: "Inspect saved homepage fare routes by market and status.",
  diagnostics: "Review fallback coverage, refresh execution, fare eligibility and scheduling.",
};

export function HomepageFareSubpageNavigation({ active }: { active: FareSubpage }) {
  return (
    <header className="min-w-0 pt-1">
      <div className="pb-2">
        <Link
          href="/admin/homepage-fares"
          className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-md px-1 py-1 text-[12px] font-medium leading-5 text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="min-w-0">Back to Homepage Fare Operations</span>
        </Link>
      </div>
      <nav
        aria-label="Homepage fare sections"
        className="flex min-w-0 flex-wrap items-end gap-x-6 border-b border-[#D8E1EC]"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={
              "inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] font-medium text-[#020617] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] " +
              (active === tab.key ? "border-[#004BB8]" : "border-transparent hover:border-[#D8E1EC]")
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <p className="pb-3 pt-3 text-[12px] leading-5 text-[#64748B]">{descriptions[active]}</p>
    </header>
  );
}
