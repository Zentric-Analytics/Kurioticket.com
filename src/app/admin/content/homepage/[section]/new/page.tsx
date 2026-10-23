import { notFound, redirect } from "next/navigation";

import { AdminLinkButton, AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageCmsEditor } from "@/components/admin/HomepageCmsEditor";
import { hotelDestinations } from "@/data/hotelDestinations";
import { getHomepageCmsSection, homepageCmsSections } from "@/lib/adminHomepageCms";
import { getCmsContentScopeSummary } from "@/services/cmsContentService";
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
      : "US";
  const config = homepageCmsSections[section];
  const summary = await getCmsContentScopeSummary(config.type, market, homepageCmsLocale).catch(() => null);

  if (!summary?.available || !summary.active) {
    redirect("/admin/content/homepage");
  }

  return (
    <AdminPageShell
      title={`New ${config.singular}`}
      description="Create a structured draft. Save and Publish remain separate lifecycle actions."
      actions={<AdminLinkButton href={`/admin/content/homepage/${section}?market=${market}`}>Back</AdminLinkButton>}
    >
      <HomepageCmsEditor
        section={section}
        markets={homepageCmsMarkets}
        initialMarket={market}
        hotelOptions={section === "hotel-destinations" ? getHotelOptions() : []}
      />
    </AdminPageShell>
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
