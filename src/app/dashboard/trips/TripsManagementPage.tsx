"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type TripHistoryTab = "past" | "cancelled";
type TripStatusTab = "active" | TripHistoryTab;
type MobileTripTab = TripStatusTab;

const mobileTripTabs: Array<{ id: MobileTripTab; labelKey: string }> = [
  { id: "active", labelKey: "accountDashboard.trips.history.tabs.active" },
  { id: "past", labelKey: "accountDashboard.trips.history.tabs.past" },
  { id: "cancelled", labelKey: "accountDashboard.trips.history.tabs.cancelled" },
];

const mobileEmptyStates: Record<MobileTripTab, { titleKey: string; bodyKey: string; illustration: "current" | TripHistoryTab }> = {
  active: {
    titleKey: "accountDashboard.trips.current.empty.title",
    bodyKey: "accountDashboard.trips.current.empty.body",
    illustration: "current",
  },
  past: {
    titleKey: "accountDashboard.trips.history.empty.past.title",
    bodyKey: "accountDashboard.trips.history.empty.past.body",
    illustration: "past",
  },
  cancelled: {
    titleKey: "accountDashboard.trips.history.empty.cancelled.title",
    bodyKey: "accountDashboard.trips.history.empty.cancelled.body",
    illustration: "cancelled",
  },
};

const desktopTripTabs: Array<{ id: TripStatusTab; labelKey: string }> = mobileTripTabs;

