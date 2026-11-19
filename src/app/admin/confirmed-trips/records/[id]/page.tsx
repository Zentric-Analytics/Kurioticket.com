import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/auth-guards";
import { isValidAdminTripId } from "@/lib/adminConfirmedTripsDirectory";
import { formatDateTime } from "@/lib/admin-data";
import { getAdminConfirmedTripDetails } from "@/services/adminConfirmedTripsDirectoryService";
import { getAdminConfirmationDeliveryHistory } from "@/services/partnerConfirmationDeliveryService";

export const metadata = { title: "Admin Confirmed Trip Details" };
type Props = { params: Promise<{ id: string }> };

function Field({ label, value }: { label: string; value: string | number | null }) {
  return <div className="min-w-0 border-b border-slate-100 py-2">
    <dt className="text-[11px] font-medium leading-4 text-slate-600">{label}</dt>
    <dd className="mt-0.5 break-words text-xs font-medium leading-5 text-slate-900">{value === null || value === "" ? "Not supplied" : value}</dd>
  </div>;
}
function date(value: string | null) {
  return value ? formatDateTime(new Date(value)) : "Not supplied";
}

export default async function AdminConfirmedTripDetailPage({ params }: Props) {
  const { id } = await params;
  if (!isValidAdminTripId(id)) notFound();
  await requireAdminSession("/admin/confirmed-trips/records/" + encodeURIComponent(id));
  const result = await getAdminConfirmedTripDetails(id);
  if (result.status === "not_found") notFound();
  const history = result.status === "ok" ? await getAdminConfirmationDeliveryHistory(result.trip.id) : null;
  return (
    <AdminPageShell title="Confirmed Trip Details"
      description="Read-only details of a trusted provider-confirmed My Trip. Kurioticket does not manage the provider booking."
      actions={<Link href="/admin/confirmed-trips/records" className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-indigo-700 hover:underline"><ArrowLeft size={15} aria-hidden="true" />Back to confirmed trip records</Link>}>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        {result.status === "unavailable" ? (
          <div role="status" className="text-sm text-slate-700">Confirmed trip details are temporarily unavailable. No trip data was assumed.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="break-words text-lg font-semibold text-slate-950">{result.trip.origin ? result.trip.origin + " → " + result.trip.destination : result.trip.destination}</h2>
                <p className="mt-1 text-sm text-slate-600">Provider: {result.trip.providerName} · {result.trip.tripType}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <AdminStatusBadge tone={result.trip.status === "CANCELLED" ? "warn" : result.trip.status === "UPCOMING" ? "good" : "neutral"}>{result.trip.status}</AdminStatusBadge>
                {result.trip.needsStatusReview ? <p className="text-xs font-semibold text-amber-700">Review status freshness — departure has passed, but the stored provider status is still Upcoming.</p> : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 md:gap-x-6">
              <section aria-label="Customer and confirmation">
                <h3 className="text-sm font-semibold text-slate-950">Customer and confirmation</h3>
                <dl className="mt-1">
                  <Field label="Customer email" value={result.trip.userEmail ?? "Email unavailable"} />
                  <Field label="Customer ID" value={result.trip.userId} />
                  <Field label="Provider" value={result.trip.providerName} />
                  <Field label="Confirmation reference" value={result.trip.providerConfirmationCode} />
                  <Field label="Provider trip ID" value={result.trip.providerTripId} />
                  <Field label="Latest signed confirmation" value={date(result.trip.confirmedAt)} />
                </dl>
              </section>
              <section aria-label="Travel details">
                <h3 className="text-sm font-semibold text-slate-950">Travel details</h3>
                <dl className="mt-1">
                  <Field label="Product" value={result.trip.tripType} />
                  <Field label="Origin" value={result.trip.origin} />
                  <Field label="Destination" value={result.trip.destination} />
                  <Field label="Departure" value={date(result.trip.departureDate)} />
                  <Field label="Return" value={date(result.trip.returnDate)} />
                  <Field label="Travelers" value={result.trip.travelerCount} />
                  <Field label="Provider-supplied total" value={result.trip.totalAmount === null ? "Not supplied" : result.trip.currency + " " + result.trip.totalAmount} />
                  <Field label="Record created" value={date(result.trip.createdAt)} />
                  <Field label="Record last updated" value={date(result.trip.updatedAt)} />
                </dl>
              </section>
            </div>
            <section aria-labelledby="confirmation-delivery-history" className="min-w-0 border-t border-slate-200 pt-3">
              <h3 id="confirmation-delivery-history" className="text-sm font-semibold text-slate-950">Authenticated confirmation delivery history</h3>
              <p className="mt-1 text-sm text-slate-600">Latest 50 authenticated callback receipts for this trip. Delivery acceptance does not prove a new booking or a changed trip state.</p>
              {history?.status === "unavailable" || !history ? (
                <p role="status" className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Confirmation delivery history is unavailable.</p>
              ) : history.rows.length ? (
                <div role="region" aria-label="Authenticated confirmation delivery receipts" tabIndex={0} className="mt-2 max-w-full overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <table className="w-full min-w-[580px] text-left text-xs">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                      <tr><th className="px-3 py-2.5">Received</th><th className="px-3 py-2.5">Outcome</th><th className="px-3 py-2.5">Reason</th><th className="px-3 py-2.5">Reported status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.rows.map(item => <tr key={item.id}>
                        <td className="whitespace-nowrap px-3 py-2.5">{formatDateTime(new Date(item.receivedAt))}</td>
                        <td className="px-3 py-2.5">{item.outcome}</td>
                        <td className="px-3 py-2.5">{item.reason.replaceAll("_", " ")}</td>
                        <td className="px-3 py-2.5">{item.reportedStatus || "Unavailable"}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
              ) : <p role="status" className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No authenticated callback receipts are linked to this trip yet. Older accepted trips predate receipt monitoring.</p>}
            </section>
            <p className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
              This is a provider-confirmed My Trip record, not a Kurioticket booking, payment, refund, or cancellation. It shows the latest stored provider status only; no historical updates are inferred.
            </p>
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
