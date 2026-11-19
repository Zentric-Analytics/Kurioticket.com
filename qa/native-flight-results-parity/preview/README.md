# Reproduce the visual comparisons

These are **browser-rendered previews of native components**, not Android/iOS device screenshots and not the production mobile website. They compare the same fixture data at 390 × 900 CSS pixels (captured at 2× density).

- Before application source: `0a9a4b9ab9c32de6e853dddc7cbf9d0867775910`.
- After application source: `b3a29303b445a35a3eb891151278f871470f4b3c` (merged to dev in `bc4332add366ea8c8ecf7c0385bb22664cae4c01`; preview-only changes do not change the Flight components).
- Data: repository `visualFlights`, with matching November dates on both sides; USD; one-way; English; light mode. Logos use the production initials fallback.
- States: results, selected airline/nonstop groups, Airlines quick sheet, full Filters and Sort.

## What is rendered

`build.mjs` extracts the actual Header, Card, Journey, Summary and style declarations from each version of `ApprovedResultsScreen.tsx`. It imports each version's DateStrip, QuickControls, FilterSheet, SortSheet and shared shell. The Track Price fragment and styles also come directly from that version's production source, with controlled inactive state. It assembles those components with the before/after ordering and fixture state.

React Native Web is installed **only in this QA harness**. Native platform integrations are adapted: safe-area insets are zero; the provider fills the browser viewport; localization is fixed to English; navigation is a no-op; Expo blur/glass renders a plain View; native SVG primitives use browser SVG; Lucide uses the same repository-pinned icon family/version. The real Flight Results scoped palette is used on the after side. The preview is not a supported Expo Web app target.

The harness does **not** run the complete Results screen, SectionList virtualization, network requests, auth, OS-native switches/blur, native safe-area chrome or gestures. Font rasterization, focus outlines and native shadows can differ from a device. These captures illustrate presentation; they do not replace the native validation still outstanding in the main report. No application dependencies or production UI are changed by the harness.

## Run

Use an isolated checkout/archive of the starting SHA for `BEFORE_CHECKOUT`. Do not switch or modify `work`.

From the repository root (root dependencies already installed):

```bash
npm ci --prefix qa/native-flight-results-parity/preview --ignore-scripts --no-audit --no-fund
BEFORE_CHECKOUT=/absolute/path/to/starting-dev node qa/native-flight-results-parity/preview/build.mjs
node qa/native-flight-results-parity/preview/server.mjs
```

Open `http://127.0.0.1:3063/?v=before` or `http://127.0.0.1:3063/?v=after`.

Optional parameters: `&selected=1`, `&sheet=airlines&selected=1`, `&sheet=all&selected=1`, `&sheet=sort`.

In another terminal, from the root:

```bash
node qa/native-flight-results-parity/preview/capture.mjs
node qa/native-flight-results-parity/preview/compare.mjs
```

`CHROMIUM_PATH` overrides `/usr/bin/chromium`; `PREVIEW_PORT` overrides 3063. Generated bundles/source adapters default to the system temporary directory and never enter application source or typecheck inputs; `PREVIEW_CACHE_DIR` can override that location.

Validation performed: both bundles built; all ten captures completed with **zero page runtime errors**; five contact sheets were visually inspected. The missing Expo tsconfig warning from an archived baseline is expected for this isolated browser adapter and does not affect source extraction or capture.
