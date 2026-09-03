"use client";

import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { nearbyFarePriceSize } from "./nearbyFareDateTilePresentation";

export type NearbyFareDateTileProps = {
  buttonRef?: Ref<HTMLButtonElement>;
  dateLabel: string;
  weekdayLabel: string;
  formattedPrice: string | null;
  accessibleLabel: string;
  selected: boolean;
  loading: boolean;
  unavailable: boolean;
  disabled: boolean;
  presentation: "mobile" | "desktop";
  onSelect: () => void;
};

export function NearbyFareDateTile({
  buttonRef,
  dateLabel,
  weekdayLabel,
  formattedPrice,
  accessibleLabel,
  selected,
  loading,
  unavailable,
  disabled,
  presentation,
  onSelect,
}: NearbyFareDateTileProps) {
  const visiblePrice = formattedPrice ?? (loading ? "" : "Unavailable");

  return (
    <button
      ref={buttonRef}
      type="button"
      data-fare-date-cell
      data-fare-date-presentation={presentation}
      aria-label={accessibleLabel}
      aria-current={selected ? "date" : undefined}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "focus-ring relative flex min-h-[76px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-center shadow-sm transition hover:border-[#075EE8]/40 hover:bg-slate-50 focus-visible:border-[#075EE8]/50 motion-reduce:transition-none",
        presentation === "mobile"
          ? "w-[clamp(92px,24vw,104px)] snap-center"
          : "w-full min-w-0",
        selected && "border-[#075EE8] bg-blue-50/60",
      )}
    >
      {selected ? (
        <span
          className="absolute inset-x-1.5 top-0 h-0.5 rounded-b bg-[#075EE8]"
          aria-hidden="true"
        />
      ) : null}
      {loading ? (
        <>
          <span className="h-3 w-12 animate-pulse rounded bg-slate-200" />
          <span className="mt-1.5 h-3 w-8 animate-pulse rounded bg-slate-200" />
          <span className="mt-1.5 h-3 w-14 animate-pulse rounded bg-slate-200" />
        </>
      ) : (
        <>
          <span className={cn("text-[12px] font-semibold uppercase leading-4", selected ? "text-[#075EE8]" : "text-slate-800")}>
            {dateLabel.toUpperCase()}
          </span>
          <span className={cn("text-[11px] font-medium uppercase leading-4", selected ? "text-[#075EE8]" : "text-slate-500")}>
            {weekdayLabel.toUpperCase()}
          </span>
          <span
            className={cn(
              "flight-fare-strip-price mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-medium leading-4 tabular-nums",
              selected ? "font-semibold text-[#075EE8]" : "text-slate-900",
              unavailable && "text-slate-500",
            )}
            data-price-size={nearbyFarePriceSize(visiblePrice)}
            title={formattedPrice ?? undefined}
            dir="ltr"
          >
            {visiblePrice}
          </span>
        </>
      )}
    </button>
  );
}
