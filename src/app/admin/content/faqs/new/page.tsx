import { ContentPageFrame } from "@/components/admin/ContentWorkspace";
import { redirect } from "next/navigation";


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
    <ContentPageFrame
      title="New FAQ"
      subtitle="Create an English FAQ draft before publishing."
      backHref={nav.listHref}
      backLabel="Back to FAQs"
    >
      <FaqCmsEditor listQuery={nav.query} />
    </ContentPageFrame>
  );
}
