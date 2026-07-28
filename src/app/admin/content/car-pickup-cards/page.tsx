import Image from "next/image";

import {
  AdminDataTable,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";

import {
  getCarPickupCardSummary,
  getCarPickupImageSource,
  hasCarPickupCardIssues,
  selectCarPickupCardRows,
  type CarPickupCardInventoryRow,
} from "./page-data";

export const metadata = { title: "Admin Car Pickup Card Inventory" };

export default function CarPickupCardInventoryPage() {
  const rows = selectCarPickupCardRows();
  const summary = getCarPickupCardSummary(rows);

  return (
    <AdminPageShell
      eyebrow=""
      title="Car pickup cards"
      description="Inspect the code-backed pickup cards used on the public Cars landing page. These are not car search results or vehicle inventory."
      actions={<AdminLinkButton href="/admin/content">Back to Content Inventory</AdminLinkButton>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Pickup cards" value={summary.pickupCards} />
        <AdminMetricCard label="Unique pickup locations" value={summary.uniquePickupLocations} />
        <AdminMetricCard label="Configured images" value={summary.configuredImages} />
        <AdminMetricCard label="Public usage" value={summary.publicUsage} tone="good" />
      </div>

      <AdminDataTable
        caption="Cars landing-page pickup cards"
        density="compact"
        minWidth="1080px"
        columns={["Image preview", "Pickup location", "Translation key", "Image source", "Public surface", "Status"]}
        summary={`Showing all ${rows.length} pickup cards`}
        rows={rows.map((row) => ({
          id: row.rowId,
          cells: [
            <ImagePreview key="preview" row={row} />,
            <div key="location" className="font-semibold text-slate-950">
              {row.pickupLocation || <span className="text-slate-400">Not configured</span>}
              {row.duplicatePickupLocation ? <Flag>Duplicate pickup location</Flag> : null}
            </div>,
            <div key="translation">
              {row.translationKey ? <code className="text-xs text-slate-700">{row.translationKey}</code> : <span className="text-slate-400">Not configured</span>}
              {row.missingTranslationKey ? <Flag>Missing translation key</Flag> : null}
              {row.duplicateTranslationKey ? <Flag>Duplicate translation key</Flag> : null}
            </div>,
            <div key="image-source" className="max-w-xs">
              <span>{getCarPickupImageSource(row.image)}</span>
              {row.image ? <code className="mt-1 block break-all text-[11px] text-slate-500">{row.image}</code> : null}
              {row.missingImage ? <Flag>Missing image</Flag> : null}
              {row.invalidImage ? <Flag>Invalid image</Flag> : null}
              {row.duplicateImage ? <Flag>Duplicate image</Flag> : null}
            </div>,
            <AdminStatusBadge key="surface" tone="info">Cars landing page</AdminStatusBadge>,
            <AdminStatusBadge key="status" tone={hasCarPickupCardIssues(row) ? "warn" : "good"}>
              {hasCarPickupCardIssues(row) ? "Needs attention" : "Configured"}
            </AdminStatusBadge>,
          ],
        }))}
      />
    </AdminPageShell>
  );
}

function ImagePreview({ row }: { row: CarPickupCardInventoryRow }) {
  if (row.missingImage || row.invalidImage) {
    return <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-2 text-center text-xs font-semibold text-slate-500">No valid image</div>;
  }

  return (
    <Image
      src={row.image}
      alt={`${row.pickupLocation || "Pickup card"} preview`}
      width={96}
      height={64}
      className="h-16 w-24 rounded-xl border border-slate-200 object-cover"
    />
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block"><AdminStatusBadge tone="warn">{children}</AdminStatusBadge></span>;
}
