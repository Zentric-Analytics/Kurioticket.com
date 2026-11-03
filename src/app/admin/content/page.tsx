import Link from "next/link";
import { ArrowUpRight, Building2, CircleHelp, MapPin, Plane } from "lucide-react";

import { ContentPageFrame, ContentSectionHeading, ContentStatusPill } from "@/components/admin/ContentWorkspace";
import { getCmsContentScopeSummary } from "@/services/cmsContentService";
import { faqCmsScope } from "@/services/faqCmsService";
import { homepageCmsLocale } from "@/services/homepageCmsService";

export const metadata = { title: "Admin Content" };

type CmsScopeSummary = Awaited<ReturnType<typeof getCmsContentScopeSummary>> | null;

function contentScopeStatus(summary: CmsScopeSummary) {
  if (!summary?.available) return "Unavailable";
  return summary.active ? "CMS managed" : "Setup required";
}

function publishedContentCount(summary: CmsScopeSummary) {
  return summary?.available && summary.active ? summary.publishedInScope : "—";
}

function contentScopeDescription(summary: CmsScopeSummary, scope: string) {
  if (!summary?.available) return scope + ": CMS storage could not be verified.";
  if (!summary.active) return scope + ": CMS setup required; legacy content may still be used as fallback.";
  return scope + " · " + summary.draft + " draft" + (summary.draft === 1 ? "" : "s") + " awaiting publication";
}

export default async function AdminContentPage() {
  const [faqSummary, destinationSummary, flightSummary, hotelSummary] = await Promise.all([
    getCmsContentScopeSummary("FAQ", faqCmsScope.market, faqCmsScope.locale).catch(() => null),
    getCmsContentScopeSummary("HOMEPAGE_DESTINATION", "US", homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("FLIGHT_ROUTE", "US", homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("HOTEL_DESTINATION", "GLOBAL", homepageCmsLocale).catch(() => null),
  ]);

  const homepageNeedsSetup = [destinationSummary, flightSummary, hotelSummary]
    .some((summary) => summary?.available && !summary.active);

  const contentAreas = [
    {
      section: "homepage" as const,
      icon: MapPin,
      title: "Homepage destination cards",
      status: contentScopeStatus(destinationSummary),
      value: publishedContentCount(destinationSummary),
      note: contentScopeDescription(destinationSummary, "US market"),
      href: "/admin/content/homepage/destinations",
      actionLabel: "Manage destinations",
    },
    {
      section: "homepage" as const,
      icon: Plane,
      title: "Flight route cards",
      status: contentScopeStatus(flightSummary),
      value: publishedContentCount(flightSummary),
      note: contentScopeDescription(flightSummary, "US market"),
      href: "/admin/content/homepage/flight-routes",
      actionLabel: "Manage flight routes",
    },
    {
      section: "homepage" as const,
      icon: Building2,
      title: "Hotel destination cards",
      status: contentScopeStatus(hotelSummary),
      value: publishedContentCount(hotelSummary),
      note: contentScopeDescription(hotelSummary, "Global"),
      href: "/admin/content/homepage/hotel-destinations",
      actionLabel: "Manage hotel destinations",
    },
    {
      section: "help" as const,
      icon: CircleHelp,
      title: "FAQs",
      status: contentScopeStatus(faqSummary),
      value: publishedContentCount(faqSummary),
      note: contentScopeDescription(faqSummary, "English FAQs"),
      href: "/admin/content/faqs",
      actionLabel: "Manage FAQs",
    },
  ];

  const homepageAreas = contentAreas.filter((area) => area.section === "homepage");
  const helpAreas = contentAreas.filter((area) => area.section === "help");

  return (
    <ContentPageFrame title="Content" subtitle="Manage the content published across Kurioticket.">
      <div className="space-y-6">
        {homepageNeedsSetup ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-slate-700">Some homepage content scopes still need CMS setup.</p>
            <Link href="/admin/content/homepage" className="inline-flex items-center gap-1 text-[13px] font-semibold text-indigo-700 hover:underline">
              Review homepage CMS setup <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        <section aria-labelledby="homepage-content-heading" className="space-y-3">
          <div id="homepage-content-heading"><ContentSectionHeading>Homepage content</ContentSectionHeading></div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {homepageAreas.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.title} className="flex min-w-0 flex-col rounded-lg border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Icon size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
                      <h3 className="min-w-0 text-sm font-semibold leading-5 text-slate-950">{area.title}</h3>
                    </div>
                    <ContentStatusPill status={area.status} />
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-semibold leading-none tabular-nums text-[#111827]">{area.value}</p>
                    <p className="mt-1 text-xs text-slate-500">Published CMS records</p>
                  </div>
                  <p className="mt-2 flex-1 text-[13px] leading-5 text-[#64748B]">{area.note}</p>
                  <div className="mt-4 pt-1">
                    <Link href={area.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                      {area.actionLabel}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="help-content-heading" className="space-y-3">
          <div id="help-content-heading"><ContentSectionHeading>Help &amp; information</ContentSectionHeading></div>

          <div className="space-y-3">
            {helpAreas.map((area) => {
              const Icon = area.icon;
              return (
                <div key={area.title} className="min-w-0 rounded-lg border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <Icon size={20} className="text-slate-600" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-950">{area.title}</h3>
                        
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-semibold leading-none tabular-nums text-slate-950">{area.value}</p>
                        <p className="text-xs text-slate-500">Published</p>
                      </div>
                      <ContentStatusPill status={area.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <p className="min-w-0 flex-1 text-[13px] leading-5 text-[#64748B]">{area.note}</p>
                    <Link href={area.href} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                      {area.actionLabel}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ContentPageFrame>
  );
}
