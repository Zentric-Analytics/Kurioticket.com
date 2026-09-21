"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getProviders } from "next-auth/react";
import { X } from "lucide-react";
import { SigninForm } from "@/components/auth/SigninForm";
import { useLocale } from "@/components/layout/LocaleProvider";
import { acquireMobileResultsScrollLock } from "@/lib/search/mobileResultsScrollLock";

export function MobileSigninDialog({ callbackUrl, onClose }: { callbackUrl: string; onClose: () => void }) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void getProviders().then((providers) => { if (active) setGoogleEnabled(Boolean(providers?.google)); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const launcher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const release = acquireMobileResultsScrollLock();
    dialogRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); onClose(); return; }
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => { release(); document.removeEventListener("keydown", onKeyDown, true); launcher?.focus({ preventScroll: true }); };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-end bg-slate-950/40 sm:hidden" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t.loginPageTitle} tabIndex={-1} className="relative max-h-[95dvh] min-h-[85dvh] w-full overflow-y-auto overscroll-contain rounded-t-[24px] bg-white px-1 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-14 outline-none">
        <button type="button" aria-label="Close sign in" onClick={onClose} className="focus-ring absolute right-3 top-2 flex h-11 w-11 items-center justify-center rounded-full text-slate-600"><X size={22} /></button>
        <SigninForm embedded callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
      </div>
    </div>, document.body,
  );
}
