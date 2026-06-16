"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";

const formatTranslation = (
  template: string,
  values: Record<string, string | number>,
) =>
  Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{{${key}}}`, String(value)),
    template,
  );

const popularCountryCurrencyCodes = [
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

type SelectorDebugSnapshot = {
  activeElement: string;
  bodyOverflow: string;
  bodyPosition: string;
  htmlOverflow: string;
  listClientHeight: number;
  listScrollHeight: number;
  listScrollTop: number;
  listCanScroll: boolean;
  touchStarts: number;
  touchMoves: number;
  wheels: number;
  scrolls: number;
  elementFromPoint: string;
  overlaySummary: string;
  backdropSummary: string;
  sheetSummary: string;
  listSummary: string;
  triggerInsideAriaHidden: boolean;
};

const emptySelectorDebugSnapshot: SelectorDebugSnapshot = {
  activeElement: "unavailable",
  bodyOverflow: "",
  bodyPosition: "",
  htmlOverflow: "",
  listClientHeight: 0,
  listScrollHeight: 0,
  listScrollTop: 0,
  listCanScroll: false,
  touchStarts: 0,
  touchMoves: 0,
  wheels: 0,
  scrolls: 0,
  elementFromPoint: "unavailable",
  overlaySummary: "unavailable",
  backdropSummary: "unavailable",
  sheetSummary: "unavailable",
  listSummary: "unavailable",
  triggerInsideAriaHidden: false,
};

const describeElementForSelectorDebug = (element: Element | null) => {
  if (!element) return "none";

  const htmlElement = element as HTMLElement;
  const id = htmlElement.id ? `#${htmlElement.id}` : "";
  const role = htmlElement.getAttribute("role");
  const name = htmlElement.getAttribute("name");
  const roleLabel = role ? `[role=${role}]` : "";
  const nameLabel = name ? `[name=${name}]` : "";

  return `${htmlElement.tagName.toLowerCase()}${id}${roleLabel}${nameLabel}`;
};

const summarizeComputedStyleForSelectorDebug = (element: Element | null) => {
  if (!element || typeof window === "undefined") return "none";

  const style = window.getComputedStyle(element);

  return `z=${style.zIndex};pe=${style.pointerEvents};pos=${style.position};overflowY=${style.overflowY};display=${style.display};visibility=${style.visibility}`;
};

type CountryCurrencySelectorProps = {
  variant?: "default" | "header" | "mobile";
  grouped?: boolean;
  onBeforeOpen?: () => void;
};

