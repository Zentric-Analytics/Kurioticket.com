"use client";

import { useRef } from "react";

export type HotelDetailsTab = "compare" | "about" | "location" | "reviews";

const tabs: ReadonlyArray<{ id: HotelDetailsTab; label: string }> = [
  { id: "compare", label: "Compare prices" },
  { id: "about", label: "About" },
  { id: "location", label: "Location" },
  { id: "reviews", label: "Reviews" },
];

type HotelDetailsSectionNavProps = {
  activeTab: HotelDetailsTab;
  onTabChange: (tab: HotelDetailsTab) => void;
};

export function HotelDetailsSectionNav({
  activeTab,
  onTabChange,
}: HotelDetailsSectionNavProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    onTabChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Hotel details"
      className="sticky top-0 z-30 mt-3 grid grid-cols-[minmax(0,1.65fr)_repeat(3,minmax(0,1fr))] border-b border-slate-200 bg-white px-2 lg:mt-5 lg:px-0"
      data-hotel-details-section-nav
    >
      {tabs.map((tab, index) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`hotel-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`hotel-${tab.id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`focus-ring relative inline-flex min-h-11 min-w-0 items-center justify-center whitespace-nowrap px-0.5 text-[12px] font-bold transition-colors min-[390px]:text-[13px] sm:px-2 sm:text-sm ${selected ? "text-blue" : "text-slate-600 hover:text-slate-950"}`}
          >
            {tab.label}
            <span
              className={`absolute inset-x-1 bottom-0 h-0.5 bg-blue transition-opacity sm:inset-x-2 ${selected ? "opacity-100" : "opacity-0"}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
