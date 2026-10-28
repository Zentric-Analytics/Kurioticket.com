import Link from "next/link";
import { ArrowUpRight, FileCheck2 } from "lucide-react";

import { tripNeedsStatusReview } from "@/lib/adminConfirmedTripsDirectory";
import type { ConfirmedTripsOperationsSnapshot } from "@/services/adminConfirmedTripsOperationsService";

type RecentTrip = ConfirmedTripsOperationsSnapshot["recentTrips"][number];
type Props = { trips: RecentTrip[]; now?: Date };

const tripDateTimeFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function StatusBadge({ status }: { status: string }) {
  const label = status === "UPCOMING" ? "Upcoming" : status === "PAST" ? "Past" : status === "CANCELLED" ? "Cancelled" : status;
  const tone = status === "UPCOMING"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "CANCELLED"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-100 text-slate-700";
  return <span title="Latest stored provider status" className={"inline-flex max-w-full items-center rounded-full border px-2 py-1 text-[11px] font-semibold leading-4 " + tone}>{label}</span>;
}

function TripTimestamp({ value }: { value: string }) {
  return <time dateTime={value} className="block break-words text-xs leading-5 text-slate-800">{tripDateTimeFormat.format(new Date(value))}</time>;
}

/** Pure read-only view. The route loads verified data; fixtures are only supplied by unit tests. */
export function RecentConfirmedTripTable({ trips, now = new Date() }: Props) {
  if (trips.length === 0) {
    return (
      <div role="status" className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
        <FileCheck2 size={24} className="text-slate-400" aria-hidden="true" />
        <h3 className="mt-2 text-sm font-semibold text-slate-950">No provider-confirmed trips yet</h3>
        <p className="mt-1 max-w-lg text-xs leading-5 text-slate-600">
          No accepted signed partner callback has created a confirmed My Trip in this database.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div role="region" aria-label="Recent confirmed trips table" tabIndex={0}
        className="max-w-full overflow-x-auto rounded-xl border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <table className="w-full min-w-[880px] table-fixed text-left text-xs">
          <caption className="sr-only">Recent trusted provider-confirmed trips. Each row links to the existing read-only trip details page.</caption>
          <colgroup>
            <col className="w-[19%]" />
            <col className="w-[23%]" />
            <col className="w-[19%]" />
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              {["Customer", "Trip", "Provider / reference", "Travel / confirmation", "Status", "Details"].map((heading) => (
                <th key={heading} scope="col" className="px-3 py-2.5 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map((trip) => (
              <tr key={trip.id} className="align-top transition-colors hover:bg-slate-50/70">
                <td className="min-w-0 px-3 py-3">
                  <p className="break-all text-xs font-semibold leading-5 text-slate-900">{trip.userEmail || "Email unavailable"}</p>
                  <p className="mt-0.5 break-all text-[11px] leading-4 text-slate-500">{trip.userId}</p>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <span className="text-[11px] font-semibold text-indigo-700">{trip.tripType}</span>
                  <p className="mt-0.5 break-words text-xs font-medium leading-5 text-slate-800">
                    {trip.origin ? trip.origin + " → " + trip.destination : trip.destination}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{trip.travelerCount} traveler{trip.travelerCount === 1 ? "" : "s"}</p>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <p className="break-words text-xs font-medium leading-5 text-slate-800">{trip.providerName}</p>
                  <p className="mt-0.5 break-all text-[11px] leading-4 text-slate-500">{trip.providerConfirmationCode}</p>
                </td>
                <td className="min-w-0 px-3 py-3">
                  <p className="text-[11px] leading-4 text-slate-500">Departure</p>
                  <TripTimestamp value={trip.departureDate} />
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">Confirmed</p>
                  <TripTimestamp value={trip.confirmedAt} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={trip.status} />
                  {tripNeedsStatusReview(trip, now) ? (
                    <p className="mt-1.5 text-[11px] font-medium leading-4 text-amber-800">Review status freshness</p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <Link href={"/admin/confirmed-trips/records/" + encodeURIComponent(trip.id)}
                    aria-label={"View details for trip reference " + trip.providerConfirmationCode}
                    className="inline-flex min-h-8 items-center gap-1 rounded-md text-xs font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                    View details <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">Latest stored provider status; a handoff is not a booking confirmation. Scroll the table horizontally on narrow screens.</p>
    </div>
  );
}
