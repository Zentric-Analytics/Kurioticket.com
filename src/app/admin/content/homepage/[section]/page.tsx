import { notFound } from "next/navigation";

import { ContentDirectoryToolbar } from "@/components/admin/ContentDirectoryToolbar";
import { ContentPageFrame, ContentEmptyState } from "@/components/admin/ContentWorkspace";
import { HomepageCmsListClient } from "@/components/admin/HomepageCmsListClient";
import { CmsCreateLink } from "@/components/admin/CmsCreateLink";
import type { CmsContentStatus } from "@/generated/prisma/enums";
import { getHomepageCmsSection, homepageCmsSections, sortHomepageCmsDirectoryItems } from "@/lib/adminHomepageCms";
import { homepageCmsListNavigation } from "@/lib/adminContentNavigation";
import {
  CmsContentError,
  getCmsContentScopeSummary,
  getCmsContentMarketOverview,
  listAdminCmsContentDirectory,
} from "@/services/cmsContentService";
import { homepageCmsLocale, homepageCmsMarkets } from "@/services/homepageCmsService";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PageProps = { params: Promise<{ section: string }>; searchParams: SearchParams };

const validStatuses = new Set<CmsContentStatus>(["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"]);

export default async function HomepageCmsSectionPage({ params, searchParams }: PageProps) {
  const { section: rawSection } = await params;
  const section = getHomepageCmsSection(rawSection);
  if (!section) notFound();

  const config = homepageCmsSections[section];
  const raw = await searchParams;
  const statusRaw = one(raw.status).trim();
  const status = validStatuses.has(statusRaw as CmsContentStatus) ? statusRaw as CmsContentStatus : undefined;
  const defaultMarket = section === "hotel-destinations" ? "GLOBAL" : "ALL";
  const requestedMarket = one(raw.market).trim().toUpperCase() || defaultMarket;
  const allowedMarket = section === "hotel-destinations"
    ? "GLOBAL"
    : requestedMarket === "ALL" || homepageCmsMarkets.includes(requestedMarket as never)
      ? requestedMarket
      : defaultMarket;
  const nav = homepageCmsListNavigation(section, raw, allowedMarket);

  const summary = await (allowedMarket === "ALL"
    ? getCmsContentMarketOverview(config.type, homepageCmsMarkets, homepageCmsLocale)
    : getCmsContentScopeSummary(config.type, allowedMarket, homepageCmsLocale)).catch(() => null);
  if (!summary?.available || !summary.active) {
    return (
      <ContentPageFrame
        wide
        title={config.title}
        subtitle="This CMS scope must be initialized before editing."
        backHref={nav.backHref}
        backLabel={nav.backLabel}
      >
        <ContentEmptyState
          title="CMS scope unavailable"
          message="Initialize Homepage CMS from the homepage content overview before creating or editing this content."
        />
      </ContentPageFrame>
    );
  }

  let listing: Awaited<ReturnType<typeof listAdminCmsContentDirectory>> | null = null;
  let error: string | null = null;
  try {
    const listInput = {
      type: config.type,
      status,
      market: allowedMarket === "ALL" ? undefined : allowedMarket,
      locale: homepageCmsLocale,
      search: one(raw.q) || undefined,
    };
    // Retrieve all filtered rows in one repeatable-read snapshot. The
    // service's existing cursor pagination remains available to other screens.
    listing = await listAdminCmsContentDirectory(listInput);
    listing = {
      items: sortHomepageCmsDirectoryItems(listing.items),
      nextCursor: null,
    };
  } catch (caught) {
    error = caught instanceof CmsContentError ? caught.message : "CMS content is unavailable.";
  }

  return (
    <ContentPageFrame
      wide
      title={config.title}
      subtitle={allowedMarket === "ALL" ? "Manage drafts and published content across all markets." : "Manage drafts and published content."}
      backHref={nav.backHref}
      backLabel={nav.backLabel}
      actions={<CmsCreateLink path={`/admin/content/homepage/${section}/new`} label={`Add ${config.singular}`} />}
    >
      <div className="space-y-4">
        <ContentDirectoryToolbar
          path={`/admin/content/homepage/${section}`}
          query={nav.query}
          status={statusRaw}
          market={section !== "hotel-destinations" ? allowedMarket : undefined}
          markets={section !== "hotel-destinations" ? homepageCmsMarkets : []}
          searchLabel={section === "flight-routes" ? "Search flight routes" : section === "hotel-destinations" ? "Search hotel destinations" : "Search destinations"}
        >
        {error ? (
          <ContentEmptyState title="Content unavailable" message={error} />
        ) : listing && listing.items.length > 0 ? (
          <>
            <HomepageCmsListClient
              section={section}
              items={listing.items}
              listQuery={nav.query}
              reorderMarket={
                section !== "hotel-destinations" &&
                allowedMarket !== "ALL" &&
                !status &&
                !one(raw.q).trim()
                  ? allowedMarket
                  : undefined
              }
            />
          </>
        ) : (
          <ContentEmptyState
            title="No content found"
            message="No content records match this market and lifecycle status."
            action={<CmsCreateLink path={`/admin/content/homepage/${section}/new`} label={`Add ${config.singular}`} />}
          />
        )}
        </ContentDirectoryToolbar>
      </div>
    </ContentPageFrame>
  );
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

