"use client";

import { getCmsUnpublishedChangeLabel, type CmsPublicationSnapshot } from "@/lib/adminCmsPublicationStatus";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContentRecordsTable, ContentStatusPill } from "@/components/admin/ContentWorkspace";


type FaqListItem = CmsPublicationSnapshot & {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  sortOrder: number;
  version: number;
  publishedVersion: number | null;
  updatedAt: string;
  draftPayload: unknown;
};

function faqPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { question: "Invalid FAQ draft", answer: "", category: "Uncategorized" };
  }
  const raw = value as Record<string, unknown>;
  return {
    question: typeof raw.question === "string" ? raw.question : "Invalid FAQ draft",
    answer: typeof raw.answer === "string" ? raw.answer : "",
    category: typeof raw.category === "string" ? raw.category : "Uncategorized",
  };
}

export function FaqCmsListClient({ items, listQuery = "" }: { items: FaqListItem[]; listQuery?: string }) {
  const editorContext = new URLSearchParams(listQuery);

  return (
    <div className="min-w-0">
        <ContentRecordsTable
          columns={["Question", "Category", "Status", "Order", "Version", "Updated", "Action"]}
          rows={items.map((item) => {
            const payload = faqPayload(item.draftPayload);
            const unpublishedLabel = getCmsUnpublishedChangeLabel(item);
            return {
              id: item.id,
              cells: [
                <div key="question" className="max-w-xl">
                  <p className="text-[13px] font-medium text-[#111827]">{payload.question}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{payload.answer}</p>
                </div>,
                payload.category,
                <div key="status" className="space-y-1">
                  <ContentStatusPill status={item.status} inline />
                  {unpublishedLabel ? <p className="text-[12px] font-medium text-amber-700">{unpublishedLabel}</p> : null}
                </div>,
                item.sortOrder,
                `v${item.version}`,
                new Date(item.updatedAt).toLocaleString(),
                <Link key="action" href={`/admin/content/faqs/${encodeURIComponent(item.id)}?${editorContext.toString()}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#004BB8] hover:underline">
                  Edit <ArrowUpRight size={14} aria-hidden="true" />
                </Link>,
              ],
            };
          })}
        />
    </div>
  );
}
