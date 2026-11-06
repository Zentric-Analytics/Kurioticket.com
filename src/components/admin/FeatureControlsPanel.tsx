"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeatureControlEnvironment, FeatureControlKey } from "@/lib/feature-controls/registry";

type Control = {
  key: FeatureControlKey;
  name: string;
  description: string;
  category: string;
  risk: string;
  kind: string;
  state: { enabled: boolean; updatedAt: string | null };
};


const controlRowSummaries: Record<FeatureControlKey, string> = {
  FLIGHT_SEARCH_ENABLED: "Allow flight searches.",
  HOTEL_SEARCH_ENABLED: "Allow hotel searches.",
  CAR_SEARCH_ENABLED: "Allow car searches.",
  DEALS_ENABLED: "Show or hide Packages.",
  PRICE_ALERTS_ENABLED: "Allow new and reactivated price alerts.",
  PRICE_ALERT_PROCESSING_ENABLED: "Run automatic price checks and send alerts.",
};

const controlChangeDescriptions: Record<FeatureControlKey, { enable: string; disable: string }> = {
  FLIGHT_SEARCH_ENABLED: {
    enable: "Visitors will be able to search for flights again.",
    disable: "Flight searches will be unavailable to visitors. Existing saved travel data will not be affected.",
  },
  HOTEL_SEARCH_ENABLED: {
    enable: "Visitors will be able to search for hotels again.",
    disable: "Hotel searches will be unavailable. Flight and car searches will not be affected.",
  },
  CAR_SEARCH_ENABLED: {
    enable: "Visitors will be able to search for cars again.",
    disable: "Car searches will be unavailable. Flight and hotel searches will not be affected.",
  },
  DEALS_ENABLED: {
    enable: "Packages will become available again. Flight, hotel and car searches keep their own controls.",
    disable: "Packages will be hidden. Flight, hotel and car searches keep their own controls.",
  },
  PRICE_ALERTS_ENABLED: {
    enable: "Visitors will be able to create and reactivate price alerts again.",
    disable: "New price alerts and reactivations will pause. Existing alerts and history will remain available.",
  },
  PRICE_ALERT_PROCESSING_ENABLED: {
    enable: "Automatic price checks, alert events and notification emails will resume.",
    disable: "Automatic price checks, alert events and notification emails will pause. Saved alerts will be preserved.",
  },
};

