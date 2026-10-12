import type { ReactNode } from "react";

export const mobileFlightDetailsNavSurfaceClass =
  "inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-inset ring-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.06)]";

export function MobileFlightDetailsActionBar({ back, actions }: { back: ReactNode; actions: ReactNode }) {
  return (
    <header
      data-flight-details-mobile-action-bar
      aria-label="Flight details actions"
      className="sticky top-0 z-[80] flex min-h-[calc(env(safe-area-inset-top)+60px)] items-center justify-between bg-inherit px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)] sm:hidden"
    >
      {back}
      <div data-flight-details-mobile-actions className={`${mobileFlightDetailsNavSurfaceClass} w-[92px] gap-1`}>
        {actions}
      </div>
    </header>
  );
}
