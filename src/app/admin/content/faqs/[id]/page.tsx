import { ContentPageFrame, ContentSectionHeading, ContentStatusPill } from "@/components/admin/ContentWorkspace";
import { notFound } from "next/navigation";

import { AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { FaqCmsEditor } from "@/components/admin/FaqCmsEditor";
import { CmsRevisionRestoreButton } from "@/components/admin/CmsRevisionRestoreButton";
import { CmsContentError, getAdminCmsContent } from "@/services/cmsContentService";
import { faqCmsListNavigation } from "@/lib/adminContentNavigation";

export const metadata = { title: "Edit Admin FAQ" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFaqDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;

  let result: Awaited<ReturnType<typeof getAdminCmsContent>>;
  try {
    result = await getAdminCmsContent(id);
  } catch (error) {
    if (error instanceof CmsContentError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  if (
    result.item.type !== "FAQ" ||
    result.item.market !== "GLOBAL" ||
    result.item.locale !== "en"
  ) {
    notFound();
  }

  const nav = faqCmsListNavigation(await searchParams);

  return (
    <ContentPageFrame
      title="Edit FAQ"
      subtitle="Review the draft, publication status and revision history."
      backHref={nav.listHref}
      backLabel="Back to FAQs"
    >
      <div className="space-y-5">
        <FaqCmsEditor initialItem={result.item} listQuery={nav.query} />

        <section className="mt-7 min-w-0">
          <div className="mb-3">
            <ContentSectionHeading>Revision history</ContentSectionHeading>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Recent immutable CMS revisions, including the admin identity recorded for each change.
            </p>
          </div>
          {result.revisions.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">No revisions are recorded for this FAQ.</p>
          ) : (
            <div className="divide-y divide-[#E5E7EB] border-t border-[#E5E7EB]">
              {result.revisions.map((revision) => {
                const payload = faqPayload(revision.draftPayload);
                return (
                  <div key={revision.id} className="grid gap-3 py-4 lg:grid-cols-[100px_130px_minmax(0,1fr)_210px_150px] lg:items-start">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Version</p>
                      <p className="mt-1 font-black text-slate-950">v{revision.version}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Action</p>
                      <div className="mt-1">
                        <AdminStatusBadge tone={revision.action === "PUBLISHED" ? "good" : revision.action === "ARCHIVED" ? "neutral" : revision.action === "HIDDEN" ? "warn" : "info"}>
                          {revision.action}
                        </AdminStatusBadge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Draft snapshot</p>
                      <p className="mt-1 font-bold text-slate-950">{payload.question || "Invalid legacy question"}</p>
                      <p className="mt-1 text-xs text-slate-500">{payload.category || "Uncategorized"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Recorded</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(revision.createdAt).toLocaleString()}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{revision.actorEmail}</p>
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
                );
              })}
            </div>
          )}
        </section>
      </div>
    </ContentPageFrame>
  );
}

function faqPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { question: "", category: "" };
  }
  const raw = value as Record<string, unknown>;
  return {
    question: typeof raw.question === "string" ? raw.question : "",
    category: typeof raw.category === "string" ? raw.category : "",
  };
}
