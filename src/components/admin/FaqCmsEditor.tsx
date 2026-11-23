"use client";

import { cmsOrderForDisplay, cmsOrderForStorage, CMS_DISPLAY_ORDER_MAX } from "@/lib/cmsOrderPresentation";

import { validateCmsEditor, readCmsFieldErrors, type CmsFieldErrors } from "@/lib/cmsContentValidation";
import { getCmsUnpublishedChangeLabel, type CmsPublicationSnapshot } from "@/lib/adminCmsPublicationStatus";
import { useCmsNavigationGuard } from "@/lib/cmsNavigationGuard";
import { CmsValidationProvider, CmsFieldError, CmsSuccessMessage } from "@/components/admin/CmsEditorFeedback";
import { useCmsOperation } from "@/components/admin/CmsOperationContext";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ContentSectionHeading, ContentStatusPill } from "@/components/admin/ContentWorkspace";
import { CmsEditorActions, type CmsEditorAction } from "@/components/admin/CmsEditorActions";

import {
  AdminButton,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminPageShell";

type FaqCmsItem = CmsPublicationSnapshot & {
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
  const [sortOrder, setSortOrder] = useState(String(cmsOrderForDisplay(initialItem?.sortOrder ?? 0)));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<CmsFieldErrors>({});
  const [conflict, setConflict] = useState(false);
  const [transitionPending, startTransition] = useTransition();
  const { busy: externalBusy } = useCmsOperation();
  const pending = transitionPending || externalBusy;
  const [activeAction, setActiveAction] = useState<CmsEditorAction | null>(null);

  const clientErrors = validateCmsEditor("FAQ", { question, answer, category }, sortOrder);
  const validDraft = Object.keys(clientErrors).length === 0;

  const savedPayload = readPayload(item?.draftPayload);
  const draftDirty = item ? Boolean(
    (
      question.trim() !== savedPayload.question ||
      answer.trim() !== savedPayload.answer ||
      category.trim() !== savedPayload.category ||
      sortOrder !== String(cmsOrderForDisplay(item.sortOrder))
    )
  ) : question !== initialPayload.question || answer !== initialPayload.answer || category !== initialPayload.category || sortOrder !== "1";
  const hasUnpublishedChanges = item ? getCmsUnpublishedChangeLabel(item) !== null : false;
  const fieldErrors = { ...(draftDirty ? clientErrors : {}), ...serverFieldErrors };
  const navigationGuard = useCmsNavigationGuard(draftDirty, pending);

  function clearFeedback() {
    setMessage(null);
    setServerFieldErrors({});
    if (!conflict) setError(null);
  }

  function payload() {
    return {
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim(),
    };
  }

  function createDraft() {
    if (!validDraft || pending) return;
    setMessage(null);
    setError(null);
    setConflict(false);
    setActiveAction("create_draft");
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "FAQ",
            key: `faq-${crypto.randomUUID()}`,
            market: "GLOBAL",
            locale: "en",
            sortOrder: cmsOrderForStorage(sortOrder),
            payload: payload(),
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.item?.id) {
          setServerFieldErrors(readCmsFieldErrors(body.issues));
          setError(typeof body.error === "string" ? body.error : "Unable to create FAQ draft.");
          return;
        }
        navigationGuard.allowNavigation();
        router.replace(`/admin/content/faqs/${encodeURIComponent(body.item.id)}${listQuery ? "?" + listQuery : ""}`);
        router.refresh();
      } catch {
        setError("Unable to create FAQ draft. Check your connection and try again.");
      }
    });
  }

  function saveDraft() {
    if (!item || !validDraft) return;
    mutate("save_draft", {
      payload: payload(),
      sortOrder: cmsOrderForStorage(sortOrder),
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
    if (!item || pending || !window.confirm("Archive this FAQ? Archived content cannot be edited or restored here. Any unsaved edits will be discarded.")) return;
    mutate("archive", {}, "FAQ archived.");
  }

  function mutate(action: "save_draft" | "publish" | "hide" | "archive", extra: Record<string, unknown>, success: string) {
    if (!item || pending) return;
    setMessage(null);
    setError(null);
    setActiveAction(action);
    startTransition(async () => {
      try {
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
          setServerFieldErrors(readCmsFieldErrors(body.issues));
          const serverError = typeof body.error === "string" ? body.error : "Unable to update FAQ.";
          const staleVersion = response.status === 409 && /changed since it was opened|changed concurrently|refresh before|another admin session/i.test(serverError);
          if (staleVersion) {
            setConflict(true);
            setError("This FAQ changed in another admin session. Reload the latest version before making more edits.");
          } else {
            setError(serverError);
          }
          return;
        }
        setConflict(false);
        setItem(body.item as FaqCmsItem);
        if (action === "save_draft" || action === "archive" || !draftDirty) {
          const normalized = readPayload(body.item.draftPayload);
          setQuestion(normalized.question);
          setAnswer(normalized.answer);
          setCategory(normalized.category);
          setSortOrder(String(cmsOrderForDisplay(body.item.sortOrder ?? cmsOrderForStorage(sortOrder))));
        }
        setServerFieldErrors({});
        setMessage(success);
        router.refresh();
      } catch {
        setError("Unable to update FAQ. Check your connection and try again.");
      }
    });
  }

  return (
    <CmsValidationProvider errors={fieldErrors}>
      <div onChangeCapture={clearFeedback} className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 xl:gap-14 [&_input]:rounded-lg [&_select]:rounded-lg [&_textarea]:rounded-lg [&_input]:h-9 [&_select]:h-9 [&_input]:text-[13px] [&_select]:text-[13px] [&_textarea]:text-[13px] [&_input]:font-normal [&_select]:font-normal">
        <div className="space-y-5">
          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <ContentSectionHeading>FAQ details</ContentSectionHeading>
                <p className="mt-1 text-[13px] leading-5 text-[#64748B]">
                  English FAQ content for the Global public FAQ scope.
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
              <CmsFieldError name="question" />
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
              <CmsFieldError name="answer" />
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
                <CmsFieldError name="category" />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium text-[#64748B]">Order</span>
                <AdminInput
                  className="mt-2"
                  type="number"
                  min={1}
                  max={CMS_DISPLAY_ORDER_MAX}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  disabled={pending || item?.status === "ARCHIVED"}
                />
                <CmsFieldError name="sortOrder" />
              </label>
            </div>

            <CmsEditorActions
              status={item?.status}
              pendingAction={pending ? activeAction : null}
              blocked={externalBusy}
              validDraft={validDraft}
              draftDirty={draftDirty}
              onCreate={createDraft}
              onSave={saveDraft}
              onPublish={publish}
              onHide={hide}
              onArchive={archive}
            />

            {item && draftDirty ? (
              <p className="text-[13px] leading-5 text-amber-700" role="status">
                Save this draft before publishing the current edits.
              </p>
            ) : null}
            <CmsSuccessMessage message={message} onDismiss={() => setMessage(null)} />
            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] leading-5 text-rose-700" role="alert">{error}</p> : null}
            {conflict ? (
              <AdminButton className="cursor-pointer" type="button" variant="secondary" onClick={() => window.location.reload()}>
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

        <aside className="h-fit min-w-0">
          <ContentSectionHeading>Draft preview</ContentSectionHeading>
          <h2 className="mt-2 text-[15px] font-semibold text-[#111827]">{question.trim() || "FAQ question"}</h2>
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-5 text-[#475569]">
            {answer.trim() || "The FAQ answer preview will appear here."}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 pt-2 text-[12px] text-[#64748B]">
            <span>{category.trim() || "General"}</span>
            <span>Order {sortOrder || "1"}</span>
          </div>
        </aside>
      </div>
    </CmsValidationProvider>
  );
}

function State({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-2.5">
      <p className="text-[12px] font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 break-words text-[13px] font-medium text-[#334155]">{value}</p>
    </div>
  );
}
