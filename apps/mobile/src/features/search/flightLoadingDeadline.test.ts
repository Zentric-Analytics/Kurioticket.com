import assert from "node:assert/strict";
import test from "node:test";
import { withinFlightLoadingDeadline } from "./flightLoadingDeadline";

const futureRoundTrip = (gapDays: number) => ({
  tripType: "round-trip",
  origin: "AAA",
  destination: "BBB",
  departureDate: "2031-05-10",
  returnDate: `2031-05-${String(10 + gapDays).padStart(2, "0")}`,
});

for (const gapDays of [1, 6]) {
  test(`a ${gapDays}-day round trip leaves loading by the configured deadline`, async () => {
    const search = futureRoundTrip(gapDays);
    let loading = true;
    let aborted = false;
    const neverResponds = new Promise<typeof search>(() => undefined);

    await assert.rejects(
      withinFlightLoadingDeadline(neverResponds, () => { aborted = true; }, 5)
        .finally(() => { loading = false; }),
      /flight_loading_deadline/,
    );

    assert.equal(aborted, true);
    assert.equal(loading, false);
  });
}

test("the UI deadline aborts the active request rather than only abandoning its result", async () => {
  const controller = new AbortController();
  let requestObservedAbort = false;
  const activeRequest = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener("abort", () => {
      requestObservedAbort = true;
      reject(new Error("underlying_request_aborted"));
    });
  });

  await assert.rejects(
    withinFlightLoadingDeadline(
      activeRequest,
      () => controller.abort("ui-deadline"),
      5,
    ),
    /flight_loading_deadline|underlying_request_aborted/,
  );
  assert.equal(controller.signal.aborted, true);
  assert.equal(controller.signal.reason, "ui-deadline");
  assert.equal(requestObservedAbort, true);
});
