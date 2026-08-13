"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { buildDealsSearchFingerprint } from "@/lib/deals/dealsTripPlan";
import { readDealsHandoffSnapshotV2 } from "@/lib/deals/dealsHandoffSnapshotV2";
import {
  buildDealsJourneyUrl,
  getFirstDealsJourneyStage,
} from "@/lib/deals/dealsJourneyRoutes";
import type { DealsHandoffSnapshotReadV2 } from "@/lib/deals/dealsHandoffSnapshotV2";

export function DealsGuidedHandoffBoundaryV2({
  search,
}: {
  search: DealsSearch;
}) {
  const [result, setResult] = useState<DealsHandoffSnapshotReadV2 | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResult(
        readDealsHandoffSnapshotV2(
          sessionStorage,
          buildDealsSearchFingerprint(search),
        ),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [search]);

  if (result === null)
    return <p role="status">Checking your reviewed options…</p>;
  if (result.status !== "valid") {
    const stage =
      result.status === "hotel"
        ? "hotel-results"
        : result.status === "flight"
          ? "flight-results"
          : result.status === "car"
            ? "car-results"
            : getFirstDealsJourneyStage(search.mode);
    return (
      <div data-deals-guided-v2-boundary-invalid>
        <h1 className="text-2xl font-extrabold">Your options need attention</h1>
        <p className="mt-2 text-slate-600">
          Return to the journey to refresh the affected planning selection or
          flight offer.
        </p>
        <Link
          className="focus-ring mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"
          href={buildDealsJourneyUrl(stage, search)}
        >
          Return to trip options
        </Link>
      </div>
    );
  }
  return (
    <div data-deals-guided-v2-boundary>
      <h1 className="text-2xl font-extrabold">Ready for the next step</h1>
      <p className="mt-2 font-semibold">
        Your selected options passed the Trip Review checks.
      </p>
      <p className="mt-2 text-slate-600">
        No provider has been opened and no booking or payment has started.
      </p>
    </div>
  );
}
