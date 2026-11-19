"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const mobileResultsEditGroupClass =
  "overflow-hidden rounded-[14px] border border-[#D8E1EC] bg-white divide-y divide-[#E2E8F0] [&>[data-hotel-mobile-edit-row]+[data-hotel-mobile-edit-row]]:border-t [&>[data-hotel-mobile-edit-row]+[data-hotel-mobile-edit-row]]:border-[#E2E8F0]";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  value: string;
  icon?: LucideIcon;
  showChevron?: boolean;
};

export const MobileResultsEditRow = forwardRef<HTMLButtonElement, Props>(
  function MobileResultsEditRow(
    { label, value, icon: Icon, showChevron = true, className, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        data-mobile-results-edit-row
        className={cn(
          "grid min-h-[60px] w-full grid-cols-[20px_minmax(0,1fr)_18px] items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {Icon ? (
          <Icon
            className="h-[18px] w-[18px] text-slate-500"
            aria-hidden="true"
          />
        ) : (
          <span />
        )}
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase leading-3 tracking-[0.1em] text-slate-500">
            {label}
          </span>
          <span className="mt-1 block truncate text-[15px] font-semibold leading-5 text-slate-950">
            {value}
          </span>
        </span>
        {showChevron ? (
          <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
        ) : (
          <span aria-hidden="true" />
        )}
      </button>
    );
  },
);
