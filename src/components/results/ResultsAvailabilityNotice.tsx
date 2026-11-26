import * as React from "react";
import { CAR_SANDBOX_AGE_NOTICE } from "@/shared/cars/carSearchFeedback";
import { RESULTS_AVAILABILITY_NOTICE } from "@/shared/presentation/resultsAvailabilityNotice";

export function ResultsAvailabilityNotice({ carPreview = false }: { carPreview?: boolean } = {}) {
  return (
    <div className="w-full shrink-0 bg-white">
      <p
        role="note"
        data-results-availability-notice
        className="page-shell py-2 text-xs leading-5 text-slate-600"
      >
        {RESULTS_AVAILABILITY_NOTICE}
      </p>
      {carPreview && <p role="note" data-car-sandbox-age-notice className="page-shell pb-2 text-xs leading-5 text-slate-600">{CAR_SANDBOX_AGE_NOTICE}</p>}
    </div>
  );
}
