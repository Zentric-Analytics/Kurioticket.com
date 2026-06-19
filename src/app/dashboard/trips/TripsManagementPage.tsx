"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRightLeft, CalendarClock, CircleX, MapPin, Plane, Route, Ticket, BriefcaseBusiness } from "lucide-react";
import { AccountSectionHeader } from "@/components/dashboard/DashboardGrid";
import { cn } from "@/lib/utils";

type TripTabId = "active" | "past" | "cancelled";

type TripTab = {
  id: TripTabId;
  label: string;
  headline: string;
  text: string;
  visualLabel: string;
};

const tripTabs: TripTab[] = [
  {
    id: "active",
    label: "Active",
    headline: "Where to next?",
    text: "You haven’t started any trips yet. When you make a booking, it will appear here.",
    visualLabel: "Suitcase, boarding pass, and plane route illustration",
  },
  {
    id: "past",
    label: "Past",
    headline: "Revisit your favourite places",
    text: "Here you will see all your past trips and get inspired for your next ones.",
    visualLabel: "Postcard timeline and location pins illustration",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    headline: "Sometimes plans change",
    text: "Here you will see all the trips you have cancelled. Maybe next time!",
    visualLabel: "Changed route and cancelled marker illustration",
  },
];

export function TripsManagementPage() {
  const [activeTab, setActiveTab] = useState<TripTabId>("active");
  const activeTripTab = tripTabs.find((tab) => tab.id === activeTab) ?? tripTabs[0];

  return (
    <section aria-labelledby="trips-title" className="mx-auto min-w-0 max-w-[64rem] space-y-5 lg:space-y-7">
      <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200/80 pb-5 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
        <AccountSectionHeader
          title="Bookings & Trips"
          description="View and manage your active, past, and cancelled trips."
          titleId="trips-title"
        />
        <Link
          href="/dashboard/support"
          className="focus-ring inline-flex w-fit shrink-0 items-center justify-center rounded-full px-1 py-1 text-sm font-semibold text-violet-800 underline-offset-4 transition hover:text-violet-950 hover:underline"
        >
          Can’t find a booking?
        </Link>
      </div>

      <div className="space-y-5 sm:space-y-6">
        <div
          role="tablist"
          aria-label="Trip status filters"
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="inline-flex min-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_42px_-34px_rgba(49,46,129,0.45)] sm:min-w-0">
            {tripTabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${tab.id}-trips-tab`}
                  aria-selected={isActive}
                  aria-controls={`${tab.id}-trips-panel`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "focus-ring inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-bold transition sm:min-w-28 sm:flex-none",
                    isActive
                      ? "border border-violet-700 bg-violet-700 text-white shadow-[0_16px_32px_-22px_rgba(79,70,229,0.9)]"
                      : "border border-transparent text-slate-700 hover:bg-violet-50 hover:text-violet-900",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section
          id={`${activeTripTab.id}-trips-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTripTab.id}-trips-tab`}
          className="overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_30px_90px_-65px_rgba(49,46,129,0.9)]"
        >
          <div className="grid gap-8 px-5 py-9 sm:px-8 sm:py-11 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10 lg:px-12 lg:py-14">
            <TripVisual tab={activeTripTab} />
            <div className="mx-auto max-w-lg text-center lg:mx-0 lg:text-left">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-800">{activeTripTab.label} trips</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-4xl">
                {activeTripTab.headline}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7 lg:mx-0">
                {activeTripTab.text}
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function TripVisual({ tab }: { tab: TripTab }) {
  if (tab.id === "past") {
    return <PastTripsVisual tab={tab} />;
  }

  if (tab.id === "cancelled") {
    return <CancelledTripsVisual tab={tab} />;
  }

  return <ActiveTripsVisual tab={tab} />;
}

function VisualShell({ tab, children }: { tab: TripTab; children: ReactNode }) {
  return (
    <div
      role="img"
      aria-label={tab.visualLabel}
      className="relative mx-auto flex min-h-64 w-full max-w-sm items-center justify-center rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:min-h-72 lg:mx-0"
    >
      <div className="absolute left-6 top-6 h-14 w-14 rounded-full bg-violet-100/80" />
      <div className="absolute bottom-7 right-8 h-20 w-20 rounded-full border border-violet-200/80" />
      {children}
    </div>
  );
}

function ActiveTripsVisual({ tab }: { tab: TripTab }) {
  return (
    <VisualShell tab={tab}>
      <div className="relative h-52 w-64">
        <Route className="absolute left-5 top-7 h-36 w-52 text-violet-300" strokeWidth={1.8} />
        <Plane className="absolute right-6 top-8 h-8 w-8 rotate-12 text-violet-800" />
        <div className="absolute bottom-8 left-8 h-28 w-24 rounded-3xl border-2 border-violet-800 bg-white shadow-[0_18px_42px_-28px_rgba(49,46,129,0.8)]">
          <div className="mx-auto mt-4 h-5 w-10 rounded-full border-2 border-violet-700" />
          <div className="absolute bottom-0 left-0 right-0 h-16 rounded-b-[1.35rem] bg-violet-100" />
          <BriefcaseBusiness className="absolute bottom-5 left-1/2 h-10 w-10 -translate-x-1/2 text-violet-800" />
        </div>
        <div className="absolute bottom-11 right-9 rotate-6 rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_18px_42px_-30px_rgba(49,46,129,0.75)]">
          <Ticket className="h-12 w-12 text-violet-700" />
          <div className="mt-3 h-2 w-20 rounded-full bg-violet-100" />
          <div className="mt-2 h-2 w-14 rounded-full bg-slate-200" />
        </div>
      </div>
    </VisualShell>
  );
}

function PastTripsVisual({ tab }: { tab: TripTab }) {
  return (
    <VisualShell tab={tab}>
      <div className="relative h-52 w-64">
        <div className="absolute left-9 top-8 h-36 w-44 -rotate-6 rounded-3xl border border-violet-200 bg-white p-4 shadow-[0_18px_42px_-30px_rgba(49,46,129,0.75)]">
          <div className="h-16 rounded-2xl bg-violet-100" />
          <div className="mt-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-violet-700" />
            <div className="h-2 flex-1 rounded-full bg-slate-200" />
          </div>
          <div className="mt-3 h-2 w-24 rounded-full bg-violet-200" />
        </div>
        <div className="absolute bottom-9 right-8 rounded-2xl border border-violet-200 bg-white p-4 shadow-[0_18px_42px_-30px_rgba(49,46,129,0.65)]">
          <MapPin className="h-9 w-9 text-violet-800" />
        </div>
        <div className="absolute left-16 top-[3.25rem] h-3 w-3 rounded-full bg-violet-700" />
        <div className="absolute left-28 top-28 h-3 w-3 rounded-full bg-violet-500" />
        <div className="absolute right-[4.25rem] top-20 h-3 w-3 rounded-full bg-violet-700" />
      </div>
    </VisualShell>
  );
}

function CancelledTripsVisual({ tab }: { tab: TripTab }) {
  return (
    <VisualShell tab={tab}>
      <div className="relative h-52 w-64">
        <div className="absolute left-8 top-9 h-36 w-48 rounded-3xl border border-violet-200 bg-white p-5 shadow-[0_18px_42px_-30px_rgba(49,46,129,0.75)]">
          <Route className="h-24 w-36 text-violet-300" strokeWidth={1.8} />
          <ArrowRightLeft className="absolute left-20 top-16 h-9 w-9 text-violet-800" />
          <MapPin className="absolute bottom-5 left-6 h-7 w-7 text-violet-700" />
        </div>
        <div className="absolute bottom-9 right-8 rounded-full border border-violet-200 bg-white p-4 shadow-[0_18px_42px_-30px_rgba(49,46,129,0.65)]">
          <CircleX className="h-11 w-11 text-violet-800" />
        </div>
      </div>
    </VisualShell>
  );
}
