import { LoaderCircle } from "lucide-react";

/** Consistent record-area feedback for both Support queues during filter navigation. */
export function AdminQueueLoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true"
      className="flex min-h-[240px] items-center justify-center bg-white text-[13px] font-medium text-[#374151]">
      <span className="inline-flex items-center gap-2">
        <LoaderCircle size={18} className="animate-spin text-[#004BB8]" aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}
