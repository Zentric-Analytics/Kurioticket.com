"use client";

import { Check, ChevronDown, Luggage } from "lucide-react";
import { useRef, useState } from "react";

import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import type { FlightDetailsFareChoice } from "@/lib/flights/flightDetailsContract";
import { nativeFareBenefitRows } from "@/lib/flights/nativeFareBenefitPresentation";
import type { TripType } from "@/lib/types";

export function MobileNativeFareRail({
  fares,
  selectedFareKey,
  tripType,
  selectedCurrency,
  currencyRates,
  isFallbackRate,
  onSelect,
}: {
  fares: FlightDetailsFareChoice[];
  selectedFareKey: string;
  tripType: TripType;
  selectedCurrency: string;
  currencyRates: ExchangeRates;
  isFallbackRate: boolean;
  onSelect: (index: number) => void;
}) {
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [expandedFareBenefit, setExpandedFareBenefit] = useState<string | null>(null);

  function selectWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const offset = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
    if (!offset) return;
    event.preventDefault();
    const nextIndex = (index + offset + fares.length) % fares.length;
    onSelect(nextIndex);
    const nextFare = cardRefs.current[nextIndex];
    nextFare?.focus();
    nextFare?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Available fares"
      data-mobile-native-fare-rail
      className="flex min-w-0 items-start gap-[10px] overflow-x-auto overflow-y-visible pb-[18px] pt-3 pr-[38px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden"
    >
      {fares.map((fare, index) => {
        const selected = fare.key === selectedFareKey;
        const price = formatDisplayPrice({
          amount: fare.offer.price,
          sourceCurrency: fare.offer.currency,
          displayCurrency: selectedCurrency,
          convertSourceEstimate: true,
          useFlightResultSymbols: true,
          maximumFractionDigits: 0,
          rates: currencyRates,
          isFallbackRate,
        });
        const priceAvailable = fare.offer.currency.toUpperCase() === selectedCurrency.toUpperCase()
          || (!isFallbackRate && price.currency.toUpperCase() === selectedCurrency.toUpperCase());
        const isKayak = fare.offer.provider === "KAYAK sandbox";
        const benefitRows = nativeFareBenefitRows(
          fare.distinguishingTerms,
          tripType,
          3,
          isKayak
            ? {
                ensureStandardRows: true,
                conditions: fare.offer.providerDetails?.conditions,
              }
            : undefined,
        );

        return (
          <div
            key={fare.key}
            data-mobile-native-fare-card
            className={`relative min-h-[142px] w-[clamp(197px,calc(197px+(100vw-320px)*0.27),217px)] shrink-0 rounded-[15px] border-[1.5px] px-3 pb-2 pt-1.5 transition-[border-color,background-color,box-shadow] ${
              selected
                ? "z-[1] border-[#075EE8] bg-[#F4F8FF] shadow-[0_6px_14px_rgba(7,19,59,0.18)]"
                : "z-0 border-[#D7E0EC] bg-white shadow-[0_2px_6px_rgba(7,19,59,0.06)]"
            }`}
          >
            <button
              ref={(element) => { cardRefs.current[index] = element; }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${fare.label}, ${priceAvailable ? price.ariaLabel : "price unavailable"}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => selectWithKeyboard(event, index)}
              className="absolute inset-0 z-0 rounded-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#075EE8]/40"
            />

            <div className="pointer-events-none relative z-[1] flex min-h-[126px] flex-col gap-[5px] pb-[31px]">
              <div className="flex items-start">
                <div className="mx-auto flex max-w-full items-center gap-[7px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#CFE3FA] bg-[#EAF3FF] text-[#075EE8]">
                    <Luggage className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p className="line-clamp-2 min-w-0 shrink text-[13px] font-extrabold leading-[17px] tracking-[0.1px] text-[#1A1A1A]">
                    {fare.label}
                  </p>
                </div>
              </div>

              {benefitRows.length ? (
                <div className="pointer-events-auto flex flex-col items-start gap-[5px]">
                  {benefitRows.map((row) => {
                    const benefitKey = `${fare.key}:${row.key}`;
                    const expanded = expandedFareBenefit === benefitKey;
                    return (
                      <button
                        key={benefitKey}
                        type="button"
                        aria-expanded={expanded}
                        aria-label={`${row.title.replace("/", " and ")}${
                          expanded ? `, ${row.detail}` : ""
                        }, ${expanded ? "collapse details" : "expand details"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedFareBenefit((current) => current === benefitKey ? null : benefitKey);
                        }}
                        className="flex w-full max-w-full items-start gap-[7px] rounded pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/30"
                      >
                        <span className="flex w-[15px] shrink-0 justify-center pt-px">
                          <span className={`flex h-[14px] w-[14px] items-center justify-center rounded-full border ${
                            row.semantic === "positive" ? "border-emerald-500" : "border-slate-400"
                          }`}>
                            {row.semantic === "positive" ? (
                              <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2.2} aria-hidden="true" />
                            ) : row.semantic === "negative" ? (
                              <span className="h-[1.5px] w-[7px] rounded bg-slate-500" aria-hidden="true" />
                            ) : (
                              <span className="h-[3px] w-[3px] rounded-full bg-slate-500" aria-hidden="true" />
                            )}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-semibold leading-4 text-[#1A1A1A]">{row.title}</span>
                          {expanded ? (
                            <span className="mt-px block whitespace-pre-line text-[11px] font-normal leading-4 text-[#64748B]">
                              {row.detail}
                            </span>
                          ) : null}
                        </span>
                        <ChevronDown
                          className={`mt-0.5 h-[13px] w-[13px] shrink-0 text-[#64748B] transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="pointer-events-none absolute inset-x-3 bottom-1.5 z-[1] flex justify-center">
              <p
                className="max-w-full truncate text-center text-[19px] font-semibold leading-[23px] tabular-nums text-[#1A1A1A]"
                aria-label={price.ariaLabel}
              >
                {priceAvailable ? price.formatted : "Price unavailable"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
