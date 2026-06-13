"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type TripHistoryTab = "past" | "cancelled";
type TripStatusTab = "active" | TripHistoryTab;
type MobileTripTab = TripStatusTab;

const mobileTripTabs: Array<{ id: MobileTripTab; label: string }> = [
  { id: "active", label: "Active" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const mobileEmptyStates: Record<MobileTripTab, { title: string; body: string; illustration: "current" | TripHistoryTab }> = {
  active: {
    title: "Where to next?",
    body: "You have not started any trips yet. When you make a booking, it will appear here.",
    illustration: "current",
  },
  past: {
    title: "Your travel history will appear here",
    body: "Completed trips will be listed here so you can review past plans and details.",
    illustration: "past",
  },
  cancelled: {
    title: "No cancelled trips yet",
    body: "Trips you cancel will appear here for easy reference.",
    illustration: "cancelled",
  },
};

const desktopTripTabs: Array<{ id: TripStatusTab; label: string }> = mobileTripTabs;

export function TripsManagementPage() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTripTab>("active");
  const [activeDesktopTab, setActiveDesktopTab] = useState<TripStatusTab>("active");
  const [showLookup, setShowLookup] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const lookupPopoverRef = useRef<HTMLDivElement | null>(null);
  const lookupTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showLookup) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (lookupPopoverRef.current?.contains(target) || lookupTriggerRef.current?.contains(target)) {
        return;
      }

      setShowLookup(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowLookup(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLookup]);

  function closeLookup() {
    setShowLookup(false);
  }

  function handleLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupMessage(t("accountDashboard.trips.lookup.unavailable"));
  }

  const mobileEmptyState = mobileEmptyStates[activeMobileTab];
  const desktopEmptyState = mobileEmptyStates[activeDesktopTab];

  return (
    <section aria-labelledby="trips-title" className="mx-auto min-w-0 max-w-[62rem] space-y-5 lg:mt-0 lg:space-y-6 xl:max-w-[64rem]">
      <div className="flex min-w-0 flex-col gap-2 pb-0 sm:gap-4 lg:flex-row lg:items-start lg:justify-between lg:border-b lg:border-slate-200/80 lg:pb-5">
        <div className="min-w-0">
          <h1 id="trips-title" className="text-4xl font-black tracking-[-0.04em] text-slate-950 lg:text-4xl lg:font-bold lg:tracking-[-0.035em]">
            {t("accountDashboard.trips.title")}
          </h1>
          <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-slate-600 lg:block lg:text-base">
            {t("accountDashboard.trips.subtitle")}
          </p>
        </div>
        <div className="relative flex w-fit shrink-0 justify-end">
          <button
            ref={lookupTriggerRef}
            type="button"
            onClick={() => {
              setShowLookup(true);
              setLookupMessage(null);
            }}
            aria-expanded={showLookup}
            aria-controls="reservation-lookup"
            className="focus-ring inline-flex w-fit items-center justify-center rounded-full px-1 py-1 text-sm font-semibold text-violet-800 underline-offset-4 transition hover:text-violet-950 hover:underline"
          >
            {t("accountDashboard.trips.findReservation")}
          </button>

          {showLookup ? (
            <div
              className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/20 px-3 pb-3 pt-16 sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:block sm:w-[min(24rem,calc(100vw-3rem))] sm:bg-transparent sm:p-0"
              role="presentation"
            >
              <section
                id="reservation-lookup"
                ref={lookupPopoverRef}
                aria-labelledby="reservation-lookup-title"
                aria-modal="true"
                role="dialog"
                className="max-h-[calc(100vh-4.75rem)] w-full max-w-sm overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)] sm:max-h-none sm:max-w-none sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 id="reservation-lookup-title" className="text-xl font-bold tracking-[-0.02em] text-slate-950">
                      {t("accountDashboard.trips.lookup.title")}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {t("accountDashboard.trips.lookup.body")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeLookup}
                    aria-label={t("accountDashboard.trips.lookup.closeAriaLabel")}
                    className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl leading-none text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleLookupSubmit} className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-slate-800">
                    {t("accountDashboard.trips.lookup.reservationCode")}
                    <input
                      type="text"
                      name="reservationCode"
                      autoComplete="off"
                      className="focus-ring h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium uppercase tracking-[0.08em] text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-800">
                    {t("accountDashboard.trips.lookup.emailAddress")}
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      className="focus-ring h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400"
                    />
                  </label>
                  <button
                    type="submit"
                    className="focus-ring inline-flex h-12 items-center justify-center rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(79,70,229,0.9)] transition hover:bg-violet-800"
                  >
                    {t("accountDashboard.trips.lookup.submit")}
                  </button>
                  {lookupMessage ? (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="status">
                      {lookupMessage}
                    </p>
                  ) : null}
                </form>
              </section>
            </div>
          ) : null}
        </div>
      </div>

      <section aria-labelledby="mobile-trips-panel-title" className="space-y-7 lg:hidden">
        <div className="flex min-w-0 items-center gap-7 overflow-hidden" role="tablist" aria-label="Trip status filters">
          {mobileTripTabs.map((tab) => {
            const isActive = activeMobileTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-mobile-trips-panel`}
                id={`${tab.id}-mobile-trips-tab`}
                onClick={() => setActiveMobileTab(tab.id)}
                className={cn(
                  "focus-ring inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-0.5 text-sm font-bold transition",
                  isActive
                    ? "border-violet-700 text-violet-800"
                    : "border-transparent text-slate-800 hover:border-violet-200 hover:text-slate-950",
                )}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div
          id={`${activeMobileTab}-mobile-trips-panel`}
          role="tabpanel"
          aria-labelledby={`${activeMobileTab}-mobile-trips-tab`}
          className="px-1 pb-10 pt-1"
        >
          <div className="flex min-w-0 flex-col items-center gap-5 text-center">
            {mobileEmptyState.illustration === "current" ? (
              <CurrentTripsIllustration ariaLabel={t("accountDashboard.trips.illustration.currentAriaLabel")} />
            ) : (
              <HistoryEmptyIllustration
                variant={mobileEmptyState.illustration}
                ariaLabel={t(mobileEmptyState.illustration === "cancelled" ? "accountDashboard.trips.illustration.cancelledAriaLabel" : "accountDashboard.trips.illustration.historyAriaLabel")}
              />
            )}
            <div className="max-w-lg">
              <h2 id="mobile-trips-panel-title" className="text-2xl font-bold tracking-[-0.025em] text-slate-950">
                {mobileEmptyState.title}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-700">
                {mobileEmptyState.body}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="desktop-trips-panel-title" className="hidden pt-2 lg:block">
        <div className="border-b border-slate-200/80" role="tablist" aria-label="Trip status filters">
          <div className="flex min-w-0 gap-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {desktopTripTabs.map((tab) => {
              const isActive = activeDesktopTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab.id}-desktop-trips-panel`}
                  id={`${tab.id}-desktop-trips-tab`}
                  onClick={() => setActiveDesktopTab(tab.id)}
                  className={cn(
                    "focus-ring relative -mb-px inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-1 text-sm font-semibold transition",
                    isActive
                      ? "border-violet-800 text-violet-900"
                      : "border-transparent text-slate-600 hover:border-violet-300 hover:text-slate-900",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id={`${activeDesktopTab}-desktop-trips-panel`}
          role="tabpanel"
          aria-labelledby={`${activeDesktopTab}-desktop-trips-tab`}
          className="flex min-h-[25rem] items-center justify-center px-1 pb-16 pt-12 xl:min-h-[28rem] xl:pb-20 xl:pt-14"
        >
          <div className="flex min-w-0 flex-col items-center gap-5 text-center">
            {desktopEmptyState.illustration === "current" ? (
              <CurrentTripsIllustration ariaLabel={t("accountDashboard.trips.illustration.currentAriaLabel")} />
            ) : (
              <HistoryEmptyIllustration
                variant={desktopEmptyState.illustration}
                ariaLabel={t(desktopEmptyState.illustration === "cancelled" ? "accountDashboard.trips.illustration.cancelledAriaLabel" : "accountDashboard.trips.illustration.historyAriaLabel")}
              />
            )}
            <div className="max-w-lg">
              <h2 id="desktop-trips-panel-title" className="text-3xl font-bold tracking-[-0.025em] text-slate-950">
                {desktopEmptyState.title}
              </h2>
              <p className="mt-3 text-base font-medium leading-6 text-slate-700">
                {desktopEmptyState.body}
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

function HistoryEmptyIllustration({ variant, ariaLabel }: { variant: TripHistoryTab; ariaLabel: string }) {
  if (variant === "cancelled") {
    return (
      <svg
        className="h-24 w-24 shrink-0 text-violet-800"
        viewBox="0 0 120 120"
        fill="none"
        role="img"
        aria-label={ariaLabel}
      >
        <circle cx="60" cy="60" r="44" fill="#F1EDFF" />
        <path d="M29 42l18-8 26 10 18-7v41l-18 7-26-10-18 8V42Z" fill="white" stroke="currentColor" strokeLinejoin="round" strokeWidth="3" />
        <path d="M47 34v41M73 44v41" stroke="#A78BFA" strokeLinecap="round" strokeWidth="2.5" />
        <path d="M38 60c9-7 17-8 27-3s17 4 25-4" stroke="#C4B5FD" strokeLinecap="round" strokeWidth="3" />
        <circle cx="76" cy="68" r="15" fill="#F5F3FF" stroke="#6D28D9" strokeWidth="3" />
        <path d="M70 62l12 12M82 62L70 74" stroke="#6D28D9" strokeLinecap="round" strokeWidth="3" />
      </svg>
    );
  }

  return (
    <svg
      className="h-24 w-24 shrink-0 text-violet-800"
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label={ariaLabel}
    >
      <circle cx="60" cy="60" r="44" fill="#F1EDFF" />
      <path d="M34 32h36l15 15v41H34V32Z" fill="white" stroke="currentColor" strokeLinejoin="round" strokeWidth="3" />
      <path d="M70 33v15h15" stroke="currentColor" strokeLinejoin="round" strokeWidth="3" />
      <path d="M45 59h27M45 70h21" stroke="#A78BFA" strokeLinecap="round" strokeWidth="3" />
      <path d="M45 48h12" stroke="#6D28D9" strokeLinecap="round" strokeWidth="3" />
      <path d="M42 88c7 5 29 5 36 0" stroke="#C4B5FD" strokeLinecap="round" strokeWidth="3" />
      <path d="M82 74a13 13 0 1 1-4-9" stroke="#6D28D9" strokeLinecap="round" strokeWidth="3" />
      <path d="M82 61v11h-11" stroke="#6D28D9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

function CurrentTripsIllustration({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg className="h-28 w-28 text-violet-800 sm:h-32 sm:w-32" viewBox="0 0 160 160" fill="none" role="img" aria-label={ariaLabel}>
      <circle cx="80" cy="80" r="58" fill="#ECE7FF" />
      <path d="M43 104c14 11 60 11 74 0" stroke="#8B5CF6" strokeLinecap="round" strokeWidth="4" />
      <path d="M50 96l20-52 26 20 22-11-18 59-28-21-22 5Z" fill="white" stroke="currentColor" strokeLinejoin="round" strokeWidth="4" />
      <path d="M70 44l2 47M96 64l4 48" stroke="#8B5CF6" strokeLinecap="round" strokeWidth="3" />
      <path d="M43 55c11-9 22-13 36-13" stroke="#8B5CF6" strokeDasharray="1 8" strokeLinecap="round" strokeWidth="3" />
      <path d="M113 42l9 4-9 4 3-4-3-4Z" fill="#6D28D9" />
      <circle cx="104" cy="96" r="7" fill="#6D28D9" />
    </svg>
  );
}
