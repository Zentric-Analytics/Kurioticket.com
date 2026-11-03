"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, ArrowUpRight } from "lucide-react";

import { ConfirmedTripRecordsTable } from "@/components/admin/ConfirmedTripRecordsTable";
import type { AdminConfirmedTripRow } from "@/services/adminConfirmedTripsDirectoryService";

type Props = { rows: AdminConfirmedTripRow[]; subtle?: boolean };

const timestamp = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function statusLabel(status: string) {
  if (status === "UPCOMING") return "Upcoming";
  if (status === "PAST") return "Past";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

/** Presentation-only list/grid switch: both use the same verified server rows. */
export function TripDirectoryView({ rows, subtle = false }: Props) {
  const [view, setView] = useState<"list" | "grid">("list");

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-5 text-slate-600">Latest stored provider trip status · Tracking-health reporting is not connected yet.</p>
        <div role="group" aria-label="Trip directory view" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"}
            className={"inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 " + (view === "list" ? "bg-indigo-700 text-white" : "text-slate-700 hover:bg-white")}>
            <List size={15} aria-hidden="true" /> List
          </button>
          <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"}
            className={"inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 " + (view === "grid" ? "bg-indigo-700 text-white" : "text-slate-700 hover:bg-white")}>
            <LayoutGrid size={15} aria-hidden="true" /> Grid
          </button>
        </div>
      </div>

      {view === "list" ? (
        <ConfirmedTripRecordsTable rows={rows} />
      ) : (
        <div aria-label="Matching confirmed trip cards" className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((trip) => (
            <article key={trip.id} className={"flex min-w-0 flex-col rounded-xl border p-4 " + (subtle ? "border-slate-200/80 bg-white" : "border-slate-200 bg-white")}>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">{trip.tripType}</span>
                  <h3 className="mt-1 break-words text-sm font-semibold text-slate-950">{trip.origin ? trip.origin + " → " + trip.destination : trip.destination}</h3>
                </div>
                <span className={"shrink-0 rounded-full px-2 py-1 text-xs font-semibold " + (trip.status === "CANCELLED" ? "bg-amber-50 text-amber-800" : trip.status === "UPCOMING" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700")}>
                  {statusLabel(trip.status)}
                </span>
              </div>
              <dl className="mt-3 grid min-w-0 gap-2 border-t border-slate-100 pt-3 text-xs">
                <div className="min-w-0"><dt className="text-slate-500">Customer</dt><dd className="mt-0.5 break-all font-medium text-slate-800">{trip.userEmail || "Email unavailable"}</dd></div>
                <div className="min-w-0"><dt className="text-slate-500">Provider</dt><dd className="mt-0.5 break-words font-medium text-slate-800">{trip.providerName}</dd></div>
                <div className="min-w-0"><dt className="text-slate-500">Confirmation reference</dt><dd className="mt-0.5 break-all font-medium text-slate-800">{trip.providerConfirmationCode}</dd></div>
                <div className="min-w-0"><dt className="text-slate-500">Latest confirmation (UTC)</dt><dd className="mt-0.5 font-medium text-slate-800"><time dateTime={trip.confirmedAt}>{timestamp.format(new Date(trip.confirmedAt))}</time></dd></div>
              </dl>
              {trip.needsStatusReview ? <p className="mt-3 text-xs font-medium text-amber-800">Review status freshness</p> : null}
              <Link href={"/admin/confirmed-trips/records/" + encodeURIComponent(trip.id)}
                className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                View details <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
