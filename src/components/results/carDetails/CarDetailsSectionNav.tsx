"use client";

import type { KeyboardEvent, Ref } from "react";
import { useRef } from "react";

export type CarDetailsTab = "compare" | "pickup" | "location";

export function CarDetailsSectionNav({
  activeTab,
  onTabChange,
  labels,
  desktopBarRef,
}: {
  activeTab: CarDetailsTab;
  onTabChange: (tab: CarDetailsTab) => void;
  labels: Record<CarDetailsTab, string> & {
    navigation: string;
    mobileCompare?: string;
  };
  desktopBarRef?: Ref<HTMLDivElement>;
}) {
  const mobileTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const desktopTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs: ReadonlyArray<{ id: CarDetailsTab; label: string }> = [
    { id: "compare", label: labels.compare },
    { id: "pickup", label: labels.pickup },
    { id: "location", label: labels.location },
  ];
  const mobileTabs = tabs;

  function nextTabIndex(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return null;
    event.preventDefault();
    return (
      index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length
    ) % tabs.length;
  }

  function handleMobileKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const nextIndex = nextTabIndex(event, index);
    if (nextIndex === null) return;
    onTabChange(tabs[nextIndex].id);
    mobileTabRefs.current[nextIndex]?.focus();
  }

  function handleDesktopKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const nextIndex = nextTabIndex(event, index);
    if (nextIndex === null) return;
    onTabChange(tabs[nextIndex].id);
    desktopTabRefs.current[nextIndex]?.focus();
  }

  return (
    <>
      <div
        role="tablist"
        aria-label={labels.navigation}
        className="sticky top-[var(--car-details-mobile-header-boundary)] z-30 mt-0 flex w-full items-stretch border-b border-slate-200 bg-[#F5F7FB] lg:hidden"
        data-car-details-mobile-section-nav
      >
        {mobileTabs.map((tab, index) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                mobileTabRefs.current[index] = element;
              }}
              id={`car-${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`car-${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => handleMobileKeyDown(event, index)}
              className={`car-details-native-tab-label focus-ring relative inline-flex min-h-12 min-w-0 items-center justify-center whitespace-nowrap px-0.5 font-sans text-[12px] font-semibold leading-[normal] tracking-normal transition-colors min-[390px]:text-[13px] ${tab.id === "compare" ? "w-[32%]" : tab.id === "pickup" ? "w-[43%]" : "w-[25%]"} ${selected ? "text-[#075EE8]" : "text-[#475569]"}`}
            >
              {tab.id === "compare" && labels.mobileCompare
                ? labels.mobileCompare
                : tab.label}
              <span
                className={`absolute inset-x-2 bottom-0 h-0.5 bg-[#075EE8] transition-opacity ${selected ? "opacity-100" : "opacity-0"}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div
        ref={desktopBarRef}
        className="relative hidden w-full lg:sticky lg:top-0 lg:z-40 lg:mt-0 lg:block lg:max-w-none lg:border-b lg:border-slate-200 lg:bg-white"
        data-car-details-section-nav
        data-car-details-flight-style-tabs
      >
        <div
          role="tablist"
          aria-label={labels.navigation}
          className="mx-auto flex min-h-11 w-full max-w-[760px] items-stretch"
          data-car-details-desktop-tabs
        >
          {tabs.map((tab, index) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(element) => {
                  desktopTabRefs.current[index] = element;
                }}
                id={`car-desktop-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`car-desktop-${tab.id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(event) => handleDesktopKeyDown(event, index)}
                className={`car-details-desktop-selected-info-type focus-ring min-h-11 flex-1 whitespace-nowrap border-b-[3px] px-2 text-center text-[13px] font-semibold leading-5 transition-colors ${selected ? "border-[#075EE8] text-[#07133B]" : "border-transparent text-[#536B92] hover:text-[#142033]"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
