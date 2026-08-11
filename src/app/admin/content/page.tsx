import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { generalFaqs } from "@/content/faqs";
import { getDefaultHomeDiscoveryPriceRoutes } from "@/data/homeDiscovery";
import { hotelDestinations } from "@/data/hotelDestinations";
import { popularDestinationsByMarket } from "@/data/marketHomeContent";

export const metadata = { title: "Admin Content" };

const homepageDestinationCount = Object.values(popularDestinationsByMarket).reduce((count, items) => count + items.length, 0);
const flightRouteCount = getDefaultHomeDiscoveryPriceRoutes().length;

const contentAreas = [
  { title: "Homepage destination cards", status: "Read-only", value: homepageDestinationCount, note: "Existing market homepage content is available for review. CRUD is not connected in this task." },
  { title: "Flight route cards", status: "Read-only", value: flightRouteCount, note: "Existing homepage flight route definitions are visible as configuration-backed content." },
  { title: "Hotel destination cards", status: "Read-only", value: hotelDestinations.length, note: "Existing hotel destination definitions are available for review." },
  { title: "FAQs", status: "Read-only", value: generalFaqs.length, note: "Existing FAQ content is code-backed and not editable from admin yet." },
];

export default function AdminContentPage() {
  return (
    <AdminPageShell
      title="Public Content Management"
      description="Read-only visibility into the code-backed content currently used by the public website."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contentAreas.map((area) => (
          <AdminSectionCard key={area.title} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-black text-slate-950">{area.title}</h2>
              <AdminStatusBadge tone={area.status === "Read-only" ? "info" : "neutral"}>{area.status}</AdminStatusBadge>
            </div>
            <p className="mt-4 text-3xl font-black text-slate-950">{area.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{area.note}</p>
          </AdminSectionCard>
        ))}
      </div>
    </AdminPageShell>
  );
}
