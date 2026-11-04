"use client";

import { useEffect, useState } from "react";
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

function formatChangedDate(value: string | null) {
  if (!value) return "Registry default";
  return "Changed " + new Date(value).toLocaleDateString();
}

export function FeatureControlsPanel({
  initialControls,
  environment,
  canControlProduction,
  operationsAvailable = true,
}: {
  initialControls: Control[];
  environment: FeatureControlEnvironment;
  canControlProduction: boolean;
  operationsAvailable?: boolean;
}) {
  const [controls, setControls] = useState(initialControls);
  const [pending, setPending] = useState<{ control: Control; enabled: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const categories = Array.from(new Set(controls.map((control) => control.category)));

  useEffect(() => {
    setControls(initialControls);
  }, [initialControls]);

  function closePending() {
    if (saving) return;
    setPending(null);
    setError("");
    setReason("");
  }

  useEffect(() => {
    if (!pending) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        setPending(null);
        setError("");
        setReason("");
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
      router.refresh();
    } catch {
      setError("The control could not be changed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
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
        <section key={category} aria-labelledby={"settings-" + category.toLowerCase().replaceAll(" ", "-")}>
          <div className="flex items-center justify-between gap-3">
            <h3 id={"settings-" + category.toLowerCase().replaceAll(" ", "-")} className="text-sm font-semibold text-slate-950">
              {category}
            </h3>
            <span className="text-[11px] font-medium text-slate-500">
              {controls.filter((control) => control.category === category).length} controls
            </span>
          </div>

          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {controls
              .filter((control) => control.category === category)
              .map((control, index, group) => {
                const permitted = operationsAvailable && (environment === "STAGING" || canControlProduction);
                return (
                  <article
                    key={control.key}
                    className={"flex min-w-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 " + (index < group.length - 1 ? "border-b border-slate-100" : "")}
                  >
                    <div className="min-w-0 sm:max-w-[70%]">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h4 className="text-[13px] font-semibold text-slate-950">{control.name}</h4>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                          {control.risk} risk · {control.kind}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-slate-600">{control.description}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{environment}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{formatChangedDate(control.state.updatedAt)}</p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={control.state.enabled}
                        aria-label={(control.state.enabled ? "Disable " : "Enable ") + control.name}
                        disabled={!permitted}
                        onClick={() => setPending({ control, enabled: !control.state.enabled })}
                        className={
                          "inline-flex h-8 min-w-20 items-center justify-center rounded-full px-3 text-[12px] font-semibold transition-colors " +
                          (control.state.enabled
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300") +
                          " disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        {control.state.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}

      {pending ? (
        <div role="dialog" aria-modal="true" aria-labelledby="feature-control-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h3 id="feature-control-dialog-title" className="text-lg font-semibold text-slate-950">
              {pending.enabled ? "Enable" : "Disable"} {pending.control.name}?
            </h3>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
              <span>{environment}</span>
              <span>·</span>
              <span>{pending.control.risk} risk</span>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-slate-600">{pending.control.description}</p>
            <label className="mt-4 block text-[13px] font-semibold text-slate-800">
              Reason {environment === "PRODUCTION" ? "(required)" : "(optional)"}
              <textarea
                maxLength={500}
                disabled={saving}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-[13px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            {error ? <p role="alert" className="mt-2 text-[13px] font-medium text-red-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={closePending}
                className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                aria-busy={saving}
                disabled={saving || (environment === "PRODUCTION" && !reason.trim())}
                onClick={submit}
                className="inline-flex h-9 items-center rounded-lg bg-indigo-700 px-3 text-[13px] font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
