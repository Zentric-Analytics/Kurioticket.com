"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";

import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { Button } from "@/components/ui/Button";
import type { AnalyticsConsentChoice, VisitorConsentSyncState } from "@/lib/analyticsConsentClient";

type Props = {
  showBanner: boolean;
  editing: boolean;
  modal: boolean;
  draftAnalytics: boolean;
  decisionPending: boolean;
  syncState: VisitorConsentSyncState;
  onOpen: () => void;
  onClose: () => void;
  onDraftChange: (value: boolean) => void;
  onChoose: (choice: Exclude<AnalyticsConsentChoice, null>) => void;
  onRetry: () => void;
};

const actionClass = "min-h-11 rounded-xl bg-[#004BB8] px-5 text-sm font-semibold text-white hover:bg-[#003D99]";

function Category({ id, name, subtitle, description, analytics, checked, disabled, onChange }: {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  analytics?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex min-h-[72px] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <button type="button" aria-expanded={expanded} aria-controls={id}
          onClick={() => setExpanded(value => !value)}
          className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 text-start sm:gap-3">
          {expanded ? <Minus className="size-4 shrink-0 text-[#004BB8]" aria-hidden="true" /> : <Plus className="size-4 shrink-0 text-[#004BB8]" aria-hidden="true" />}
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-5 text-navy">{name}</span>
            <span className="mt-0.5 block text-xs leading-4 text-slate-500">{subtitle}</span>
          </span>
        </button>
        {analytics ? (
          <button type="button" role="switch" aria-label={name} aria-checked={!!checked}
            disabled={disabled} onClick={() => onChange?.(!checked)}
            className="focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-60">
            <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none ${checked ? "bg-[#004BB8]" : "bg-slate-500"}`}>
              <span className={`size-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${checked ? "translate-x-5" : "translate-x-0"}`} />
            </span>
          </button>
        ) : <span className="shrink-0 text-xs font-semibold text-emerald-800">Always active</span>}
      </div>
      <div id={id} hidden={!expanded} className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        {description}
      </div>
    </div>
  );
}

/** Presentation only: every decision uses the existing, single analytics consent channel. */
export function CookieConsentPresentation({
  showBanner, editing, modal, draftAnalytics, decisionPending, syncState,
  onOpen, onClose, onDraftChange, onChoose, onRetry,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const busy = decisionPending && syncState !== "error";
  const failed = decisionPending && syncState === "error";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (modal) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.show();
      if (previousFocusRef.current && !dialog.contains(previousFocusRef.current)) previousFocusRef.current.focus({ preventScroll: true });
    }
    return () => {
      dialog.close();
      if (modal) document.body.style.overflow = previousOverflow;
      if (previousFocusRef.current?.isConnected && !dialog.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [modal]);

  useEffect(() => {
    if (modal) headingRef.current?.focus({ preventScroll: true });
  }, [editing, modal]);

  const actions = (
    <>
      <Button type="button" disabled={busy} onClick={() => onChoose("declined")} className={actionClass}>Reject optional</Button>
      <Button type="button" disabled={busy} onClick={() => onChoose("granted")} className={actionClass}>Accept all</Button>
    </>
  );
  const status = (
    <div aria-live="polite" role="status" className="text-sm leading-5 text-slate-600">
      {busy ? "Saving your choice…" : failed ? (
        <div className="flex flex-wrap items-center gap-2">
          <span>We could not update your preferences. Please retry.</span>
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>Retry</Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <dialog ref={dialogRef} aria-modal={modal} aria-labelledby={editing ? "cookie-preferences-title" : "cookie-banner-title"}
      onCancel={event => { event.preventDefault(); if (editing) onClose(); }}
      className={`fixed inset-0 z-[80] m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-navy backdrop:bg-slate-950/45 ${modal ? "" : "pointer-events-none"}`}>
      {showBanner ? (
        <section aria-hidden={editing || undefined} inert={editing || undefined}
          className="pointer-events-auto absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-[24px] border border-slate-200 bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.14)] motion-safe:animate-[mobile-results-sheet-surface-in_220ms_ease-out]">
          <div className="mx-auto max-w-[1200px] px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-7 sm:pb-7">
            <h2 ref={!editing ? headingRef : undefined} tabIndex={-1} id="cookie-banner-title"
              className="text-xl font-semibold tracking-tight text-navy outline-none sm:text-2xl">We value your privacy</h2>
            <p className="mt-3 max-w-[900px] text-sm leading-6 text-slate-600">
              We use essential cookies to keep Kurioticket secure and provide the travel services you request.
              With your permission, we use optional analytics cookies to understand how our platform is used and improve your experience.
              You can change your choice at any time.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/legal/cookie-policy" className="focus-ring rounded-sm font-medium text-[#004BB8] hover:underline">Cookie Policy</Link>
              <Link href="/legal/privacy-policy" className="focus-ring rounded-sm font-medium text-[#004BB8] hover:underline">Privacy Policy</Link>
            </div>
            {!editing && (busy || failed) ? <div className="mt-3">{status}</div> : null}
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:flex sm:flex-wrap sm:justify-end sm:gap-3">
              <Button type="button" variant="secondary" onClick={onOpen} disabled={busy}
                className="col-span-2 min-h-11 rounded-xl border-slate-300 px-5 font-semibold text-[#004BB8] hover:bg-slate-50">Cookie preferences</Button>
              {actions}
            </div>
          </div>
        </section>
      ) : null}
      {editing ? (
        <div className="pointer-events-auto absolute inset-0 flex items-end justify-center sm:items-center sm:p-6">
          {showBanner ? <div aria-hidden="true" className="absolute inset-0 bg-slate-950/25" /> : null}
          <section className="relative flex max-h-[92dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-[24px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] motion-safe:animate-[mobile-results-sheet-surface-in_220ms_ease-out] sm:max-h-[85dvh] sm:max-w-[540px] sm:rounded-[24px] sm:motion-safe:animate-[cookie-preferences-enter_220ms_ease-out]">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <KurioticketLogo className="h-8 w-auto max-w-[180px]" />
              <button type="button" aria-label="Close cookie preferences" onClick={onClose}
                className="focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200">
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <h2 id="cookie-preferences-title" ref={headingRef} tabIndex={-1}
                className="text-2xl font-semibold tracking-tight text-navy outline-none">Cookie preferences</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Your privacy. Your choice.</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">Choose how we use cookies and similar technologies across Kurioticket. You can update your preferences at any time.</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <Link href="/legal/cookie-policy" onClick={onClose} className="focus-ring rounded-sm font-medium text-[#004BB8] hover:underline">Cookie Policy</Link>
                <Link href="/legal/privacy-policy" onClick={onClose} className="focus-ring rounded-sm font-medium text-[#004BB8] hover:underline">Privacy Policy</Link>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">{actions}</div>
              <h3 className="mt-6 mb-3 text-sm font-semibold text-navy">Manage consent preferences</h3>
              <div className="space-y-2">
                <Category id="cookie-essential-description" name="Essential cookies" subtitle="Security and core functionality"
                  description="Required for secure sign-in, requested travel searches, necessary session continuity and operational search and provider handoff records. These do not enable optional behavioural analytics. Retained records follow our data-retention policy." />
                <Category id="cookie-analytics-description" name="Analytics cookies" subtitle="Usage and experience insights"
                  description="With your permission, we measure visitor engagement, browsing patterns and feature usage across visits to improve Kurioticket. Turning analytics off does not prevent necessary searches or operational records."
                  analytics checked={draftAnalytics} disabled={busy} onChange={onDraftChange} />
              </div>
              {busy || failed ? <div className="mt-4">{status}</div> : null}
            </div>
            <footer className="shrink-0 border-t border-slate-100 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
              <Button type="button" disabled={busy} className={`w-full ${actionClass}`}
                onClick={() => onChoose(draftAnalytics ? "granted" : "declined")}>Save my preferences</Button>
              <p className="mt-2 text-center text-xs leading-5 text-slate-500">You can change your preferences at any time.</p>
            </footer>
          </section>
        </div>
      ) : null}
    </dialog>
  );
}
