import { LoaderCircle } from "lucide-react";

/** Shared pending-records feedback for Support Tickets and Deletion Requests. */
export function AdminQueueLoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[240px] items-center justify-center border-b border-[#E7ECF5] bg-white px-4 text-[13px] font-medium text-[#334155]">
      <span className="inline-flex items-center gap-2">
        <LoaderCircle size={18} className="animate-spin text-[#004BB8]" aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}
