import Link from "next/link";

import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { generalFaqs } from "@/content/faqs";
import { getDefaultHomeDiscoveryPriceRoutes } from "@/data/homeDiscovery";
import { hotelDestinations } from "@/data/hotelDestinations";
import { popularDestinationsByMarket } from "@/data/marketHomeContent";
import { getCmsContentScopeSummary } from "@/services/cmsContentService";
import { faqCmsScope } from "@/services/faqCmsService";
import { homepageCmsLocale } from "@/services/homepageCmsService";

export const metadata = { title: "Admin Content" };

const homepageDestinationCount = Object.values(popularDestinationsByMarket).reduce((count, items) => count + items.length, 0);
const flightRouteCount = getDefaultHomeDiscoveryPriceRoutes().length;

export default async function AdminContentPage() {
  const [faqSummary, destinationSummary, flightSummary, hotelSummary] = await Promise.all([
    getCmsContentScopeSummary("FAQ", faqCmsScope.market, faqCmsScope.locale).catch(() => null),
    getCmsContentScopeSummary("HOMEPAGE_DESTINATION", "US", homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("FLIGHT_ROUTE", "US", homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("HOTEL_DESTINATION", "GLOBAL", homepageCmsLocale).catch(() => null),
  ]);

  const homepageAvailable = Boolean(destinationSummary?.available && flightSummary?.available && hotelSummary?.available);
  const homepageActive = Boolean(destinationSummary?.active && flightSummary?.active && hotelSummary?.active);

  const contentAreas = [
    {
      title: "Homepage destination cards",
      status: !homepageAvailable ? "Unavailable" : homepageActive ? "CMS managed" : "Setup required",
      value: homepageActive ? destinationSummary?.total ?? 0 : homepageDestinationCount,
      note: homepageActive
        ? "Market-scoped destination cards with draft, publish, hide, archive and ordering controls."
        : "Initialize Homepage CMS to move market destination cards from code-backed content into managed publishing.",
      href: "/admin/content/homepage/destinations",
      actionLabel: "Manage destinations",
    },
    {
      title: "Flight route cards",
      status: !homepageAvailable ? "Unavailable" : homepageActive ? "CMS managed" : "Setup required",
      value: homepageActive ? flightSummary?.total ?? 0 : flightRouteCount,
      note: homepageActive
        ? "Market-scoped discovery and regional route cards backed by canonical Kurioticket airport codes."
        : "Initialize Homepage CMS to migrate the current route-card order without changing fare operations.",
      href: "/admin/content/homepage/flight-routes",
      actionLabel: "Manage flight routes",
    },
    {
      title: "Hotel destination cards",
      status: !homepageAvailable ? "Unavailable" : homepageActive ? "CMS managed" : "Setup required",
      value: homepageActive ? hotelSummary?.total ?? 0 : hotelDestinations.length,
      note: homepageActive
        ? "Canonical GLOBAL hotel destination records validated against the Kurioticket hotel catalog."
        : "Initialize Homepage CMS to make canonical hotel destination content manageable.",
      href: "/admin/content/homepage/hotel-destinations",
      actionLabel: "Manage hotel destinations",
    },
    {
      title: "FAQs",
      status: !faqSummary?.available ? "Unavailable" : faqSummary.active ? "CMS managed" : "Setup required",
      value: faqSummary?.active ? faqSummary.total : generalFaqs.length,
      note: !faqSummary?.available
        ? "CMS storage could not be verified. Public FAQs continue using the existing translated code-backed content."
        : faqSummary.active
          ? faqSummary.published + " published · " + faqSummary.draft + " draft · " + faqSummary.hidden + " hidden · " + faqSummary.archived + " archived"
          : "Initialize the current English FAQ set, then create drafts, preview, publish, hide and archive from admin.",
      href: "/admin/content/faqs",
      actionLabel: "Manage FAQs",
    },
  ];

  return (
    <AdminPageShell
      title="Public Content Management"
      description="Manage CMS-backed public content with explicit draft and publishing controls. Homepage fare operations remain separate."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/content/health" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-100">
            CMS Health
          </Link>
          <Link href="/admin/content/homepage" className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-800 hover:bg-indigo-100">
            Homepage CMS overview
          </Link>
          <Link href="/admin/settings" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Homepage fare operations
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contentAreas.map((area) => (
          <AdminSectionCard key={area.title} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-black text-slate-950">{area.title}</h2>
              <AdminStatusBadge tone={area.status === "CMS managed" ? "good" : area.status === "Setup required" ? "warn" : area.status === "Unavailable" ? "bad" : "info"}>
                {area.status}
              </AdminStatusBadge>
            </div>
            <p className="mt-4 text-3xl font-black text-slate-950">{area.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{area.note}</p>
            <Link href={area.href} className="mt-4 inline-flex text-sm font-black text-indigo-700 hover:text-indigo-900">
              {area.actionLabel}
            </Link>
          </AdminSectionCard>
        ))}
      </div>
    </AdminPageShell>
  );
}
