import { Building2, CircleHelp, MapPin, Plane } from "lucide-react";

import { ContentPageFrame } from "@/components/admin/ContentWorkspace";
import { getCmsContentMarketOverview, getCmsContentScopeSummary } from "@/services/cmsContentService";
import { faqCmsScope } from "@/services/faqCmsService";
import { homepageCmsLocale, homepageCmsMarkets } from "@/services/homepageCmsService";

export const metadata = { title: "Admin Content" };

type CmsScopeSummary = { available: boolean; active: boolean; needsSetup?: boolean; publishedInScope: number } | null;

function contentScopeStatus(summary: CmsScopeSummary) {
  if (!summary?.available) return "Unavailable";
  if (summary.needsSetup) return "Setup required";
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
    },
    {
      icon: Plane,
      title: "Flight routes",
      status: contentScopeStatus(flightSummary),
      value: publishedContentCount(flightSummary),
    },
    {
      icon: Building2,
      title: "Hotel destinations",
      status: contentScopeStatus(hotelSummary),
      value: publishedContentCount(hotelSummary),
    },
    {
      icon: CircleHelp,
      title: "FAQs",
      status: contentScopeStatus(faqSummary),
      value: publishedContentCount(faqSummary),
    },
  ];

  return (
    <ContentPageFrame title="Content" visuallyHideTitle wide>
      <div className="w-full pt-2">
        <div className="w-full min-w-0 space-y-4">
        {homepageNeedsSetup ? (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-[13px] text-[#475569]">Some homepage content markets need CMS setup.</p>
          </div>
        ) : null}

        <section aria-label="Content publication overview" className="grid w-full min-w-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {contentAreas.map((area) => {
            const Icon = area.icon;
            return (
              <article
                key={area.title}
                className="flex h-full min-w-0 flex-col justify-between gap-4 rounded-lg border border-[#E5E7EB] bg-white p-4"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <Icon size={18} className="mt-0.5 shrink-0 text-[#64748B]" aria-hidden="true" />
                  <h3 className="min-w-0 break-words text-[14px] font-semibold leading-5 text-[#111827]">{area.title}</h3>
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
              </article>
            );
          })}
        </section>
        </div>
      </div>
    </ContentPageFrame>
  );
}
