import Link from "next/link";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getConfirmedTripsIntegrationReadiness, getConfirmedTripsOperationsSnapshot } from "@/services/adminConfirmedTripsOperationsService";

export const metadata = { title: "Admin Confirmed Trips" };

export default async function AdminConfirmedTripsPage() {
  const [operations, readiness] = await Promise.all([getConfirmedTripsOperationsSnapshot(), Promise.resolve(getConfirmedTripsIntegrationReadiness())]);

  return (
    <AdminPageShell
      title="Confirmed Trips"
      description="Monitor provider-confirmed My Trips created by signed partner callbacks. Provider handoffs, searches and payments are not treated as booking confirmations."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/redirects" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Provider handoffs
          </Link>
          <Link href="/admin/searches" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Search operations
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {operations ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminMetricCard label="Confirmed trips" value={operations.metrics.total} hint="Provider-confirmed My Trips in this database" tone="info" />
            <AdminMetricCard label="Last 24h" value={operations.metrics.confirmedLast24h} hint="Trips whose latest provider-confirmation timestamp is within 24h" tone={operations.metrics.confirmedLast24h > 0 ? "good" : "neutral"} />
            <AdminMetricCard label="Upcoming" value={operations.metrics.upcoming} hint="Provider-confirmed upcoming trips" />
            <AdminMetricCard label="Past" value={operations.metrics.past} hint="Provider-confirmed past trips" />
            <AdminMetricCard label="Cancelled" value={operations.metrics.cancelled} hint="Provider-confirmed cancelled trips" tone={operations.metrics.cancelled > 0 ? "warn" : "neutral"} />
          </div>
        ) : (
          <AdminEmptyState title="Confirmed-trip telemetry unavailable" message="The connected database could not return confirmed-trip operations. No zero values were invented." />
        )}

        <AdminSectionCard className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-black text-slate-950">Confirmation integration readiness</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                The partner confirmation endpoint is server-to-server only. Current Duffel search and KAYAK sandbox integrations do not send booking confirmations.
              </p>
            </div>
            <AdminStatusBadge tone={readiness.webhookCredentialConfigured ? "good" : "warn"}>
              {readiness.webhookCredentialConfigured ? "Webhook credential configured" : "Webhook credential not configured"}
            </AdminStatusBadge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Fact label="Endpoint" value="POST /api/internal/partner-confirmations" />
            <Fact label="Webhook credential model" value="One shared secret" />
            <Fact label="Current search-provider confirmation feed" value="None" />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            A configured webhook secret means the signed callback boundary is ready; it does not mean a provider agreement or live confirmation feed is active. Provider identity is supplied inside the signed payload; there is no separate provider-name allowlist in the current contract.
          </p>
        </AdminSectionCard>

        {operations ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminSectionCard className="p-5">
              <h2 className="font-black text-slate-950">Confirmed trips by product</h2>
              {operations.byProduct.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {operations.byProduct.map((item) => (
                    <div key={item.tripType} className="flex items-center justify-between gap-3 py-3">
                      <span className="font-semibold text-slate-900">{item.tripType}</span>
                      <AdminStatusBadge tone="info">{item.count}</AdminStatusBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No provider-confirmed trips are recorded yet.</p>
              )}
            </AdminSectionCard>

            <AdminSectionCard className="p-5">
              <h2 className="font-black text-slate-950">Confirmed trips by provider</h2>
              {operations.byProvider.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {operations.byProvider.map((item) => (
                    <div key={item.provider} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.provider}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.lastConfirmationAt ? "Last confirmation " + formatDateTime(new Date(item.lastConfirmationAt)) : "No timestamp"}</p>
                      </div>
                      <AdminStatusBadge tone="info">{item.count}</AdminStatusBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No provider confirmation feed has produced a confirmed trip yet.</p>
              )}
            </AdminSectionCard>
          </div>
        ) : null}

        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">Operational boundaries</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Kurioticket is a metasearch and referral platform. A confirmed My Trip means Kurioticket accepted a valid signed partner confirmation and stored it as trusted trip data. It does not create a Kurioticket booking, payment, refund, cancellation or ticketing record.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminStatusBadge tone="good">Signed confirmations only</AdminStatusBadge>
            <AdminStatusBadge>Provider handoff ≠ confirmation</AdminStatusBadge>
            <AdminStatusBadge>No Kurioticket payment record</AdminStatusBadge>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            MyTrip rows do not carry an environment column. This page therefore reports the database connected to the current {operations?.environment ?? "application"} environment rather than applying a per-row environment filter.
          </p>
        </AdminSectionCard>

        {operations ? (
          operations.recentTrips.length ? (
            <div>
              <div className="mb-3">
                <h2 className="font-black text-slate-950">Recent provider-confirmed trips</h2>
                <p className="mt-1 text-sm text-slate-600">Latest trusted partner-confirmed trip records in this database.</p>
              </div>
              <AdminDataTable
                columns={["Confirmed", "Customer", "Product", "Route / destination", "Provider", "Reference", "Travel", "Status"]}
                rows={operations.recentTrips.map((trip) => ({
                  id: trip.id,
                  cells: [
                    formatDateTime(new Date(trip.confirmedAt)),
                    <div key="customer"><p className="font-semibold text-slate-950">{trip.userEmail || "Email unavailable"}</p><p className="text-xs text-slate-500">{trip.userId}</p></div>,
                    trip.tripType,
                    trip.origin ? trip.origin + " → " + trip.destination : trip.destination,
                    trip.providerName,
                    trip.providerConfirmationCode,
                    <div key="travel"><p className="font-semibold text-slate-950">{formatDateTime(new Date(trip.departureDate))}</p><p className="text-xs text-slate-500">{trip.travelerCount} traveler{trip.travelerCount === 1 ? "" : "s"}</p></div>,
                    <AdminStatusBadge key="status" tone={trip.status === "CANCELLED" ? "warn" : trip.status === "UPCOMING" ? "good" : "neutral"}>{trip.status}</AdminStatusBadge>,
                  ],
                }))}
              />
            </div>
          ) : (
            <AdminEmptyState title="No provider-confirmed trips yet" message="The confirmation contract is ready, but no accepted signed partner callback has created a confirmed My Trip in this database." />
          )
        ) : null}
      </div>
    </AdminPageShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
