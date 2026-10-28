"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

export function ActivityDataInfo({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) { pinned.current = false; setOpen(false); }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { pinned.current = false; setOpen(false); }
    };
    document.addEventListener("keydown", onEscape);
    document.addEventListener("pointerdown", dismiss);
    return () => { document.removeEventListener("keydown", onEscape); document.removeEventListener("pointerdown", dismiss); };
  }, [open]);
  return <div ref={root} className="relative inline-flex"
    onMouseEnter={() => setOpen(true)} onMouseLeave={() => { if (!pinned.current && !root.current?.contains(document.activeElement)) setOpen(false); }}
    onFocus={() => setOpen(true)} onBlur={(event) => {
      if (!pinned.current && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); pinned.current = false; setOpen(false); event.currentTarget.querySelector("button")?.focus(); } }}>
    <button type="button" aria-label="About activity data" aria-describedby="activity-data-explanation"
      aria-expanded={open} onClick={() => { pinned.current = true; setOpen(true); }}
      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-full text-[#475569] hover:text-[#004BB8]">
      <Info size={16} aria-hidden="true" />
    </button>
    <div id="activity-data-explanation" role="tooltip" hidden={!open}
      className="fixed inset-x-4 top-1/3 z-20 mx-auto w-auto max-w-80 lg:absolute lg:inset-x-auto lg:left-0 lg:right-auto lg:top-full lg:mx-0 lg:w-64 rounded-lg border border-[#D8E1EC] bg-white p-3 text-xs font-normal leading-5 text-[#334155] shadow-lg lg:left-0 lg:right-auto">
      {children}
    </div>
  </div>;
}
