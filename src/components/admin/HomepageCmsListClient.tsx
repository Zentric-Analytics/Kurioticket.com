"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContentRecordsTable, ContentStatusPill } from "@/components/admin/ContentWorkspace";

import type { HomepageCmsSection } from "@/lib/adminHomepageCms";

type CmsListItem = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  market: string;
  sortOrder: number;
  version: number;
  publishedVersion: number | null;
  updatedAt: string;
  draftPayload: unknown;
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
}: {
  section: HomepageCmsSection;
  items: CmsListItem[];
  listQuery?: string;
}) {
  const editorContext = new URLSearchParams(listQuery);

  return (
    <div className="min-w-0 pt-3">
        <ContentRecordsTable
          columns={["Content", "Market", "Status", "Order", "Version", "Updated", "Action"]}
          rows={items.map((item) => {
            const summary = readSummary(section, item.draftPayload);
            const unpublished = item.publishedVersion !== null && item.version !== item.publishedVersion;
            return {
              id: item.id,
              cells: [
                <div key="content" className="max-w-xl">
                  <p className="text-[13px] font-medium text-[#111827]">{summary.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{summary.detail || "—"}</p>
                </div>,
                item.market,
                <div key="status" className="space-y-1">
                  <ContentStatusPill status={item.status} />
                  {unpublished ? <p className="text-[12px] font-medium text-amber-700">Unpublished changes</p> : null}
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
        />
    </div>
  );
}
