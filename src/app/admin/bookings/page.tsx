import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";

export const metadata = { title: "Admin Booking Operations" };

const checklist = [
  "provider booking API connected",
  "payment processor connected",
  "booking confirmation storage",
  "customer itinerary email",
  "cancellation/refund rules",
];

export default function AdminBookingsPage() {
  return (
    <AdminPageShell
      title="Booking Operations"
      description="Booking controls are intentionally unavailable until the full production booking workflow exists."
      actions={<AdminStatusBadge tone="warn">Not live yet</AdminStatusBadge>}
    >
      <AdminSectionCard className="p-6">
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Booking operations will become available after production provider booking APIs, payment confirmation, and provider confirmation records are connected.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checklist.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <AdminStatusBadge tone="neutral">Pending</AdminStatusBadge>
              <p className="mt-3 text-sm font-black capitalize text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
