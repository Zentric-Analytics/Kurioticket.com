import {
  AdminDataTable,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";

import { FaqInventoryFilterToolbar } from "./FaqInventoryFilterToolbar";
import {
  filterFaqInventoryRows,
  formatFaqCollection,
  getFaqInventorySummary,
  hasFaqInventoryIssues,
  parseFaqInventorySearchParams,
  selectFaqInventoryRows,
  type FaqInventorySearchParams,
} from "./page-data";

export const metadata = { title: "Admin FAQ Definition Inventory" };

type PageProps = { searchParams?: Promise<FaqInventorySearchParams> };

export default async function FaqInventoryPage({ searchParams }: PageProps) {
  const filters = parseFaqInventorySearchParams(await searchParams);
  const allRows = selectFaqInventoryRows();
  const rows = filterFaqInventoryRows(allRows, filters);
  const summary = getFaqInventorySummary(allRows);

  return (
    <AdminPageShell
      eyebrow=""
      title="FAQ definitions"
      description="Inspect code-backed FAQ definitions. Public text is localised at runtime, rendered counts may differ when translated questions collide, and these records are not customer support ticket content."
      actions={<AdminLinkButton href="/admin/content">Back to Content Inventory</AdminLinkButton>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total FAQ definitions" value={summary.total} />
        <AdminMetricCard label="General/support definitions" value={summary.generalAndSupport} />
        <AdminMetricCard label="Cars definitions" value={summary.cars} />
        <AdminMetricCard label="FAQ collections" value={summary.collections} />
      </div>

      <FaqInventoryFilterToolbar q={filters.q} collection={filters.collection} />

      <AdminDataTable
        caption="Code-backed FAQ definition inventory"
        density="compact"
        minWidth="1480px"
        columns={["Collection", "FAQ ID", "Question key", "Answer key", "English fallback question", "Public surface", "Localisation behaviour", "Status"]}
        summary={`Showing ${rows.length} of ${allRows.length} FAQ definitions`}
        rows={rows.map((row) => ({
          id: row.rowId,
          cells: [
            <AdminStatusBadge key="collection" tone={row.collection === "CARS" ? "info" : row.collection === "SUPPORT" ? "warn" : "neutral"}>{formatFaqCollection(row.collection)}</AdminStatusBadge>,
            <div key="id"><code className="text-xs text-slate-700">{row.faqId}</code>{row.duplicateId ? <Flag>Duplicate FAQ ID</Flag> : null}</div>,
            <div key="question-key"><code className="text-xs text-slate-700">{row.questionKey}</code>{row.duplicateQuestionKey ? <Flag>Duplicate question key</Flag> : null}</div>,
            <div key="answer-key"><code className="text-xs text-slate-700">{row.answerKey}</code>{row.duplicateAnswerKey ? <Flag>Duplicate answer key</Flag> : null}</div>,
            <div key="fallback" className="max-w-sm">
              {row.englishFallbackQuestion || <span className="text-slate-400">Missing fallback question</span>}
              {row.duplicateFallbackQuestion ? <Flag>Duplicate English fallback question</Flag> : null}
              {row.missingFallbackQuestion ? <Flag>Missing fallback question</Flag> : null}
              {row.missingFallbackAnswer ? <Flag>Missing fallback answer text</Flag> : null}
            </div>,
            <span key="surface">{row.publicSurface}</span>,
            <div key="localisation" className="max-w-xs">
              <span>{row.localizationBehaviour}</span>
              {row.translatedQuestionCollision ? <Flag>Translated question collision</Flag> : null}
            </div>,
            <AdminStatusBadge key="status" tone={hasFaqInventoryIssues(row) ? "warn" : "good"}>{hasFaqInventoryIssues(row) ? "Needs attention" : "Configured"}</AdminStatusBadge>,
          ],
        }))}
      />
    </AdminPageShell>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block"><AdminStatusBadge tone="warn">{children}</AdminStatusBadge></span>;
}
