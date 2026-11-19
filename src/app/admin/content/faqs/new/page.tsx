import { CmsRetryButton } from "@/components/admin/CmsRetryButton";
import Link from "next/link";
import { ContentPageFrame, ContentEmptyState } from "@/components/admin/ContentWorkspace";


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
    return <ContentPageFrame title="New FAQ" backHref={nav.listHref} backLabel="Back to FAQs">
      <ContentEmptyState title={summary.available ? "FAQ CMS setup required" : "FAQ CMS unavailable"}
        message={summary.available ? "Initialize the English FAQ scope from the FAQ directory before creating a draft." : "Content storage could not be reached. Retry to check it again."}
        action={summary.available ? <Link href={nav.listHref} className="text-[13px] text-[#004BB8] underline">Review FAQ setup</Link> : <CmsRetryButton />} />
    </ContentPageFrame>;
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
