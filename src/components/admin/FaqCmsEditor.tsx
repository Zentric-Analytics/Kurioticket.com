"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ContentSectionHeading, ContentStatusPill } from "@/components/admin/ContentWorkspace";

import {
  AdminButton,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminPageShell";

type FaqCmsItem = {
  id: string;
  key: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  market: string;
  locale: string;
  sortOrder: number;
  version: number;
  publishedVersion: number | null;
  publishedAt: string | null;
  draftPayload: unknown;
};

function readPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { question: "", answer: "", category: "General" };
  }
  const raw = value as Record<string, unknown>;
  return {
    question: typeof raw.question === "string" ? raw.question : "",
    answer: typeof raw.answer === "string" ? raw.answer : "",
    category: typeof raw.category === "string" ? raw.category : "General",
  };
}

export function FaqCmsEditor({ initialItem, listQuery = "" }: { initialItem?: FaqCmsItem; listQuery?: string }) {
  const router = useRouter();
  const initialPayload = useMemo(() => readPayload(initialItem?.draftPayload), [initialItem]);
  const [item, setItem] = useState<FaqCmsItem | undefined>(initialItem);
  const [question, setQuestion] = useState(initialPayload.question);
  const [answer, setAnswer] = useState(initialPayload.answer);
  const [category, setCategory] = useState(initialPayload.category);
  const [sortOrder, setSortOrder] = useState(String(initialItem?.sortOrder ?? 0));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();

  const validDraft =
    question.trim().length > 0 &&
    answer.trim().length > 0 &&
    category.trim().length > 0 &&
    Number.isInteger(Number(sortOrder)) &&
    Number(sortOrder) >= 0;

  const savedPayload = readPayload(item?.draftPayload);
  const draftDirty = Boolean(
    item &&
    (
      question.trim() !== savedPayload.question ||
      answer.trim() !== savedPayload.answer ||
      category.trim() !== savedPayload.category ||
      Number(sortOrder) !== item.sortOrder
    )
  );
  const hasUnpublishedChanges =
    item?.publishedVersion !== null &&
    item?.publishedVersion !== undefined &&
    item.version !== item.publishedVersion;

  function payload() {
    return {
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim(),
    };
  }

  function createDraft() {
    if (!validDraft) return;
    setMessage(null);
    setError(null);
    setConflict(false);
    startTransition(async () => {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FAQ",
          key: `faq-${crypto.randomUUID()}`,
          market: "GLOBAL",
          locale: "en",
          sortOrder: Number(sortOrder),
          payload: payload(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.item?.id) {
        setError(typeof body.error === "string" ? body.error : "Unable to create FAQ draft.");
        return;
      }
      router.replace(`/admin/content/faqs/${encodeURIComponent(body.item.id)}${listQuery ? "?" + listQuery : ""}`);
      router.refresh();
    });
  }

  function saveDraft() {
    if (!item || !validDraft) return;
    mutate("save_draft", {
      payload: payload(),
      sortOrder: Number(sortOrder),
    }, "Draft saved.");
  }

  function publish() {
    if (!item || !validDraft || draftDirty) return;
    mutate("publish", {}, "FAQ published.");
  }

  function hide() {
    if (!item) return;
    mutate("hide", {}, "FAQ hidden from the public FAQ scope.");
  }

  function archive() {
    if (!item || !window.confirm("Archive this FAQ? Archived content cannot be edited in this CMS phase.")) return;
    mutate("archive", {}, "FAQ archived.");
  }

  function mutate(action: "save_draft" | "publish" | "hide" | "archive", extra: Record<string, unknown>, success: string) {
    if (!item) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expectedVersion: item.version,
          ...extra,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.item) {
        if (response.status === 409) {
          setConflict(true);
          setError("This FAQ changed in another admin session. Reload the latest version before making more edits.");
        } else {
          setError(typeof body.error === "string" ? body.error : "Unable to update FAQ.");
        }
        return;
      }
      setConflict(false);
      setItem(body.item as FaqCmsItem);
      setSortOrder(String(body.item.sortOrder ?? Number(sortOrder)));
      setMessage(success);
      router.refresh();
    });
  }

  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 xl:gap-14 [&_input]:rounded-lg [&_select]:rounded-lg [&_textarea]:rounded-lg [&_input]:h-9 [&_select]:h-9 [&_input]:text-[13px] [&_select]:text-[13px] [&_textarea]:text-[13px] [&_input]:font-normal [&_select]:font-normal">
      <div className="space-y-5">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <ContentSectionHeading>{item ? "Edit FAQ" : "Create FAQ draft"}</ContentSectionHeading>
              <p className="mt-1 text-[13px] leading-5 text-[#64748B]">
                English FAQ content for the GLOBAL public FAQ scope.
              </p>
            </div>
            {item ? <ContentStatusPill status={item.status} /> : null}
          </div>

          <label className="block">
            <span className="text-[12px] font-medium text-[#64748B]">Question</span>
            <AdminInput
              className="mt-2"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={240}
              disabled={pending || item?.status === "ARCHIVED"}
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-medium text-[#64748B]">Answer</span>
            <AdminTextarea
              className="mt-2 min-h-44"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              maxLength={5000}
              disabled={pending || item?.status === "ARCHIVED"}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <label className="block">
              <span className="text-[12px] font-medium text-[#64748B]">Category</span>
              <AdminInput
                className="mt-2"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={80}
                disabled={pending || item?.status === "ARCHIVED"}
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-[#64748B]">Order</span>
              <AdminInput
                className="mt-2"
                type="number"
                min={0}
                max={100000}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                disabled={pending || item?.status === "ARCHIVED"}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[#E5E7EB] pt-4 [&_button]:rounded-lg [&_button]:text-[13px] [&_button]:font-medium [&_button]:shadow-none">
            {!item ? (
              <AdminButton type="button" onClick={createDraft} loading={pending} disabled={!validDraft}>
                Create draft
              </AdminButton>
            ) : item.status !== "ARCHIVED" ? (
              <>
                <AdminButton type="button" variant="secondary" onClick={saveDraft} loading={pending} disabled={!validDraft}>
                  Save draft
                </AdminButton>
                <AdminButton type="button" onClick={publish} loading={pending} disabled={!validDraft || draftDirty}>
                  Publish
                </AdminButton>
                {item.status === "PUBLISHED" ? (
                  <AdminButton type="button" variant="secondary" onClick={hide} loading={pending}>
                    Hide
                  </AdminButton>
                ) : null}
                <AdminButton type="button" variant="destructive" onClick={archive} loading={pending}>
                  Archive
                </AdminButton>
              </>
            ) : null}
          </div>

          {item && draftDirty ? (
            <p className="text-sm font-bold text-amber-700" role="status">
              Save this draft before publishing the current edits.
            </p>
          ) : null}
          {message ? <p className="text-sm font-bold text-emerald-700" role="status">{message}</p> : null}
          {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">{error}</p> : null}
          {conflict ? (
            <AdminButton type="button" variant="secondary" onClick={() => window.location.reload()}>
              Reload latest
            </AdminButton>
          ) : null}
        </section>

        {item ? (
          <section className="mt-6 min-w-0">
            <ContentSectionHeading>Publishing state</ContentSectionHeading>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <State label="Draft version" value={`v${item.version}`} />
              <State label="Published version" value={item.publishedVersion ? `v${item.publishedVersion}` : "Not published"} />
              <State label="Unpublished changes" value={hasUnpublishedChanges ? "Yes" : "No"} />
              <State label="Published at" value={item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "—"} />
            </div>
          </section>
        ) : null}
      </div>

      <aside className="h-fit min-w-0 lg:sticky lg:top-24">
        <ContentSectionHeading>Draft preview</ContentSectionHeading>
        <h2 className="mt-2 text-[15px] font-semibold text-[#111827]">{question.trim() || "FAQ question"}</h2>
        <p className="mt-3 whitespace-pre-wrap text-[13px] leading-5 text-[#475569]">
          {answer.trim() || "The FAQ answer preview will appear here."}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-4 text-[12px] text-[#64748B]">
          <span>{category.trim() || "General"}</span>
          <span>Order {sortOrder || "0"}</span>
        </div>
      </aside>
    </div>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[#E5E7EB] py-2.5">
      <p className="text-[12px] font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 break-words text-[13px] font-medium text-[#334155]">{value}</p>
    </div>
  );
}
