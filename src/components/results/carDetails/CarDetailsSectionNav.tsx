"use client";

import { useRef } from "react";

export type CarDetailsTab = "compare" | "pickup" | "location";

const tabs: ReadonlyArray<{ id: CarDetailsTab; label: string }> = [
  { id: "compare", label: "Compare prices" },
  { id: "pickup", label: "Pickup & return" },
  { id: "location", label: "Location" },
];

export function CarDetailsSectionNav({
  activeTab,
  onTabChange,
}: {
  activeTab: CarDetailsTab;
  onTabChange: (tab: CarDetailsTab) => void;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextIndex =
      (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
      tabs.length;
    onTabChange(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Car details"
      className="sticky top-0 z-30 mt-1 flex items-stretch justify-between gap-2 border-b border-slate-200 bg-white"
      data-car-details-section-nav
    >
      {tabs.map((tab, index) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`car-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`car-${tab.id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`focus-ring relative inline-flex min-h-12 min-w-0 items-center justify-center whitespace-nowrap px-0.5 text-[11px] font-bold transition-colors min-[390px]:text-[12px] sm:px-2 sm:text-sm ${selected ? "text-blue" : "text-slate-600 hover:text-slate-950"}`}
          >
            {tab.label}
            <span
              className={`absolute inset-x-2 bottom-0 h-0.5 bg-blue transition-opacity ${selected ? "opacity-100" : "opacity-0"}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
