import { redirect } from "next/navigation";

import { AdminLinkButton, AdminPageShell } from "@/components/admin/AdminPageShell";
import { FaqCmsEditor } from "@/components/admin/FaqCmsEditor";
import { getCmsContentScopeSummary } from "@/services/cmsContentService";
import { faqCmsScope } from "@/services/faqCmsService";
import { faqCmsListNavigation } from "@/lib/adminContentNavigation";

export const metadata = { title: "New Admin FAQ" };

export default async function NewAdminFaqPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const nav = faqCmsListNavigation(await searchParams);
  const summary = await getCmsContentScopeSummary("FAQ", faqCmsScope.market, faqCmsScope.locale)
    .catch(() => ({ available: false, active: false }));

  if (!summary.available || !summary.active) {
    redirect("/admin/content/faqs");
  }

  return (
    <AdminPageShell
      title="New FAQ"
      description="Create an English FAQ draft. Publishing remains a separate explicit action."
      actions={<AdminLinkButton href={nav.listHref}>Back to FAQs</AdminLinkButton>}
    >
      <FaqCmsEditor listQuery={nav.query} />
    </AdminPageShell>
  );
}
