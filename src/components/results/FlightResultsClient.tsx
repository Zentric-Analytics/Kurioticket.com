function InsightCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="truncate text-sm font-black text-navy">
          {label}
        </p>

        {value ? (
          <p className="truncate text-xs font-semibold text-muted">
            {value}
          </p>
        ) : null}
      </div>
    </div>
  );
}