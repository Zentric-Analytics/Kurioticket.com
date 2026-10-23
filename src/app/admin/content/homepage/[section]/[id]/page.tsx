import { notFound } from "next/navigation";

import {
  AdminLinkButton,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { HomepageCmsEditor } from "@/components/admin/HomepageCmsEditor";
import { hotelDestinations } from "@/data/hotelDestinations";
import { getHomepageCmsSection, homepageCmsSections } from "@/lib/adminHomepageCms";
import { CmsContentError, getAdminCmsContent } from "@/services/cmsContentService";
import { homepageCmsMarkets } from "@/services/homepageCmsService";

type PageProps = { params: Promise<{ section: string; id: string }> };

export default async function HomepageCmsDetailPage({ params }: PageProps) {
  const { section: rawSection, id } = await params;
  const section = getHomepageCmsSection(rawSection);
  if (!section) notFound();

  const config = homepageCmsSections[section];
  let result: Awaited<ReturnType<typeof getAdminCmsContent>>;
  try {
    result = await getAdminCmsContent(id);
  } catch (error) {
    if (error instanceof CmsContentError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  if (result.item.type !== config.type || result.item.locale !== "en") notFound();

  return (
    <AdminPageShell
      title={`Edit ${config.singular}`}
      description="Review the draft, publish intentionally, and inspect the immutable revision trail."
      actions={<AdminLinkButton href={`/admin/content/homepage/${section}?market=${result.item.market}`}>Back</AdminLinkButton>}
    >
      <div className="space-y-5">
        <HomepageCmsEditor
          section={section}
          markets={homepageCmsMarkets}
          initialMarket={result.item.market}
          initialItem={result.item}
          hotelOptions={section === "hotel-destinations" ? getHotelOptions() : []}
        />

        <AdminSectionCard className="overflow-hidden p-0">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-950">Revision history</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Recent immutable draft and published snapshots.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {result.revisions.map((revision) => (
              <div key={revision.id} className="grid gap-3 p-5 lg:grid-cols-[100px_140px_120px_minmax(0,1fr)_220px]">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Version</p>
                  <p className="mt-1 font-black text-slate-950">v{revision.version}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Action</p>
                  <div className="mt-1"><AdminStatusBadge tone={revision.action === "PUBLISHED" ? "good" : revision.action === "HIDDEN" ? "warn" : revision.action === "ARCHIVED" ? "neutral" : "info"}>{revision.action}</AdminStatusBadge></div>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Market</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{revision.market}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Snapshot</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{revisionTitle(section, revision.draftPayload)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Recorded</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(revision.createdAt).toLocaleString()}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{revision.actorEmail}</p>
                </div>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}

function revisionTitle(section: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Invalid legacy snapshot";
  const raw = value as Record<string, unknown>;
  const key = section === "destinations" ? "city" : section === "flight-routes" ? "title" : "name";
  return typeof raw[key] === "string" ? raw[key] : "Invalid legacy snapshot";
}

function getHotelOptions() {
  return hotelDestinations.map((destination) => ({
    canonicalId: `hotel:${destination.id}`,
    label: `${destination.name} · ${destination.country}`,
    name: destination.name,
    country: destination.country,
    countryCode: destination.countryCode,
    kind: destination.kind,
    searchValue: destination.searchValue,
  }));
}
