import { ContentPageFrame, ContentSectionHeading, ContentStatusPill } from "@/components/admin/ContentWorkspace";
import { notFound } from "next/navigation";


import { HomepageCmsEditor } from "@/components/admin/HomepageCmsEditor";
import { CmsRevisionRestoreButton } from "@/components/admin/CmsRevisionRestoreButton";
import { hotelDestinations } from "@/data/hotelDestinations";
import { getHomepageCmsSection, homepageCmsSections } from "@/lib/adminHomepageCms";
import { homepageCmsListNavigation } from "@/lib/adminContentNavigation";
import { getCmsMarketName } from "@/lib/adminCmsMarketLabels";
import { CmsContentError, getAdminCmsContent, getCmsHomepageFlightRoutePairs } from "@/services/cmsContentService";
import { homepageCmsMarkets } from "@/services/homepageCmsService";

type PageProps = {
  params: Promise<{ section: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomepageCmsDetailPage({ params, searchParams }: PageProps) {
  const { section: rawSection, id } = await params;
  const section = getHomepageCmsSection(rawSection);
  if (!section) notFound();

  const config = homepageCmsSections[section];
  let result: Awaited<ReturnType<typeof getAdminCmsContent>>;
  try {
    result = await getAdminCmsContent(id);
  } catch (error) {
    if (error instanceof CmsContentError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  if (result.item.type !== config.type || result.item.locale !== "en") notFound();
  const nav = homepageCmsListNavigation(section, await searchParams, result.item.market);

  return (
    <ContentPageFrame
      title={`Edit ${config.singular}`}
      subtitle="Edit the draft, manage publication and review its revision history."
      backHref={nav.listHref}
      backLabel={`Back to ${config.title}`}
    >
      <div className="space-y-5">
        <HomepageCmsEditor
          section={section}
          markets={homepageCmsMarkets}
          initialMarket={result.item.market}
          listQuery={nav.query}
          initialItem={result.item}
          hotelOptions={section === "hotel-destinations" ? getHotelOptions() : []}
          supportedFlightRoutes={
            section === "destinations"
              ? getCmsHomepageFlightRoutePairs("HOMEPAGE_DESTINATION")
              : section === "flight-routes"
                ? getCmsHomepageFlightRoutePairs("FLIGHT_ROUTE")
                : []
          }
        />

        <section className="mt-7 min-w-0">
          <div className="mb-3">
            <ContentSectionHeading>Revision history</ContentSectionHeading>
            <p className="mt-1 text-[13px] leading-5 text-[#64748B]">Recent immutable draft and published snapshots.</p>
          </div>
          <div className="divide-y divide-[#E7ECF5]">
            {result.revisions.map((revision) => (
              <div key={revision.id} className="grid gap-3 py-4 lg:grid-cols-[72px_130px_140px_140px_200px_minmax(0,1fr)]">
                <div>
                  <p className="text-[12px] font-medium text-[#64748B]">Version</p>
                  <p className="mt-1 text-[13px] font-semibold text-[#111827]">v{revision.version}</p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[#64748B]">Action</p>
                  <div className="mt-1 flex"><ContentStatusPill status={revision.action} /></div>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[#64748B]">Market</p>
                  <p className="mt-1 text-[13px] font-medium text-[#334155]">{getCmsMarketName(revision.market)}</p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[#64748B]">Snapshot</p>
                  <p className="mt-1 text-[13px] font-medium text-[#334155]">{revisionTitle(section, revision.draftPayload)}</p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[#64748B]">Recorded</p>
                  <p className="mt-1 text-[13px] font-medium text-[#334155]">{new Date(revision.createdAt).toLocaleString()}</p>
                  <p className="mt-1 break-all text-[12px] text-[#64748B]">{revision.actorEmail}</p>
                </div>
                <div>
                  {result.item.status !== "ARCHIVED" && revision.version < result.item.version ? (
                    <CmsRevisionRestoreButton
                      itemId={result.item.id}
                      revisionId={revision.id}
                      expectedVersion={result.item.version}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ContentPageFrame>
  );
}

function revisionTitle(section: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Invalid legacy snapshot";
  const raw = value as Record<string, unknown>;
  const key = section === "destinations" ? "city" : section === "flight-routes" ? "title" : "name";
  return typeof raw[key] === "string" ? raw[key] : "Invalid legacy snapshot";
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
