// Filter choices and local Hotel result derivation are synchronous. Keep these at
// zero so the UI never blocks a second user action or swaps real results for a
// fake loading state after an in-memory filter/sort change.
export const NATIVE_FILTER_SELECTION_FEEDBACK_MS = 0;
export const NATIVE_FILTER_RESULTS_TRANSITION_MS = 0;
