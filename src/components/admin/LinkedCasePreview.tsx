"use client";

import { ChevronDown } from "lucide-react";
import React, { useEffect, useId, useState } from "react";

import type { LinkedCaseOrigin, LinkedCasePreviewResult } from "@/services/adminLinkedCasePreviewCore";

type Props = { origin: LinkedCaseOrigin; sourceId: string };

const deletionStatus: Record<string, string> = {
  PENDING: "Pending",
  READY_FOR_REVIEW: "Ready for review",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};
const supportStatus: Record<string, string> = {
  OPEN: "Open",
  WAITING_ON_USER: "Awaiting customer",
  WAITING_ON_TEAM: "Awaiting team",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date) + " UTC";
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-[#64748B]">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-[13px] font-medium leading-5 text-[#0F172A]">{value}</dd>
    </div>
  );
}

/** Minimal, on-demand case context. Never loads a full Support conversation or
 * exposes account deletion management actions through a cross-workspace preview. */
export function LinkedCasePreview({ origin, sourceId }: Props) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkedCasePreviewResult | null>(null);

  const readScope = JSON.stringify([expanded, origin, sourceId]);
  const [previousReadScope, setPreviousReadScope] = useState(readScope);
  if (previousReadScope !== readScope) {
    setPreviousReadScope(readScope);
    setLoading(expanded);
    setResult(null);
  }

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    let active = true;

    void (async () => {
      try {
        const response = await fetch(
          "/api/admin/linked-cases/" + encodeURIComponent(origin) + "/" + encodeURIComponent(sourceId),
          { method: "GET", credentials: "include", cache: "no-store", signal: controller.signal },
        );
        const body = await response.json() as LinkedCasePreviewResult;
        if (!active) return;
        if (!body || !["ok", "invalid", "forbidden", "not_found", "unavailable"].includes(body.status)) {
          throw new Error("Invalid linked case response");
        }
        setResult(body);
      } catch {
        if (active && !controller.signal.aborted) setResult({ status: "unavailable" });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; controller.abort(); };
  }, [expanded, origin, sourceId]);

  const title = origin === "support" ? "deletion request" : "Support ticket";
  const preview = !loading && result?.status === "ok" ? result.data : null;
  const failure = result?.status === "forbidden"
    ? "You do not have permission to view this related case."
    : result?.status === "unavailable"
      ? "The related case is temporarily unavailable. No case status has been inferred."
      : "The linked case could not be verified. No unrelated record is shown.";

  return (
    <div className="mt-3 min-w-0">
      <button type="button" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => { setExpanded(previous => !previous); setResult(null); }}
        className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-left text-[12px] font-semibold text-[#004BB8] transition-colors hover:border-[#B8C9DF] hover:bg-[#F5F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
        {expanded ? "Hide " + title : "View " + title}
        <ChevronDown size={14} aria-hidden="true" className={"shrink-0 transition-transform " + (expanded ? "rotate-180" : "")} />
      </button>
      <div id={panelId} hidden={!expanded}>
        {expanded ? (
          <section role="region" aria-label={"Linked " + title + " summary"} aria-busy={loading}
            className="mt-3 min-w-0 rounded-xl border border-[#D8E1EC] bg-[#FAFBFD] p-4 sm:p-5">
            <div className="border-b border-[#E7ECF5] pb-3">
              <h4 className="text-[14px] font-semibold text-[#0F172A]">Related {title}</h4>
              <p className="mt-1 text-[11px] leading-4 text-[#64748B]">
                Read-only summary of the verified linked case
              </p>
            </div>
            {loading || !result ? (
              <p role="status" className="py-4 text-[12px] text-[#64748B]">Loading related case…</p>
            ) : !preview ? (
              <p role="alert" className="py-4 text-[12px] text-[#9A3412]">{failure}</p>
            ) : preview.kind === "deletion" && origin === "support" ? (
              <>
                <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 py-4 sm:grid-cols-2">
                  <Field label="Deletion status" value={deletionStatus[preview.status] ?? preview.status} />
                  <Field label="Requested" value={dateLabel(preview.requestedAt)} />
                  <Field label="Scheduled review" value={dateLabel(preview.deletionScheduledAt)} />
                  {preview.cancelledAt ? <Field label="Cancelled" value={dateLabel(preview.cancelledAt)} /> : null}
                  {preview.completedAt ? <Field label="Completed" value={dateLabel(preview.completedAt)} /> : null}
                </dl>
                <p className="border-t border-[#E7ECF5] pt-2 text-[11px] leading-4 text-[#64748B]">
                  Deletion status is independent of ticket status. Management and finalization controls are not available here.
                </p>
              </>
            ) : preview.kind === "support" && origin === "deletion" ? (
              <>
                <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 py-4">
                  <Field label="Ticket subject" value={preview.subject || "Unavailable"} />
                  <Field label="Ticket status" value={supportStatus[preview.status] ?? preview.status} />
                  <Field label="Priority" value={preview.priority.toLowerCase()} />
                  <Field label="Messages" value={preview.messageCount.toLocaleString()} />
                  <Field label="Last updated" value={dateLabel(preview.updatedAt)} />
                </dl>
                <p className="border-t border-[#E7ECF5] pt-2 text-[11px] leading-4 text-[#64748B]">
                  The ticket conversation and Support reply controls remain in Support.
                </p>
              </>
            ) : (
              <p role="alert" className="py-4 text-[12px] text-[#9A3412]">Related case type could not be verified.</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