export function FeatureControlsPanel({
  initialControls,
  environment,
  canControlProduction,
  operationsAvailable = true,
  hideCategoryHeading = false,
}: {
  initialControls: Control[];
  environment: FeatureControlEnvironment;
  canControlProduction: boolean;
  operationsAvailable?: boolean;
  hideCategoryHeading?: boolean;
}) {
  const [controls, setControls] = useState(initialControls);
  const [pending, setPending] = useState<{ control: Control; enabled: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [showOptionalNote, setShowOptionalNote] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const isProduction = environment === "PRODUCTION";
  const categories = Array.from(new Set(controls.map((control) => control.category)));
  const categoryLabels: Record<string, string> = {
    "Travel Search": "Product availability",
    "Travel Automation": "Travel automation",
  };
  const categoryDescriptions: Record<string, string> = {
    "Travel Search": "Manage travel search and Packages.",
    "Travel Automation": "Manage price alerts and automatic checks.",
  };

  useEffect(() => {
    setControls(initialControls);
  }, [initialControls]);

  function closePending() {
    if (saving) return;
    setPending(null);
    setError("");
    setReason("");
    setShowOptionalNote(false);
  }

  useEffect(() => {
    if (!pending) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-dialog-cancel]")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        setPending(null);
        setError("");
        setReason("");
        setShowOptionalNote(false);
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), textarea:not([disabled])",
      ) ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, saving]);

  async function submit() {
    if (!pending || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/feature-controls", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: pending.control.key,
          enabled: pending.enabled,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || "The control could not be changed.");
        return;
      }
      setControls((current) =>
        current.map((control) =>
          control.key === pending.control.key
            ? {
                ...control,
                state: {
                  enabled: body.enabled,
                  updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : control.state.updatedAt,
                },
              }
            : control,
        ),
      );
      setPending(null);
      setReason("");
      setShowOptionalNote(false);
      router.refresh();
    } catch {
      setError("The control could not be changed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {!operationsAvailable ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] font-medium leading-5 text-amber-800">
          Feature controls are in read-only fallback mode. Registry defaults are shown and changes are disabled.
        </p>
      ) : environment === "PRODUCTION" && !canControlProduction ? (
        <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-medium leading-5 text-slate-700">
          Production controls are view only for your account.
        </p>
      ) : null}

      {categories.map((category) => (
        <section
          key={category}
          aria-label={hideCategoryHeading ? (categoryLabels[category] || category) : undefined}
          aria-labelledby={hideCategoryHeading ? undefined : "settings-" + category.toLowerCase().replaceAll(" ", "-")}
        >
          {!hideCategoryHeading ? (
            <>
              <h3 id={"settings-" + category.toLowerCase().replaceAll(" ", "-")} className="text-[14px] font-semibold text-[#020617]">
                {categoryLabels[category] || category}
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                {categoryDescriptions[category] || "Persisted administrative controls."}
              </p>
            </>
          ) : null}

          <div className={(hideCategoryHeading ? "" : "mt-2 border-t border-[#D8E1EC] ") + "divide-y divide-[#E7ECF5] border-b border-[#D8E1EC]"}>
            {controls
              .filter((control) => control.category === category)
              .map((control) => {
                const permitted = operationsAvailable && (environment === "STAGING" || canControlProduction);
                return (
                  <article
                    key={control.key}
                    className="flex min-w-0 flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
                  >
                    <div className="min-w-0 sm:max-w-[72%]">
                      <h4 className="text-[13px] font-semibold text-[#020617]">{control.name}</h4>
                      <p className="mt-1 text-[12px] leading-5 text-[#64748B]">{controlRowSummaries[control.key]}</p>
                     </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 sm:min-w-[128px] sm:justify-end">
                      <span className={"text-[12px] font-medium " + (control.state.enabled ? "text-emerald-700" : "text-[#64748B]")}>
                        {control.state.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={control.state.enabled}
                        aria-label={(control.state.enabled ? "Disable " : "Enable ") + control.name}
                        disabled={!permitted}
                        onClick={(event) => {
                          triggerRef.current = event.currentTarget;
                          setPending({ control, enabled: !control.state.enabled });
                        }}
                        className={
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 " +
                          (control.state.enabled ? "bg-emerald-600" : "bg-slate-300") +
                          " disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        <span
                          aria-hidden="true"
                          className={
                            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform " +
                            (control.state.enabled ? "translate-x-6" : "translate-x-1")
                          }
                        />
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}

      {pending ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feature-control-dialog-title"
          aria-describedby="feature-control-dialog-description"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4"
        >
          <div className="w-full max-w-[440px] rounded-xl bg-white p-5 shadow-xl sm:p-6">
            <h3 id="feature-control-dialog-title" className="text-[18px] font-semibold leading-6 tracking-[-0.01em] text-[#020617]">
              {pending.enabled ? "Enable" : "Disable"} {pending.control.name}?
            </h3>
            <p id="feature-control-dialog-description" className="mt-2 text-[13px] leading-5 text-[#475569]">
              {controlChangeDescriptions[pending.control.key][pending.enabled ? "enable" : "disable"]}
            </p>

            {isProduction ? (
              <div className="mt-4 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-900">
                This change affects the live website. A reason is required to continue.
              </div>
            ) : null}

            {isProduction ? (
              <label htmlFor="feature-control-reason" className="mt-4 block text-[13px] font-medium text-[#334155]">
                Reason for change (required)
                <textarea
                  id="feature-control-reason"
                  maxLength={500}
                  required
                  disabled={saving}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 block min-h-20 w-full resize-y rounded-md border border-[#CBD5E1] bg-white p-2.5 text-[13px] font-normal leading-5 text-[#020617] outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20"
                />
              </label>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  aria-expanded={showOptionalNote}
                  aria-controls="feature-control-optional-note"
                  disabled={saving}
                  onClick={() => {
                    if (showOptionalNote) setReason("");
                    setShowOptionalNote(!showOptionalNote);
                  }}
                  className="inline-flex min-h-8 items-center gap-1.5 text-[12px] font-medium text-[#475569] hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
                >
                  <span aria-hidden="true">{showOptionalNote ? "−" : "+"}</span>
                  Add a note (optional)
                </button>
                <div id="feature-control-optional-note" hidden={!showOptionalNote}>
                  <label htmlFor="feature-control-note-input" className="mt-1 block text-[12px] text-[#64748B]">
                    Note
                    <textarea
                      id="feature-control-note-input"
                      maxLength={500}
                      disabled={saving || !showOptionalNote}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className="mt-1.5 block min-h-20 w-full resize-y rounded-md border border-[#CBD5E1] bg-white p-2.5 text-[13px] font-normal leading-5 text-[#020617] outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20"
                    />
                  </label>
                </div>
              </div>
            )}

            {error ? <p role="alert" className="mt-3 text-[12px] font-medium text-rose-700">{error}</p> : null}
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[#E7ECF5] pt-4">
              <button
                type="button"
                data-dialog-cancel
                disabled={saving}
                onClick={closePending}
                className="inline-flex min-h-9 items-center rounded-md px-3 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                aria-busy={saving}
                disabled={saving || (environment === "PRODUCTION" && !reason.trim())}
                onClick={submit}
                className="inline-flex min-h-9 items-center justify-center rounded-md bg-[#004BB8] px-3 text-[13px] font-semibold text-white hover:bg-[#003B91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : (pending.enabled ? "Enable " : "Disable ") + pending.control.name}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
