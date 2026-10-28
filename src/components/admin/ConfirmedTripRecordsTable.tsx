import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { AdminConfirmedTripRow } from "@/services/adminConfirmedTripsDirectoryService";

type Props = { rows: AdminConfirmedTripRow[] };

const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function TripDate({ value }: { value: string }) {
  return <time dateTime={value} className="block text-xs leading-5 text-slate-800">{dateTime.format(new Date(value))}</time>;
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

/** Read-only records passed from the authorized directory. No mock trips or mutations. */
export function ConfirmedTripRecordsTable({ rows }: Props) {
  return (
    <div className="min-w-0">
      <div role="region" aria-label="Matching confirmed trip records" tabIndex={0}
        className="max-w-full overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <table className="w-full min-w-[920px] table-fixed text-left text-xs">
          <caption className="sr-only">Provider-confirmed My Trip records. Each row links to the existing read-only details page.</caption>
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[21%]" />
            <col className="w-[21%]" />
            <col className="w-[19%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-slate-50 text-[11px] text-slate-600">
            <tr>
              {["Customer", "Trip", "Provider / reference", "Travel / confirmation", "Status", "Details"].map(heading => (
                <th key={heading} scope="col" className="px-3 py-2.5 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(trip => (
              <tr key={trip.id} className="align-top hover:bg-slate-50/70">
                <td className="min-w-0 px-3 py-3">
                  <p className="break-all text-xs font-medium leading-5 text-slate-900">{trip.userEmail || "Email unavailable"}</p>
                  <p className="mt-0.5 break-all text-[11px] leading-4 text-slate-500">{trip.userId}</p>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <p className="text-[11px] font-semibold leading-4 text-indigo-700">{trip.tripType}</p>
                  <p className="mt-0.5 break-words text-xs leading-5 text-slate-800">{trip.origin ? trip.origin + " → " + trip.destination : trip.destination}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{trip.travelerCount} traveler{trip.travelerCount === 1 ? "" : "s"}</p>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <p className="break-words text-xs font-medium leading-5 text-slate-900">{trip.providerName}</p>
                  <p className="mt-0.5 break-all text-[11px] leading-4 text-slate-600">{trip.providerConfirmationCode}</p>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <p className="text-[11px] leading-4 text-slate-500">Departure</p>
                  <TripDate value={trip.departureDate} />
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">Confirmed</p>
                  <TripDate value={trip.confirmedAt} />
                </td>
                <td className="px-3 py-3">
                  <Status value={trip.status} needsReview={trip.needsStatusReview} />
                </td>
                <td className="px-3 py-3">
                  <Link href={"/admin/confirmed-trips/records/" + encodeURIComponent(trip.id)}
                    aria-label={"View details for confirmation " + trip.providerConfirmationCode}
                    className="inline-flex min-h-8 items-center gap-1 rounded-md text-xs font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                    View details <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-slate-600">Latest stored provider statuses. Scroll the table horizontally on narrower screens.</p>
    </div>
  );
}
