"use client";

import React from "react";
import { Archive, EyeOff, LoaderCircle, Save, Upload, type LucideIcon } from "lucide-react";

export type CmsEditorAction = "create_draft" | "save_draft" | "publish" | "hide" | "archive";

type Props = {
  status?: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  pendingAction: CmsEditorAction | null;
  validDraft: boolean;
  blocked?: boolean;
  draftDirty: boolean;
  onCreate: () => void;
  onSave: () => void;
  onPublish: () => void;
  onHide: () => void;
  onArchive: () => void;
};

const loadingLabels: Record<CmsEditorAction, string> = {
  create_draft: "Creating…",
  save_draft: "Saving…",
  publish: "Publishing…",
  hide: "Hiding…",
  archive: "Archiving…",
};

export function CmsEditorActions({ status, pendingAction, blocked = false, validDraft, draftDirty, onCreate, onSave, onPublish, onHide, onArchive }: Props) {
  if (status === "ARCHIVED") return null;
  const busy = blocked || pendingAction !== null;

  function actionButton(action: CmsEditorAction, label: string, Icon: LucideIcon, onClick: () => void, disabled = false, tone: "primary" | "secondary" | "quiet" | "danger" = "secondary") {
    const loading = pendingAction === action;
    const colors = {
      primary: "border-[#111827] bg-[#111827] text-white enabled:hover:border-[#303846] enabled:hover:bg-[#303846]",
      secondary: "border-[#D8E1EC] bg-white text-[#374151] enabled:hover:border-[#B8C3D1] enabled:hover:bg-[#F8FAFC]",
      quiet: "border-transparent bg-transparent text-[#64748B] enabled:hover:bg-[#F1F5F9] enabled:hover:text-[#111827]",
      danger: "border-transparent bg-transparent text-[#B42318] enabled:hover:bg-[#FEF3F2] enabled:hover:text-[#912018]",
    };
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy || disabled}
        aria-busy={loading || undefined}
        className={`inline-flex h-10 cursor-pointer shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50 ${colors[tone]}`}
      >
        {loading ? <LoaderCircle size={15} className="shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <Icon size={15} className="shrink-0" aria-hidden="true" />}
        <span className="grid">
          <span className={`col-start-1 row-start-1 ${loading ? "invisible" : ""}`} aria-hidden={loading}>{label}</span>
          <span className={`col-start-1 row-start-1 ${loading ? "" : "invisible"}`} aria-hidden={!loading}>{loadingLabels[action]}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap items-center gap-2">
        {!status ? actionButton("create_draft", "Create draft", Save, onCreate, !validDraft, "primary") : (
          <>
            {actionButton("save_draft", "Save draft", Save, onSave, !validDraft)}
            {actionButton("publish", "Publish", Upload, onPublish, !validDraft || draftDirty, "primary")}
          </>
        )}
      </div>
      {status ? (
        <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
          {status === "PUBLISHED" ? actionButton("hide", "Hide", EyeOff, onHide, false, "quiet") : null}
          {actionButton("archive", "Archive", Archive, onArchive, false, "danger")}
        </div>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">{pendingAction ? loadingLabels[pendingAction] : ""}</span>
    </div>
  );
}
