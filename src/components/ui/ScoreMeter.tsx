import { cn } from "@/lib/utils";

export function ScoreMeter({ label, score, invert = false }: { label: string; score: number; invert?: boolean }) {
  const display = Math.round(score);
  const color = invert
    ? display <= 35
      ? "bg-teal"
      : display <= 65
        ? "bg-amber"
        : "bg-danger"
    : display >= 75
      ? "bg-teal"
      : display >= 50
        ? "bg-blue"
        : "bg-amber";

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-muted">
        <span>{label}</span>
        <span className="font-mono text-navy">{display}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(8, Math.min(100, display))}%` }} />
      </div>
    </div>
  );
}
