import { CmsScopeUnavailable } from "@/components/admin/CmsScopeUnavailable";
import { ContentPageFrame } from "@/components/admin/ContentWorkspace";
import { notFound } from "next/navigation";


import { HomepageCmsEditor } from "@/components/admin/HomepageCmsEditor";
import { getHomepageCmsSection, homepageCmsSections } from "@/lib/adminHomepageCms";
import { homepageCmsListNavigation } from "@/lib/adminContentNavigation";
import { getAdminCmsHotelOptions, getCmsContentMarketOverview, getCmsContentScopeSummary, getCmsHomepageFlightRoutePairs } from "@/services/cmsContentService";
import { homepageCmsLocale, homepageCmsMarkets, getHomepageCmsInitializationReadiness } from "@/services/homepageCmsService";

type PageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewHomepageCmsContentPage({ params, searchParams }: PageProps) {
  const { section: rawSection } = await params;
  const section = getHomepageCmsSection(rawSection);
  if (!section) notFound();

  const raw = await searchParams;
  const requestedMarket = one(raw.market).trim().toUpperCase();
  const market = section === "hotel-destinations"
    ? "GLOBAL"
    : homepageCmsMarkets.includes(requestedMarket as never)
      ? requestedMarket
      : "ALL";
  const nav = homepageCmsListNavigation(section, raw, market);
  const config = homepageCmsSections[section];
  const summary = await (market === "ALL"
    ? getCmsContentMarketOverview(config.type, homepageCmsMarkets, homepageCmsLocale)
    : getCmsContentScopeSummary(config.type, market, homepageCmsLocale)).catch(() => null);

  if (!summary?.available || !summary.active) {
    const readiness = summary?.available ? await getHomepageCmsInitializationReadiness().catch(() => null) : null;
    return <ContentPageFrame title={`New ${config.singular}`} backHref={nav.listHref} backLabel={`Back to ${config.title}`}>
      <CmsScopeUnavailable available={Boolean(summary?.available)} partial={Boolean(readiness?.hasExistingHomepageData)} />
    </ContentPageFrame>;
  }

  const hotelOptions = section === "hotel-destinations" ? await getAdminCmsHotelOptions().catch(() => null) : [];
  if (!hotelOptions) return <ContentPageFrame title={`New ${config.singular}`} backHref={nav.listHref} backLabel={`Back to ${config.title}`}>
    <CmsScopeUnavailable available={false} />
  </ContentPageFrame>;

  return (
    <ContentPageFrame
      title={`New ${config.singular}`}
      subtitle="Create a draft, then publish it when ready."
      backHref={nav.listHref}
      backLabel={`Back to ${config.title}`}
    >
      <HomepageCmsEditor
        section={section}
        markets={homepageCmsMarkets}
        initialMarket={market === "ALL" ? "" : market}
        listQuery={nav.query}
        hotelOptions={hotelOptions}
        supportedFlightRoutes={
          section === "destinations"
            ? getCmsHomepageFlightRoutePairs("HOMEPAGE_DESTINATION")
            : section === "flight-routes"
              ? getCmsHomepageFlightRoutePairs("FLIGHT_ROUTE")
              : []
        }
      />
    </ContentPageFrame>
  );
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}
