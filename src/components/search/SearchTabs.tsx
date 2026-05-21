function DateDisplay({
  label,
  value,
  helper,
  disabled,
  onClick,
  className = "",
}: {
  label: string;
  value: string;
  helper: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full text-left ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      } ${className}`}
    >
      <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
        {label}

        <span className="text-[#6d28d9]">
          <CalendarDays size={17} />
        </span>
      </span>

      <span className="mt-1 block h-10 text-lg font-bold text-slate-950">
        {value ? prettyDate(value) : "Select date"}
      </span>

      <span className="block truncate text-sm font-medium text-slate-500">
        {helper}
      </span>
    </button>
  );
}