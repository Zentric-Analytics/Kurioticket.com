import Link from "next/link";
import { ArrowUpRight, Building2, CircleHelp, MapPin, Plane } from "lucide-react";

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
      section: "homepage" as const,
      icon: MapPin,
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
      section: "homepage" as const,
      icon: Plane,
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
      section: "homepage" as const,
      icon: Building2,
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
      section: "help" as const,
      icon: CircleHelp,
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

  const homepageAreas = contentAreas.filter((area) => area.section === "homepage");
  const helpAreas = contentAreas.filter((area) => area.section === "help");

  return (
    <AdminPageShell
      title="Public Content Management"
      eyebrow=""
      description="Manage website content, publishing, and visibility."
    >
      <div className="space-y-6">
        <nav aria-label="Content management shortcuts" className="flex flex-wrap items-center gap-2">
          <Link href="/admin/content/health" className="inline-flex min-h-9 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
            CMS Health
          </Link>
          <Link href="/admin/content/homepage" className="inline-flex min-h-9 items-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100">
            Homepage CMS overview
          </Link>
          <Link href="/admin/homepage-fares" className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Homepage fare operations
          </Link>
        </nav>

        <section aria-labelledby="homepage-content-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="homepage-content-heading" className="text-base font-semibold text-slate-950">
              Homepage content
            </h2>
            <p className="text-xs font-medium text-slate-500">{homepageAreas.length} content areas</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {homepageAreas.map((area) => {
              const Icon = area.icon;
              return (
                <AdminSectionCard key={area.title} className="flex min-w-0 flex-col p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Icon size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
                      <h3 className="min-w-0 text-sm font-semibold leading-5 text-slate-950">{area.title}</h3>
                    </div>
                    <AdminStatusBadge tone={area.status === "CMS managed" ? "good" : area.status === "Setup required" ? "warn" : "bad"}>
                      {area.status}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-3 text-3xl font-semibold leading-none tabular-nums text-slate-950">{area.value}</p>
                  <p className="mt-2 flex-1 text-sm leading-5 text-slate-600">{area.note}</p>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <Link href={area.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                      {area.actionLabel}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </AdminSectionCard>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="help-content-heading" className="space-y-3">
          <h2 id="help-content-heading" className="text-base font-semibold text-slate-950">
            Help &amp; information
          </h2>

          <div className="space-y-3">
            {helpAreas.map((area) => {
              const Icon = area.icon;
              return (
                <AdminSectionCard key={area.title} className="min-w-0 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <Icon size={20} className="text-slate-600" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-950">{area.title}</h3>
                        <p className="text-xs text-slate-500">Frequently asked questions</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-2xl font-semibold leading-none tabular-nums text-slate-950">{area.value}</p>
                      <AdminStatusBadge tone={area.status === "CMS managed" ? "good" : area.status === "Setup required" ? "warn" : "bad"}>
                        {area.status}
                      </AdminStatusBadge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-100 pt-3">
                    <p className="min-w-0 flex-1 text-sm leading-5 text-slate-600">{area.note}</p>
                    <Link href={area.href} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                      {area.actionLabel}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </AdminSectionCard>
              );
            })}
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
