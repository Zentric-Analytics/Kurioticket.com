import Link from "next/link";

import { ContentPageFrame, ContentEmptyState, ContentMetric, ContentStatusPill } from "@/components/admin/ContentWorkspace";
import { HomepageCmsInitializeButton } from "@/components/admin/HomepageCmsInitializeButton";
import { getCmsContentScopeSummary } from "@/services/cmsContentService";
import { getHomepageCmsInitializationReadiness, homepageCmsLocale } from "@/services/homepageCmsService";

export const metadata = { title: "Admin Homepage Content" };

export default async function AdminHomepageContentPage() {
  const [destinations, flights, hotels, initializationReadiness] = await Promise.all([
    getCmsContentScopeSummary("HOMEPAGE_DESTINATION", "US", homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("FLIGHT_ROUTE", "US", homepageCmsLocale).catch(() => null),
    getCmsContentScopeSummary("HOTEL_DESTINATION", "GLOBAL", homepageCmsLocale).catch(() => null),
    getHomepageCmsInitializationReadiness().catch(() => null),
  ]);

  const available = Boolean(destinations?.available && flights?.available && hotels?.available && initializationReadiness?.available);
  const active = Boolean(destinations?.active && flights?.active && hotels?.active);
  const partiallyInitialized = !active && Boolean(initializationReadiness?.hasExistingHomepageData);

  return (
    <ContentPageFrame
      title="Homepage content"
      subtitle="Manage homepage destinations, flight routes and hotel destinations."
      backHref="/admin/content"
      backLabel="Back to Content"
    >
      <div className="space-y-5">
        {!available ? (
          <ContentEmptyState
            title="Homepage CMS unavailable"
            message="CMS storage could not be verified. The public homepage continues using the existing code-backed content."
          />
        ) : partiallyInitialized ? (
          <ContentEmptyState
            title="Homepage CMS setup is incomplete"
            message="Some homepage scopes exist, so the full initialisation action cannot safely be run again. Review the affected scopes in System → CMS Health before changing content."
            action={<Link href="/admin/system/cms-health" className="inline-flex text-sm font-semibold text-indigo-700 hover:underline">Review CMS Health</Link>}
          />
        ) : !active ? (
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-950">Initialize homepage CMS</h2>
                  <ContentStatusPill status="Setup required" />
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Import the current homepage destinations, flight routes and canonical hotel destinations as the first published CMS versions. This is an explicit audited action.
                </p>
              </div>
              <HomepageCmsInitializeButton />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 border-b border-[#E5E7EB] pb-4 sm:grid-cols-3">
              <ContentMetric label="US destination cards" value={destinations?.total ?? 0} />
              <ContentMetric label="US flight routes" value={flights?.total ?? 0} />
              <ContentMetric label="Hotel destinations" value={hotels?.total ?? 0} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <ContentArea
                title="Homepage destinations"
                description="Market-scoped destination cards used by the popular destination/stay surface."
                href="/admin/content/homepage/destinations?from=overview"
              />
              <ContentArea
                title="Flight route cards"
                description="Market-scoped discovery and regional route cards. Order controls which cards appear first."
                href="/admin/content/homepage/flight-routes?from=overview"
              />
              <ContentArea
                title="Hotel destinations"
                description="Canonical GLOBAL hotel destination identities used for safe hotel discovery."
                href="/admin/content/homepage/hotel-destinations?from=overview"
              />
            </div>
          </>
        )}
      </div>
    </ContentPageFrame>
  );
}

function ContentArea({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-[#111827]">{title}</h2>
        <ContentStatusPill status="CMS managed" />
      </div>
      <p className="mt-2 text-[13px] leading-5 text-[#64748B]">{description}</p>
      <Link href={href} className="mt-4 inline-flex text-[13px] font-medium text-[#004BB8] hover:underline">
        Manage
      </Link>
    </div>
  );
}
