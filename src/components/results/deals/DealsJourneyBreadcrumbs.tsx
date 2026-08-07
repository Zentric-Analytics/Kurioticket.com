"use client";

import Link from "next/link";
import {
  BedDouble,
  Car,
  CheckCircle2,
  ChevronRight,
  Plane,
} from "lucide-react";
import type { DealsJourneyProgress } from "@/lib/deals/dealsJourneyProgress";
import type { DealsJourneyStage } from "@/lib/deals/dealsJourneyRoutes";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import {
  getDealsJourneyBreadcrumbs,
} from "@/lib/deals/dealsJourneyBreadcrumbs";

const productIcons = { hotel: BedDouble, flight: Plane, car: Car };

export function DealsJourneyBreadcrumbs({
  progress,
  page,
  search,
  t,
}: {
  progress: DealsJourneyProgress;
  page: DealsJourneyStage | "complete";
  search: DealsSearch;
  t: (key: string) => string;
}) {
  const items = getDealsJourneyBreadcrumbs(progress, page, search);
  return (
    <nav
      aria-label={t("deals.breadcrumb.navigationLabel")}
      className="mt-2 max-w-full overflow-x-auto py-1"
    >
      <ol className="flex min-w-max items-center whitespace-nowrap text-sm">
        {items.map((item, index) => {
          const Icon =
            item.id === "complete"
              ? CheckCircle2
              : item.product
                ? productIcons[item.product]
                : undefined;
          const content = (
            <>
              {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
              <span>{t(item.labelKey)}</span>
            </>
          );
          const className = `inline-flex min-h-11 items-center gap-1.5 rounded-md px-1.5 ${
            item.current
              ? "cursor-default font-semibold text-slate-950"
              : "focus-ring cursor-pointer font-medium text-slate-700 hover:text-[#004BB8] hover:underline"
          }`;
          return (
            <li
              key={item.id}
              className="flex items-center"
              aria-current={item.current ? "page" : undefined}
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden
                  className="mx-1 size-3.5 shrink-0 text-slate-400 rtl:rotate-180"
                />
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className={className}
                  aria-label={
                    item.accessibleLabelKey
                      ? t(item.accessibleLabelKey)
                      : undefined
                  }
                >
                  {content}
                </Link>
              ) : (
                <span
                  className={className}
                  aria-label={
                    item.accessibleLabelKey
                      ? t(item.accessibleLabelKey)
                      : undefined
                  }
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
