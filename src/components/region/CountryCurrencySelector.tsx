"use client";

import {
  Check,
  ChevronDown,
  Search,
  X,
} from "lucide-react";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import { useRegion } from "@/components/region/RegionProvider";


type CountryCurrencySelectorProps = {
  variant?: "default" | "header";
  grouped?: boolean;
};

export function CountryCurrencySelector({
  variant = "default",
  grouped = false,
}: CountryCurrencySelectorProps) {
  const {
    mode,
    setMode,
    selectedOption,
    options,
  } = useRegion();

  const [open, setOpen] =
    useState(false);

  const [query, setQuery] =
    useState("");

  const triggerRef =
    useRef<HTMLButtonElement | null>(null);

  const dialogRef =
    useRef<HTMLElement | null>(null);

  const searchInputRef =
    useRef<HTMLInputElement | null>(null);

  const dialogId =
    useId();

  const titleId =
    useId();

  const descriptionId =
    useId();

  const searchId =
    useId();

  const isHeaderVariant =
    variant === "header";

  const isGroupedHeaderVariant =
    isHeaderVariant && grouped;

  const triggerClassName = isGroupedHeaderVariant
    ? "inline-flex h-12 cursor-pointer items-center gap-2 rounded-none border-0 bg-transparent px-4 text-sm font-semibold text-indigo-50 shadow-none transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
    : isHeaderVariant
      ? "inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-indigo-50 shadow-sm transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900"
      : "inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500";

  const chevronClassName = isHeaderVariant
    ? "text-indigo-100"
    : "text-slate-500";

  const closeDialog = () => {
    setOpen(false);
    setQuery("");
    window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    const onKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (
        event.key !== "Tab" ||
        !dialogRef.current
      ) {
        return;
      }

      const focusableElements =
        Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(
          (element) =>
            element.getClientRects().length > 0
        );

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      if (!firstElement || !lastElement) {
        return;
      }

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      }

      if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [open]);

  const filteredOptions =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      if (!normalizedQuery) {
        return options;
      }

      return options.filter(
        (option) => {
          return (
            option.code
              .toLowerCase()
              .includes(
                normalizedQuery
              ) ||
            option.country
              .toLowerCase()
              .includes(
                normalizedQuery
              ) ||
            option.currency
              .toLowerCase()
              .includes(
                normalizedQuery
              )
          );
        }
      );
    }, [options, query]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() =>
          setOpen((value) => !value)
        }
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={`Open preferences, current country and currency ${selectedOption.code}, ${selectedOption.currency}`}
      >
        <span>
          {selectedOption.code} · {selectedOption.currency}
        </span>

        <ChevronDown
          size={14}
          className={chevronClassName}
          aria-hidden="true"
        />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-40 bg-slate-900/45"
                onClick={closeDialog}
              />

              <section
                ref={dialogRef}
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl md:inset-x-0 md:bottom-auto md:top-[max(80px,8vh)] md:mx-auto md:w-[min(980px,96vw)] md:rounded-3xl md:p-7"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">
                      Preferences
                    </p>

                    <h2
                      id={titleId}
                      className="mt-1 text-2xl font-black text-slate-950"
                    >
                      Country & currency
                    </h2>

                    <p
                      id={descriptionId}
                      className="mt-1 text-sm text-slate-600"
                    >
                      Choose how prices are displayed. This does not change airport suggestions, and real-time FX is not applied yet.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeDialog}
                    className="cursor-pointer rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    aria-label="Close preferences dialog"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <label
                  htmlFor={searchId}
                  className="mb-2 block text-sm font-bold text-slate-900"
                >
                  Search country or currency
                </label>

                <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
                  <Search
                    size={16}
                    className="text-slate-500"
                  />

                  <input
                    ref={searchInputRef}
                    id={searchId}
                    value={query}
                    onChange={(
                      event
                    ) =>
                      setQuery(
                        event.target
                          .value
                      )
                    }
                    placeholder="United States or USD"
                    className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div
                  role="radiogroup"
                  aria-label="Country and currency options"
                  className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {filteredOptions.map(
                    (option) => {
                      const isActive =
                        option.code ===
                        mode;

                      return (
                        <button
                          key={
                            option.code
                          }
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          aria-label={`${option.country}, ${option.currency}`}
                          onClick={() => {
                            setMode(
                              option.code
                            );

                            closeDialog();
                          }}
                          className={`cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                            isActive
                              ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                              : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-900">
                              {option.code} · {option.currency}
                            </span>

                            {isActive ? (
                              <Check
                                size={16}
                                className="text-violet-600"
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>

                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            {option.country}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </section>
            </>,
            document.body
          )
        : null}
    </>
  );
}