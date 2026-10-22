import Link from "next/link";

import {
  AdminButton,
  AdminEmptyState,
  AdminFilterBar,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminSelect,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { FaqCmsInitializeButton } from "@/components/admin/FaqCmsInitializeButton";
import { FaqCmsListClient } from "@/components/admin/FaqCmsListClient";
import type { CmsContentStatus } from "@/generated/prisma/enums";
import {
  CmsContentError,
  getCmsContentScopeSummary,
  listAdminCmsContent,
} from "@/services/cmsContentService";
import { faqCmsScope } from "@/services/faqCmsService";

export const metadata = { title: "Admin FAQs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const validStatuses = new Set<CmsContentStatus>(["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"]);

export default async function AdminFaqCmsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const statusRaw = one(raw.status).trim();
  const status = validStatuses.has(statusRaw as CmsContentStatus)
    ? statusRaw as CmsContentStatus
    : undefined;
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
    <AdminPageShell
      title="FAQs"
      description="Create, review, preview and publish English FAQ content through the versioned CMS."
      actions={
        <div className="flex flex-wrap gap-2">
          <AdminLinkButton href="/admin/content">Back to content</AdminLinkButton>
          {summary.active ? <AdminLinkButton href="/admin/content/faqs/new" variant="primary">Add FAQ</AdminLinkButton> : null}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AdminMetricCard label="Total" value={summary.total} hint="English FAQ CMS records" />
          <AdminMetricCard label="Published" value={summary.published} tone="good" />
          <AdminMetricCard label="Draft" value={summary.draft} tone="info" />
          <AdminMetricCard label="Hidden" value={summary.hidden} tone="warn" />
          <AdminMetricCard label="Archived" value={summary.archived} />
        </div>

        {!summary.available ? (
          <AdminEmptyState
            title="FAQ CMS unavailable"
            message="CMS storage could not be verified. The public FAQ keeps using the existing translated code-backed content while storage is unavailable."
          />
        ) : !summary.active ? (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-950">Initialize English FAQ CMS</h2>
                  <AdminStatusBadge tone="info">Setup required</AdminStatusBadge>
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
            <AdminFilterBar action="/admin/content/faqs">
              <AdminSelect name="status" defaultValue={statusRaw}>
                <option value="">All statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="HIDDEN">Hidden</option>
                <option value="ARCHIVED">Archived</option>
              </AdminSelect>
              <AdminButton type="submit">Apply status</AdminButton>
            </AdminFilterBar>

            {listingError ? (
              <AdminEmptyState title="FAQ list unavailable" message={listingError} />
            ) : listing && listing.items.length > 0 ? (
              <>
                <FaqCmsListClient items={listing.items} />
                {listing.nextCursor ? (
                  <div className="flex justify-end">
                    <Link
                      href={nextPageHref(statusRaw, listing.nextCursor)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                    >
                      Next page
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <AdminEmptyState
                title="No FAQs found"
                message="No FAQ records match the selected lifecycle status."
                action={<AdminLinkButton href="/admin/content/faqs/new" variant="primary">Add FAQ</AdminLinkButton>}
              />
            )}
          </>
        )}
      </div>
    </AdminPageShell>
  );
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function nextPageHref(status: string, cursor: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("cursor", cursor);
  return `/admin/content/faqs?${params.toString()}`;
}
