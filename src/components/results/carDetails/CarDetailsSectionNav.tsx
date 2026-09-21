"use client";

import { useRef } from "react";

export type CarDetailsTab = "compare" | "pickup" | "location";

export function CarDetailsSectionNav({
  activeTab,
  onTabChange,
  labels,
}: {
  activeTab: CarDetailsTab;
  onTabChange: (tab: CarDetailsTab) => void;
  labels: Record<CarDetailsTab, string> & {
    navigation: string;
    mobileCompare?: string;
  };
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs: ReadonlyArray<{ id: CarDetailsTab; label: string }> = [
    { id: "compare", label: labels.compare },
    { id: "pickup", label: labels.pickup },
    { id: "location", label: labels.location },
  ];

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
      aria-label={labels.navigation}
      className="sticky top-[var(--car-details-mobile-header-boundary)] z-30 mt-0 flex w-full items-stretch border-b border-slate-200 bg-[#F5F7FB] lg:top-0 lg:mt-1 lg:justify-between lg:gap-2 lg:bg-white"
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
            className={`focus-ring relative inline-flex min-h-12 min-w-0 items-center justify-center whitespace-nowrap px-0.5 text-[12px] font-semibold leading-[18px] transition-colors min-[390px]:text-[13px] lg:w-auto lg:flex-1 lg:px-2 lg:text-sm lg:font-bold lg:leading-normal ${tab.id === "compare" ? "w-[32%]" : tab.id === "pickup" ? "w-[43%]" : "w-[25%]"} ${selected ? "text-blue" : "text-slate-600 hover:text-slate-950"}`}
          >
            {tab.id === "compare" && labels.mobileCompare ? (
              <>
                <span className="lg:hidden">{labels.mobileCompare}</span>
                <span className="hidden lg:inline">{tab.label}</span>
              </>
            ) : (
              tab.label
            )}
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
