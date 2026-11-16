import Link from "next/link";
import { ContentEmptyState } from "@/components/admin/ContentWorkspace";
import { CmsRetryButton } from "@/components/admin/CmsRetryButton";

export function CmsScopeUnavailable({ available, partial = false }: { available: boolean; partial?: boolean }) {
  return <ContentEmptyState
    title={!available ? "CMS storage unavailable" : partial ? "CMS setup is incomplete" : "CMS setup required"}
    message={!available
      ? "Content storage could not be reached. Retry to check it again."
      : partial
        ? "Some homepage scopes exist, but this scope is missing. Review CMS Health before changing setup."
        : "This content scope has not been initialized. Review the content overview to set it up."}
    action={!available ? <CmsRetryButton /> : <Link href={partial ? "/admin/system/cms-health" : "/admin/content/homepage"} className="text-[13px] font-medium text-[#004BB8] underline">{partial ? "Review CMS Health" : "Review content setup"}</Link>}
  />;
}
