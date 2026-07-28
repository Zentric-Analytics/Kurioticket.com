import {
  AdminDataTable,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";

import {
  getHomepageTrustMessageSummary,
  hasHomepageTrustMessageIssues,
  selectHomepageTrustMessageRows,
} from "./page-data";

export const metadata = { title: "Admin Homepage Trust Message Inventory" };

export default function HomepageTrustMessageInventoryPage() {
  const rows = selectHomepageTrustMessageRows();
  const summary = getHomepageTrustMessageSummary(rows);

  return (
    <AdminPageShell
      eyebrow=""
      title="Homepage trust messages"
      description="Inspect the three trust messages rendered on the public homepage and localised at runtime. This inventory is scoped only to homepage trust messages; it does not represent Cars, Hotels or other trust-content surfaces, and excludes the trust-section heading and subtitle unless they are added as separate inventory records."
      actions={<AdminLinkButton href="/admin/content">Back to Content Inventory</AdminLinkButton>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label="Homepage trust messages" value={summary.messages} />
        <AdminMetricCard label="Unique message IDs" value={summary.uniqueIds} />
        <AdminMetricCard label="Title translation coverage" value={`${summary.titleCoverage} / ${summary.possibleTranslations}`} />
        <AdminMetricCard label="Body translation coverage" value={`${summary.bodyCoverage} / ${summary.possibleTranslations}`} />
        <AdminMetricCard label="Public usage" value={summary.publicUsage} tone="good" />
      </div>

      <AdminDataTable
        caption="Homepage trust message definitions"
        density="compact"
        minWidth="1420px"
        columns={["Message ID", "English fallback title", "English fallback body", "Title translation key", "Body translation key", "Localisation coverage", "Public surface", "Status"]}
        summary={`Showing all ${rows.length} homepage trust messages`}
        rows={rows.map((row) => ({
          id: row.rowId,
          cells: [
            <div key="id"><code className="text-xs text-slate-700">{row.id}</code>{row.duplicateId ? <Flag>Duplicate message ID</Flag> : null}</div>,
            <div key="title" className="max-w-xs">{row.englishFallbackTitle || <span className="text-slate-400">Not configured</span>}{row.missingEnglishFallbackTitle ? <Flag>Missing English fallback title</Flag> : null}</div>,
            <div key="body" className="max-w-md">{row.englishFallbackBody || <span className="text-slate-400">Not configured</span>}{row.missingEnglishFallbackBody ? <Flag>Missing English fallback body</Flag> : null}</div>,
            <div key="title-key"><code className="text-xs text-slate-700">{row.titleKey}</code>{row.duplicateTitleKey ? <Flag>Duplicate title key</Flag> : null}</div>,
            <div key="body-key"><code className="text-xs text-slate-700">{row.bodyKey}</code>{row.duplicateBodyKey ? <Flag>Duplicate body key</Flag> : null}</div>,
            <div key="coverage" className="min-w-56">
              <span className="block">Title {row.titleCoverage} / {row.supportedLocaleCount} · Body {row.bodyCoverage} / {row.supportedLocaleCount}</span>
              {row.missingTitleLocales.length ? <Flag>Missing title: {row.missingTitleLocales.join(", ")}</Flag> : null}
              {row.missingBodyLocales.length ? <Flag>Missing body: {row.missingBodyLocales.join(", ")}</Flag> : null}
              {row.rawKeyTitleLocales.length ? <Flag>Title falls back to raw key: {row.rawKeyTitleLocales.join(", ")}</Flag> : null}
              {row.rawKeyBodyLocales.length ? <Flag>Body falls back to raw key: {row.rawKeyBodyLocales.join(", ")}</Flag> : null}
            </div>,
            <AdminStatusBadge key="surface" tone="info">Public homepage</AdminStatusBadge>,
            <AdminStatusBadge key="status" tone={hasHomepageTrustMessageIssues(row) ? "warn" : "good"}>{hasHomepageTrustMessageIssues(row) ? "Needs attention" : "Configured"}</AdminStatusBadge>,
          ],
        }))}
      />
    </AdminPageShell>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block"><AdminStatusBadge tone="warn">{children}</AdminStatusBadge></span>;
}
