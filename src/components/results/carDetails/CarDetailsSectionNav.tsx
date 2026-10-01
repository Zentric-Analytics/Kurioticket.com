"use client";

import type { ReactNode, Ref } from "react";
import { useRef } from "react";

export type CarDetailsTab = "compare" | "pickup" | "location";

export function CarDetailsSectionNav({
  activeTab,
  onTabChange,
  labels,
  desktopBarRef,
  desktopStuck = false,
  desktopBackControl,
  desktopUtilityActions,
}: {
  activeTab: CarDetailsTab;
  onTabChange: (tab: CarDetailsTab) => void;
  labels: Record<CarDetailsTab, string> & {
    navigation: string;
    mobileCompare?: string;
  };
  desktopBarRef?: Ref<HTMLDivElement>;
  desktopStuck?: boolean;
  desktopBackControl?: ReactNode;
  desktopUtilityActions?: ReactNode;
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
    <>
      <div
        role="tablist"
        aria-label={labels.navigation}
        className="sticky top-[var(--car-details-mobile-header-boundary)] z-30 mt-0 flex w-full items-stretch border-b border-slate-200 bg-[#F5F7FB] lg:hidden"
        data-car-details-mobile-section-nav
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
        className={`relative hidden min-h-16 w-full transition-[background-color,border-color] duration-200 ease-out lg:sticky lg:top-0 lg:z-40 lg:mx-auto lg:mt-3 lg:max-w-[820px] ${desktopStuck ? "lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-4 lg:bg-transparent" : "lg:block lg:bg-[#F8FAFC]"}`}
        data-car-details-section-nav
        data-stuck={desktopStuck ? "true" : "false"}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-x-0 top-0 z-0 hidden h-16 bg-[#F8FAFC]/95 transition-[opacity,box-shadow] duration-200 ease-out lg:block ${desktopStuck ? "opacity-100 shadow-[0_6px_20px_rgba(15,23,42,0.07)] backdrop-blur-xl" : "opacity-0"}`}
          data-car-details-desktop-sticky-backdrop
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 z-[1] hidden h-px w-[620px] max-w-[calc(100%-2rem)] -translate-x-1/2 bg-slate-200 lg:block"
          data-car-details-desktop-nav-rule
        />
        <div
          className={`z-10 transition-[opacity,transform] duration-200 ease-out ${desktopStuck ? "relative col-start-1 row-start-1 flex min-h-16 items-center self-stretch justify-self-start translate-x-0 translate-y-0 opacity-100" : "pointer-events-none absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 opacity-0"}`}
          data-car-details-desktop-sticky-back
          aria-hidden={desktopStuck ? undefined : true}
        >
          {desktopStuck ? desktopBackControl : null}
        </div>
        <nav
          aria-label={labels.navigation}
          className={`z-10 flex min-h-16 shrink-0 items-stretch gap-1 transition-[transform] duration-200 ease-out ${desktopStuck ? "relative col-start-2 row-start-1 justify-self-center translate-x-0" : "absolute left-1/2 top-0 -translate-x-1/2"}`}
          data-car-details-desktop-tabs
          data-balanced={desktopStuck ? "true" : "false"}
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={selected ? "location" : undefined}
                onClick={() => onTabChange(tab.id)}
                className={`focus-ring relative inline-flex min-h-16 items-center justify-center whitespace-nowrap border-b-2 px-[14px] font-sans text-sm font-semibold leading-normal transition-colors ${selected ? "border-[#192024] text-[#192024]" : "border-transparent text-[#59636A] hover:text-[#004BB8]"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div
          className={`z-10 transition-[opacity,transform] duration-200 ease-out ${desktopStuck ? "relative col-start-3 row-start-1 flex min-h-16 items-center self-stretch justify-self-end translate-x-0 translate-y-0 opacity-100" : "pointer-events-none absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 opacity-0"}`}
          data-car-details-desktop-sticky-actions
          aria-hidden={desktopStuck ? undefined : true}
        >
          {desktopStuck ? desktopUtilityActions : null}
        </div>
      </div>
    </>
  );
}
