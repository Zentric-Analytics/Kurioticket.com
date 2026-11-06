"use client";

import { CmsSuccessMessage } from "@/components/admin/CmsEditorFeedback";
import { useState } from "react";

import Link from "next/link";
import { ArrowUpRight, GripVertical } from "lucide-react";
import { CmsCardReorder } from "@/components/admin/CmsCardReorder";
import { ContentRecordsTable, ContentStatusPill } from "@/components/admin/ContentWorkspace";

import type { HomepageCmsSection } from "@/lib/adminHomepageCms";
import { getCmsUnpublishedChangeLabel } from "@/lib/adminCmsPublicationStatus";
import { getCmsMarketName } from "@/lib/adminCmsMarketLabels";

type CmsListItem = {
  id: string;
  key: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  market: string;
  sortOrder: number;
  version: number;
  publishedVersion: number | null;
  updatedAt: string;
  draftPayload: unknown;
  publishedPayload: unknown;
  publishedMarket: string | null;
  locale: string;
  publishedLocale: string | null;
  publishedSortOrder: number | null;
};

function readSummary(section: HomepageCmsSection, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { title: "Invalid content", detail: "" };
  }
  const raw = value as Record<string, unknown>;

  if (section === "destinations") {
    const city = typeof raw.city === "string" ? raw.city : "Invalid destination";
    const country = typeof raw.country === "string" ? raw.country : "";
    const origin = typeof raw.originCode === "string" ? raw.originCode : "";
    const destination = typeof raw.destinationCode === "string" ? raw.destinationCode : "";
    return { title: city, detail: [country, origin && destination ? `${origin} → ${destination}` : ""].filter(Boolean).join(" · ") };
  }

  if (section === "flight-routes") {
    const title = typeof raw.title === "string" ? raw.title : "Invalid route";
    const origin = typeof raw.originCode === "string" ? raw.originCode : "";
    const destination = typeof raw.destinationCode === "string" ? raw.destinationCode : "";
    return { title, detail: origin && destination ? `${origin} → ${destination}` : "" };
  }

  const name = typeof raw.name === "string" ? raw.name : "Invalid hotel destination";
  const country = typeof raw.country === "string" ? raw.country : "";
  const canonicalId = typeof raw.canonicalId === "string" ? raw.canonicalId : "";
  return { title: name, detail: [country, canonicalId].filter(Boolean).join(" · ") };
}

export function HomepageCmsListClient({
  section,
  items,
  listQuery = "",
  reorderMarket,
}: {
  section: HomepageCmsSection;
  items: CmsListItem[];
  listQuery?: string;
  reorderMarket?: string;
}) {
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderMessage, setReorderMessage] = useState<string | null>(null);
  const editorContext = new URLSearchParams(listQuery);

  return (
    <div className="min-w-0 space-y-3">
      {reorderMarket && section !== "hotel-destinations" ? (
        <div>
          {reorderOpen ? (
            <CmsCardReorder
              section={section}
              market={reorderMarket}
              rows={items}
              onDone={(message) => {
                setReorderOpen(false);
                if (message) setReorderMessage(message);
              }}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><CmsSuccessMessage message={reorderMessage} onDismiss={() => setReorderMessage(null)} />{!reorderMessage ? <p className="text-[12px] text-[#64748B]">Change card positions without editing their Order numbers individually.</p> : null}</div>
              <button type="button" onClick={() => { setReorderMessage(null); setReorderOpen(true); }}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#374151] transition-colors hover:border-[#6D28D9] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-[#6D28D9]">
                <GripVertical size={15} aria-hidden="true" /> Reorder cards
              </button>
            </div>
          )}
        </div>
      ) : null}
      {reorderOpen ? null : <ContentRecordsTable
          columns={["Content", "Market", "Status", "Order", "Version", "Updated", "Action"]}
          rows={items.map((item) => {
            const summary = readSummary(section, item.draftPayload);
            const unpublishedLabel = getCmsUnpublishedChangeLabel(item);
            return {
              id: item.id,
              cells: [
                <div key="content" className="max-w-xl">
                  <p className="text-[13px] font-medium text-[#111827]">{summary.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{summary.detail || "—"}</p>
                </div>,
                getCmsMarketName(item.market),
                <div key="status" className="space-y-1">
                  <ContentStatusPill status={item.status} inline />
                  {unpublishedLabel ? <p className="text-[12px] font-medium text-amber-700">{unpublishedLabel}</p> : null}
                </div>,
                item.sortOrder,
                `v${item.version}`,
                new Date(item.updatedAt).toLocaleString(),
                <Link key="action" href={`/admin/content/homepage/${section}/${encodeURIComponent(item.id)}?${editorContext.toString()}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#004BB8] hover:underline">
                  Edit <ArrowUpRight size={14} aria-hidden="true" />
                </Link>,
              ],
            };
          })}
        />}
    </div>
  );
}
