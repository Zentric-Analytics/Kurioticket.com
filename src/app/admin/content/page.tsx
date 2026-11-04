import Link from "next/link";
import { ArrowUpRight, Building2, CircleHelp, MapPin, Plane } from "lucide-react";

import { ContentPageFrame } from "@/components/admin/ContentWorkspace";
import { getCmsContentMarketOverview, getCmsContentScopeSummary } from "@/services/cmsContentService";
import { faqCmsScope } from "@/services/faqCmsService";
import { homepageCmsLocale, homepageCmsMarkets } from "@/services/homepageCmsService";

export const metadata = { title: "Admin Content" };

type CmsScopeSummary = { available: boolean; active: boolean; publishedInScope: number } | null;

function contentScopeStatus(summary: CmsScopeSummary) {
  if (!summary?.available) return "Unavailable";
  return summary.active ? "CMS managed" : "Setup required";
}

function publishedContentCount(summary: CmsScopeSummary) {
  return summary?.available && summary.active ? summary.publishedInScope : "—";
}

export default async function AdminContentPage() {
  const [faqSummary, destinationSummary, flightSummary, hotelSummary] = await Promise.all([
    getCmsContentScopeSummary("FAQ", faqCmsScope.market, faqCmsScope.locale).catch(() => null),
    getCmsContentMarketOverview("HOMEPAGE_DESTINATION", homepageCmsMarkets, homepageCmsLocale).catch(() => null),
    getCmsContentMarketOverview("FLIGHT_ROUTE", homepageCmsMarkets, homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("HOTEL_DESTINATION", "GLOBAL", homepageCmsLocale).catch(() => null),
  ]);

  const homepageNeedsSetup =
    Boolean(destinationSummary?.available && destinationSummary.needsSetup) ||
    Boolean(flightSummary?.available && flightSummary.needsSetup) ||
    Boolean(hotelSummary?.available && !hotelSummary.active);

  const contentAreas = [
    {
      icon: MapPin,
      title: "Homepage destinations",
      status: contentScopeStatus(destinationSummary),
      value: publishedContentCount(destinationSummary),
      href: "/admin/content/homepage/destinations",
    },
    {
      icon: Plane,
      title: "Flight routes",
      status: contentScopeStatus(flightSummary),
      value: publishedContentCount(flightSummary),
      href: "/admin/content/homepage/flight-routes",
    },
    {
      icon: Building2,
      title: "Hotel destinations",
      status: contentScopeStatus(hotelSummary),
      value: publishedContentCount(hotelSummary),
      href: "/admin/content/homepage/hotel-destinations",
    },
    {
      icon: CircleHelp,
      title: "FAQs",
      status: contentScopeStatus(faqSummary),
      value: publishedContentCount(faqSummary),
      href: "/admin/content/faqs",
    },
  ];

  return (
    <ContentPageFrame title="Content" visuallyHideTitle>
      <div className="space-y-4">
        {homepageNeedsSetup ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-[#475569]">Some homepage content needs CMS setup.</p>
            <Link href="/admin/content/homepage" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#004BB8] hover:underline">
              Review homepage CMS setup <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        <nav aria-label="Content management" className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
          {contentAreas.map((area) => {
            const Icon = area.icon;
            return (
              <Link
                key={area.href}
                href={area.href}
                className="group focus-ring flex h-full min-w-0 cursor-pointer flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 transition-colors hover:border-[#6D28D9] hover:bg-[#FBFAFF] focus-visible:border-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon size={18} className="shrink-0 text-[#64748B]" aria-hidden="true" />
                    <h3 className="min-w-0 text-[14px] font-semibold leading-5 text-[#111827]">{area.title}</h3>
                  </div>
                  <ArrowUpRight size={16} aria-hidden="true" className="shrink-0 text-[#64748B] transition-colors group-hover:text-[#6D28D9]" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-[24px] font-semibold leading-7 tracking-tight tabular-nums text-[#111827]">{area.value}</span>
                    <span className="text-[12px] leading-5 text-[#64748B]">Published records</span>
                  </div>
                  {area.status !== "CMS managed" ? (
                    <p className="mt-1 text-[12px] font-medium text-amber-700">{area.status}</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </ContentPageFrame>
  );
}
