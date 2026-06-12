"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

type TripTab = "past" | "cancelled";

const tabs: Array<{ id: TripTab; label: string }> = [
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

export function TripsManagementPage() {
  const [activeTab, setActiveTab] = useState<TripTab>("past");
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
    setLookupMessage("Reservation lookup is not available yet.");
  }

  const historyEmptyState = activeTab === "past"
    ? {
        title: "Your travel history will appear here",
        body: "Completed trips will be listed here so you can review past plans and details.",
      }
    : {
        title: "No cancelled trips yet",
        body: "Trips you cancel will appear here for easy reference.",
      };

  return (
    <section aria-labelledby="trips-title" className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]">
      <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 id="trips-title" className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            My Trips
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            View and manage your trips in one place.
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
            Find a reservation
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
                      Enter booking details
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      Enter your reservation code and email address to locate and manage your booking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeLookup}
                    aria-label="Close reservation lookup"
                    className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl leading-none text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleLookupSubmit} className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-slate-800">
                    Reservation code
                    <input
                      type="text"
                      name="reservationCode"
                      autoComplete="off"
                      className="focus-ring h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium uppercase tracking-[0.08em] text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-800">
                    Email address
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
                    Find reservation
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

      <section aria-labelledby="upcoming-trips-title" className="pt-4 sm:pt-6">
        <div className="flex min-w-0 flex-col items-center gap-5 py-5 text-center sm:py-7">
          <CurrentTripsIllustration />
          <div className="max-w-lg">
            <h2 id="upcoming-trips-title" className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-3xl">
              Where to next?
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-700 sm:text-base">
              You have not started any trips yet. When you make a booking, it will appear here.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="trip-history-title" className="pt-2 sm:pt-4">
        <h2 id="trip-history-title" className="sr-only">
          Trip history
        </h2>
        <div className="border-b border-slate-200/80" role="tablist" aria-label="Trip history filters">
          <div className="flex min-w-0 gap-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab.id}-trips-panel`}
                  id={`${tab.id}-trips-tab`}
                  onClick={() => setActiveTab(tab.id)}
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
          id={`${activeTab}-trips-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTab}-trips-tab`}
          className="min-h-[10rem] px-1 pb-9 pt-6 sm:pb-11 sm:pt-8"
        >
          <div className="max-w-xl">
            <h3 className="text-xl font-bold tracking-[-0.02em] text-slate-950 sm:text-2xl">{historyEmptyState.title}</h3>
            <p className="mt-2 max-w-lg text-sm font-medium leading-6 text-slate-700 sm:text-base">{historyEmptyState.body}</p>
          </div>
        </div>
      </section>
    </section>
  );
}

function CurrentTripsIllustration() {
  return (
    <svg className="h-28 w-28 text-violet-800 sm:h-32 sm:w-32" viewBox="0 0 160 160" fill="none" role="img" aria-label="Travel illustration">
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
