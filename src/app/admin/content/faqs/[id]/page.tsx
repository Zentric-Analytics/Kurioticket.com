import { CmsOperationProvider } from "@/components/admin/CmsOperationContext";
import { CmsRevisionPagination } from "@/components/admin/CmsRevisionPagination";
import { ContentPageFrame, ContentSectionHeading, ContentStatusPill } from "@/components/admin/ContentWorkspace";
import { notFound } from "next/navigation";


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

  const raw = await searchParams;
  const revisionBefore = typeof raw.revisionBefore === "string" ? raw.revisionBefore : undefined;
  let result: Awaited<ReturnType<typeof getAdminCmsContent>>;
  try {
    result = await getAdminCmsContent(id, revisionBefore);
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

  const nav = faqCmsListNavigation(raw);

  return (
    <ContentPageFrame
      title="Edit FAQ"
      subtitle="Review the draft, publication status and revision history."
      backHref={nav.listHref}
      backLabel="Back to FAQs"
    >
      <CmsOperationProvider>
      <div className="space-y-5">
        <FaqCmsEditor key={result.item.id} initialItem={result.item} listQuery={nav.query} />

        <section className="mt-7 min-w-0">
          <div className="mb-3">
            <ContentSectionHeading>Revision history</ContentSectionHeading>
            <p className="mt-1 text-[13px] leading-5 text-[#64748B]">
              Saved draft and publication history, with the admin who made each change.
            </p>
          </div>
          {result.revisions.length === 0 ? (
            <p className="py-4 text-[13px] text-[#64748B]">No revisions are recorded for this FAQ.</p>
          ) : (
            <div className="divide-y divide-[#E7ECF5]">
              {result.revisions.map((revision) => {
                const payload = faqPayload(revision.draftPayload);
                return (
                  <div key={revision.id} className="grid gap-3 py-4 lg:grid-cols-[100px_130px_minmax(0,1fr)_210px_150px] lg:items-start">
                    <div>
                      <p className="text-[12px] font-medium text-[#64748B]">Version</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#111827]">v{revision.version}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#64748B]">Action</p>
                      <div className="mt-1">
                        <ContentStatusPill status={revision.action} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#64748B]">Draft snapshot</p>
                      <p className="mt-1 text-[13px] font-medium text-[#334155]">{payload.question || "Invalid legacy question"}</p>
                      <p className="mt-1 text-[12px] text-[#64748B]">{payload.category || "Uncategorized"}</p>
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
                );
              })}
            </div>
          )}
          <CmsRevisionPagination query={nav.query} before={revisionBefore} next={result.nextRevisionBefore} />
        </section>
      </div>
      </CmsOperationProvider>
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
