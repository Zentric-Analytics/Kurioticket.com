import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientUrl = new URL("../FlightDetailsClient.tsx", import.meta.url);
const stageUrl = new URL("./DealsFlightDetailsStage.tsx", import.meta.url);
const shellUrl = new URL("./DealsJourneyShell.tsx", import.meta.url);
const enUrl = new URL("../../../lib/i18n/en.ts", import.meta.url);

test("guided Flight details uses a stable loaded callback and request identity", async () => {
  const [client, stage] = await Promise.all([readFile(clientUrl, "utf8"), readFile(stageUrl, "utf8")]);
  assert.match(stage, /const handleFlightLoaded = useCallback\(\(flight: PublicFlightResult \| null, resultReceivedAt: number \| null\) => \{/);
  assert.match(stage, /setLoaded\(flight && resultReceivedAt !== null \? \{ flight, receivedAt: resultReceivedAt \} : null\)/);
  assert.match(stage, /\}, \[\]\);/);
  assert.match(stage, /onFlightLoaded=\{handleFlightLoaded\}/);
  assert.match(client, /const onFlightLoadedRef = useRef\(onFlightLoaded\)/);
  assert.match(client, /onFlightLoadedRef\.current = onFlightLoaded/);
  assert.match(client, /onFlightLoadedRef\.current\?\.\(candidate, receivedAt\)/);
  assert.match(client, /\}, \[id, retryToken\]\);/);
  assert.doesNotMatch(client, /\}, \[id, retryToken, onFlightLoaded\]\);/);
});

test("guided Flight details clears loaded state, aborts ID changes, and rejects stale responses", async () => {
  const client = await readFile(clientUrl, "utf8");
  const lifecycle = client.slice(client.indexOf("useEffect(() => {\n    if (!id)"), client.indexOf("useEffect(() => {\n    if (!retryFocusRef.current)"));
  assert.match(lifecycle, /setLoading\(true\); setDetailsError\(""\); setFlight\(null\); setResultReceivedAt\(null\); onFlightLoadedRef\.current\?\.\(null, null\)/);
  assert.match(lifecycle, /const controller = new AbortController\(\)/);
  assert.match(lifecycle, /return \(\) => \{ active = false; window\.clearTimeout\(startTimer\); controller\.abort\(\); \}/);
  assert.match(lifecycle, /if \(candidate\.id\.trim\(\) !== id\.trim\(\)\) throw new Error/);
  assert.match(client, /const currentFlight = id && loadedFlight\?\.id\.trim\(\) === id\.trim\(\) \? loadedFlight : null/);
});

test("guided Flight details Retry enters loading before focus completion and uses translated copy", async () => {
  const [client, en] = await Promise.all([readFile(clientUrl, "utf8"), readFile(enUrl, "utf8")]);
  const retry = client.slice(client.indexOf("const retry = () =>"), client.indexOf("const itineraryLegs"));
  assert.match(retry, /retryFocusRef\.current = true; setLoading\(true\); setDetailsError\(""\); setFlight\(null\); setResultReceivedAt\(null\); onFlightLoadedRef\.current\?\.\(null, null\); setRetryToken/);
  assert.match(client, /if \(loading\) loadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(client, /else if \(currentFlight\) \{ headingRef\.current\?\.focus\(\{ preventScroll: true \}\); retryFocusRef\.current = false; \}/);
  assert.match(client, /else if \(detailsError\) \{ errorHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\); retryFocusRef\.current = false; \}/);
  assert.doesNotMatch(client, /document\.body\.focus/);
  assert.match(client, /t\["deals\.guided\.flightDetails\.retry"\] \|\| enTranslations\["deals\.guided\.flightDetails\.retry"\]/);
  assert.match(en, /"deals\.guided\.flightDetails\.retry": "Retry Flight details"/);
  assert.doesNotMatch(client, />Retry Flight details</);
});

test("Flight details heading semantics remain valid in guided and standalone modes", async () => {
  const client = await readFile(clientUrl, "utf8");
  assert.match(client, /const titleTag = standalone \? "h1" : "h2"/);
  assert.match(client, /standalone \? <h1 ref=\{errorHeadingRef\}/);
  assert.match(client, /: <h2 ref=\{errorHeadingRef\}/);
  assert.match(client, /<Card className="overflow-hidden[\s\S]*\{titleTag === "h1" \? <h1 ref=\{headingRef\}[\s\S]*: <h2 ref=\{headingRef\}/);
  assert.match(client, /<div className="mt-5"><SelectedFlightSummary[\s\S]*headingLevel=\{standalone \? "h2" : "h3"\}[\s\S]*routeHeadingLevel=\{standalone \? "h2" : "h3"\}/);
});

test("guided Flight details provider and confirmation regressions stay source-suppressed", async () => {
  const [client, stage, shell] = await Promise.all([readFile(clientUrl, "utf8"), readFile(stageUrl, "utf8"), readFile(shellUrl, "utf8")]);
  assert.match(client, /\{standalone \? <div className="min-w-0 lg:col-start-2 lg:row-start-1"><ProviderComparisonPanel/);
  assert.doesNotMatch(stage, /api\/redirect|writeDealsStagedJourneyPlan|replaceDealsFlightSelection/);
  assert.match(shell, /confirmGuidedFlightSelection/);
  assert.match(shell, /attemptGuidedConfirmation\([\s\S]*write: writeDealsStagedJourneyPlan[\s\S]*if \(!result\.ok\)[\s\S]*setPlanState[\s\S]*router\.push/);
  assert.match(shell, /<DealsCarResultsStage/);
  assert.match(shell, /<DealsReviewStage/);
});
