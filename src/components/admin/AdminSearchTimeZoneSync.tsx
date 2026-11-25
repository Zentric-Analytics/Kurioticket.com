"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setAdminReportingTimeZone } from "@/app/admin/reportingTimeZoneActions";
import { resolveAdminTimeZone } from "@/lib/adminLocalTime";
import { detectAdminDeviceTimeZone, type AdminReportingTimeZonePreference } from "@/lib/adminReportingTimeZonePreference";

type ReportingTimeZoneContextValue = {
  preference: AdminReportingTimeZonePreference;
  isSaving: boolean;
  error: string | null;
  selectTimeZone: (value: string) => void;
};

const ReportingTimeZoneContext = createContext<ReportingTimeZoneContextValue | null>(null);
const changeChannelName = "kurioticket-admin-reporting-time-zone";
const automaticOption = "automatic";

export function AdminReportingTimeZoneProvider({ preference, children }: {
  preference: AdminReportingTimeZonePreference;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { mode, timeZone } = preference;
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const synchronized = useRef<{ device: string; committed: string } | null>(null);
  const synchronizationPending = useRef(false);
  const selectionPending = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel !== "function") return;
    const updates = new BroadcastChannel(changeChannelName);
    updates.addEventListener("message", () => router.refresh());
    channel.current = updates;
    return () => {
      channel.current = null;
      updates.close();
    };
  }, [router]);

  const saveTimeZone = useCallback(async (next: AdminReportingTimeZonePreference, intent: "select" | "synchronize") => {
    const result = await setAdminReportingTimeZone(next, intent);
    if (result.ok) {
      if (result.changed) channel.current?.postMessage(null);
      // A newer cookie may already exist when another Admin tab made the change.
      else if (result.preference.mode !== mode || result.preference.timeZone !== timeZone) router.refresh();
    }
    return result;
  }, [mode, router, timeZone]);

  const synchronize = useCallback(async () => {
    if (mode !== "automatic" || synchronizationPending.current || selectionPending.current) return;
    const detected = detectAdminDeviceTimeZone();
    if (detected === resolveAdminTimeZone(timeZone)
      || (synchronized.current?.device === detected && synchronized.current.committed === timeZone)) return;

    synchronizationPending.current = true;
    try {
      const result = await saveTimeZone({ mode: "automatic", timeZone: detected }, "synchronize");
      if (result.ok) synchronized.current = { device: detected, committed: result.preference.timeZone };
    } catch {
      // The next visible check can retry a failed background update.
    } finally {
      synchronizationPending.current = false;
    }
  }, [mode, saveTimeZone, timeZone]);

  useEffect(() => {
    const checkVisible = () => {
      if (document.visibilityState === "visible") void synchronize();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) router.refresh();
      checkVisible();
    };
    checkVisible();
    const timer = window.setInterval(checkVisible, 60_000);
    window.addEventListener("focus", checkVisible);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", checkVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkVisible);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", checkVisible);
    };
  }, [pathname, router, synchronize]);

  function selectTimeZone(value: string) {
    if (selectionPending.current) return;
    const next: AdminReportingTimeZonePreference = value === automaticOption
      ? { mode: "automatic", timeZone: detectAdminDeviceTimeZone() }
      : { mode: "manual", timeZone: value };

    synchronized.current = null;
    selectionPending.current = true;
    setError(null);
    startSaving(async () => {
      try {
        const result = await saveTimeZone(next, "select");
        if (!result.ok) setError("Choose a valid reporting time zone.");
      } catch {
        setError("Unable to update the reporting time zone. Please try again.");
      } finally {
        selectionPending.current = false;
      }
    });
  }

  return (
    <ReportingTimeZoneContext.Provider value={{ preference, isSaving, error, selectTimeZone }}>
      {children}
    </ReportingTimeZoneContext.Provider>
  );
}

export function AdminReportingTimeZoneControl() {
  const settings = useContext(ReportingTimeZoneContext);
  const id = useId();
  const activeZone = settings?.preference.timeZone ?? "UTC";
  const timeZones = useMemo(() => {
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return [...new Set(["UTC", "Africa/Lagos", "Europe/London", "America/New_York", "Asia/Dubai", activeZone, ...supported])].sort();
  }, [activeZone]);
  if (!settings) return null;

  const selected = settings.preference.mode === "automatic" ? automaticOption : activeZone;
  return (
    <form className="mt-1.5 space-y-1.5 border-t border-slate-200 p-1.5 pt-2"
      aria-busy={settings.isSaving || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        const zone = new FormData(event.currentTarget).get("timeZone");
        if (typeof zone === "string") settings.selectTimeZone(zone);
      }}>
      <label htmlFor={id} className="block text-[11px] font-semibold leading-4 text-slate-700">Reporting time zone</label>
      <select
        key={selected}
        id={id}
        name="timeZone"
        defaultValue={selected}
        disabled={settings.isSaving}
        className="focus-ring h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-800"
      >
        <option value={automaticOption}>Use device time zone</option>
        {timeZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
      </select>
      <button type="submit" disabled={settings.isSaving}
        className="focus-ring h-7 rounded-md bg-indigo-50 px-2 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
        {settings.isSaving ? "Applying…" : "Apply time zone"}
      </button>
      <span role="status" className="sr-only">Current reporting time zone {activeZone}</span>
      {settings.error ? <p role="alert" className="text-[11px] leading-4 text-rose-800">{settings.error}</p> : null}
    </form>
  );
}
