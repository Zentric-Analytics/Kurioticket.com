"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminInput,
  AdminSelect,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";

type FaqListItem = {
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

function tone(status: FaqListItem["status"]) {
  if (status === "PUBLISHED") return "good" as const;
  if (status === "HIDDEN") return "warn" as const;
  if (status === "ARCHIVED") return "neutral" as const;
  return "info" as const;
}

export function FaqCmsListClient({ items }: { items: FaqListItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => faqPayload(item.draftPayload).category))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const payload = faqPayload(item.draftPayload);
      if (category && payload.category !== category) return false;
      if (!q) return true;
      return [payload.question, payload.answer, payload.category].some((value) =>
        value.toLowerCase().includes(q),
      );
    });
  }, [category, items, query]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px]">
        <AdminInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions, answers or categories"
          aria-label="Search FAQs on this page"
        />
        <AdminSelect
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter FAQs by category"
        >
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </AdminSelect>
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          title="No FAQs match"
          message="No FAQ on this page matches the selected search and category filters."
        />
      ) : (
        <AdminDataTable
          columns={["Question", "Category", "Status", "Order", "Version", "Updated", "Action"]}
          rows={filtered.map((item) => {
            const payload = faqPayload(item.draftPayload);
            const hasUnpublishedChanges = item.publishedVersion !== null && item.version !== item.publishedVersion;
            return {
              id: item.id,
              cells: [
                <div key="question" className="max-w-xl">
                  <p className="font-black text-slate-950">{payload.question}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{payload.answer}</p>
                </div>,
                payload.category,
                <div key="status" className="space-y-1">
                  <AdminStatusBadge tone={tone(item.status)}>{item.status}</AdminStatusBadge>
                  {hasUnpublishedChanges ? <p className="text-xs font-bold text-amber-700">Unpublished changes</p> : null}
                </div>,
                item.sortOrder,
                `v${item.version}`,
                new Date(item.updatedAt).toLocaleString(),
                <Link key="action" href={`/admin/content/faqs/${item.id}`} className="font-black text-indigo-700 hover:text-indigo-900">
                  Edit
                </Link>,
              ],
            };
          })}
        />
      )}
    </div>
  );
}
