import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/deals/handoff/page.tsx", "utf8");
const client =
  fs.readFileSync(
    "src/components/results/deals/DealsHandoffClient.tsx",
    "utf8",
  ) +
  fs.readFileSync(
    "src/components/results/deals/DealsHandoffExperience.tsx",
    "utf8",
  );
const experience = fs.readFileSync(
  "src/components/results/deals/DealsHandoffExperience.tsx",
  "utf8",
);
const card = fs.readFileSync(
  "src/components/results/deals/DealsHandoffStepCard.tsx",
  "utf8",
);
const guided = fs.readFileSync(
  "src/components/results/deals/DealsGuidedHandoffClient.tsx",
  "utf8",
);
const actionIds = fs.readFileSync("src/lib/deals/dealsHandoffIds.ts", "utf8");
const summary = fs.readFileSync(
  "src/components/results/deals/DealsHandoffSummary.tsx",
  "utf8",
);
const presentation = fs.readFileSync(
  "src/lib/deals/dealsHandoffPresentation.ts",
  "utf8",
);

test("guided handoff omits redundant guidance while preserving the handoff contract", () => {
  assert.doesNotMatch(experience, /packages\.guided\.handoff\.introduction/);
  assert.doesNotMatch(experience, /packages\.guided\.handoff\.openedDisclosure/);
  assert.match(
    experience,
    /guided && allOpened && \(\s*<div\s+role="status"[\s\S]*deals\.guided\.handoff\.allOpened[\s\S]*deals\.guided\.handoff\.allOpenedBody/,
  );
  assert.match(experience, /<DealsJourneyProgress/);
  assert.match(
    experience,
    /progress=\{getHandoffReadyDealsJourneyProgress\([\s\S]*guided \? "guided" : "legacy"/,
  );
  assert.match(experience, /<ol\s+id="provider-steps"/);
  assert.match(experience, /<DealsHandoffStepCard/);
  assert.match(experience, /onOpen=\{\(\) => onOpen\(step\.product\)\}/);
  assert.match(experience, /aria-live="polite"[\s\S]{0,40}\{announcement\}/);
});

test("guided handoff hides the page title visually while retaining an accessible H1", () => {
  const guidedHeading =
    guided.match(
      /<h1[\s\S]*?deals\.guided\.handoff\.title[\s\S]*?<\/h1>/,
    )?.[0] ?? "";

  assert.match(guidedHeading, /className="sr-only"/);
  assert.match(guidedHeading, /packages\.guided\.handoff\.title/);
  assert.doesNotMatch(
    guidedHeading,
    /text-2xl|font-extrabold|text-slate-950|ready \? "mt-4/,
  );
});

test("handoff keeps the responsive summary and ordered provider steps contract", () => {
  assert.match(page, /page-shell max-w-5xl/);
  assert.match(client, /xl:grid-cols-\[minmax\(0,1fr\)_300px\]/);
  assert.match(client, /<DealsHandoffSummary[\s\S]*<div className="order-2/);
  assert.match(client, /<ol\s+id="provider-steps"/);
  assert.match(summary, /role="progressbar"/);
  assert.match(card, /aria-current=/);
});
test("provider activation remains safe, persistent, specific, and accessible", () => {
  assert.match(client, /markDealsProviderOpened/);
  assert.match(client, /writeDealsTripPlan/);
  assert.match(client, /getNextDealsProviderStep/);
  assert.match(client, /legacyNext\.allOpened/);
  assert.doesNotMatch(client, /nextId=/);
  assert.match(card, /target="_blank"/);
  assert.match(card, /rel="noopener noreferrer"/);
  assert.match(card, /packages\.handoff\.newTab/);
  assert.match(client, /plan\.resultsPath/);
  assert.match(card, /min-h-11/);
  assert.doesNotMatch(
    client + card,
    /window\.open|partnerRedirectUrl|bookingUrl|Open details/,
  );
});
test("shared experience restores legacy actionable totals and separates guided unavailable actions", () => {
  assert.match(
    client,
    /const total = guided \? steps\.length : actionable\.length/,
  );
  assert.match(client, /hasExpired=\{hasExpired\}/);
  assert.match(
    client,
    /hasUnavailableAction=\{guided && hasUnavailableAction\}/,
  );
  assert.match(summary, /summaryActionUnavailable/);
  assert.match(summary, /hasExpired \?[^:]+summaryRefreshRequired/);
});
test("step activation cancellation and guided recovery progress remain isolated", () => {
  assert.match(card, /if \(onOpen\(\) === false\) event\.preventDefault\(\)/);
  assert.match(card, /target="_blank"/);
  assert.match(card, /rel="noopener noreferrer"/);
  assert.match(
    card,
    /<Link[\s\S]{0,100}href=\{unavailableHref \?\? resultsPath\}[\s\S]{0,100}onClick=\{onRecoveryNavigation\}/,
  );
  const active =
    card.match(
      /<a[\s\S]{0,100}href=\{step\.href\}[\s\S]{0,100}id=\{getDealsHandoffActionId\(step\.product\)\}[\s\S]*?<\/a>/,
    )?.[0] ?? "";
  assert.doesNotMatch(active, /onRecoveryNavigation|useRouteProgress/);
});
test("guided retry focuses the shared real action without activating it", () => {
  assert.match(actionIds, /`provider-step-\$\{product\}-action`/);
  assert.match(card, /id=\{getDealsHandoffActionId\(step\.product\)\}/);
  assert.match(
    guided,
    /getElementById\(getDealsHandoffActionId\(product\)\)[\s\S]{0,100}\?\.focus\(\)/,
  );
  assert.match(guided, /setActivationFailure\(null\)/);
  assert.doesNotMatch(guided, /\.click\(|window\.open/);
});
test("guided failure copy and mounted focus targets follow failure state", () => {
  assert.match(
    guided,
    /failure\.kind === "persistence-failed"[\s\S]{0,100}\? "activationFailedBody"/,
  );
  assert.match(
    guided,
    /failure\.kind === "storage-read-unavailable"[\s\S]{0,100}\? "storageReadFailedBody"/,
  );
  assert.match(guided, /readyFailure \? activationAlertRef : statePanelRef/);
  assert.match(
    guided,
    /failure === "plan-expired"[\s\S]*getFirstDealsJourneyStage\(search\.mode\)/,
  );
  assert.match(
    guided,
    /failure === "product-expired"[\s\S]*buildDealsJourneyUrl\(recoveryStage, search\)/,
  );
});
test("flight uses a protected-provider action while stays and cars retain internal details actions", () => {
  assert.match(presentation, /DealsHandoffActionKind/);
  assert.match(presentation, /"provider-handoff"/);
  assert.match(presentation, /"internal-details"/);
  assert.match(presentation, /buildDealsInternalRedirectHref/);
  assert.match(card, /step\.actionKind === "provider-handoff"/);
  assert.match(card, /step\.actionKind === "provider-handoff" \|\| opened/);
  assert.match(card, /packages\.handoff\.continueToProvider/);
  assert.match(card, /step\.product === "hotel"/);
  assert.match(card, /packages\.handoff\.openStay/);
  assert.match(card, /packages\.handoff\.openCar/);
  assert.doesNotMatch(
    card,
    /packages\.handoff\.(?:reviewStayAgain|reviewCarAgain)/,
  );
  assert.doesNotMatch(card, /openFlight|reviewFlightAgain/);
  assert.doesNotMatch(
    card + presentation,
    /partnerRedirectUrl|bookingUrl|window\.open|window\.location|location\.assign|location\.replace/,
  );
});
test("handoff cards omit provider identities while preserving product, price, and action contracts", () => {
  assert.doesNotMatch(card, /packages\.handoff\.providerLabel|step\.provider/);
  assert.doesNotMatch(
    card,
    /<Detail className="mt-5 border-t border-slate-200 pt-4"/,
  );
  assert.doesNotMatch(card, /provider(?:Logo|Badge)|(?:logo|badge).*provider/i);

  assert.match(card, /packages\.handoff\.providerPrice/);
  assert.match(card, /packages\.handoff\.sourcePrice/);
  assert.match(card, /price\.providerFormatted/);

  assert.match(card, /step\.airline/);
  assert.match(card, /step\.routeLabel/);
  assert.match(card, /step\.name/);
  assert.match(card, /step\.roomType/);
  assert.match(card, /step\.company/);
  assert.match(card, /step\.model/);

  assert.match(card, /href=\{step\.href\}/);
  assert.match(card, /target="_blank"/);
  assert.match(card, /rel="noopener noreferrer"/);
  assert.match(card, /onClick=/g);
  assert.match(card, /packages\.handoff\.newTab/);
  assert.match(presentation, /provider:\s*item\.provider/);
});

test("handoff cards keep prices and actions readable in balanced columns", () => {
  assert.doesNotMatch(card, /lg:grid-cols-\[minmax\(0,1fr\)_220px\]/);
  assert.match(card, /lg:grid-cols-\[minmax\(0,1fr\)_240px\]/);

  const mainPrice =
    card.match(
      /<p[\s\S]{0,100}aria-label=\{price\.ariaLabel\}[\s\S]*?<\/p>/,
    )?.[0] ?? "";
  assert.doesNotMatch(mainPrice, /break-words/);
  assert.match(mainPrice, /tabular-nums/);
  assert.match(mainPrice, /dir="ltr"/);
  assert.match(mainPrice, /whitespace-nowrap/);
  assert.match(mainPrice, /\{price\.formatted\}/);

  const sourcePrice =
    card.match(
      /\{t\("deals\.handoff\.sourcePrice"\)[\s\S]*?\{price\.providerFormatted\}[\s\S]*?<\/p>/,
    )?.[0] ?? "";
  assert.match(sourcePrice, /dir="ltr"/);
  assert.match(sourcePrice, /whitespace-nowrap/);
  assert.match(sourcePrice, /tabular-nums/);
  assert.match(card, /packages\.handoff\.providerPrice/);

  const action =
    card.match(/<a[\s\S]{0,100}href=\{step\.href\}[\s\S]*?<\/a>/)?.[0] ?? "";
  assert.match(action, /target="_blank"/);
  assert.match(action, /rel="noopener noreferrer"/);
  assert.match(action, /onClick=/g);
  assert.match(action, /min-h-11/);
  assert.match(action, /w-full/);
  assert.match(action, /whitespace-nowrap/);
  assert.match(action, /packages\.handoff\.newTab/);
  assert.match(action, /ArrowUpRight/);
  assert.match(
    card,
    /inline-flex whitespace-nowrap items-center gap-1 rounded-full/,
  );
});

test("handoff cards use a calm and consistent typography hierarchy", () => {
  assert.match(card, /text-sm font-medium leading-5 text-slate-500/);
  assert.match(card, /text-xl font-semibold leading-7 text-slate-950/);
  assert.match(
    card,
    /inline-flex whitespace-nowrap items-center gap-1 rounded-full px-3 py-1\.5 text-sm font-medium/,
  );
  assert.match(card, /text-lg font-semibold leading-7 text-slate-950/);
  assert.match(
    card,
    /mt-2 text-2xl font-semibold leading-8 tracking-wide text-slate-900/,
  );
  assert.match(
    card,
    /<dt className="text-sm font-medium leading-5 text-slate-500">/,
  );
  assert.match(
    card,
    /<dd className="mt-1 font-medium leading-6 text-slate-900">/,
  );
  assert.match(card, /text-sm font-medium leading-5 text-slate-600/);
  assert.match(
    card,
    /mt-1 text-xl font-semibold leading-7 tracking-tight tabular-nums text-slate-950/,
  );

  const action =
    card.match(/<a[\s\S]{0,100}href=\{step\.href\}[\s\S]*?<\/a>/)?.[0] ?? "";
  assert.match(action, /text-sm font-semibold/);
  const refresh =
    card.match(
      /<Link[\s\S]{0,100}href=\{unavailableHref \?\? resultsPath\}[\s\S]*?<\/Link>/,
    )?.[0] ?? "";
  assert.match(refresh, /font-semibold/);

  assert.doesNotMatch(card, /\bfont-bold\b/);
  assert.doesNotMatch(card, /\bfont-extrabold\b/);
});

test("handoff cards retain consistent product details and semantic room grouping", () => {
  for (const field of [
    "step.airline",
    "step.flightNumber",
    "step.routeLabel",
    "step.departureLabel",
    "step.arrivalLabel",
    "step.durationLabel",
  ])
    assert.match(card, new RegExp(field.replace(".", "\\.")));
  for (const field of [
    "step.name",
    "step.location",
    "step.checkInLabel",
    "step.checkOutLabel",
    "step.nights",
    "step.roomType",
  ])
    assert.match(card, new RegExp(field.replace(".", "\\.")));
  for (const field of [
    "step.company",
    "step.model",
    "step.category",
    "step.pickupLocation",
    "step.pickupLabel",
    "step.returnLocation",
    "step.returnLabel",
    "step.rentalDays",
  ])
    assert.match(card, new RegExp(field.replace(".", "\\.")));
  assert.match(
    card,
    /\{step\.roomType && \([\s\S]*?<dl className="mt-4">[\s\S]*?<Detail[\s\S]*?label=\{t\("deals\.handoff\.room"\)\}[\s\S]*?value=\{step\.roomType\}[\s\S]*?<\/dl>[\s\S]*?\)\}/,
  );
  assert.match(
    card,
    /dir="ltr"[\s\S]{0,100}className="mt-2[^"]*"[\s\S]{0,100}<span className="whitespace-nowrap">\{step\.routeLabel\}<\/span>/,
  );
});

test("handoff cards avoid layout shortcuts that conceal readable content", () => {
  assert.doesNotMatch(
    card,
    /line-clamp-|truncate|overflow-clip|overflow-hidden|break-all|max-h-|h-\[[^\]]+\]|(?:^|[\s"`])-mt-|translate-|scale-/m,
  );
});
test("loading and exceptional states use dedicated accessible presentations", () => {
  assert.match(client, /DealsHandoffSkeleton/);
  assert.match(client, /<StatePanel/);
  assert.match(client, /progressUnsaved/);
  assert.match(client, /getDealsTripPlanEstimatedTotal/);
  assert.match(client, /packages\.handoff\.returnSearch/);
  assert.doesNotMatch(client + card, /line-clamp-|truncate|h-\[[^\]]+\]/);
});

test("handoff preserves navigation, one accessible legacy heading, and shared progress", () => {
  assert.match(client, /DetailsBackLink/);
  assert.match(client, /<h1 className="sr-only">/);
  assert.match(client, /DealsHandoffExperience/);
  assert.match(client, /getHandoffReadyDealsJourneyProgress/);
  assert.match(client, /data-deals-handoff-ready-grid/);
});

test("trip summary keeps its content without owning results navigation", () => {
  assert.doesNotMatch(
    summary,
    /from "next\/link"|ArrowLeft|resultsPath|deals\.handoff\.returnResults/,
  );
  assert.match(summary, /<aside aria-labelledby="trip-summary-title"/);
  assert.match(summary, /xl:sticky xl:top-24/);
  assert.match(
    summary,
    /rounded-2xl border border-slate-200\/80 bg-white shadow-none/,
  );
  assert.doesNotMatch(summary, /shadow-sm/);
  assert.match(summary, /function OpenSectionLine/);
  assert.equal(summary.match(/<OpenSectionLine/g)?.length, 3);
  assert.match(summary, /aria-hidden="true"/);
  assert.match(summary, /border-slate-300\/80/);
  assert.match(summary, /packages\.handoff\.tripSummary/);
  assert.match(summary, /\{modeLabel\}/);
  assert.match(summary, /role="progressbar"/);
  assert.match(summary, /aria-valuemin=\{0\}/);
  assert.match(summary, /aria-valuemax=\{total\}/);
  assert.match(summary, /aria-valuenow=\{opened\}/);
  assert.match(summary, /packages\.handoff\.estimatedCombinedTotal/);
  assert.match(summary, /packages\.handoff\.combinedEstimateUnavailable/);
  assert.match(summary, /packages\.handoff\.estimateDisclosure/);
  assert.match(summary, /packages\.handoff\.openingDoesNotBook/);
  assert.match(summary, /packages\.handoff\.summaryRefreshRequired/);
  assert.doesNotMatch(summary, /\bnextId\b/);
  assert.doesNotMatch(summary, /packages\.handoff\.goToNextStep/);
  assert.doesNotMatch(summary, /ArrowDown/);
  assert.doesNotMatch(summary, /href=\{`#\$\{nextId\}`\}/);
  assert.doesNotMatch(summary, /Go to next provider step/);
  assert.doesNotMatch(summary, /bg-blue-50|bg-amber-50|rounded-xl p-3/);
});

test("handoff shell and navigation remain free of unsafe back fallbacks", () => {
  const mainIndex = page.indexOf(
    '<main className="flex-1 bg-surface-muted/40">',
  );
  const sectionIndex = page.indexOf(
    '<section className="border-b border-border bg-white">',
    mainIndex,
  );
  const shellIndex = page.indexOf(
    '<div className="page-shell max-w-5xl py-7 sm:py-10">',
    sectionIndex,
  );
  assert.ok(mainIndex >= 0, "retains the muted main foundation");
  assert.ok(sectionIndex > mainIndex, "the white section is inside main");
  assert.ok(
    shellIndex > sectionIndex,
    "the page shell is inside the white section",
  );
  assert.doesNotMatch(
    page,
    /bg-\[#f6f8fb\]|bg-slate-50|gradient|background-image|border-x|border-t/,
  );
  assert.doesNotMatch(
    page + client + summary,
    /router\.back|history\.back|document\.referrer/,
  );
  assert.doesNotMatch(client + summary, /ArrowLeft/);
});

test("guided plan and click-time fingerprint conflicts share the action-free conflict state", () => {
  assert.match(
    guided,
    /readResult\.status === "fingerprint_mismatch"[\s\S]*<DealsGuidedConflictState/,
  );
  assert.match(
    guided,
    /failure === "fingerprint-mismatch"[\s\S]*<DealsGuidedConflictState/,
  );
  assert.match(
    guided,
    /result\.currentPlan\?\.searchFingerprint === fingerprint/,
  );
  assert.match(guided, /data-deals-guided-handoff-ready/);
});

test("ready guided handoff inherits the shared Deals-root breadcrumb", () => {
  assert.match(
    guided,
    /\{ready && plan && \([\s\S]*<DealsJourneyBreadcrumbs[\s\S]*page="complete"/,
  );
  assert.doesNotMatch(
    guided,
    /<DealsJourneyBreadcrumbs[\s\S]*<DealsJourneyBreadcrumbs/,
  );
});
