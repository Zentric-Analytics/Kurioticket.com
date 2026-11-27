import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { ActivityFiltersBar } from "./ActivityFiltersBar";
import { AdminActivityDataDialog, type ActivityCoverage } from "./AdminActivityDataDialog";

export const FULL_ACTIVITY_CATEGORIES = [
  { value: "all", label: "All activity" },
  { value: "access", label: "Device & Access" },
  { value: "pages", label: "Pages visited" },
  { value: "searches", label: "Searches" },
  { value: "selections", label: "Selections" },
  { value: "handoffs", label: "Provider handoffs" },
  { value: "interactions", label: "Saved, shared & alerts" },
] as const;

type ActivityAction = {
  label: string;
  href?: string;
  unavailableReason?: string;
};
type ActivityCategory = ActivityAction & { value: string };
type Props = {
  backHref: string;
  title: string;
  identityType: string;
  identityDetails?: ReactNode;
  journeyAction?: ActivityAction;
  filters: Omit<ComponentProps<typeof ActivityFiltersBar>, "tabs">;
  categories: readonly ActivityCategory[];
  activeCategory: string;
  historyActions?: readonly ActivityAction[];
  coverage?: ActivityCoverage;
  prefetch?: boolean;
  children: ReactNode;
};

const linkClass = "focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-[#004BB8] hover:bg-[#F1F6FF]";

function HistoryAction({ action, prefetch, arrow = false }: {
  action: ActivityAction; prefetch?: boolean; arrow?: boolean;
}) {
  const content = <>{action.label}{arrow ? <ChevronRight size={14} aria-hidden="true"/> : null}</>;
  return action.href
    ? <Link href={action.href} prefetch={prefetch} className={linkClass}>{content}</Link>
    : <span aria-disabled="true" title={action.unavailableReason}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#94A3B8]">{content}
      {action.unavailableReason ? <span className="sr-only"> — {action.unavailableReason}</span> : null}
    </span>;
}

/** One history presentation for accounts, recorded guests, and current access.
 * Callers provide only the actions supported by their verified identity evidence. */
export function AdminFullActivityWorkspace({
  backHref, title, identityType, identityDetails, journeyAction, filters,
  categories, activeCategory, historyActions = [], coverage, prefetch, children,
}: Props) {
  const tabs = <nav aria-label="Activity categories" className="flex min-w-0 flex-wrap gap-x-4 gap-y-0">
    {categories.map(category => category.href
      ? <Link key={category.value} href={category.href} prefetch={prefetch}
        aria-current={activeCategory === category.value ? "page" : undefined}
        className={"focus-ring inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-1 py-2 text-[13px] font-medium " +
          (activeCategory === category.value ? "border-[#004BB8] text-[#004BB8]" : "border-transparent text-[#475569]")}>
        {category.label}
      </Link>
      : <span key={category.value} aria-disabled="true" title={category.unavailableReason}
        className="inline-flex min-h-11 items-center border-b-2 border-transparent px-1 py-2 text-[13px] text-[#94A3B8]">
        {category.label}
        {category.unavailableReason ? <span className="sr-only"> — {category.unavailableReason}</span> : null}
      </span>)}
  </nav>;

  return <div className="min-w-0 space-y-3 bg-white pb-5 text-[#0F172A]">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <nav aria-label="Breadcrumb"><Link href={backHref} prefetch={prefetch} className={linkClass}>
        <ArrowLeft size={15} aria-hidden="true"/> Back to Activity
      </Link></nav>
      <AdminActivityDataDialog coverage={coverage}/>
    </div>
    <section data-testid="activity-history-card" className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold">All activity</h1>
          <p className="mt-1 break-words text-[13px] text-[#475569]">{title} · {identityType}</p>
          {identityDetails}
        </div>
        {journeyAction ? <HistoryAction action={journeyAction} prefetch={prefetch} arrow/> : null}
      </header>
      <ActivityFiltersBar {...filters} tabs={tabs}/>
      {historyActions.length ? <div data-testid="activity-history-actions" className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {historyActions.map(action => <HistoryAction key={action.label} action={action} prefetch={prefetch}/>)}
      </div> : null}
      {children}
    </section>
  </div>;
}
