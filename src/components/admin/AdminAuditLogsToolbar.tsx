"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminDirectorySelect, type AdminDirectoryOption } from "./AdminDirectorySelect";

type AuditRange = "24h" | "7d" | "30d" | "all" | "90d" | "custom";

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
  { value: "all", label: "All time" },
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
  { value: "ADMIN_NOTIFICATION_PREFERENCE_UPDATED", label: "Notification preference updates" },
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
  { value: "AdminNotificationPreference", label: "Notification preference" },
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
  const [draftRange, setDraftRange] = useState<AuditRange>(range);
  const [draftAction, setDraftAction] = useState(action);
  const [draftTargetType, setDraftTargetType] = useState(targetType);
  const [rangeSelectVersion, setRangeSelectVersion] = useState(0);
  const [draftDates, setDraftDates] = useState({ from: fromDate, to: toDate });
  const [adminDraft, setAdminDraft] = useState(adminEmail);
  const [targetDraft, setTargetDraft] = useState(targetEmail);
  const [isPending, startTransition] = useTransition();
  const adminDraftRef = useRef(adminEmail);
  const targetDraftRef = useRef(targetEmail);
  const searchEditingRef = useRef(false);
  const [searchEditing, setSearchEditing] = useState(false);
  const lastSubmittedSearchRef = useRef<string | null>(null);
  const paramsRef = useRef(new URLSearchParams(pageHref.split("?")[1] || ""));

  useEffect(() => {
    paramsRef.current = new URLSearchParams(pageHref.split("?")[1] || "");
    setDraftRange(range);
    setDraftAction(action);
    setDraftTargetType(targetType);
  }, [pageHref, range, action, targetType]);

  const committedScope = JSON.stringify([pageHref, fromDate, toDate, customOpen]);
  const [previousScope, setPreviousScope] = useState(committedScope);
  if (previousScope !== committedScope) {
    setPreviousScope(committedScope);
    if (!customOpen) setDraftDates({ from: fromDate, to: toDate });
  }
  const searchScope = JSON.stringify([pageHref, adminEmail, targetEmail]);
  const [previousSearchScope, setPreviousSearchScope] = useState(searchScope);
  if (previousSearchScope !== searchScope) {
    setPreviousSearchScope(searchScope);
    const appliedAdmin = adminEmail.trim();
    const appliedTarget = targetEmail.trim();
    // Preserve edits while an older server navigation is still arriving.
    if (!searchEditing) {
      setAdminDraft(appliedAdmin);
      setTargetDraft(appliedTarget);
    } else if (appliedAdmin === adminDraft.trim() && appliedTarget === targetDraft.trim()) {
      setSearchEditing(false);
    }
  }

  useEffect(() => {
    if (!searchEditing) {
      adminDraftRef.current = adminDraft;
      targetDraftRef.current = targetDraft;
      searchEditingRef.current = false;
      lastSubmittedSearchRef.current = null;
    }
  }, [searchEditing, adminDraft, targetDraft]);

  useEffect(() => {
    const onHistoryNavigation = () => {
      const params = new URLSearchParams(window.location.search);
      paramsRef.current = params;
      searchEditingRef.current = false;
      lastSubmittedSearchRef.current = null;
      setCustomOpen(false);
      setSearchEditing(false);

      const restoredAdmin = (params.get("adminEmail") ?? "").trim();
      const restoredTarget = (params.get("targetEmail") ?? "").trim();
      adminDraftRef.current = restoredAdmin;
      targetDraftRef.current = restoredTarget;
      setAdminDraft(restoredAdmin);
      setTargetDraft(restoredTarget);
    };
    window.addEventListener("popstate", onHistoryNavigation);
    return () => window.removeEventListener("popstate", onHistoryNavigation);
  }, []);

  const actionOptions = withCurrentOption(baseActionOptions, draftAction, "Action: ");
  const targetTypeOptions = withCurrentOption(baseTargetTypeOptions, draftTargetType, "Target: ");
  const options: readonly AdminDirectoryOption[] = [
    ...rangeOptions,
    ...(draftRange === "90d" ? [{ value: "90d", label: "Last 90 days (legacy)" }] : []),
    ...(draftRange === "custom" ? [{ value: "custom", label: "Custom range (legacy)" }] : []),
  ];
  const todayUtc = new Date().toISOString().slice(0, 10);
  const validCustom = validDate(draftDates.from) && validDate(draftDates.to) && draftDates.from <= draftDates.to && draftDates.to <= todayUtc;

  const navigate = useCallback((values: Record<string, string | null>, replace = false) => {
    const params = new URLSearchParams(paramsRef.current);
    params.delete("cursor");

    const currentAdmin = adminDraftRef.current.trim();
    const currentTarget = targetDraftRef.current.trim();

    if (!("adminEmail" in values)) {
      if (currentAdmin) params.set("adminEmail", currentAdmin);
      else params.delete("adminEmail");
    }
    if (!("targetEmail" in values)) {
      if (currentTarget) params.set("targetEmail", currentTarget);
      else params.delete("targetEmail");
    }

    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const committedAdmin = (params.get("adminEmail") ?? "").trim();
    const committedTarget = (params.get("targetEmail") ?? "").trim();
    const committedSearchKey = committedAdmin + "\n" + committedTarget;
    if (searchEditingRef.current && committedAdmin === currentAdmin && committedTarget === currentTarget) {
      lastSubmittedSearchRef.current = committedSearchKey;
    }

    const query = params.toString();
    paramsRef.current = new URLSearchParams(query);
    const href = "/admin/logs" + (query ? "?" + query : "");
    startTransition(() => {
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }, [router]);

  function changeRange(next: string) {
    setDraftRange(next as AuditRange);
    setCustomOpen(next === "custom");
    if (next === "custom") setDraftDates({ from: fromDate, to: toDate });
  }

  function applyFilters() {
    if (isPending || (draftRange === "custom" && !validCustom)) return;
    navigate({
      range: draftRange,
      action: draftAction || null,
      targetType: draftTargetType || null,
      adminEmail: adminDraft.trim() || null,
      targetEmail: targetDraft.trim() || null,
      fromDate: draftRange === "custom" ? draftDates.from : null,
      toDate: draftRange === "custom" ? draftDates.to : null,
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    // Search text is a draft until the single Apply filters action.
    event.preventDefault();
  }

  return (
    <div className="border-b border-[#D8E1EC] py-3">
      <div className="flex min-w-0 flex-col gap-3 2xl:flex-row 2xl:items-center">
        <form
          onSubmit={submitSearch}
          role="search"
          aria-label="Search audit logs"
          className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:w-[520px] 2xl:flex-none"
        >
        <div className="relative min-w-0">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-[#64748B]" />
          <label className="sr-only" htmlFor="audit-admin-email-search">Search admin email</label>
          <input
            id="audit-admin-email-search"
            type="search"
            value={adminDraft}
            onChange={event => {
              adminDraftRef.current = event.target.value;
              searchEditingRef.current = true;
              setSearchEditing(true);
              setAdminDraft(event.target.value);
            }}
            placeholder="Search admin email"
            className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#020617] outline-none placeholder:text-[#94A3B8] focus:border-[#94A3B8] focus:ring-0"
          />
        </div>
        <div className="relative min-w-0">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-[#64748B]" />
          <label className="sr-only" htmlFor="audit-target-email-search">Search target email</label>
          <input
            id="audit-target-email-search"
            type="search"
            value={targetDraft}
            onChange={event => {
              targetDraftRef.current = event.target.value;
              searchEditingRef.current = true;
              setSearchEditing(true);
              setTargetDraft(event.target.value);
            }}
            placeholder="Search target email"
            className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#020617] outline-none placeholder:text-[#94A3B8] focus:border-[#94A3B8] focus:ring-0"
          />
        </div>
        </form>

        <div className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,170px)_minmax(0,170px)_minmax(0,170px)_auto] 2xl:ml-auto">
        <AdminDirectorySelect
          key={draftRange + ":" + rangeSelectVersion}
          name="range"
          label="Date range"
          value={draftRange}
          options={options}
          nativeExcludeValues={["custom"]}
          compact attached
          align="end"
          onValueChange={changeRange}
        />
        <AdminDirectorySelect
          name="action"
          label="Action"
          value={draftAction}
          options={actionOptions}
          compact attached
          align="end"
          onValueChange={setDraftAction}
        />
        <AdminDirectorySelect
          name="targetType"
          label="Target type"
          value={draftTargetType}
          options={targetTypeOptions}
          compact attached
          align="end"
          onValueChange={setDraftTargetType}
        />
        <button type="button" onClick={applyFilters}
          disabled={isPending || (draftRange === "custom" && !validCustom)}
          className="inline-flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition hover:bg-[#003D97] disabled:opacity-50">
          Apply filters
        </button>
        </div>
      </div>

      {(customOpen || draftRange === "custom") ? (
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
              setDraftRange("custom");
            }}
            className="h-10 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Set custom dates
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomOpen(false);
              setDraftDates({ from: fromDate, to: toDate });
              setDraftRange(range);
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
