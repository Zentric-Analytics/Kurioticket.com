import { ChevronDown } from "lucide-react";

import type { FaqItem } from "@/content/faqs";
import { cn } from "@/lib/utils";

type FaqAccordionProps = {
  items: FaqItem[];
  mobileLimit?: number;
  columns?: "one" | "two" | "three";
  compact?: boolean;
  className?: string;
};

const columnClasses = {
  one: "grid-cols-1",
  two: "grid-cols-1 md:grid-cols-2",
  three: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
};

export function FaqAccordion({
  items,
  mobileLimit,
  columns = "two",
  compact = false,
  className,
}: FaqAccordionProps) {
  return (
    <div
      className={cn(
        "grid items-start gap-3",
        columnClasses[columns],
        compact ? "sm:gap-4" : "sm:gap-5",
        className,
      )}
    >
      {items.map((item, index) => (
        <details
          key={item.question}
          className={cn(
            "group rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-950/[0.03] transition hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/[0.05]",
            mobileLimit !== undefined && index >= mobileLimit && "hidden sm:block",
          )}
        >
          <summary
            className={cn(
              "focus-ring flex cursor-pointer list-none items-start justify-between gap-4 text-start font-bold text-slate-900 marker:hidden [&::-webkit-details-marker]:hidden",
              compact
                ? "px-4 py-3.5 text-sm leading-6 sm:px-5"
                : "px-4 py-4 text-sm leading-6 sm:px-5 sm:py-5 sm:text-base",
            )}
          >
            <span>{item.question}</span>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:bg-[#004BB8]/8 group-open:text-[#004BB8]">
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"
              />
            </span>
          </summary>
          <div
            className={cn(
              "border-t border-slate-100 text-slate-600",
              compact
                ? "px-4 pb-4 pt-3 text-sm leading-6 sm:px-5"
                : "px-4 pb-5 pt-3 text-sm font-medium leading-6 sm:px-5 sm:text-base sm:leading-7",
            )}
          >
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
