import Link from "next/link";

import { AdminButton, AdminSelect } from "@/components/admin/AdminPageShell";
import { ContentPageFrame, ContentEmptyState, ContentMetric, ContentStatusPill } from "@/components/admin/ContentWorkspace";
import { FaqCmsInitializeButton } from "@/components/admin/FaqCmsInitializeButton";
import { FaqCmsListClient } from "@/components/admin/FaqCmsListClient";
import { CmsCreateLink } from "@/components/admin/CmsCreateLink";
import type { CmsContentStatus } from "@/generated/prisma/enums";
import {
  CmsContentError,
  getCmsContentScopeSummary,
  listAdminCmsContent,
} from "@/services/cmsContentService";
import { faqCmsScope } from "@/services/faqCmsService";
import { faqCmsListNavigation } from "@/lib/adminContentNavigation";

export const metadata = { title: "Admin FAQs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const validStatuses = new Set<CmsContentStatus>(["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"]);

export default async function AdminFaqCmsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const statusRaw = one(raw.status).trim();
  const status = validStatuses.has(statusRaw as CmsContentStatus)
    ? statusRaw as CmsContentStatus
    : undefined;
  const nav = faqCmsListNavigation(raw);
  const cursor = one(raw.cursor) || undefined;

  const summary = await getCmsContentScopeSummary("FAQ", faqCmsScope.market, faqCmsScope.locale)
    .catch(() => ({
      available: false,
      active: false,
      total: 0,
      draft: 0,
      published: 0,
      hidden: 0,
      archived: 0,
    }));

  let listing:
    | Awaited<ReturnType<typeof listAdminCmsContent>>
    | null = null;
  let listingError: string | null = null;

  if (summary.available) {
    try {
      listing = await listAdminCmsContent({
        type: "FAQ",
        status,
        market: faqCmsScope.market,
        locale: faqCmsScope.locale,
        limit: 100,
        cursor,
      });
    } catch (error) {
      listingError = error instanceof CmsContentError ? error.message : "FAQ CMS data is unavailable.";
    }
  }

  return (
    <ContentPageFrame
      title="FAQs"
      subtitle="Manage English FAQ questions and answers."
      backHref="/admin/content"
      backLabel="Back to Content"
      actions={summary.active ? <CmsCreateLink path="/admin/content/faqs/new" label="Add FAQ" /> : null}
    >
      <div className="space-y-5">
        <div className="grid gap-4 border-b border-[#E5E7EB] pb-4 sm:grid-cols-3 lg:grid-cols-5">
          <ContentMetric label="Total" value={summary.total} />
          <ContentMetric label="Published" value={summary.published} />
          <ContentMetric label="Draft" value={summary.draft} />
          <ContentMetric label="Hidden" value={summary.hidden} />
          <ContentMetric label="Archived" value={summary.archived} />
        </div>

        {!summary.available ? (
          <ContentEmptyState
            title="FAQ CMS unavailable"
            message="CMS storage could not be verified. The public FAQ keeps using the existing translated code-backed content while storage is unavailable."
          />
        ) : !summary.active ? (
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-950">Initialize English FAQ CMS</h2>
                  <ContentStatusPill status="Setup required" />
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Import the current English FAQs as the first published CMS version. This is an explicit audited action; nothing is imported merely by opening this page.
                </p>
              </div>
              <FaqCmsInitializeButton />
            </div>
          </div>
        ) : (
          <>
            <form action="/admin/content/faqs" className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-3 [&_select]:w-auto [&_select]:min-w-[150px]">
              <AdminSelect name="status" defaultValue={statusRaw}>
                <option value="">All statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="HIDDEN">Hidden</option>
                <option value="ARCHIVED">Archived</option>
              </AdminSelect>
              <AdminButton size="sm" className="rounded-lg font-medium shadow-none" type="submit">Apply status</AdminButton>
            </form>

            {listingError ? (
              <ContentEmptyState title="FAQ list unavailable" message={listingError} />
            ) : listing && listing.items.length > 0 ? (
              <>
                <FaqCmsListClient items={listing.items} listQuery={nav.query} />
                {listing.nextCursor ? (
                  <div className="flex justify-end">
                    <Link
                      href={nextPageHref(nav.query, listing.nextCursor)}
                      className="inline-flex h-9 items-center rounded-lg border border-[#D9DDE3] bg-white px-3 text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC]"
                    >
                      Next page
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <ContentEmptyState
                title="No FAQs found"
                message="No FAQ records match the selected lifecycle status."
                action={<CmsCreateLink path="/admin/content/faqs/new" label="Add FAQ" />}
              />
            )}
          </>
        )}
      </div>
    </ContentPageFrame>
  );
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function nextPageHref(query: string, cursor: string) {
  const params = new URLSearchParams(query);
  params.set("cursor", cursor);
  return "/admin/content/faqs?" + params.toString();
}
