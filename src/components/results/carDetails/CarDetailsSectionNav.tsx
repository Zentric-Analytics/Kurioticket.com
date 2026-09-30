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
        className={`relative hidden min-h-16 w-full items-center justify-between gap-4 border-b border-slate-200 bg-[#F5F7FB] lg:sticky lg:top-0 lg:z-40 lg:mt-3 lg:flex ${desktopStuck ? "lg:shadow-[0_5px_16px_rgba(15,23,42,0.06)]" : ""}`}
        data-car-details-section-nav
        data-stuck={desktopStuck ? "true" : "false"}
      >
        {desktopStuck && desktopBackControl ? (
          <div
            className="me-2 flex shrink-0 items-center"
            data-car-details-desktop-sticky-back
          >
            {desktopBackControl}
          </div>
        ) : null}
        <nav
          aria-label={labels.navigation}
          className="flex min-h-16 shrink-0 items-stretch gap-1"
          data-car-details-desktop-tabs
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={selected ? "location" : undefined}
                onClick={() => onTabChange(tab.id)}
                className={`focus-ring relative inline-flex min-h-16 items-center justify-center whitespace-nowrap border-b-2 px-[14px] font-sans text-sm font-semibold leading-normal transition-colors first:pl-0 ${selected ? "border-[#192024] text-[#192024]" : "border-transparent text-[#59636A] hover:text-[#004BB8]"}`}
              >
                {tab.label}

              </button>
            );
          })}
        </nav>
        <div
          className="ms-auto shrink-0"
          data-car-details-desktop-sticky-actions
          hidden={!desktopStuck}
        >
          {desktopUtilityActions}
        </div>
      </div>
    </>
  );
}
