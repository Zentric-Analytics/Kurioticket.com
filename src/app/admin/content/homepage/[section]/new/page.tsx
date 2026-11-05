import { ContentPageFrame } from "@/components/admin/ContentWorkspace";
import { notFound, redirect } from "next/navigation";


import { HomepageCmsEditor } from "@/components/admin/HomepageCmsEditor";
import { hotelDestinations } from "@/data/hotelDestinations";
import { getHomepageCmsSection, homepageCmsSections } from "@/lib/adminHomepageCms";
import { homepageCmsListNavigation } from "@/lib/adminContentNavigation";
import { getCmsContentMarketOverview, getCmsContentScopeSummary } from "@/services/cmsContentService";
import { homepageCmsLocale, homepageCmsMarkets } from "@/services/homepageCmsService";

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
    redirect("/admin/content/homepage");
  }

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
        hotelOptions={section === "hotel-destinations" ? getHotelOptions() : []}
      />
    </ContentPageFrame>
  );
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function getHotelOptions() {
  return hotelDestinations.map((destination) => ({
    canonicalId: `hotel:${destination.id}`,
    label: `${destination.name} · ${destination.country}`,
    name: destination.name,
    country: destination.country,
    countryCode: destination.countryCode,
    kind: destination.kind,
    searchValue: destination.searchValue,
  }));
}
