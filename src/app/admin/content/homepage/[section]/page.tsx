import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminButton, AdminSelect } from "@/components/admin/AdminPageShell";
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
    });
  } catch (caught) {
    error = caught instanceof CmsContentError ? caught.message : "CMS content is unavailable.";
  }

  return (
    <ContentPageFrame
      title={config.title}
      subtitle="Manage drafts and published content."
      backHref={nav.backHref}
      backLabel={nav.backLabel}
      actions={<CmsCreateLink path={`/admin/content/homepage/${section}/new`} label={`Add ${config.singular}`} />}
    >
      <div className="space-y-4">
        <form action={`/admin/content/homepage/${section}`} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-3 [&_select]:w-auto [&_select]:min-w-[150px]">
          {raw.from === "overview" ? <input type="hidden" name="from" value="overview" /> : null}
          {section !== "hotel-destinations" ? (
            <AdminSelect name="market" defaultValue={allowedMarket}>
              {homepageCmsMarkets.map((market) => <option key={market} value={market}>{market}</option>)}
            </AdminSelect>
          ) : null}
          <AdminSelect name="status" defaultValue={statusRaw}>
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="HIDDEN">Hidden</option>
            <option value="ARCHIVED">Archived</option>
          </AdminSelect>
          <AdminButton size="sm" className="rounded-lg font-medium shadow-none" type="submit">Apply filters</AdminButton>
        </form>

        {error ? (
          <ContentEmptyState title="Content unavailable" message={error} />
        ) : listing && listing.items.length > 0 ? (
          <>
            <HomepageCmsListClient section={section} items={listing.items} listQuery={nav.query} />
            {listing.nextCursor ? (
              <div className="flex justify-end">
                <Link href={nextHref(section, nav.query, listing.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
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
