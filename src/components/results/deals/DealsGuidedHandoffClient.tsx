"use client";

import Link from "next/link";
import { AlertTriangle, CircleX, DatabaseZap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { useRegion } from "@/components/region/RegionProvider";
import { DealsHandoffExperience } from "./DealsHandoffExperience";
import { DealsHandoffSkeleton } from "./DealsHandoffSkeleton";
import { DealsGuidedConflictState } from "./DealsGuidedConflictState";
import { DealsJourneyBreadcrumbs } from "./DealsJourneyBreadcrumbs";
import { useDealsStagedJourneyLifecycle } from "./useDealsStagedJourneyLifecycle";
import {
  attemptGuidedHandoffActivation,
  getDealsGuidedEstimatedTotal,
  getDealsGuidedOpenedCount,
  getDealsGuidedProducts,
  validateDealsGuidedHandoffPlan,
  type GuidedActivationFailure,
} from "@/lib/deals/dealsGuidedHandoff";
import {
  buildDealsJourneyUrl,
  getEarliestIncompleteDealsJourneyStage,
  getFirstDealsJourneyStage,
  getRequiredDealsJourneyStageAt,
} from "@/lib/deals/dealsJourneyRoutes";
import { getDealsHandoffActionId } from "@/lib/deals/dealsHandoffIds";
import { getDealsReviewChangeHref } from "@/lib/deals/dealsReviewPresentation";
import {
  buildDealsSearchFingerprint,
  type DealsTripPlan,
  type DealsTripPlanProduct,
} from "@/lib/deals/dealsTripPlan";
import {
  readDealsStagedJourneyPlan,
  removeDealsStagedJourneyPlan,
  writeDealsStagedJourneyPlan,
  type DealsStagedSnapshotResult,
  type DealsTripPlanReadResult,
} from "@/lib/deals/dealsTripPlanStorage";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { translations as en } from "@/lib/i18n/en";
import {
  areDealsGuidedPlansMateriallyEqual,
  shouldAnnounceDealsCrossTabUpdate,
  type DealsLifecycleSource,
} from "@/lib/deals/dealsGuidedJourneyLifecycle";
import { useRouter } from "next/navigation";
import { getHandoffReadyDealsJourneyProgress } from "@/lib/deals/dealsJourneyProgress";

export function DealsGuidedHandoffClient({ search }: { search: DealsSearch }) {
  const { t: dictionary, locale } = useLocale();
  const { selectedCurrency } = useRegion();
  const rates = useCurrencyRates();
  const { start } = useRouteProgress();
  const router = useRouter();
  const t = useCallback(
    (key: string) => dictionary[key] ?? en[key] ?? key,
    [dictionary],
  );
  const fingerprint = buildDealsSearchFingerprint(search);
  const [readResult, setReadResult] = useState<DealsTripPlanReadResult | null>(
    null,
  );
  const [plan, setPlan] = useState<DealsTripPlan | null>(null);
  const [activationFailure, setActivationFailure] =
    useState<GuidedActivationFailure | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const activationAlertRef = useRef<HTMLDivElement>(null);
  const statePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loadedAt = Date.now();
      const result = readDealsStagedJourneyPlan(fingerprint, loadedAt);
      setReadResult(result);
      if (result.status === "valid") setPlan(result.plan);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fingerprint]);

  const installLifecycle = (
    result: DealsStagedSnapshotResult | DealsTripPlanReadResult,
    source: DealsLifecycleSource,
  ) => {
    if (
      result.status === "valid" &&
      areDealsGuidedPlansMateriallyEqual(plan, result.plan)
    )
      return;
    setReadResult(result);
    setActivationFailure(null);
    setPlan(result.status === "valid" ? result.plan : null);
    if (
      result.status === "valid" &&
      shouldAnnounceDealsCrossTabUpdate(source, plan, result.plan)
    )
      setAnnouncement(t("deals.guided.crossTabUpdated"));
  };
  const onSnapshot = (
    result: DealsStagedSnapshotResult,
    _at: number,
    source: DealsLifecycleSource,
  ) => installLifecycle(result, source);
  const onRefresh = (
    result: DealsTripPlanReadResult,
    _at: number,
    source: DealsLifecycleSource,
  ) => installLifecycle(result, source);
  const now = useDealsStagedJourneyLifecycle({
    fingerprint,
    plan,
    onSnapshot,
    onRefresh,
  });
  const recoveryStage = plan
    ? getRequiredDealsJourneyStageAt(
        "review",
        search.mode,
        plan,
        { hotelId: null, carId: null },
        now,
      )
    : getFirstDealsJourneyStage(search.mode);
  const restartCurrentPreview = () => {
    removeDealsStagedJourneyPlan();
    setPlan(null);
    setReadResult(null);
    start();
    router.replace(
      buildDealsJourneyUrl(getFirstDealsJourneyStage(search.mode), search),
    );
  };

  useEffect(() => {
    if (!activationFailure) return;
    const readyFailure = isReadyFailure(activationFailure);
    window.setTimeout(
      () =>
        (readyFailure ? activationAlertRef : statePanelRef).current?.focus(),
      0,
    );
  }, [activationFailure]);

  const activate = (product: DealsTripPlanProduct): boolean => {
    if (!plan) return false;
    setActivationFailure(null);
    const activatedAt = Date.now();
    const result = attemptGuidedHandoffActivation({
      renderedPlan: plan,
      product,
      search,
      fingerprint,
      now: activatedAt,
      locale,
      read: readDealsStagedJourneyPlan,
      write: writeDealsStagedJourneyPlan,
    });
    if (!result.ok) {
      if (result.currentPlan?.searchFingerprint === fingerprint)
        setPlan(result.currentPlan);
      setActivationFailure(result.failure);
      return false;
    }
    setPlan(result.plan);
    setAnnouncement(
      t("deals.handoff.openedAnnouncement")
        .replace(
          "{{product}}",
          t(`deals.tripPlan.${product === "hotel" ? "stay" : product}`),
        )
        .replace("{{opened}}", String(getDealsGuidedOpenedCount(result.plan)))
        .replace(
          "{{total}}",
          String(getDealsGuidedProducts(result.plan).length),
        ),
    );
    return true;
  };

  let content;
  let state = "loading";
  let ready = false;
  if (!readResult)
    content = (
      <DealsHandoffSkeleton label={t("deals.guided.handoff.loading")} />
    );
  else if (readResult.status === "storage_unavailable") {
    state = "storage-unavailable";
    content = (
      <State
        kind="storage"
        title={t("deals.guided.handoff.storageTitle")}
        body={t("deals.guided.handoff.storageBody")}
        action={t("deals.guided.handoff.returnDeals")}
        href="/deals"
        start={start}
      />
    );
  } else if (readResult.status === "expired") {
    state = "expired";
    content = (
      <State
        kind="warning"
        title={t("deals.guided.handoff.expiredTitle")}
        body={t("deals.guided.handoff.expiredBody")}
        action={t("deals.guided.handoff.refresh")}
        href={buildDealsJourneyUrl(
          getFirstDealsJourneyStage(search.mode),
          search,
        )}
        start={start}
      />
    );
  } else if (readResult.status === "fingerprint_mismatch") {
    state = "fingerprint-mismatch";
    content = (
      <DealsGuidedConflictState t={t} onRestart={restartCurrentPreview} />
    );
  } else if (readResult.status !== "valid" || !plan) {
    state = readResult.status;
    content = (
      <State
        kind="missing"
        title={t("deals.guided.handoff.missingTitle")}
        body={t("deals.guided.handoff.missingBody")}
        action={t("deals.guided.handoff.returnDeals")}
        href="/deals"
        start={start}
      />
    );
  } else if (activationFailure && !isReadyFailure(activationFailure)) {
    const failure = activationFailure.kind;
    if (failure === "fingerprint-mismatch") {
      state = "fingerprint-mismatch";
      content = (
        <DealsGuidedConflictState t={t} onRestart={restartCurrentPreview} />
      );
    } else if (failure === "mode-mismatch" || failure === "plan-invalid") {
      state = "invalid";
      content = (
        <State
          stateRef={statePanelRef}
          kind="missing"
          title={t("deals.guided.invalid.title")}
          body={t("deals.guided.invalid.body")}
          action={t("deals.guided.handoff.refresh")}
          href={buildDealsJourneyUrl(
            getFirstDealsJourneyStage(search.mode),
            search,
          )}
          start={start}
        />
      );
    } else if (failure === "plan-expired") {
      state = "expired";
      content = (
        <State
          stateRef={statePanelRef}
          kind="warning"
          title={t("deals.guided.handoff.expiredTitle")}
          body={t("deals.guided.handoff.planExpiredAtClick")}
          action={t("deals.guided.handoff.refresh")}
          href={buildDealsJourneyUrl(
            getFirstDealsJourneyStage(search.mode),
            search,
          )}
          start={start}
        />
      );
    } else if (failure === "product-expired") {
      state = "product-expired";
      content = (
        <State
          stateRef={statePanelRef}
          kind="warning"
          title={t("deals.guided.handoff.refreshTitle")}
          body={t("deals.guided.handoff.productExpiredAtClick")}
          action={t("deals.guided.handoff.refresh")}
          href={buildDealsJourneyUrl(recoveryStage, search)}
          start={start}
        />
      );
    } else if (failure === "incomplete") {
      state = "incomplete";
      content = (
        <State
          stateRef={statePanelRef}
          kind="warning"
          title={t("deals.guided.handoff.incompleteTitle")}
          body={t("deals.guided.handoff.incompleteBody")}
          action={t("deals.guided.handoff.refresh")}
          href={buildDealsJourneyUrl(
            getEarliestIncompleteDealsJourneyStage(search.mode, plan),
            search,
          )}
          start={start}
        />
      );
    } else {
      state = failure;
      content = (
        <State
          stateRef={statePanelRef}
          kind="missing"
          title={t("deals.guided.handoff.missingTitle")}
          body={t("deals.guided.handoff.missingBody")}
          action={t("deals.guided.handoff.returnDeals")}
          href="/deals"
          start={start}
        />
      );
    }
  } else {
    const validation = validateDealsGuidedHandoffPlan(
      plan,
      search,
      fingerprint,
      now,
    );
    if (!validation.ok && validation.reason === "incomplete") {
      state = "incomplete";
      content = (
        <State
          kind="warning"
          title={t("deals.guided.handoff.incompleteTitle")}
          body={t("deals.guided.handoff.incompleteBody")}
          action={t("deals.guided.handoff.refresh")}
          href={buildDealsJourneyUrl(
            getEarliestIncompleteDealsJourneyStage(search.mode, plan),
            search,
          )}
          start={start}
        />
      );
    } else if (!validation.ok && validation.reason === "product-expired") {
      state = "product-expired";
      content = (
        <State
          kind="warning"
          title={t("deals.guided.handoff.refreshTitle")}
          body={t("deals.guided.handoff.productExpiredAtClick")}
          action={t("deals.guided.handoff.refresh")}
          href={buildDealsJourneyUrl(recoveryStage, search)}
          start={start}
        />
      );
    } else if (!validation.ok && validation.reason === "fingerprint-mismatch") {
      state = "fingerprint-mismatch";
      content = (
        <DealsGuidedConflictState t={t} onRestart={restartCurrentPreview} />
      );
    } else if (!validation.ok) {
      state = "expired";
      content = (
        <State
          kind="warning"
          title={t("deals.guided.handoff.expiredTitle")}
          body={t("deals.guided.handoff.expiredBody")}
          action={t("deals.guided.handoff.refresh")}
          href={buildDealsJourneyUrl(
            getFirstDealsJourneyStage(search.mode),
            search,
          )}
          start={start}
        />
      );
    } else {
      state = activationFailure ? "activation-error" : "ready";
      ready = true;
      content = (
        <>
          {activationFailure && (
            <ActivationAlert
              alertRef={activationAlertRef}
              failure={activationFailure}
              t={t}
              retry={() => {
                const product = activationFailure.product;
                setActivationFailure(null);
                window.setTimeout(
                  () =>
                    document
                      .getElementById(getDealsHandoffActionId(product))
                      ?.focus(),
                  0,
                );
              }}
            />
          )}
          <DealsHandoffExperience
            plan={plan}
            now={now}
            locale={locale}
            selectedCurrency={selectedCurrency}
            rates={rates}
            t={t}
            progressUnsaved={false}
            announcement={announcement}
            onOpen={activate}
            orderedProducts={validation.products}
            guided
            recoveryHrefs={Object.fromEntries(
              validation.products.map((product) => [
                product,
                getDealsReviewChangeHref(product, search),
              ]),
            )}
            combinedTotal={getDealsGuidedEstimatedTotal(
              plan,
              selectedCurrency,
              rates.rates,
            )}
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              onClick={start}
              href={buildDealsJourneyUrl(
                getFirstDealsJourneyStage(search.mode),
                search,
              )}
              className="focus-ring inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white"
            >
              {t("deals.guided.handoff.changeSelections")}
            </Link>
            <Link
              onClick={start}
              href="/deals"
              className="focus-ring inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700"
            >
              {t("deals.guided.handoff.startOver")}
            </Link>
          </div>
        </>
      );
    }
  }
  return (
    <section
      data-deals-guided-handoff
      data-deals-guided-handoff-state={state}
      {...(ready ? { "data-deals-guided-handoff-ready": true } : {})}
    >
      {ready && plan && (
        <DealsJourneyBreadcrumbs
          progress={getHandoffReadyDealsJourneyProgress(plan)}
          page="complete"
          search={search}
          t={t}
        />
      )}
      <h1 className="sr-only">{t("deals.guided.handoff.title")}</h1>
      <div className="mt-5">{content}</div>
    </section>
  );
}

