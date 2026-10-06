"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";

import { BrandedLoading } from "@/components/layout/BrandedLoading";
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
};

const CAR_DEAL_SELECTION_BUSY_MS = 320;

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
}: Props) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const groups = useMemo(() => getCarDealPickerGroups(car), [car]);
  const [openProviderKey, setOpenProviderKey] = useState<string | null>(null);
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [dealSelectionPending, setDealSelectionPending] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);
  const selectionTimerRef = useRef<number | null>(null);
  const [desktopPosition, setDesktopPosition] = useState({ top: 0, left: 0 });
  const overlayOpen = Boolean(openProviderKey || showAllProviders);

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
  }, [overlayOpen]);

  useEffect(
    () => () => {
      if (selectionTimerRef.current !== null) {
        window.clearTimeout(selectionTimerRef.current);
      }
    },
    [],
  );

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

  const selectGroup = (group: CarProviderOfferGroup) => {
    const providerChanged = group.key !== selectedGroup.key;
    setOpenProviderKey(group.key);
    setShowAllProviders(false);

    if (!providerChanged) return;

    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
    }

    setDealSelectionPending(true);
    onSelectOffer(group.primaryOffer);
    selectionTimerRef.current = window.setTimeout(() => {
      setDealSelectionPending(false);
      selectionTimerRef.current = null;
    }, CAR_DEAL_SELECTION_BUSY_MS);
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
      aria-busy={dealSelectionPending}
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

      {dealSelectionPending && typeof document !== "undefined"
        ? createPortal(
            <div
              data-car-deal-selection-loading
              className="fixed inset-0 z-[12050] bg-[#F5F7FB]"
            >
              <BrandedLoading
                title="Updating deal"
                messages={["Refreshing price and provider..."]}
                variant="fullscreen"
                visual="logoPulse"
                showProgress
                showActivityDots={false}
                accessibleProgress
                className="min-h-[100svh] w-full bg-[#F5F7FB] px-5"
                contentClassName="max-w-md text-center"
              />
            </div>,
            document.body,
          )
        : null}

      {overlayOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                ref={desktopPanelRef}
                className="fixed z-[140] hidden w-[310px] rounded-xl border border-[#D8E1EC] bg-white p-3 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.4)] md:block"
                style={{ top: desktopPosition.top, left: desktopPosition.left }}
                data-car-deal-picker-desktop-panel
              >
                {showAllProviders ? (
                  <ProviderList
                    groups={groups}
                    selectedKey={selectedGroup.key}
                    onSelect={selectGroup}
                  />
                ) : panelGroup ? (
                  <ProviderPreview
                    group={panelGroup}
                    selected={panelGroup.key === selectedGroup.key}
                    total={formatOfferPrice(panelGroup.primaryOffer, panelGroup.primaryOffer.totalPrice)}
                    perDay={formatOfferPrice(panelGroup.primaryOffer, panelGroup.primaryOffer.pricePerDay)}
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
                      selected={panelGroup.key === selectedGroup.key}
                      total={formatOfferPrice(panelGroup.primaryOffer, panelGroup.primaryOffer.totalPrice)}
                      perDay={formatOfferPrice(panelGroup.primaryOffer, panelGroup.primaryOffer.pricePerDay)}
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
  selected,
  total,
  perDay,
  onClose,
  mobile = false,
}: {
  group: CarProviderOfferGroup;
  selected: boolean;
  total: string;
  perDay: string;
  onClose: () => void;
  mobile?: boolean;
}) {
  const offer = group.primaryOffer;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8E1EC] bg-white">
            <ProviderMark group={group} compact />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#07133B]">{group.providerName}</p>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              {group.offers.length === 1 ? "1 available offer" : `${group.offers.length} available offers · best rate selected`}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close provider deal"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      <div className={`${mobile ? "mt-4" : "mt-3"} grid grid-cols-2 gap-2 rounded-lg bg-[#F8FAFC] p-3`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Total</p>
          <p className="mt-1 text-base font-bold text-[#07133B]" dir="ltr">{total}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Per day</p>
          <p className="mt-1 text-base font-bold text-[#07133B]" dir="ltr">{perDay}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-[12px] leading-5 text-[#475569]">
        {offer.freeCancellation ? <p>Free cancellation</p> : null}
        {offer.taxesAndFeesIncluded ? <p>Taxes and fees included</p> : null}
        {offer.payAtPickup ? <p>Pay at pickup</p> : null}
        {!offer.bookingUrl ? <p>Provider handoff will appear when this seller supplies a booking link.</p> : null}
      </div>

      <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-semibold ${
        selected ? "bg-[#EEF5FF] text-[#004BB8]" : "bg-slate-100 text-[#475569]"
      }`}>
        {selected ? "Selected · View deal uses this provider" : "Choose this provider to update View deal"}
      </p>
    </div>
  );
}
