"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminDirectorySelect, type AdminDirectoryOption } from "./AdminDirectorySelect";

type AuditRange = "24h" | "7d" | "30d" | "90d" | "custom";

type Props = {
  action: string;
  adminEmail: string;
  targetType: string;
  targetEmail: string;
  range: AuditRange;
  fromDate: string;
  toDate: string;
  pageHref: string;
};

const rangeOptions: readonly AdminDirectoryOption[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

const baseActionOptions: readonly AdminDirectoryOption[] = [
  { value: "", label: "All actions" },
  { value: "CMS", label: "CMS actions" },
  { value: "PROVIDER", label: "Provider actions" },
  { value: "USER", label: "User actions" },
  { value: "support_ticket", label: "Support actions" },
  { value: "EMAIL", label: "Email actions" },
  { value: "ADMIN_ALERT", label: "Alert actions" },
  { value: "FEATURE_CONTROL_UPDATED", label: "Feature control updates" },
  { value: "TEAM_ACCESS", label: "Team access actions" },
  { value: "HOMEPAGE_FARES", label: "Homepage fare actions" },
];

const baseTargetTypeOptions: readonly AdminDirectoryOption[] = [
  { value: "", label: "All target types" },
  { value: "User", label: "User" },
  { value: "Visitor", label: "Visitor" },
  { value: "Provider", label: "Provider" },
  { value: "SupportTicket", label: "Support ticket" },
  { value: "EmailDelivery", label: "Email delivery" },
  { value: "CmsContentItem", label: "CMS content item" },
  { value: "CmsContentScope", label: "CMS content scope" },
  { value: "AdminCmsIntegrity", label: "CMS integrity" },
  { value: "AdminOperationalTelemetry", label: "Operational telemetry" },
  { value: "AdminOperationalCondition", label: "Operational condition" },
  { value: "PreviewTester", label: "Preview tester" },
  { value: "FeatureFlag", label: "Feature flag" },
];

function withCurrentOption(options: readonly AdminDirectoryOption[], value: string, prefix: string) {
  if (!value || options.some(option => option.value === value)) return options;
  return [{ value, label: prefix + value }, ...options];
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

export function AdminAuditLogsToolbar({
  action,
  adminEmail,
  targetType,
  targetEmail,
  range,
  fromDate,
  toDate,
  pageHref,
}: Props) {
  const router = useRouter();
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeSelectVersion, setRangeSelectVersion] = useState(0);
  const [draftDates, setDraftDates] = useState({ from: fromDate, to: toDate });
  const [adminDraft, setAdminDraft] = useState(adminEmail);
  const [targetDraft, setTargetDraft] = useState(targetEmail);
  const [isPending, startTransition] = useTransition();

  const committedScope = JSON.stringify([pageHref, fromDate, toDate, adminEmail, targetEmail, customOpen]);
  const [previousScope, setPreviousScope] = useState(committedScope);
  if (previousScope !== committedScope) {
    setPreviousScope(committedScope);
    if (!customOpen) setDraftDates({ from: fromDate, to: toDate });
    setAdminDraft(adminEmail);
    setTargetDraft(targetEmail);
  }

  const actionOptions = withCurrentOption(baseActionOptions, action, "Action: ");
  const targetTypeOptions = withCurrentOption(baseTargetTypeOptions, targetType, "Target: ");
  const todayUtc = new Date().toISOString().slice(0, 10);
  const validCustom = validDate(draftDates.from) && validDate(draftDates.to) && draftDates.from <= draftDates.to && draftDates.to <= todayUtc;

  function navigate(values: Record<string, string | null>) {
    const params = new URLSearchParams(pageHref.split("?")[1] || "");
    params.delete("cursor");
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    startTransition(() => router.push("/admin/logs" + (query ? "?" + query : ""), { scroll: false }));
  }

  function changeRange(next: string) {
    if (next === "custom") {
      setDraftDates({ from: fromDate, to: toDate });
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    navigate({ range: next, fromDate: null, toDate: null });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({
      adminEmail: adminDraft.trim() || null,
      targetEmail: targetDraft.trim() || null,
    });
  }

  return (
    <div className="border-b border-[#D8E1EC] py-3">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-2">
          <AdminDirectorySelect
            key={range + ":" + rangeSelectVersion}
            name="range"
            label="Date range"
            value={range}
            options={rangeOptions}
            nativeExcludeValues={["custom"]}
            plain
            onValueChange={changeRange}
          />
          <AdminDirectorySelect
            name="action"
            label="Action"
            value={action}
            options={actionOptions}
            plain
            onValueChange={next => navigate({ action: next || null })}
          />
          <AdminDirectorySelect
            name="targetType"
            label="Target type"
            value={targetType}
            options={targetTypeOptions}
            plain
            onValueChange={next => navigate({ targetType: next || null })}
          />
          <Link
            href="/admin/logs?range=7d"
            className="inline-flex h-10 items-center text-[13px] font-medium text-[#475569] hover:text-[#020617] hover:underline"
          >
            Clear filters
          </Link>
        </div>

        <form onSubmit={submitSearch} className="flex min-w-0 flex-1 flex-wrap items-end justify-end gap-2 lg:max-w-[650px]">
          <label className="min-w-[190px] flex-1 text-[11px] font-medium text-[#64748B]">
            Admin email
            <input
              type="search"
              value={adminDraft}
              onChange={event => setAdminDraft(event.target.value)}
              placeholder="Search admin email"
              className="mt-1 h-10 w-full rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617] outline-none placeholder:text-[#94A3B8] focus:border-[#94A3B8] focus:ring-0"
            />
          </label>
          <label className="min-w-[190px] flex-1 text-[11px] font-medium text-[#64748B]">
            Target email
            <input
              type="search"
              value={targetDraft}
              onChange={event => setTargetDraft(event.target.value)}
              placeholder="Search target email"
              className="mt-1 h-10 w-full rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617] outline-none placeholder:text-[#94A3B8] focus:border-[#94A3B8] focus:ring-0"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply filters
          </button>
        </form>
      </div>

      {(customOpen || range === "custom") ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-medium text-[#64748B]">
            From (UTC)
            <input
              type="date"
              aria-label="Custom start date UTC"
              value={draftDates.from}
              max={draftDates.to || todayUtc}
              onChange={event => {
                setCustomOpen(true);
                setDraftDates(current => ({ ...current, from: event.target.value }));
              }}
              className="mt-1 block h-10 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617]"
            />
          </label>
          <label className="text-[11px] font-medium text-[#64748B]">
            To (UTC)
            <input
              type="date"
              aria-label="Custom end date UTC"
              value={draftDates.to}
              min={draftDates.from || undefined}
              max={todayUtc}
              onChange={event => {
                setCustomOpen(true);
                setDraftDates(current => ({ ...current, to: event.target.value }));
              }}
              className="mt-1 block h-10 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617]"
            />
          </label>
          <button
            type="button"
            disabled={!validCustom || isPending}
            onClick={() => {
              setCustomOpen(false);
              navigate({ range: "custom", fromDate: draftDates.from, toDate: draftDates.to });
            }}
            className="h-10 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply dates
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomOpen(false);
              setDraftDates({ from: fromDate, to: toDate });
              setRangeSelectVersion(version => version + 1);
            }}
            className="h-10 px-2 text-[13px] font-medium text-[#475569] hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {isPending ? (
        <p role="status" aria-live="polite" className="mt-2 inline-flex items-center gap-2 text-[12px] text-[#475569]">
          <LoaderCircle size={14} className="animate-spin text-[#004BB8]" aria-hidden="true" />
          Updating audit logs…
        </p>
      ) : null}
    </div>
  );
}
