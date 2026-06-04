"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useRegion } from "@/components/region/RegionProvider";

const popularMarketCodes = [
  "US",
  "GB",
  "CA",
  "AU",
  "DE",
  "FR",
  "NL",
  "ES",
  "IT",
  "JP",
  "SG",
  "AE",
  "IN",
  "NG",
  "ZA",
  "BR",
] as const;

type CountryCurrencySelectorProps = {
  variant?: "default" | "header" | "mobile";
  grouped?: boolean;
};

export function CountryCurrencySelector({
  variant = "default",
  grouped = false,
}: CountryCurrencySelectorProps) {
  const {
    mode,
    setMode,
    selectedCurrency,
    setCurrency,
    selectedOption,
    options,
  } = useRegion();

  const [open, setOpen] = useState(false);
  const [marketQuery, setMarketQuery] = useState("");
  const [showAllMarkets, setShowAllMarkets] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const marketSearchInputRef = useRef<HTMLInputElement | null>(null);

  const dialogId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const marketSearchId = useId();
  const marketListId = useId();

  const isHeaderVariant = variant === "header";
  const isMobileVariant = variant === "mobile";
  const isGroupedHeaderVariant = isHeaderVariant && grouped;

  const triggerClassName = isMobileVariant
    ? "flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-none border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-900 transition-colors hover:border-violet-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    : isGroupedHeaderVariant
    ? "inline-flex h-12 cursor-pointer items-center gap-2 rounded-none border-0 bg-transparent px-4 text-sm font-semibold text-indigo-50 shadow-none transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
    : isHeaderVariant
      ? "inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-indigo-50 shadow-sm transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900"
      : "inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500";

  const chevronClassName = isHeaderVariant ? "text-indigo-100" : "text-slate-500";

  const closeDialog = () => {
    setOpen(false);
    setMarketQuery("");
    setShowAllMarkets(false);
    window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      marketSearchInputRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.getClientRects().length > 0);

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const popularMarkets = useMemo(() => {
    const popularOptions = popularMarketCodes
      .map((code) => options.find((option) => option.code === code))
      .filter((option): option is (typeof options)[number] => Boolean(option));

    const selectedPopularMarket = options.find((option) => option.code === mode);

    if (
      !selectedPopularMarket ||
      popularOptions.some((option) => option.code === selectedPopularMarket.code)
    ) {
      return popularOptions;
    }

    return [selectedPopularMarket, ...popularOptions];
  }, [mode, options]);

  const filteredMarkets = useMemo(() => {
    const normalizedQuery = marketQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return showAllMarkets ? options : popularMarkets;
    }

    return options.filter((option) => {
      return (
        option.code.toLowerCase().includes(normalizedQuery) ||
        option.country.toLowerCase().includes(normalizedQuery) ||
        option.currency.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [marketQuery, options, popularMarkets, showAllMarkets]);

  const hasSearchQuery = marketQuery.trim().length > 0;
  const showingFullCatalog = showAllMarkets || hasSearchQuery;
  const marketListLabel = showingFullCatalog ? "All markets" : "Popular markets";

  const handleMarketSelect = (option: (typeof options)[number]) => {
    setMode(option.code);
    setCurrency(option.currency);
    closeDialog();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={`Open market selector, current market ${selectedOption.code}, ${selectedCurrency}`}
      >
        {isMobileVariant ? (
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Market
            </span>
            <span className="mt-0.5 block truncate text-sm font-black text-slate-950">
              {selectedOption.code} · {selectedCurrency}
            </span>
          </span>
        ) : (
          <span>
            {selectedOption.code} · {selectedCurrency}
          </span>
        )}

        <ChevronDown size={14} className={`shrink-0 ${chevronClassName}`} aria-hidden="true" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40 bg-slate-950/45" onClick={closeDialog} />

              <section
                ref={dialogRef}
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-hidden rounded-none border border-slate-200 bg-white shadow-lg md:inset-x-0 md:bottom-auto md:top-[max(80px,8vh)] md:mx-auto md:w-[min(720px,94vw)]"
              >
                <div className="flex max-h-[88vh] flex-col">
                  <div className="border-b border-slate-200 px-5 pb-4 pt-5 md:px-6 md:pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 id={titleId} className="text-xl font-semibold tracking-tight text-slate-950">
                          Choose country and currency
                        </h2>

                        <p id={descriptionId} className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          Select the market used for display prices. Airport origin suggestions stay based on your detected location.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeDialog}
                        className="cursor-pointer rounded-none p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                        aria-label="Close market selector"
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>

                    <label htmlFor={marketSearchId} className="mt-5 block text-sm font-medium text-slate-800">
                      Search country or currency
                    </label>

                    <div className="mt-2 flex items-center gap-2 rounded-none border border-slate-300 bg-white px-3.5 py-3 transition-colors focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">
                      <Search size={17} className="shrink-0 text-slate-500" aria-hidden="true" />

                      <input
                        ref={marketSearchInputRef}
                        id={marketSearchId}
                        value={marketQuery}
                        onChange={(event) => setMarketQuery(event.target.value)}
                        placeholder="Search country or currency"
                        className="w-full min-w-0 border-0 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                        aria-controls={marketListId}
                      />
                    </div>
                  </div>

                  <div className="min-h-0 overflow-y-auto px-5 py-4 md:px-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {marketListLabel}
                      </h3>

                      <span className="text-xs font-medium text-slate-500">
                        {filteredMarkets.length} {filteredMarkets.length === 1 ? "market" : "markets"}
                      </span>
                    </div>

                    <div
                      id={marketListId}
                      role="radiogroup"
                      aria-label={marketListLabel}
                      className="grid gap-2.5 sm:grid-cols-2"
                    >
                      {filteredMarkets.map((option) => {
                        const isActive = option.code === mode && option.currency === selectedCurrency;

                        return (
                          <button
                            key={option.code}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            aria-label={`Select ${option.country}, ${option.code}, ${option.currency}`}
                            onClick={() => handleMarketSelect(option)}
                            className={`group flex cursor-pointer items-center justify-between gap-3 rounded-none border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                              isActive
                                ? "border-violet-600 bg-violet-50 ring-1 ring-violet-600"
                                : "border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold tracking-wide text-slate-950">
                                {option.code} · {option.currency}
                              </span>

                              <span className="mt-1 block truncate text-sm font-normal text-slate-700">
                                {option.country}
                              </span>
                            </span>

                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-none border transition-colors ${
                                isActive
                                  ? "border-violet-600 bg-violet-600 text-white"
                                  : "border-slate-200 text-transparent group-hover:border-violet-300"
                              }`}
                              aria-hidden="true"
                            >
                              <Check size={14} />
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {filteredMarkets.length === 0 ? (
                      <div className="rounded-none border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                        <p className="text-sm font-semibold text-slate-900">No matching markets</p>
                        <p className="mt-1 text-sm text-slate-500">Try a country name, country code, or currency code.</p>
                      </div>
                    ) : null}

                    {!showingFullCatalog ? (
                      <button
                        type="button"
                        onClick={() => setShowAllMarkets(true)}
                        className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-none border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                      >
                        View more markets
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>
            </>,
            document.body
          )
        : null}
    </>
  );
}
