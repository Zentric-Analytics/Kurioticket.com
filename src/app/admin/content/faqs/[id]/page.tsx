import { notFound } from "next/navigation";

import {
  AdminLinkButton,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { FaqCmsEditor } from "@/components/admin/FaqCmsEditor";
import { CmsContentError, getAdminCmsContent } from "@/services/cmsContentService";

export const metadata = { title: "Edit Admin FAQ" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminFaqDetailPage({ params }: PageProps) {
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

  return (
    <AdminPageShell
      title="Edit FAQ"
      description="Review the draft, publish intentionally, and inspect the immutable revision trail."
      actions={<AdminLinkButton href="/admin/content/faqs">Back to FAQs</AdminLinkButton>}
    >
      <div className="space-y-5">
        <FaqCmsEditor initialItem={result.item} />

        <AdminSectionCard className="overflow-hidden p-0">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-950">Revision history</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Recent immutable CMS revisions, including the admin identity recorded for each change.
            </p>
          </div>
          {result.revisions.length === 0 ? (
            <p className="p-5 text-sm text-slate-600">No revisions are recorded for this FAQ.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {result.revisions.map((revision) => {
                const payload = faqPayload(revision.draftPayload);
                return (
                  <div key={revision.id} className="grid gap-3 p-5 lg:grid-cols-[120px_140px_minmax(0,1fr)_220px] lg:items-start">
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
                  </div>
                );
              })}
            </div>
          )}
        </AdminSectionCard>
      </div>
    </AdminPageShell>
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
