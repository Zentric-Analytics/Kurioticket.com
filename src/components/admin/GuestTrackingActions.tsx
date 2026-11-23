"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ShieldOff } from "lucide-react";

type Props = { visitorId: string; backHref: string };

/**
 * Guest actions are deliberately different from account actions.
 * A guest has no account role or login to suspend; deleting historical data
 * needs an independent reviewed privacy/retention workflow.
 */
export function GuestTrackingActions({ visitorId, backHref }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)
        && !triggerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  async function disableTracking() {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
    if (!window.confirm(
      "Disable tracking for this guest ID? It will stop future activity under this ID and remove it from the active guest directory. Historical records remain subject to retention rules. The person can visit again with a new identity."
    )) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/guests/${encodeURIComponent(visitorId)}/tracking`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Unable to disable guest tracking.");
        return;
      }
      window.location.assign(backHref);
    } catch {
      setMessage("Unable to disable guest tracking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="relative shrink-0">
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Manage guest ${visitorId}`}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={open ? menuId : undefined}
      disabled={loading}
      onClick={() => setOpen(value => !value)}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
        }
        if (event.key === "Escape") {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      className="focus-ring inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#020617] hover:bg-[#F8FAFC] disabled:opacity-50"
    >
      {loading ? "Updating…" : "Manage"} <ChevronDown size={14} aria-hidden="true" />
    </button>
    {open ? <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label="Guest management"
      onKeyDown={event => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
        if (event.key === "Tab") setOpen(false);
      }}
      className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-[#D8E1EC] bg-white p-1.5 shadow-[0_12px_28px_-18px_rgba(2,6,23,0.28)]"
    >
      <button role="menuitem" type="button" disabled={loading}
        onClick={() => void disableTracking()}
        className="focus-ring flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-[#020617] hover:bg-[#F8FAFC]"
      >
        <ShieldOff size={15} aria-hidden="true" className="shrink-0 text-[#475569]" />
        Disable tracking
      </button>
      <p className="px-3 pb-2 pt-1 text-[12px] leading-5 text-[#64748B]">
        Applies to this guest ID only. Existing recorded history is retained.
      </p>
    </div> : null}
    {message ? <p role="status" className="mt-2 max-w-64 text-[12px] text-[#B91C1C]">{message}</p> : null}
  </div>;
}
