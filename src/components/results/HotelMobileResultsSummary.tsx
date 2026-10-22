"use client";

import { SquarePen } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  destination: string;
  summary: string;
  ariaLabel: string;
  onClick: () => void;
  variant?: "primary" | "sticky";
  className?: string;
};

export function HotelMobileResultsSummary({
  destination,
  summary,
  ariaLabel,
  onClick,
  variant = "primary",
  className,
}: Props) {
  const sticky = variant === "sticky";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-hotel-mobile-results-summary-control={variant}
      className={cn(
        "focus-ring group flex min-w-0 touch-manipulation items-center justify-between overflow-hidden border border-[#D8E1EC] bg-white text-start transition [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35",
        sticky
          ? "h-12 w-full gap-2 rounded-[12px] px-3 shadow-[0_5px_16px_-14px_rgba(15,23,42,0.38)] hover:border-[#C6D2E0]"
          : "h-16 w-full gap-3 rounded-[13px] px-4 shadow-[0_6px_18px_-16px_rgba(15,23,42,0.32)] hover:border-[#C6D2E0] hover:shadow-[0_8px_20px_-16px_rgba(15,23,42,0.36)]",
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
        <span
          className={cn(
            "block truncate font-bold tracking-[-0.01em] text-[#142033]",
            sticky ? "text-[15px] leading-5" : "text-[16px] leading-5",
          )}
        >
          {destination}
        </span>
        <span
          className={cn(
            "block truncate font-semibold text-slate-600",
            sticky
              ? "mt-0.5 text-[12.5px] leading-[17px]"
              : "mt-[3px] text-[12.5px] leading-[17px]",
          )}
        >
          {summary}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center border border-transparent bg-transparent text-slate-700 transition group-hover:bg-slate-100",
          sticky ? "h-9 w-9 rounded-[9px]" : "-my-1 h-11 w-11 rounded-[10px]",
        )}
      >
        <SquarePen size={16} strokeWidth={2.2} />
      </span>
    </button>
  );
}