export function CountryCurrencySelector({
  variant = "default",
  grouped = false,
  onBeforeOpen,
}: CountryCurrencySelectorProps) {
  const {
    mode,
    setMode,
    selectedCurrency,
    setCurrency,
    selectedOption,
    options,
  } = useRegion();
  const { t } = useLocale();

  const [open, setOpen] = useState(false);
  const [dialogEntered, setDialogEntered] = useState(false);
  const router = useRouter();

  const [countryCurrencyQuery, setCountryCurrencyQuery] = useState("");
  const [showAllCountryCurrencies, setShowAllCountryCurrencies] =
    useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const listScrollRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const countryCurrencySearchInputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const reloadTimerRef = useRef<number | null>(null);
  const selectorDebugEventCountsRef = useRef({
    touchStarts: 0,
    touchMoves: 0,
    wheels: 0,
    scrolls: 0,
  });
  const [selectorDebugEnabled] = useState(() => {
    if (typeof window === "undefined") return false;

    const searchParams = new URLSearchParams(window.location.search);
    const enabledByQuery = searchParams.get("selectorDebug") === "1";
    const enabledByStorage =
      window.localStorage.getItem("kurioticket_selector_debug") === "1";

    return enabledByQuery || enabledByStorage;
  });
  const [selectorDebugSnapshot, setSelectorDebugSnapshot] = useState(
    emptySelectorDebugSnapshot,
  );

  const dialogId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const countryCurrencySearchId = useId();
  const countryCurrencyListId = useId();

  const isHeaderVariant = variant === "header";
  const isMobileVariant = variant === "mobile";
  const isGroupedHeaderVariant = isHeaderVariant && grouped;

  const triggerClassName = isMobileVariant
    ? "flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-none border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-900 transition-colors hover:border-violet-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    : isGroupedHeaderVariant
      ? "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-indigo-50 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
      : isHeaderVariant
        ? "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-semibold text-indigo-50 shadow-sm transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900"
        : "inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500";

  const chevronClassName = isHeaderVariant
    ? "text-indigo-100"
    : "text-slate-500";

  const setDialogElement = useCallback(
    (element: HTMLElement | null) => {
      dialogRef.current = element;

      if (isMobileVariant) {
        listScrollRef.current = element;
      }
    },
    [isMobileVariant],
  );

  const setListScrollElement = useCallback(
    (element: HTMLDivElement | null) => {
      if (!isMobileVariant) {
        listScrollRef.current = element;
      }
    },
    [isMobileVariant],
  );

  const readSelectorDebugSnapshot = useCallback(
    (point?: { clientX: number; clientY: number }) => {
      const list = listScrollRef.current;
      const activeElement = document.activeElement;
      const elementAtPoint = point
        ? document.elementFromPoint(point.clientX, point.clientY)
        : null;
      const eventCounts = selectorDebugEventCountsRef.current;

      return {
        activeElement: describeElementForSelectorDebug(activeElement),
        bodyOverflow: document.body.style.overflow,
        bodyPosition: document.body.style.position,
        htmlOverflow: document.documentElement.style.overflow,
        listClientHeight: list?.clientHeight ?? 0,
        listScrollHeight: list?.scrollHeight ?? 0,
        listScrollTop: list?.scrollTop ?? 0,
        listCanScroll: Boolean(list && list.scrollHeight > list.clientHeight),
        touchStarts: eventCounts.touchStarts,
        touchMoves: eventCounts.touchMoves,
        wheels: eventCounts.wheels,
        scrolls: eventCounts.scrolls,
        elementFromPoint: describeElementForSelectorDebug(elementAtPoint),
        overlaySummary: summarizeComputedStyleForSelectorDebug(
          overlayRef.current,
        ),
        backdropSummary: summarizeComputedStyleForSelectorDebug(
          backdropRef.current,
        ),
        sheetSummary: summarizeComputedStyleForSelectorDebug(dialogRef.current),
        listSummary: summarizeComputedStyleForSelectorDebug(list),
        triggerInsideAriaHidden: Boolean(
          triggerRef.current?.closest('[aria-hidden="true"]'),
        ),
      };
    },
    [],
  );

  const updateSelectorDebugSnapshot = useCallback(
    (point?: { clientX: number; clientY: number }) => {
      if (!selectorDebugEnabled) return;

      const nextSnapshot = readSelectorDebugSnapshot(point);
      setSelectorDebugSnapshot(nextSnapshot);
      console.info("[kurioticket:selector-debug]", {
        open,
        isMobileVariant,
        ...nextSnapshot,
      });
    },
    [isMobileVariant, open, readSelectorDebugSnapshot, selectorDebugEnabled],
  );

  useEffect(() => {
    if (!open || !selectorDebugEnabled) return;

    selectorDebugEventCountsRef.current = {
      touchStarts: 0,
      touchMoves: 0,
      wheels: 0,
      scrolls: 0,
    };

    const list = listScrollRef.current;
    if (!list) return;

    const onTouchStart = (event: TouchEvent) => {
      selectorDebugEventCountsRef.current.touchStarts += 1;
      const touch = event.touches[0];
      updateSelectorDebugSnapshot(
        touch ? { clientX: touch.clientX, clientY: touch.clientY } : undefined,
      );
    };

    const onTouchMove = (event: TouchEvent) => {
      selectorDebugEventCountsRef.current.touchMoves += 1;
      const touch = event.touches[0];
      updateSelectorDebugSnapshot(
        touch ? { clientX: touch.clientX, clientY: touch.clientY } : undefined,
      );
    };

    const onWheel = (event: WheelEvent) => {
      selectorDebugEventCountsRef.current.wheels += 1;
      updateSelectorDebugSnapshot({
        clientX: event.clientX,
        clientY: event.clientY,
      });
    };

    const onScroll = () => {
      selectorDebugEventCountsRef.current.scrolls += 1;
      updateSelectorDebugSnapshot();
    };

    list.addEventListener("touchstart", onTouchStart, { passive: true });
    list.addEventListener("touchmove", onTouchMove, { passive: true });
    list.addEventListener("wheel", onWheel, { passive: true });
    list.addEventListener("scroll", onScroll, { passive: true });

    const frame = window.requestAnimationFrame(() => {
      updateSelectorDebugSnapshot();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      list.removeEventListener("touchstart", onTouchStart);
      list.removeEventListener("touchmove", onTouchMove);
      list.removeEventListener("wheel", onWheel);
      list.removeEventListener("scroll", onScroll);
    };
  }, [open, selectorDebugEnabled, updateSelectorDebugSnapshot]);

  const openDialog = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    onBeforeOpen?.();
    setOpen(true);
  };

  const closeDialog = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    setDialogEntered(false);
    setCountryCurrencyQuery("");
    setShowAllCountryCurrencies(false);

    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
      triggerRef.current?.focus();
    }, 180);
  }, []);

  useEffect(() => {
    if (!open) return;

    const shouldLockDocumentScroll = !isMobileVariant;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (shouldLockDocumentScroll) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      setDialogEntered(true);
      countryCurrencySearchInputRef.current?.focus();
      animationFrameRef.current = null;
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
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
      if (shouldLockDocumentScroll) {
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.body.style.overflow = previousBodyOverflow;
      }
      document.removeEventListener("keydown", onKeyDown);

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [closeDialog, isMobileVariant, open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
      }
    };
  }, []);

  const popularCountryCurrencies = useMemo(() => {
    const popularOptions = popularCountryCurrencyCodes
      .map((code) => options.find((option) => option.code === code))
      .filter((option): option is (typeof options)[number] => Boolean(option));

    const selectedPopularCountryCurrency = options.find(
      (option) => option.code === mode,
    );

    if (
      !selectedPopularCountryCurrency ||
      popularOptions.some(
        (option) => option.code === selectedPopularCountryCurrency.code,
      )
    ) {
      return popularOptions;
    }

    return [selectedPopularCountryCurrency, ...popularOptions];
  }, [mode, options]);

  const filteredCountryCurrencies = useMemo(() => {
    const normalizedQuery = countryCurrencyQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return showAllCountryCurrencies ? options : popularCountryCurrencies;
    }

    return options.filter((option) => {
      return (
        option.code.toLowerCase().includes(normalizedQuery) ||
        option.country.toLowerCase().includes(normalizedQuery) ||
        (t[`countryCurrency.country.${option.code}`] ?? "")
          .toLowerCase()
          .includes(normalizedQuery) ||
        option.currency.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [
    countryCurrencyQuery,
    options,
    popularCountryCurrencies,
    t,
    showAllCountryCurrencies,
  ]);

  const hasSearchQuery = countryCurrencyQuery.trim().length > 0;
  const showingFullCountryCurrencyCatalog =
    showAllCountryCurrencies || hasSearchQuery;
  const curatedMobileCountryCurrencyCount = 8;
  const displayedCountryCurrencies =
    !showingFullCountryCurrencyCatalog && isMobileVariant
      ? filteredCountryCurrencies.slice(0, curatedMobileCountryCurrencyCount)
      : filteredCountryCurrencies;
  const countryCurrencyListLabel = showingFullCountryCurrencyCatalog
    ? t.countryCurrencyAllCountriesAndCurrencies
    : t.countryCurrencyPopularCountryAndCurrency;
  const countryCurrencyCountLabel = showingFullCountryCurrencyCatalog
    ? filteredCountryCurrencies.length
    : displayedCountryCurrencies.length;
  const countryCurrencyOptionCountLabel = formatTranslation(
    countryCurrencyCountLabel === 1
      ? t.countryCurrencyOptionCountSingular
      : t.countryCurrencyOptionCountPlural,
    { count: countryCurrencyCountLabel },
  );
  const getCountryDisplayName = useCallback(
    (option: (typeof options)[number]) =>
      t[`countryCurrency.country.${option.code}`] ?? option.country,
    [t],
  );

  const handleCountryCurrencySelect = (option: (typeof options)[number]) => {
    const isAlreadyActive =
      option.code === mode && option.currency === selectedCurrency;

    if (isAlreadyActive) {
      closeDialog();
      return;
    }

    setMode(option.code);
    setCurrency(option.currency);
    closeDialog();

    reloadTimerRef.current = window.setTimeout(() => {
      router.refresh();
      window.location.reload();
    }, 220);
  };

  const handleShowMoreCountryCurrencies = () => {
    setShowAllCountryCurrencies(true);

    window.requestAnimationFrame(() => {
      listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeDialog() : openDialog())}
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={formatTranslation(t.openCountryCurrencySelector, {
          code: selectedOption.code,
          currency: selectedCurrency,
        })}
      >
        {isMobileVariant ? (
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {t.countryAndCurrency}
            </span>
            <span className="mt-0.5 block truncate text-sm font-black text-slate-950">
              {selectedOption.code} · {selectedCurrency}
            </span>
          </span>
        ) : isHeaderVariant ? (
          <span>{selectedCurrency}</span>
        ) : (
          <span>
            {selectedOption.code} · {selectedCurrency}
          </span>
        )}

        <ChevronDown
          size={14}
          className={`shrink-0 ${chevronClassName}`}
          aria-hidden="true"
        />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={overlayRef}
              className="fixed inset-0 z-[1000] flex items-end justify-center md:items-start md:px-4 md:pt-[max(64px,6vh)]"
              aria-hidden={false}
              data-selector-debug-overlay="true"
            >
              <div
                ref={backdropRef}
                className={`absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-200 ${
                  dialogEntered ? "opacity-100" : "opacity-0"
                }`}
                onClick={closeDialog}
                data-selector-debug-backdrop="true"
              />

              <section
                ref={setDialogElement}
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className={`relative z-[1001] h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-none bg-white text-slate-900 shadow-2xl transition duration-200 ease-out [-webkit-overflow-scrolling:touch] md:flex md:h-auto md:max-h-[86vh] md:w-[min(720px,94vw)] md:flex-col md:rounded-3xl md:border md:border-slate-200 md:overflow-hidden ${
                  dialogEntered
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0 md:translate-y-0"
                }`}
                data-selector-debug-sheet="true"
              >
                <div className="shrink-0 border-b border-slate-200 px-5 pb-4 pt-5 md:px-6 md:pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2
                        id={titleId}
                        className="text-xl font-semibold tracking-tight text-slate-950"
                      >
                        {t.chooseCountryAndCurrency}
                      </h2>

                      <p
                        id={descriptionId}
                        className="mt-2 max-w-2xl text-sm leading-6 text-slate-600"
                      >
                        {t.countryCurrencyDescription}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeDialog}
                      className="cursor-pointer rounded-none p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                      aria-label={t.closeCountryCurrencySelector}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <label
                    htmlFor={countryCurrencySearchId}
                    className="mt-5 block text-sm font-medium text-slate-800"
                  >
                    {t.searchCountryOrCurrency}
                  </label>

                  <div className="mt-2 flex items-center gap-2 rounded-none border border-slate-300 bg-white px-3.5 py-3 transition-colors focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">
                    <Search
                      size={17}
                      className="shrink-0 text-slate-500"
                      aria-hidden="true"
                    />

                    <input
                      ref={countryCurrencySearchInputRef}
                      id={countryCurrencySearchId}
                      value={countryCurrencyQuery}
                      onChange={(event) =>
                        setCountryCurrencyQuery(event.target.value)
                      }
                      placeholder={t.searchCountryOrCurrency}
                      className="h-6 w-full min-w-0 border-0 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 md:text-sm"
                      aria-controls={countryCurrencyListId}
                    />
                  </div>
                </div>

                <div
                  ref={setListScrollElement}
                  tabIndex={isMobileVariant ? undefined : 0}
                  className="px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:min-h-0 md:flex-1 md:touch-pan-y md:scroll-smooth md:overflow-y-scroll md:overscroll-contain md:px-6 md:[-webkit-overflow-scrolling:touch]"
                  data-selector-debug-scroll-area="true"
                >
                  {/* Mobile scroll boundary: the full-screen dialog owns touch scrolling; desktop keeps its established inner list scroller. */}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {countryCurrencyListLabel}
                    </h3>

                    <span className="text-xs font-medium text-slate-500">
                      {countryCurrencyOptionCountLabel}
                    </span>
                  </div>

                  <div
                    id={countryCurrencyListId}
                    role="radiogroup"
                    aria-label={countryCurrencyListLabel}
                    className="grid gap-2.5 sm:grid-cols-2"
                  >
                    {displayedCountryCurrencies.map((option) => {
                      const isActive =
                        option.code === mode &&
                        option.currency === selectedCurrency;

                      return (
                        <button
                          key={option.code}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          aria-label={formatTranslation(
                            t.selectCountryCurrencyOption,
                            {
                              country: getCountryDisplayName(option),
                              code: option.code,
                              currency: option.currency,
                            },
                          )}
                          onClick={() => handleCountryCurrencySelect(option)}
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

                            <span className="mt-1 block break-words text-sm font-normal text-slate-700">
                              {getCountryDisplayName(option)}
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

                  {displayedCountryCurrencies.length === 0 ? (
                    <div className="rounded-none border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-900">
                        {t.noCountriesOrCurrenciesFound}
                      </p>
                    </div>
                  ) : null}

                  {!showingFullCountryCurrencyCatalog ? (
                    <button
                      type="button"
                      onClick={handleShowMoreCountryCurrencies}
                      className="mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-none border border-slate-900 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-violet-700 hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                    >
                      {t.showMoreResults}
                    </button>
                  ) : null}
                </div>

                {selectorDebugEnabled ? (
                  <pre className="pointer-events-none fixed bottom-3 left-3 right-3 z-[1002] max-h-[42vh] overflow-auto rounded-lg bg-slate-950/90 p-3 text-[10px] leading-4 text-white shadow-2xl md:left-auto md:right-4 md:w-[28rem]">
                    {JSON.stringify(
                      {
                        open,
                        isMobileVariant,
                        ...selectorDebugSnapshot,
                      },
                      null,
                      2,
                    )}
                  </pre>
                ) : null}
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
