"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type SearchMonitorOption = { value: string; label: string };

export function SearchMonitorSelect({
  label,
  name,
  value,
  options,
  appearance = "underlined",
  align = "start",
  autoSubmit = false,
  clearFieldNamesOnChange = [],
}: {
  label: string;
  name: string;
  value: string;
  options: readonly SearchMonitorOption[];
  appearance?: "underlined" | "plain";
  align?: "start" | "end";
  autoSubmit?: boolean;
  /** Omit a stale scoped field from submission when this filter changes. */
  clearFieldNamesOnChange?: readonly string[];
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selected));
  const selectedLabel = options[selectedIndex]?.label ?? "";

  useEffect(() => {
    setSelected(value);
    setOpen(false);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const dismissFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismissFocus);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismissFocus);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[activeIndex]
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };
  const show = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };
  const choose = (next: string) => {
    if (!options.some((option) => option.value === next)) return;
    const changed = next !== selected;
    if (changed) {
      // A different identity must not carry the former customer's userId or
      // visitorId into a new query. Disabling these existing hidden fields
      // removes them from FormData immediately, before React commits state.
      const form = triggerRef.current?.form;
      for (const fieldName of clearFieldNamesOnChange) {
        const field = form?.elements.namedItem(fieldName);
        if (field instanceof HTMLInputElement && field.type === "hidden") {
          field.disabled = true;
        }
      }
    }
    setSelected(next);
    close();
    if (autoSubmit && changed) {
      // Request submission only after writing the selected value into the real
      // hidden form control: React state does not commit synchronously.
      if (hiddenRef.current) {
        hiddenRef.current.value = next;
        hiddenRef.current.name = next ? name : "";
      }
      triggerRef.current?.form?.requestSubmit();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(options[activeIndex].value);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
          const letter = event.key.toLocaleLowerCase();
          const next = options.findIndex((option, index) => index > activeIndex && option.label.toLocaleLowerCase().startsWith(letter));
          const wrapped = options.findIndex((option) => option.label.toLocaleLowerCase().startsWith(letter));
          if (next >= 0 || wrapped >= 0) setActiveIndex(next >= 0 ? next : wrapped);
        }
    }
  };

  return (
    <div ref={rootRef} className={"relative min-w-0 " + (appearance === "plain" ? "inline-flex shrink-0" : "block w-full")}>
      <input
        ref={hiddenRef}
        type="hidden"
        name={selected ? name : undefined}
        value={selected}
        readOnly
      />
      <button
        ref={triggerRef}
        type="button"
        aria-label={label + ": " + selectedLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => open ? close() : show(selectedIndex)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show(selectedIndex);
          }
        }}
        className={
          "inline-flex h-9 cursor-pointer items-center justify-start gap-[5px] whitespace-nowrap bg-transparent text-left text-[12px] font-semibold text-[#475569] transition-colors hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 " +
          (appearance === "plain"
            ? "px-0"
            : "w-full border-b border-[#AEB8C6] px-0 focus-visible:border-[#004BB8]")
        }
      >
        <span className="whitespace-nowrap">{selectedLabel}</span>
        <svg aria-hidden="true" viewBox="0 0 8 5" className="mt-px h-[5px] w-[8px] shrink-0" fill="currentColor">
          <path d="M0 0h8L4 5z" />
        </svg>
      </button>
      {open ? (
        <div
          id={id}
          ref={listRef}
          role="listbox"
          aria-label={label}
          aria-activedescendant={id + "-option-" + activeIndex}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          className={
            "absolute top-full z-50 mt-1.5 max-h-64 min-w-[160px] max-w-[min(90vw,280px)] overflow-y-auto rounded-lg border border-[#D8E1EC] bg-white p-1.5 shadow-[0_10px_28px_-12px_rgba(2,6,23,0.25)] outline-none " +
            (align === "end" ? "right-0" : "left-0")
          }
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={id + "-option-" + index}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={selected === option.value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option.value)}
              className={
                "flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors " +
                (index === activeIndex ? "bg-[#F1F7FF]" : "hover:bg-[#F8FAFC]") +
                (selected === option.value ? " font-semibold text-[#004BB8]" : " font-normal text-[#1A1A1A]")
              }
            >
              <span className="whitespace-nowrap">{option.label}</span>
              {selected === option.value ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#004BB8]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SearchMonitorProviderInput({ value }: { value: string }) {
  const [provider, setProvider] = useState(value);

  useEffect(() => {
    setProvider(value);
  }, [value]);

  return (
    <input
      type="text"
      aria-label="Provider"
      name={provider.trim() ? "provider" : undefined}
      value={provider}
      onChange={(event) => setProvider(event.target.value)}
      placeholder="Provider"
      autoComplete="off"
      className="h-9 w-full min-w-0 border-0 border-b border-[#AEB8C6] bg-transparent px-0 text-[12px] font-medium text-[#475569] outline-none placeholder:text-[#9CA3AF] focus:border-[#004BB8] focus:ring-0"
    />
  );
}
