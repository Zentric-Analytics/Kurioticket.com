import type { ReactNode } from "react";

export function MobileFlightDetailsActionBar({ back, actions }: { back: ReactNode; actions: ReactNode }) {
  return (
    <header
      data-flight-details-mobile-action-bar
      aria-label="Flight details actions"
      className="sticky top-0 z-[80] flex min-h-[calc(env(safe-area-inset-top)+64px)] items-center justify-between bg-[#F5F7FB] px-4 pb-[10px] pt-[calc(env(safe-area-inset-top)+10px)] sm:hidden"
    >
      {back}
      <div data-flight-details-mobile-actions className="inline-flex h-11 w-[88px] items-center rounded-[20px] border border-white/55 bg-white/90 shadow-[0_2px_6px_rgba(15,23,42,0.12)] backdrop-blur-md">
        {actions}
      </div>
    </header>
  );
}
