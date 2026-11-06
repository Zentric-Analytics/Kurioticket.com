"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { getCmsDropdownBelow } from "@/lib/adminCmsDropdownPosition";

export type AdminDirectoryOption = { value: string; label: string };

// Render a real native select on the server and without JavaScript. Upgrade
// after hydration without causing a server/client markup mismatch.
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

type Props = {
  label: string;
  name: string;
  value: string;
  options: readonly AdminDirectoryOption[];
  nativeExcludeValues?: readonly string[];
  autoSubmit?: boolean;
  compact?: boolean;
  underlined?: boolean;
  plain?: boolean;
  /** Opt-in roomier popover for long labels in an action sidebar. */
  spaciousMenu?: boolean;
  /** Content controls share a compact field and an attached downward list. */
  field?: boolean;
  attached?: boolean;
  disabled?: boolean;
  required?: boolean;
  align?: "start" | "end";
  onValueChange?: (next: string) => void;
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
  nativeExcludeValues = [],
  autoSubmit = false,
  compact = false,
  underlined = false,
  plain = false,
  spaciousMenu = false,
  field = false,
  attached = false,
  disabled = false,
  required = false,
  align = "start",
  onValueChange,
}: Props) {
  const listboxId = useId();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fieldMenuHeight, setFieldMenuHeight] = useState(232);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selected));
  const selectedLabel = options[selectedIndex]?.label || options[0]?.label || "";

  useEffect(() => { setSelected(value); }, [value]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  const fieldClass = "h-9 w-full min-w-0 scroll-mb-28 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-normal text-[#111827] shadow-[0_1px_0_rgba(15,23,42,0.04)] outline-none transition-colors hover:border-slate-400 focus:border-[#004BB8]/40 focus:ring-2 focus:ring-[#004BB8]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700";

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
    // Scroll only the popup, not the document or neighboring toolbar.
    const list = listRef.current;
    const option = list?.querySelectorAll<HTMLElement>('[role="option"]')[activeIndex];
    if (!list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [activeIndex, open]);

  const show = (index: number) => {
    if (disabled) return;
    if (field && triggerRef.current) {
      const anchor = triggerRef.current;
      if (window.innerHeight - anchor.getBoundingClientRect().bottom < 96) {
        anchor.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      }
      setFieldMenuHeight(getCmsDropdownBelow(anchor.getBoundingClientRect(), window.innerHeight).maxHeight);
    }
    setActiveIndex(Math.max(0, Math.min(options.length - 1, index)));
    setOpen(true);
  };
  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };
  const choose = (next: string) => {
    if (!options.some(option => option.value === next)) return;
    // The controlled hidden field remains in sync with selected state after
    // React commits; write immediately as well for automatic sort submits.
    if (hiddenRef.current) hiddenRef.current.value = next;
    setSelected(next);
    close();
    if (next !== selected) {
      if (onValueChange) onValueChange(next);
      else if (autoSubmit) hiddenRef.current?.form?.requestSubmit();
    }
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

  if (!hydrated) {
    return (
      <div className="min-w-0">
        <label className="sr-only" htmlFor={listboxId + "-native"}>{label}</label>
        <select
          id={listboxId + "-native"}
          name={name}
          defaultValue={value}
          disabled={disabled}
          required={required}
          className={field ? fieldClass : plain ? "h-10 w-auto max-w-full border-0 bg-transparent px-0 text-[13px] font-medium text-[#334155] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" : underlined ? "h-10 w-auto max-w-full border-0 border-b border-[#CAD3DF] bg-transparent px-0 pr-1 text-[13px] font-medium text-[#334155] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" : `focus-ring w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#020617] ${compact ? "h-10" : "h-11"}`}
        >
          {options.filter(option => !nativeExcludeValues.includes(option.value)).map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {autoSubmit ? (
          <noscript>
            <button type="submit" className="mt-2 rounded-md border border-[#D8E1EC] px-3 py-2 text-[13px] font-medium text-[#020617]">
              Apply sort
            </button>
          </noscript>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={underlined || plain ? "relative inline-flex max-w-full shrink-0" : "relative min-w-0"}>
      <input ref={hiddenRef} type="hidden" name={name} value={selected} readOnly disabled={disabled} />
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={label}
        disabled={disabled}
        aria-required={required || undefined}
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
        className={field ? fieldClass + " flex items-center justify-between gap-2 text-left" + (open ? " rounded-b-none" : "") : plain ? "inline-flex h-10 max-w-full min-w-0 cursor-pointer items-center justify-start gap-[5px] whitespace-nowrap border-0 bg-transparent px-0 text-left text-[13px] font-medium text-[#334155] transition-colors hover:text-[#111827] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" : underlined ? "inline-flex h-10 max-w-full min-w-0 cursor-pointer items-center justify-start gap-[7px] whitespace-nowrap border-b border-[#CAD3DF] bg-transparent px-0 text-left text-[13px] font-medium text-[#334155] transition-colors hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" : `focus-ring flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-left text-[13px] font-medium text-[#020617] transition-colors hover:border-[#94A3B8] ${compact ? "h-10" : "h-11"}`}
      >
        <span className={underlined || plain ? "whitespace-nowrap" : "truncate"}>{selectedLabel}</span>
        {plain ? <svg aria-hidden="true" viewBox="0 0 8 5" className="mt-px h-[5px] w-[8px] shrink-0 text-[#475569]" fill="currentColor"><path d="M0 0h8L4 5z" /></svg> : <ChevronDown size={15} aria-hidden="true" className={`shrink-0 text-[#475569] transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && !disabled ? (
        <div
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listboxId}-option-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          style={field ? { maxHeight: fieldMenuHeight } : undefined}
          className={field
            ? "absolute left-0 top-full z-[100] max-h-58 w-full overflow-y-auto overscroll-contain rounded-b-lg border border-t-0 border-slate-300 bg-white p-1 shadow-[0_6px_12px_-8px_rgba(15,23,42,0.22)] outline-none [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent]"
            : `absolute top-full z-50 ${attached ? "mt-0.5 overscroll-contain [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent]" : "mt-1.5"} max-h-64 max-w-[min(90vw,280px)] overflow-y-auto rounded-lg border border-[#D8E1EC] bg-white shadow-[0_10px_28px_-12px_rgba(2,6,23,0.25)] outline-none ${spaciousMenu ? "min-w-[228px] space-y-1 p-2" : "min-w-[170px] p-1.5"} ${(underlined || plain) && align === "end" ? "left-0 lg:left-auto lg:right-0" : "left-0"} ${underlined || plain ? "" : "w-full"}`}
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
              className={`flex w-full items-center justify-between rounded-md px-3 text-left text-[13px] transition-colors ${field || attached ? "min-h-9 cursor-pointer gap-2 py-2" : spaciousMenu ? "min-h-11 gap-3 py-2.5" : "min-h-9 gap-2 py-2"} ${index === activeIndex ? "bg-[#F1F7FF]" : "hover:bg-[#F8FAFC]"} ${selected === option.value ? "font-medium text-[#004BB8]" : "font-normal text-[#020617]"}`}
            >
              <span className={spaciousMenu ? "min-w-0 whitespace-nowrap" : "min-w-0"}>{option.label}</span>
              {selected === option.value ? <Check size={15} aria-hidden="true" className="shrink-0 text-[#004BB8]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

