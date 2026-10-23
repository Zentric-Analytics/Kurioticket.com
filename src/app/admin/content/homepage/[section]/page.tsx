import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminButton,
  AdminEmptyState,
  AdminFilterBar,
  AdminLinkButton,
  AdminPageShell,
  AdminSelect,
} from "@/components/admin/AdminPageShell";
import { HomepageCmsListClient } from "@/components/admin/HomepageCmsListClient";
import type { CmsContentStatus } from "@/generated/prisma/enums";
import { getHomepageCmsSection, homepageCmsSections } from "@/lib/adminHomepageCms";
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
  const cursor = one(raw.cursor) || undefined;

  const summary = await getCmsContentScopeSummary(config.type, allowedMarket, homepageCmsLocale).catch(() => null);
  if (!summary?.available || !summary.active) {
    return (
      <AdminPageShell
        title={config.title}
        description="This CMS scope must be initialized before it can be managed."
        actions={<AdminLinkButton href="/admin/content/homepage">Back to homepage content</AdminLinkButton>}
      >
        <AdminEmptyState
          title="CMS scope unavailable"
          message="Initialize Homepage CMS from the homepage content overview before creating or editing this content."
        />
      </AdminPageShell>
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
    <AdminPageShell
      title={config.title}
      description="Manage ordered published content for this CMS scope. Save draft and Publish remain separate actions."
      actions={
        <div className="flex flex-wrap gap-2">
          <AdminLinkButton href="/admin/content/homepage">Back</AdminLinkButton>
          <AdminLinkButton href={`/admin/content/homepage/${section}/new?market=${allowedMarket}`} variant="primary">
            Add {config.singular}
          </AdminLinkButton>
        </div>
      }
    >
      <div className="space-y-4">
        <AdminFilterBar action={`/admin/content/homepage/${section}`}>
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
          <AdminButton type="submit">Apply filters</AdminButton>
        </AdminFilterBar>

        {error ? (
          <AdminEmptyState title="Content unavailable" message={error} />
        ) : listing && listing.items.length > 0 ? (
          <>
            <HomepageCmsListClient section={section} items={listing.items} />
            {listing.nextCursor ? (
              <div className="flex justify-end">
                <Link href={nextHref(section, allowedMarket, statusRaw, listing.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Next page
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <AdminEmptyState
            title="No content found"
            message="No content records match this market and lifecycle status."
            action={<AdminLinkButton href={`/admin/content/homepage/${section}/new?market=${allowedMarket}`} variant="primary">Add {config.singular}</AdminLinkButton>}
          />
        )}
      </div>
    </AdminPageShell>
  );
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function nextHref(section: string, market: string, status: string, cursor: string) {
  const params = new URLSearchParams();
  if (market) params.set("market", market);
  if (status) params.set("status", status);
  params.set("cursor", cursor);
  return `/admin/content/homepage/${section}?${params.toString()}`;
}