export function TripsManagementPage() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const [activeHistoryTab, setActiveHistoryTab] = useState<TripHistoryTab>("past");
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

  const historyEmptyState = mobileEmptyStates[activeHistoryTab];

  return (
    <section aria-labelledby="trips-title" className="mx-auto min-w-0 max-w-[72rem] space-y-10 bg-white pb-12 pt-3 sm:pt-6 lg:space-y-12 lg:pb-16">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 id="trips-title" className="text-3xl font-black tracking-[-0.035em] text-slate-800 sm:text-4xl">
            {t("accountDashboard.trips.title")}
          </h1>
        </div>
        <div className="relative flex w-fit shrink-0 justify-end pt-1">
          <button
            ref={lookupTriggerRef}
            type="button"
            onClick={() => {
              setShowLookup(true);
              setLookupMessage(null);
            }}
            aria-expanded={showLookup}
            aria-controls="reservation-lookup"
            className="focus-ring inline-flex w-fit items-center justify-center rounded-full px-1 py-1 text-sm font-semibold text-violet-800 underline-offset-4 transition hover:text-violet-950 hover:underline lg:cursor-pointer"
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
                    <input type="text" name="reservationCode" autoComplete="off" className="focus-ring h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium uppercase tracking-[0.08em] text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-800">
                    {t("accountDashboard.trips.lookup.emailAddress")}
                    <input type="email" name="email" autoComplete="email" className="focus-ring h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400" />
                  </label>
                  <button type="submit" className="focus-ring inline-flex h-12 items-center justify-center rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(79,70,229,0.9)] transition hover:bg-violet-800">
                    {t("accountDashboard.trips.lookup.submit")}
                  </button>
                  {lookupMessage ? <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="status">{lookupMessage}</p> : null}
                </form>
              </section>
            </div>
          ) : null}
        </div>
      </div>

      <EmptyStateRow className="pt-3 sm:pt-8 lg:pt-12" illustration={<CurrentTripsIllustration ariaLabel={t("accountDashboard.trips.illustration.currentAriaLabel")} />} title={t("accountDashboard.trips.current.empty.title")} body={t("accountDashboard.trips.current.empty.body")} titleId="current-trips-panel-title" />

      <section aria-labelledby="history-trips-panel-title" className="space-y-8 pt-1 sm:pt-5 lg:pt-8">
        <div className="flex min-w-0 items-center gap-4" role="tablist" aria-label={t("accountDashboard.trips.history.filtersAriaLabel")}>
          {desktopTripTabs.filter((tab) => tab.id !== "active").map((tab) => {
            const isActive = activeHistoryTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-history-trips-panel`}
                id={`${tab.id}-history-trips-tab`}
                onClick={() => setActiveHistoryTab(tab.id as TripHistoryTab)}
                className={cn(
                  "focus-ring inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-5 text-sm font-semibold transition",
                  isActive ? "border-violet-300 bg-violet-50 text-violet-800" : "border-transparent bg-transparent text-slate-600 hover:border-violet-200 hover:text-slate-950",
                )}
              >
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        <div id={`${activeHistoryTab}-history-trips-panel`} role="tabpanel" aria-labelledby={`${activeHistoryTab}-history-trips-tab`}>
          <EmptyStateRow
            illustration={<HistoryEmptyIllustration variant={activeHistoryTab} ariaLabel={t(activeHistoryTab === "cancelled" ? "accountDashboard.trips.illustration.cancelledAriaLabel" : "accountDashboard.trips.illustration.historyAriaLabel")} />}
            title={t(historyEmptyState.titleKey)}
            body={t(historyEmptyState.bodyKey)}
            titleId="history-trips-panel-title"
          />
        </div>
      </section>
    </section>
  );
}

function EmptyStateRow({ illustration, title, body, titleId, className }: { illustration: ReactNode; title: string; body: string; titleId: string; className?: string }) {
  return (
    <div className={cn("grid min-w-0 items-center gap-7 sm:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10", className)}>
      <div className="flex justify-center sm:justify-start">{illustration}</div>
      <div className="min-w-0 text-center sm:text-left">
        <h2 id={titleId} className="text-2xl font-black tracking-[-0.025em] text-slate-800 sm:text-[1.65rem]">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base">{body}</p>
      </div>
    </div>
  );
}

function HistoryEmptyIllustration({ variant, ariaLabel }: { variant: TripHistoryTab; ariaLabel: string }) {
  if (variant === "cancelled") {
    return <CancelledTripIllustration ariaLabel={ariaLabel} />;
  }

  return <PastTripsIllustration ariaLabel={ariaLabel} />;
}

function CurrentTripsIllustration({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg className="h-auto w-44 shrink-0 sm:w-48 lg:w-52" viewBox="0 0 240 180" fill="none" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="currentTripBlob" x1="38" x2="202" y1="26" y2="152" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EEF2FF" />
          <stop offset="1" stopColor="#F5F3FF" />
        </linearGradient>
        <linearGradient id="currentTripGlobe" x1="63" x2="148" y1="50" y2="132" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DBEAFE" />
          <stop offset="1" stopColor="#EDE9FE" />
        </linearGradient>
        <filter id="currentTripShadow" x="29" y="35" width="187" height="130" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="14" floodColor="#4C1D95" floodOpacity="0.13" stdDeviation="10" />
        </filter>
      </defs>
      <path d="M42 98c-10-39 16-72 54-77 24-4 36 11 56 14 25 4 47 6 55 30 12 37-24 81-66 91-47 11-88-14-99-58Z" fill="url(#currentTripBlob)" />
      <g filter="url(#currentTripShadow)">
        <circle cx="97" cy="91" r="43" fill="url(#currentTripGlobe)" stroke="#6D28D9" strokeWidth="3" />
        <path d="M56 91h82M97 48c14 13 22 27 22 43s-8 30-22 43M97 48c-14 13-22 27-22 43s8 30 22 43" stroke="#8B5CF6" strokeLinecap="round" strokeWidth="2.5" />
        <path d="M66 65c16 8 45 8 62 0M66 117c16-8 45-8 62 0" stroke="#A78BFA" strokeLinecap="round" strokeWidth="2.5" />
        <path d="M59 80c18-9 32-9 50 1 18 9 32 9 50-2" stroke="#2563EB" strokeDasharray="4 7" strokeLinecap="round" strokeWidth="3" />
        <path d="M158 74l18 7-18 8 5-8-5-7Z" fill="#6D28D9" />
        <path d="M67 64c0 10-13 23-13 23S41 74 41 64a13 13 0 1 1 26 0Z" fill="#7C3AED" />
        <circle cx="54" cy="63" r="4" fill="white" />
        <path d="M145 99h36c5 0 9 4 9 9v30h-54v-30c0-5 4-9 9-9Z" fill="white" stroke="#5B21B6" strokeLinejoin="round" strokeWidth="3" />
        <path d="M153 99v-8c0-6 5-11 11-11s11 5 11 11v8" stroke="#5B21B6" strokeLinecap="round" strokeWidth="3" />
        <path d="M136 119h54" stroke="#C4B5FD" strokeLinecap="round" strokeWidth="3" />
        <rect x="151" y="112" width="26" height="17" rx="5" fill="#EDE9FE" />
      </g>
    </svg>
  );
}

function PastTripsIllustration({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg className="h-auto w-44 shrink-0 sm:w-48 lg:w-52" viewBox="0 0 240 180" fill="none" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="pastTripsBlob" x1="36" x2="206" y1="28" y2="151" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EFF6FF" />
          <stop offset="1" stopColor="#F5F3FF" />
        </linearGradient>
        <filter id="pastTripsShadow" x="34" y="32" width="178" height="128" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="13" floodColor="#4C1D95" floodOpacity="0.12" stdDeviation="10" />
        </filter>
      </defs>
      <path d="M35 89c0-38 34-65 73-64 28 1 37 17 61 21 26 4 43 13 43 39 0 40-41 76-90 77-50 2-87-29-87-73Z" fill="url(#pastTripsBlob)" />
      <g filter="url(#pastTripsShadow)">
        <rect x="54" y="48" width="101" height="78" rx="14" fill="white" stroke="#5B21B6" strokeWidth="3" />
        <path d="M68 108c18-19 30-22 44-10 8 7 17 8 30-5" stroke="#A78BFA" strokeLinecap="round" strokeWidth="3" />
        <path d="M73 69h40M73 82h25" stroke="#7C3AED" strokeLinecap="round" strokeWidth="3" />
        <path d="M129 76c0 10-13 24-13 24s-13-14-13-24a13 13 0 1 1 26 0Z" fill="#2563EB" />
        <circle cx="116" cy="75" r="4" fill="white" />
        <rect x="127" y="37" width="55" height="72" rx="10" fill="#F8FAFC" stroke="#6D28D9" strokeWidth="3" transform="rotate(8 127 37)" />
        <path d="M141 57l24 3M138 78l26 4M136 91l18 3" stroke="#A78BFA" strokeLinecap="round" strokeWidth="3" />
        <circle cx="165" cy="91" r="8" fill="#EDE9FE" stroke="#7C3AED" strokeWidth="3" />
        <path d="M66 134c16 8 76 10 103 0" stroke="#C4B5FD" strokeLinecap="round" strokeWidth="4" />
      </g>
    </svg>
  );
}

function CancelledTripIllustration({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg className="h-auto w-44 shrink-0 sm:w-48 lg:w-52" viewBox="0 0 240 180" fill="none" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="cancelledTripsBlob" x1="38" x2="202" y1="29" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EEF2FF" />
          <stop offset="1" stopColor="#F5F3FF" />
        </linearGradient>
        <filter id="cancelledTripsShadow" x="35" y="35" width="175" height="126" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="13" floodColor="#4C1D95" floodOpacity="0.12" stdDeviation="10" />
        </filter>
      </defs>
      <path d="M41 93c-8-35 21-65 59-68 26-2 35 13 58 17 26 5 47 9 50 34 5 39-34 75-80 81-48 6-78-25-87-64Z" fill="url(#cancelledTripsBlob)" />
      <g filter="url(#cancelledTripsShadow)">
        <path d="M57 60l39-15 42 15 39-15v78l-39 15-42-15-39 15V60Z" fill="white" stroke="#5B21B6" strokeLinejoin="round" strokeWidth="3" />
        <path d="M96 45v78M138 60v78" stroke="#C4B5FD" strokeLinecap="round" strokeWidth="3" />
        <path d="M70 88c17-16 38-18 58-7 16 9 27 8 43-5" stroke="#2563EB" strokeLinecap="round" strokeWidth="3" />
        <path d="M157 69l17 7-15 10 4-9-6-8Z" fill="#2563EB" />
        <path d="M88 91c0 10-13 24-13 24S62 101 62 91a13 13 0 1 1 26 0Z" fill="#7C3AED" />
        <circle cx="75" cy="90" r="4" fill="white" />
        <path d="M119 102c14 9 28 8 44-4" stroke="#8B5CF6" strokeDasharray="5 7" strokeLinecap="round" strokeWidth="3" />
        <circle cx="157" cy="105" r="22" fill="#F5F3FF" stroke="#6D28D9" strokeWidth="3" />
        <path d="M148 96l18 18M166 96l-18 18" stroke="#6D28D9" strokeLinecap="round" strokeWidth="4" />
        <path d="M65 144c15 7 73 9 103 0" stroke="#C4B5FD" strokeLinecap="round" strokeWidth="4" />
      </g>
    </svg>
  );
}
