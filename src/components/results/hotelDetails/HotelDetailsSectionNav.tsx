"use client";

import { useRef } from "react";

export type HotelDetailsTab = "compare" | "about" | "location" | "reviews";

const tabs: ReadonlyArray<{ id: HotelDetailsTab; label: string; mobileLabel?: string; desktopOnly?: boolean }> = [
  { id: "compare", label: "Compare prices", mobileLabel: "Rates" },
  { id: "about", label: "About", mobileLabel: "Overview" },
  { id: "location", label: "Location", desktopOnly: true },
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
    const visibleIndices = tabs
      .map((_, tabIndex) => tabIndex)
      .filter((tabIndex) => tabRefs.current[tabIndex]?.offsetParent !== null);
    const currentVisibleIndex = visibleIndices.indexOf(index);
    if (currentVisibleIndex < 0 || !visibleIndices.length) return;
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextVisibleIndex =
      (currentVisibleIndex + direction + visibleIndices.length) %
      visibleIndices.length;
    const nextIndex = visibleIndices[nextVisibleIndex];
    const nextTab = tabs[nextIndex];
    onTabChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Hotel details"
      className="order-3 sticky top-0 z-30 mt-1 grid grid-cols-3 border-b border-slate-200 bg-white px-2 lg:mt-5 lg:grid-cols-[minmax(0,1.65fr)_repeat(3,minmax(0,1fr))] lg:px-0"
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
            className={`focus-ring relative min-h-11 min-w-0 items-center justify-center whitespace-nowrap px-0.5 text-[13px] font-bold transition-colors sm:px-2 sm:text-sm ${tab.desktopOnly ? "hidden lg:inline-flex" : "inline-flex"} ${selected ? "text-blue" : "text-slate-600 hover:text-slate-950"}`}
          >
            {tab.mobileLabel ? (
              <>
                <span className="lg:hidden">{tab.mobileLabel}</span>
                <span className="hidden lg:inline">{tab.label}</span>
              </>
            ) : (
              tab.label
            )}
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