type ReadyFailure = {
  kind:
    | "persistence-failed"
    | "storage-read-unavailable"
    | "selection-changed"
    | "action-unavailable";
  product: DealsTripPlanProduct;
};

function isReadyFailure(
  failure: GuidedActivationFailure,
): failure is ReadyFailure {
  return [
    "persistence-failed",
    "storage-read-unavailable",
    "selection-changed",
    "action-unavailable",
  ].includes(failure.kind);
}

function ActivationAlert({
  alertRef,
  failure,
  t,
  retry,
}: {
  alertRef: React.RefObject<HTMLDivElement | null>;
  failure: ReadyFailure;
  t: (key: string) => string;
  retry: () => void;
}) {
  const body =
    failure.kind === "persistence-failed"
      ? "activationFailedBody"
      : failure.kind === "storage-read-unavailable"
        ? "storageReadFailedBody"
        : failure.kind === "selection-changed"
          ? "selectionChanged"
          : "actionUnavailable";
  return (
    <div
      ref={alertRef}
      tabIndex={-1}
      id="guided-handoff-activation-error"
      role="alert"
      className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <p className="font-bold">
        {t("deals.guided.handoff.activationFailedTitle")}
      </p>
      <p className="mt-1 text-sm leading-6">
        {t(`deals.guided.handoff.${body}`)}
      </p>
      {(failure.kind === "persistence-failed" ||
        failure.kind === "storage-read-unavailable") && (
        <button
          type="button"
          onClick={retry}
          className="focus-ring mt-3 min-h-11 font-bold underline"
        >
          {t("deals.guided.handoff.retryStep")}
        </button>
      )}
    </div>
  );
}

function State({
  stateRef,
  kind,
  title,
  body,
  action,
  href,
  start,
}: {
  stateRef?: React.RefObject<HTMLDivElement | null>;
  kind: "storage" | "missing" | "warning";
  title: string;
  body: string;
  action: string;
  href: string;
  start: () => void;
}) {
  const Icon =
    kind === "storage"
      ? DatabaseZap
      : kind === "warning"
        ? AlertTriangle
        : CircleX;
  return (
    <div
      ref={stateRef}
      tabIndex={stateRef ? -1 : undefined}
      role="status"
      className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${kind === "warning" ? "border-amber-300" : "border-slate-200"}`}
    >
      <Icon aria-hidden className="size-8 text-[#004BB8]" />
      <h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-xl leading-7 text-slate-600">{body}</p>
      <Link
        onClick={start}
        className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white"
        href={href}
      >
        {action}
      </Link>
    </div>
  );
}
