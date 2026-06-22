"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LineChart, Mail, Search, Settings2 } from "lucide-react";

const tabs = ["Active (0)", "Expired (0)", "All (0)"];
const sortOptions = ["Newest", "Oldest", "Route A-Z"];

const infoItems = [
  {
    title: "Real-time monitoring",
    text: "We monitor tracked routes when alerts are active.",
    icon: Bell,
  },
  {
    title: "Email notifications",
    text: "Get notified when fares change.",
    icon: Mail,
  },
  {
    title: "Price trends",
    text: "See how tracked fares move over time.",
    icon: LineChart,
  },
  {
    title: "Easy management",
    text: "Pause or remove alerts anytime.",
    icon: Settings2,
  },
];

function EmptyStateIllustration() {
  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48" aria-hidden="true">
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-100 via-indigo-50 to-sky-100" />
      <div className="absolute bottom-9 h-3 w-28 rounded-full bg-indigo-200/50 blur-[1px]" />
      <svg className="relative h-28 w-28 drop-shadow-sm" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M60 102c8.3 0 15-6.7 15-15H45c0 8.3 6.7 15 15 15Z" fill="#7C3AED" opacity="0.88" />
        <path d="M26 84h68c3.6 0 5.5-4.3 3.1-7C91.4 70.7 88 62.6 88 54v-8c0-12.7-8.1-23.5-19.5-27.5A8.8 8.8 0 0 0 60 8a8.8 8.8 0 0 0-8.5 10.5C40.1 22.5 32 33.3 32 46v8c0 8.6-3.4 16.7-9.1 23-2.4 2.7-.5 7 3.1 7Z" fill="url(#bellGradient)" />
        <path d="M33 83h54" stroke="#312E81" strokeOpacity="0.18" strokeWidth="4" strokeLinecap="round" />
        <defs>
          <linearGradient id="bellGradient" x1="31" x2="92" y1="18" y2="86" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#3730A3" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute right-8 top-8 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-lg font-black text-white shadow-lg shadow-indigo-950/20">
        !
      </span>
      <span className="absolute left-7 top-7 h-8 w-1.5 -rotate-45 rounded-full bg-violet-300" />
      <span className="absolute left-14 top-4 h-8 w-1.5 -rotate-12 rounded-full bg-violet-300" />
    </div>
  );
}

export function PriceAlertsContent() {
  const [selectedTab, setSelectedTab] = useState(tabs[0]);
  const [selectedSort, setSelectedSort] = useState(sortOptions[0]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!sortDropdownRef.current?.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <main className="flex-1 bg-white pb-10 pt-0 sm:pt-5 lg:pt-5">
      <div className="mx-auto min-w-0 max-w-6xl px-4 pt-3 pb-8 sm:px-6 sm:pt-6 lg:px-8">
        <header className="px-1 pb-5 text-left sm:px-2 sm:pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
            Price alerts
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Track prices and get notified when fares change.
          </p>
        </header>
        <div ref={sortDropdownRef} className="relative flex items-center gap-3 border-b border-slate-200 pb-4 sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto pb-1 sm:justify-between sm:overflow-visible sm:pb-0" aria-label="Price alert filters">
            <div className="flex shrink-0 gap-2">
              {tabs.map((tab) => {
                const isSelected = selectedTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    className={`focus-ring inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                      isSelected ? "bg-violet-100 text-indigo-700" : "text-slate-600 hover:bg-white hover:text-indigo-700"
                    }`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTab(tab)}
                  >
                    {isSelected && <Bell className="h-4 w-4" aria-hidden="true" />}
                    {tab}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="focus-ring inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 sm:min-h-12 sm:gap-3 sm:rounded-xl sm:px-4"
              aria-expanded={isSortOpen}
              aria-haspopup="listbox"
              onClick={() => setIsSortOpen((current) => !current)}
            >
              <span>Sort by: {selectedSort}</span>
              <ChevronDown className={`h-4 w-4 transition ${isSortOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          </div>

          {isSortOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg" role="listbox" aria-label="Sort price alerts">
              {sortOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`block w-full px-4 py-3 text-left text-sm font-semibold transition hover:bg-violet-50 hover:text-indigo-700 ${
                    selectedSort === option ? "bg-violet-50 text-indigo-700" : "text-slate-700"
                  }`}
                  role="option"
                  aria-selected={selectedSort === option}
                  onClick={() => {
                    setSelectedSort(option);
                    setIsSortOpen(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm sm:px-8 sm:py-16 lg:min-h-[34rem] lg:py-20" aria-labelledby="empty-alerts-title">
            <EmptyStateIllustration />
            <h2 id="empty-alerts-title" className="mt-6 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]">
              No price alerts yet.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
              Create an alert from a flight search to track fare changes and get notified.
            </p>
            <Link
              href="/flights"
              className="focus-ring mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#3730A3] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#312E81]"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              Search flights
            </Link>
          </section>

          <aside className="hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:block" aria-label="Price alerts features">
            <div className="space-y-7">
              {infoItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
