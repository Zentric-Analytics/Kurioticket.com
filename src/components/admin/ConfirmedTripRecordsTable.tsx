import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { AdminConfirmedTripRow } from "@/services/adminConfirmedTripsDirectoryService";

type Props = { rows: AdminConfirmedTripRow[] };

const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function TripDate({ value }: { value: string }) {
  return <time dateTime={value} className="block text-xs leading-5 text-slate-800">{dateOnly.format(new Date(value))}</time>;
}

function Status({ value, needsReview }: { value: string; needsReview: boolean }) {
  const tone = value === "UPCOMING"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : value === "CANCELLED"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-100 text-slate-700";
  const label = value === "UPCOMING" ? "Upcoming" : value === "PAST" ? "Past" : value === "CANCELLED" ? "Cancelled" : value;
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span title="Latest stored provider status" className={"rounded-full border px-2 py-1 text-[11px] font-semibold leading-4 " + tone}>
        {label}
      </span>
      {needsReview ? (
        <span className="text-[11px] font-medium leading-4 text-amber-800">Review status freshness</span>
      ) : null}
    </div>
  );
}

/** Read-only list of provider-confirmed trip records. Empty states retain the table structure. */
export function ConfirmedTripRecordsTable({ rows }: Props) {
  return (
    <div className="min-w-0">
      <div role="region" aria-label="Matching confirmed trip records" tabIndex={0}
        className="max-w-full overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <table className="w-full min-w-[1080px] table-fixed text-left text-xs">
          <caption className="sr-only">Provider-confirmed trip records. Each row links to the existing read-only details page.</caption>
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[8%]" />
            <col className="w-[19%]" />
            <col className="w-[15%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[7%]" />
          </colgroup>
          <thead className="bg-slate-50 text-[11px] text-slate-600">
            <tr>
              {["Created", "Type", "Trip", "Travel dates", "Provider", "Identity", "Status", "Action"].map(heading => (
                <th key={heading} scope="col" className="px-3 py-2.5 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? rows.map(trip => (
              <tr key={trip.id} className="align-top hover:bg-slate-50/70">
                <td className="px-3 py-3">
                  <time dateTime={trip.createdAt} className="block text-xs font-medium leading-5 text-slate-900">{dateTime.format(new Date(trip.createdAt))}</time>
                </td>
                <td className="px-3 py-3">
                  <span className="text-[11px] font-semibold leading-4 text-indigo-700">{trip.tripType}</span>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <p className="break-words text-xs font-medium leading-5 text-slate-900">{trip.origin ? trip.origin + " → " + trip.destination : trip.destination}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{trip.travelerCount} traveler{trip.travelerCount === 1 ? "" : "s"}</p>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <TripDate value={trip.departureDate} />
                  {trip.returnDate ? <><span className="text-[11px] leading-4 text-slate-400">to</span><TripDate value={trip.returnDate} /></> : null}
                </td>
                <td className="min-w-0 px-3 py-3">
                  <p className="break-words text-xs font-medium leading-5 text-slate-900">{trip.providerName}</p>
                  <p className="mt-0.5 break-all text-[11px] leading-4 text-slate-500">{trip.providerConfirmationCode}</p>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <p className="text-[11px] font-semibold leading-4 text-slate-700">Registered</p>
                  <p className="mt-0.5 break-all text-xs leading-5 text-slate-900">{trip.userEmail || "Email unavailable"}</p>
                  <p className="mt-0.5 break-all text-[11px] leading-4 text-slate-500">{trip.userId}</p>
                </td>
                <td className="px-3 py-3">
                  <Status value={trip.status} needsReview={trip.needsStatusReview} />
                </td>
                <td className="px-3 py-3">
                  <Link href={"/admin/confirmed-trips/records/" + encodeURIComponent(trip.id)}
                    aria-label={"View details for confirmation " + trip.providerConfirmationCode}
                    className="inline-flex min-h-8 items-center gap-1 rounded-md text-xs font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                    View <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-600">No trips match the selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-slate-600">Latest stored provider-confirmed trips. Scroll the list horizontally on narrower screens.</p>
    </div>
  );
}
