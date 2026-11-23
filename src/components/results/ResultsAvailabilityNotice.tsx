import * as React from "react";
import { RESULTS_AVAILABILITY_NOTICE } from "@/shared/presentation/resultsAvailabilityNotice";

export function ResultsAvailabilityNotice() {
  return (
    <div className="w-full shrink-0 bg-white">
      <p
        role="note"
        data-results-availability-notice
        className="page-shell py-2 text-xs leading-5 text-slate-600"
      >
        {RESULTS_AVAILABILITY_NOTICE}
      </p>
    </div>
  );
}
