"use client";

import type { KeyboardEvent, ReactNode, Ref } from "react";
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
        className={`relative hidden min-h-[48px] w-full transition-[background-color,border-color] duration-200 ease-out lg:sticky lg:top-0 lg:z-40 lg:mx-auto lg:mt-3 lg:max-w-[680px] ${desktopStuck ? "lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-3 lg:bg-transparent" : "lg:block lg:bg-transparent"}`}
        data-car-details-section-nav
        data-car-details-compact-sticky-tabs
        data-stuck={desktopStuck ? "true" : "false"}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-x-0 top-0 z-0 hidden h-[48px] bg-[#EEF2F7]/92 transition-[opacity,box-shadow] duration-200 ease-out lg:block ${desktopStuck ? "opacity-100 shadow-[0_5px_16px_rgba(15,23,42,0.055)] backdrop-blur-xl" : "opacity-0"}`}
          data-car-details-desktop-sticky-backdrop
        />
        <div
          className={`z-10 transition-[opacity,transform] duration-200 ease-out ${desktopStuck ? "relative col-start-1 row-start-1 flex min-h-[48px] items-center self-stretch justify-self-start opacity-100" : "pointer-events-none absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 opacity-0"}`}
          data-car-details-desktop-sticky-back
          aria-hidden={desktopStuck ? undefined : true}
        >
          {desktopStuck ? desktopBackControl : null}
        </div>
        <nav
          aria-label={labels.navigation}
          className={`z-10 flex min-h-[46px] shrink-0 items-stretch gap-0.5 transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out ${desktopStuck ? "relative col-start-2 row-start-1 justify-self-center rounded-[14px] border border-[#DCE4EE] bg-white/95 px-1 shadow-[0_2px_8px_rgba(15,23,42,0.055)] backdrop-blur-md" : "absolute left-1/2 top-0 -translate-x-1/2 bg-transparent px-0 shadow-none"}`}
          data-car-details-desktop-tabs
          data-surface={desktopStuck ? "compact" : "background"}
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
                className={`car-details-desktop-selected-info-type focus-ring relative inline-flex min-h-[46px] items-center justify-center whitespace-nowrap border-b-2 px-3 text-[13px] leading-5 transition-colors ${selected ? "border-[#075EE8] text-[#07133B]" : "border-transparent text-[#526174] hover:text-[#142033]"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div
          className={`z-10 transition-[opacity,transform] duration-200 ease-out ${desktopStuck ? "relative col-start-3 row-start-1 flex min-h-[48px] items-center self-stretch justify-self-end opacity-100" : "pointer-events-none absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 opacity-0"}`}
          data-car-details-desktop-sticky-actions
          aria-hidden={desktopStuck ? undefined : true}
        >
          {desktopStuck ? desktopUtilityActions : null}
        </div>
      </div>
    </>
  );
}
