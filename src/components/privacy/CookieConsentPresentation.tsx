"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
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
      <div className="flex min-h-[68px] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <button type="button" aria-expanded={expanded} aria-controls={id}
          onClick={() => setExpanded(value => !value)}
          className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 text-start sm:gap-3">
          {expanded ? <Minus className="size-4 shrink-0 text-[#004BB8]" aria-hidden="true" /> : <Plus className="size-4 shrink-0 text-[#004BB8]" aria-hidden="true" />}
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-5 text-navy">{name}</span>
            <span className="mt-0.5 block text-xs leading-4 text-slate-600">{subtitle}</span>
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
  const wasEditingRef = useRef(false);
  const busy = decisionPending && syncState !== "error";
  const failed = decisionPending && syncState === "error";

  // The top-layer dialog is only mounted for modal states. Opening details
  // from the initial banner never closes/reopens the dialog or restarts its backdrop.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!modal || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousGutter = root.style.scrollbarGutter;
    if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
      root.style.scrollbarGutter = previousGutter;
      if (previousFocus?.isConnected && !dialog.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
    };
  }, [modal]);

  useLayoutEffect(() => {
    if (wasEditingRef.current && !editing && showBanner) {
      dialogRef.current?.querySelector<HTMLButtonElement>("[data-cookie-preferences-open]")?.focus({ preventScroll: true });
    } else if (modal) {
      headingRef.current?.focus({ preventScroll: true });
    }
    wasEditingRef.current = editing;
  }, [editing, modal, showBanner]);

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

  const content = (
    <>
      {showBanner ? (
        <section data-cookie-consent-banner aria-hidden={editing || undefined} inert={editing || undefined}
          className="cookie-consent-banner pointer-events-auto absolute inset-x-0 bottom-0 max-h-[100%] overflow-y-auto overscroll-contain rounded-t-[24px] border border-slate-200 bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.14)]">
          <div className="mx-auto max-w-[1200px] px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-7 sm:pb-7">
            <h2 ref={!editing ? headingRef : undefined} tabIndex={-1} id="cookie-banner-title"
              className="text-xl font-semibold tracking-tight text-navy outline-none sm:text-2xl">We value your privacy</h2>
            <p className="mt-3 max-w-[900px] text-sm leading-6 text-slate-600">
              Essential cookies keep Kurioticket secure and support the travel services you request. Optional analytics helps us improve your experience. Choose what you allow.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/legal/cookie-policy" className="focus-ring rounded-sm font-medium text-[#004BB8] hover:underline">Cookie Policy</Link>
              <Link href="/legal/privacy-policy" className="focus-ring rounded-sm font-medium text-[#004BB8] hover:underline">Privacy Policy</Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:flex sm:flex-wrap sm:justify-end sm:gap-3">
              <Button type="button" variant="secondary" data-cookie-preferences-open onClick={onOpen} disabled={busy}
                className="col-span-2 min-h-11 rounded-xl border-slate-300 px-5 font-semibold text-[#004BB8] hover:bg-slate-50">Cookie preferences</Button>
              <Button type="button" disabled={busy} onClick={() => onChoose("declined")} className={actionClass}>Reject optional</Button>
              <Button type="button" disabled={busy} onClick={() => onChoose("granted")} className={actionClass}>Accept all</Button>
            </div>
          </div>
        </section>
      ) : null}
      {editing ? (
        <div className="pointer-events-auto absolute inset-0 flex items-end justify-center sm:items-center sm:p-6">
          {showBanner ? <div aria-hidden="true" className="absolute inset-0 bg-slate-950/25" /> : null}
          <section data-cookie-consent-preferences className="cookie-consent-preferences relative flex max-h-[100%] w-full min-w-0 flex-col overflow-hidden rounded-t-[24px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:max-h-[min(85svh,100%)] sm:max-w-[520px] sm:rounded-[24px]">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-3 sm:px-6">
              <KurioticketLogo className="h-8 w-auto max-w-[180px]" />
              <button type="button" aria-label="Close cookie preferences" onClick={onClose}
                className="focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200">
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <h2 id="cookie-preferences-title" ref={headingRef} tabIndex={-1}
                className="text-xl font-semibold tracking-tight text-navy outline-none sm:text-2xl">Cookie preferences</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Manage how Kurioticket uses cookies and similar technologies. Analytics is optional; leave it off and save to use essential cookies only.</p>
              <Button type="button" disabled={busy} onClick={() => onChoose("granted")} className={`mt-4 w-full ${actionClass}`}>Accept all</Button>
              <h3 className="mt-5 mb-3 text-sm font-semibold text-navy">Cookie categories</h3>
              <div className="space-y-2">
                <Category id="cookie-essential-description" name="Essential cookies" subtitle="Required for core services"
                  description="Supports secure sign-in, requested travel searches and necessary search-to-provider handoff records. These cookies do not enable optional behavioural analytics. Records follow our data-retention policy." />
                <Category id="cookie-analytics-description" name="Analytics cookies" subtitle="Helps improve your experience"
                  description="With your permission, we measure how you browse and use Kurioticket, including activity across visits, to improve our services. Turning analytics off does not stop requested searches or necessary records."
                  analytics checked={draftAnalytics} disabled={busy} onChange={onDraftChange} />
              </div>
              {busy || failed ? <div className="mt-4">{status}</div> : null}
            </div>
            <footer className="shrink-0 border-t border-slate-100 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
              <Button type="button" disabled={busy} className={`w-full ${actionClass}`}
                onClick={() => onChoose(draftAnalytics ? "granted" : "declined")}>Save preferences</Button>
            </footer>
          </section>
        </div>
      ) : null}
      {!editing && !showBanner && decisionPending ? (
        <section aria-label="Cookie preferences status" className="pointer-events-auto absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mx-auto max-w-[420px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          {status}
        </section>
      ) : null}
    </>
  );

  if (!modal) {
    return <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden text-navy">{content}</div>;
  }

  return (
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby={editing ? "cookie-preferences-title" : "cookie-banner-title"}
      onCancel={event => { event.preventDefault(); if (editing) onClose(); }}
      className="cookie-consent-dialog fixed inset-0 z-[80] m-0 h-auto max-h-none w-auto max-w-none overflow-hidden border-0 bg-transparent p-0 text-navy backdrop:bg-slate-950/45">
      {content}
    </dialog>
  );
}
