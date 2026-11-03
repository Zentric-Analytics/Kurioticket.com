import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentDirectoryToolbar } from "@/components/admin/ContentDirectoryToolbar";
import { ContentPageFrame, ContentEmptyState } from "@/components/admin/ContentWorkspace";
import { HomepageCmsListClient } from "@/components/admin/HomepageCmsListClient";
import { CmsCreateLink } from "@/components/admin/CmsCreateLink";
import type { CmsContentStatus } from "@/generated/prisma/enums";
import { getHomepageCmsSection, homepageCmsSections } from "@/lib/adminHomepageCms";
import { homepageCmsListNavigation } from "@/lib/adminContentNavigation";
import {
  CmsContentError,
  getCmsContentScopeSummary,
  listAdminCmsContent,
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
  const defaultMarket = section === "hotel-destinations" ? "GLOBAL" : "US";
  const requestedMarket = one(raw.market).trim().toUpperCase() || defaultMarket;
  const allowedMarket = section === "hotel-destinations"
    ? "GLOBAL"
    : homepageCmsMarkets.includes(requestedMarket as never)
      ? requestedMarket
      : defaultMarket;
  const nav = homepageCmsListNavigation(section, raw, allowedMarket);
  const cursor = one(raw.cursor) || undefined;

  const summary = await getCmsContentScopeSummary(config.type, allowedMarket, homepageCmsLocale).catch(() => null);
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

  let listing: Awaited<ReturnType<typeof listAdminCmsContent>> | null = null;
  let error: string | null = null;
  try {
    listing = await listAdminCmsContent({
      type: config.type,
      status,
      market: allowedMarket,
      locale: homepageCmsLocale,
      limit: 100,
      cursor,
      search: one(raw.q) || undefined,
    });
  } catch (caught) {
    error = caught instanceof CmsContentError ? caught.message : "CMS content is unavailable.";
  }

  return (
    <ContentPageFrame
      wide
      title={config.title}
      subtitle="Manage drafts and published content."
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
            <HomepageCmsListClient section={section} items={listing.items} listQuery={nav.query} />
            {listing.nextCursor ? (
              <div className="flex justify-end">
                <Link href={nextHref(section, nav.query, listing.nextCursor)} className="inline-flex h-9 items-center rounded-lg border border-[#D9DDE3] bg-white px-3 text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC]">
                  Next page
                </Link>
              </div>
            ) : null}
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

function nextHref(section: string, query: string, cursor: string) {
  const params = new URLSearchParams(query);
  params.set("cursor", cursor);
  return `/admin/content/homepage/${section}?${params.toString()}`;
}
