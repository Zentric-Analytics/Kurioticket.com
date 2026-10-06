"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleCheck, ReceiptText, WalletCards, X } from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import {
  getCarDealPickerGroups,
  type CarProviderOfferGroup,
} from "@/lib/cars/carResults";
import type { CarOffer, NormalizedCarResult } from "@/lib/cars/types";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { acquireMobileResultsScrollLock } from "@/lib/search/mobileResultsScrollLock";

type Props = {
  car: NormalizedCarResult;
  selectedOfferId: string;
  onSelectOffer: (offer: CarOffer) => void;
  compact?: boolean;
  desktopPanelTarget?: HTMLElement | null;
};

const CAR_DEAL_PICKER_DESKTOP_OPEN_EVENT =
  "kurioticket:car-deal-picker-desktop-open";

const providerInitial = (name: string) =>
  name.trim().charAt(0).toLocaleUpperCase() || "P";

function ProviderMark({
  group,
  compact,
}: {
  group: CarProviderOfferGroup;
  compact: boolean;
}) {
  const kurioticket = /kurioticket/i.test(group.providerName);
  const logoUrl = kurioticket
    ? "/brand/kurioticket-icon-blue.svg"
    : group.logoUrl;

  if (logoUrl) {
    return (
      // Provider logos can be external seller assets and must not depend on Next image host allowlists.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className={`${compact ? "h-5 w-5" : "h-6 w-6"} max-w-full object-contain`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${compact ? "text-[11px]" : "text-xs"} font-bold text-[#07133B]`}
    >
      {providerInitial(group.providerName)}
    </span>
  );
}

export function CarDealPicker({
  car,
  selectedOfferId,
  onSelectOffer,
  compact = false,
  desktopPanelTarget = null,
}: Props) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const groups = useMemo(() => getCarDealPickerGroups(car), [car]);
  const pickerInstanceId = useId();
  const [openProviderKey, setOpenProviderKey] = useState<string | null>(null);
  const [showAllProviders, setShowAllProviders] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);
  const tabletPanelRef = useRef<HTMLDivElement | null>(null);
  const [desktopPosition, setDesktopPosition] = useState({ top: 0, left: 0 });
  const [desktopInlineLeft, setDesktopInlineLeft] = useState(0);
  const overlayOpen = Boolean(openProviderKey || showAllProviders);

  useEffect(() => {
    const closeWhenAnotherDesktopPickerOpens = (event: Event) => {
      if (!window.matchMedia("(min-width: 768px)").matches) return;
      const sourceId = (event as CustomEvent<string>).detail;
      if (!sourceId || sourceId === pickerInstanceId) return;
      setOpenProviderKey(null);
      setShowAllProviders(false);
    };

    window.addEventListener(
      CAR_DEAL_PICKER_DESKTOP_OPEN_EVENT,
      closeWhenAnotherDesktopPickerOpens,
    );
    return () => {
      window.removeEventListener(
        CAR_DEAL_PICKER_DESKTOP_OPEN_EVENT,
        closeWhenAnotherDesktopPickerOpens,
      );
    };
  }, [pickerInstanceId]);

  const announceDesktopPickerOpen = () => {
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    window.dispatchEvent(
      new CustomEvent<string>(CAR_DEAL_PICKER_DESKTOP_OPEN_EVENT, {
        detail: pickerInstanceId,
      }),
    );
  };

  useEffect(() => {
    if (!overlayOpen) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = 310;
      setDesktopPosition({
        top: rect.bottom + 8,
        left: Math.min(
          Math.max(12, rect.left),
          Math.max(12, window.innerWidth - panelWidth - 12),
        ),
      });
      if (desktopPanelTarget) {
        const targetRect = desktopPanelTarget.getBoundingClientRect();
        setDesktopInlineLeft(
          Math.min(
            Math.max(0, rect.left - targetRect.left),
            Math.max(0, targetRect.width - panelWidth),
          ),
        );
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenProviderKey(null);
      setShowAllProviders(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!window.matchMedia("(min-width: 768px)").matches) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target)) return;
      if (desktopPanelRef.current?.contains(target)) return;
      if (tabletPanelRef.current?.contains(target)) return;
      setOpenProviderKey(null);
      setShowAllProviders(false);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    const releaseMobileScrollLock = window.matchMedia("(max-width: 767px)").matches
      ? acquireMobileResultsScrollLock()
      : null;

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      releaseMobileScrollLock?.();
    };
  }, [desktopPanelTarget, overlayOpen]);

  const selectedGroup =
    groups.find((group) =>
      group.offers.some((offer) => offer.id === selectedOfferId),
    ) ?? groups[0] ?? null;
  const previewGroup =
    groups.find((group) => group.key === openProviderKey) ?? selectedGroup;
  const visibleGroups = groups.slice(0, 3);
  const extraCount = Math.max(0, groups.length - visibleGroups.length);

  if (!selectedGroup) return null;

  const formatOfferPrice = (offer: CarOffer, amount: number) =>
    formatDisplayPrice({
      amount,
      sourceCurrency: offer.currency,
      displayCurrency: selectedOption.currency,
      convertSourceEstimate: true,
      maximumFractionDigits: 0,
      rates: currencyRates.rates,
      isFallbackRate: currencyRates.isFallback,
    }).formatted;

  const prepareDesktopInlinePosition = () => {
    if (!desktopPanelTarget || !anchorRef.current) return;
    const panelWidth = 310;
    const rect = anchorRef.current.getBoundingClientRect();
    const targetRect = desktopPanelTarget.getBoundingClientRect();
    setDesktopInlineLeft(
      Math.min(
        Math.max(0, rect.left - targetRect.left),
        Math.max(0, targetRect.width - panelWidth),
      ),
    );
  };

  const selectGroup = (group: CarProviderOfferGroup) => {
    const providerChanged = group.key !== selectedGroup.key;
    prepareDesktopInlinePosition();
    announceDesktopPickerOpen();
    setOpenProviderKey(group.key);
    setShowAllProviders(false);

    if (!providerChanged) return;

    onSelectOffer(group.primaryOffer);
  };

  const closePanel = () => {
    setOpenProviderKey(null);
    setShowAllProviders(false);
  };

  const panelGroup = showAllProviders ? null : previewGroup;

  return (
    <div
      ref={anchorRef}
      data-car-deal-picker
      className={`relative min-w-0 ${compact ? "mt-2" : "mt-3"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`${compact ? "text-[10px]" : "text-[11px]"} shrink-0 font-semibold text-[#475569]`}
        >
          Compare deals
        </span>
        <div className="flex min-w-0 items-center gap-1.5" role="list" aria-label="Car deal providers">
          {visibleGroups.map((group, index) => {
            const selected = group.key === selectedGroup.key;
            const repeatedProvider = groups.some(
              (candidate) =>
                candidate.key !== group.key &&
                candidate.providerName.trim().toLocaleLowerCase() ===
                  group.providerName.trim().toLocaleLowerCase(),
            );
            return (
              <button
                key={group.key}
                type="button"
                role="listitem"
                aria-label={
                  repeatedProvider
                    ? `Compare ${group.providerName} deal ${index + 1}`
                    : `Compare deal from ${group.providerName}`
                }
                aria-pressed={selected}
                onClick={() => selectGroup(group)}
                className={`inline-flex ${compact ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-[10px]"} shrink-0 items-center justify-center overflow-hidden border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 ${
                  selected
                    ? "border-[#004BB8] ring-1 ring-[#004BB8]/20"
                    : "border-[#CBD5E1] hover:border-[#94A3B8]"
                }`}
              >
                <ProviderMark group={group} compact={compact} />
              </button>
            );
          })}
          {extraCount > 0 ? (
            <button
              type="button"
              aria-label={`Show ${extraCount} more car deal providers`}
              onClick={() => {
                prepareDesktopInlinePosition();
                announceDesktopPickerOpen();
                setShowAllProviders(true);
                setOpenProviderKey(null);
              }}
              className={`inline-flex ${compact ? "h-8 min-w-8 rounded-lg px-1.5 text-[10px]" : "h-9 min-w-9 rounded-[10px] px-2 text-[11px]"} shrink-0 items-center justify-center gap-0.5 border border-[#CBD5E1] bg-white font-bold text-[#334155] hover:border-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40`}
            >
              +{extraCount}
              <ChevronDown size={compact ? 11 : 12} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {desktopPanelTarget
        ? createPortal(
            <div
              data-car-deal-picker-desktop-expansion
              data-open={overlayOpen ? "true" : "false"}
              aria-hidden={!overlayOpen}
              className={`hidden w-full transition-[grid-template-rows,opacity,padding] duration-200 ease-out lg:grid ${
                overlayOpen
                  ? "grid-rows-[1fr] pt-3 opacity-100"
                  : "pointer-events-none grid-rows-[0fr] pt-0 opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  ref={desktopPanelRef}
                  role="dialog"
                  aria-label={
                    showAllProviders
                      ? "Car deal providers"
                      : `${panelGroup?.providerName ?? "Provider"} deal details`
                  }
                  className="w-[310px] rounded-xl border border-[#D8E1EC] bg-white p-4 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.4)]"
                  style={{ marginInlineStart: desktopInlineLeft }}
                  data-car-deal-picker-desktop-panel
                >
                  {showAllProviders ? (
                    <ProviderList
                      groups={groups}
                      selectedKey={selectedGroup.key}
                      onSelect={selectGroup}
                      onClose={closePanel}
                    />
                  ) : panelGroup ? (
                    <ProviderPreview
                      group={panelGroup}
                      total={formatOfferPrice(
                        panelGroup.primaryOffer,
                        panelGroup.primaryOffer.totalPrice,
                      )}
                      onClose={closePanel}
                      desktop
                    />
                  ) : null}
                </div>
              </div>
            </div>,
            desktopPanelTarget,
          )
        : null}

      {overlayOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                ref={tabletPanelRef}
                role="dialog"
                aria-label={
                  showAllProviders
                    ? "Car deal providers"
                    : `${panelGroup?.providerName ?? "Provider"} deal details`
                }
                className="fixed z-[140] hidden w-[310px] rounded-xl border border-[#D8E1EC] bg-white p-3 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.4)] md:block lg:hidden"
                style={{ top: desktopPosition.top, left: desktopPosition.left }}
                data-car-deal-picker-tablet-panel
              >
                {showAllProviders ? (
                  <ProviderList
                    groups={groups}
                    selectedKey={selectedGroup.key}
                    onSelect={selectGroup}
                    onClose={closePanel}
                  />
                ) : panelGroup ? (
                  <ProviderPreview
                    group={panelGroup}
                    total={formatOfferPrice(
                      panelGroup.primaryOffer,
                      panelGroup.primaryOffer.totalPrice,
                    )}
                    onClose={closePanel}
                  />
                ) : null}
              </div>

              <div
                className="fixed inset-0 z-[130] flex items-end bg-slate-950/45 md:hidden"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) closePanel();
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-label={showAllProviders ? "Car deal providers" : `${panelGroup?.providerName ?? "Provider"} deal details`}
                  data-car-deal-picker-mobile-sheet
                  className="mobile-results-sheet-surface mobile-results-sheet-surface-smooth mx-3 mb-3 max-h-[72dvh] w-[calc(100%_-_24px)] overflow-y-auto rounded-[24px] border border-white/70 bg-white px-4 pb-[max(18px,env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_20px_48px_-18px_rgba(15,23,42,0.45)]"
                >
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
                  {showAllProviders ? (
                    <ProviderList
                      groups={groups}
                      selectedKey={selectedGroup.key}
                      onSelect={selectGroup}
                      onClose={closePanel}
                    />
                  ) : panelGroup ? (
                    <ProviderPreview
                      group={panelGroup}
                      total={formatOfferPrice(panelGroup.primaryOffer, panelGroup.primaryOffer.totalPrice)}
                      onClose={closePanel}
                      mobile
                    />
                  ) : null}
                </section>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

function ProviderList({
  groups,
  selectedKey,
  onSelect,
  onClose,
}: {
  groups: CarProviderOfferGroup[];
  selectedKey: string;
  onSelect: (group: CarProviderOfferGroup) => void;
  onClose?: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#07133B]">Compare providers</p>
        {onClose ? (
          <button
            type="button"
            aria-label="Close provider comparison"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {groups.map((group) => {
          const selected = group.key === selectedKey;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => onSelect(group)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left transition ${
                selected
                  ? "border-[#B7D1F6] bg-[#F2F7FF]"
                  : "border-[#E2E8F0] bg-white hover:bg-slate-50"
              }`}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#D8E1EC] bg-white">
                <ProviderMark group={group} compact />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#07133B]">
                {group.providerName}
              </span>
              {selected ? <Check size={16} className="shrink-0 text-[#004BB8]" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProviderPreview({
  group,
  total,
  onClose,
  mobile = false,
  desktop = false,
}: {
  group: CarProviderOfferGroup;
  total: string;
  onClose: () => void;
  mobile?: boolean;
  desktop?: boolean;
}) {
  const offer = group.primaryOffer;
  const hasOfferFacts =
    offer.freeCancellation || offer.taxesAndFeesIncluded || offer.payAtPickup;

  return (
    <div
      data-car-deal-provider-preview
      data-desktop={desktop ? "true" : "false"}
    >
      <div
        className={`flex items-start justify-between ${
          desktop
            ? "gap-4 border-b border-[#E7EDF4] pb-3"
            : "gap-3"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`inline-flex shrink-0 items-center justify-center border border-[#D8E1EC] bg-white ${
              desktop ? "h-10 w-10 rounded-[10px]" : "h-9 w-9 rounded-lg"
            }`}
          >
            <ProviderMark group={group} compact={!desktop} />
          </span>
          <div className="min-w-0">
            <p
              className={`truncate font-bold text-[#07133B] ${
                desktop
                  ? "text-[15px] leading-5 tracking-[-0.01em]"
                  : "text-sm"
              }`}
            >
              {group.providerName}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close provider deal"
          onClick={onClose}
          className={`inline-flex shrink-0 items-center justify-center text-slate-600 transition hover:bg-slate-100 ${
            desktop
              ? "h-8 w-8 rounded-lg border border-[#E2E8F0] bg-white"
              : "h-8 w-8 rounded-full"
          }`}
        >
          <X size={desktop ? 16 : 17} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div
        data-car-deal-price-summary
        className={`${mobile ? "mt-4" : "mt-3"} ${
          desktop
            ? "rounded-[10px] border border-[#E1E8F0] bg-[#F8FAFC] px-4 py-3.5"
            : "rounded-lg bg-[#F8FAFC] p-3"
        }`}
      >
        <p
          data-car-deal-total-price
          className={`font-bold text-[#07133B] ${
            desktop
              ? "text-[26px] leading-7 tracking-[-0.025em]"
              : "text-base"
          }`}
          dir="ltr"
        >
          {total}
        </p>
        <p
          data-car-deal-estimated-total
          className={
            desktop
              ? "mt-1 text-[13px] font-semibold leading-4 text-[#52627A]"
              : "mt-0.5 text-[11px] font-medium leading-4 text-[#64748B]"
          }
        >
          Estimated total
        </p>
      </div>

      {hasOfferFacts ? (
        <div
          data-car-deal-offer-facts
          className={
            desktop
              ? "mt-3 divide-y divide-[#E7EDF4] overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-[#FCFDFE] px-3.5"
              : "mt-3 space-y-1.5 text-[12px] leading-5 text-[#475569]"
          }
        >
          {offer.freeCancellation ? (
            desktop ? (
              <div className="flex min-h-10 items-center gap-2.5 py-2.5 text-[13px] font-semibold leading-4 text-[#334155]">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ECF8F1] text-[#16834A]">
                  <CircleCheck size={14} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span>Free cancellation</span>
              </div>
            ) : (
              <p>Free cancellation</p>
            )
          ) : null}
          {offer.taxesAndFeesIncluded ? (
            desktop ? (
              <div className="flex min-h-10 items-center gap-2.5 py-2.5 text-[13px] font-semibold leading-4 text-[#334155]">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#52627A]">
                  <ReceiptText size={14} strokeWidth={2} aria-hidden="true" />
                </span>
                <span>Taxes and fees included</span>
              </div>
            ) : (
              <p>Taxes and fees included</p>
            )
          ) : null}
          {offer.payAtPickup ? (
            desktop ? (
              <div className="flex min-h-10 items-center gap-2.5 py-2.5 text-[13px] font-semibold leading-4 text-[#334155]">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#52627A]">
                  <WalletCards size={14} strokeWidth={2} aria-hidden="true" />
                </span>
                <span>Pay at pickup</span>
              </div>
            ) : (
              <p>Pay at pickup</p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
