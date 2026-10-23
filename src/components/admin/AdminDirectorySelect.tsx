"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export type AdminDirectoryOption = { value: string; label: string };

type Props = {
  label: string;
  name: string;
  value: string;
  options: readonly AdminDirectoryOption[];
  autoSubmit?: boolean;
  compact?: boolean;
};

/**
 * Compact select-only combobox for the Admin directory.
 * A real hidden form field preserves GET filtering/sorting; the popup owns only
 * presentation and keyboard interaction. No data or permission rules live here.
 */
export function AdminDirectorySelect({
  label,
  name,
  value,
  options,
  autoSubmit = false,
  compact = false,
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selected));
  const selectedLabel = options[selectedIndex]?.label || options[0]?.label || "";

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const dismissOnResize = () => setOpen(false);
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", dismissOnResize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", dismissOnResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[activeIndex]
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const show = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(options.length - 1, index)));
    setOpen(true);
  };
  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };
  const choose = (next: string) => {
    if (!options.some(option => option.value === next)) return;
    // Update the actual GET form input *before* requestSubmit (React state
    // updates are batched and are not guaranteed to flush first).
    if (hiddenRef.current) hiddenRef.current.value = next;
    setSelected(next);
    close();
    if (autoSubmit && next !== selected) hiddenRef.current?.form?.requestSubmit();
  };
  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex(index => (index + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex(index => (index - 1 + options.length) % options.length);
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
      default: {
        // Native selects support first-character navigation; keep that
        // useful behavior in the custom listbox as well.
        if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) break;
        const first = event.key.toLocaleLowerCase();
        const index = options.findIndex((option, i) => i > activeIndex && option.label.toLocaleLowerCase().startsWith(first));
        const wrapped = options.findIndex(option => option.label.toLocaleLowerCase().startsWith(first));
        if (index >= 0 || wrapped >= 0) setActiveIndex(index >= 0 ? index : wrapped);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={value} />
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => open ? close() : show(selectedIndex)}
        onKeyDown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show(selectedIndex);
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            show(event.key === "Home" ? 0 : options.length - 1);
          }
        }}
        className={`focus-ring flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-left text-[13px] font-medium text-[#020617] transition-colors hover:border-[#94A3B8] ${compact ? "h-10" : "h-11"}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 text-[#0F172A] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listboxId}-option-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-[170px] overflow-y-auto rounded-lg border border-[#D8E1EC] bg-white p-1.5 shadow-[0_8px_24px_-12px_rgba(2,6,23,0.25)] outline-none"
        >
          {options.map((option, index) => (
            <button
              id={`${listboxId}-option-${index}`}
              key={option.value}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={selected === option.value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option.value)}
              className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${index === activeIndex ? "bg-[#F1F7FF]" : "hover:bg-[#F8FAFC]"} ${selected === option.value ? "font-medium text-[#004BB8]" : "font-normal text-[#020617]"}`}
            >
              <span className="min-w-0">{option.label}</span>
              {selected === option.value ? <Check size={15} aria-hidden="true" className="shrink-0 text-[#004BB8]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
