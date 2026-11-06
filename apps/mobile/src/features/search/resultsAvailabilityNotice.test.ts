import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import type { ReactNode } from "react";
import { RESULTS_AVAILABILITY_NOTICE } from "../../../../../src/shared/presentation/resultsAvailabilityNotice";

// Use one React/renderer pair. Native host adapters below preserve accessibility
// and safe-area props; these are component tests, not device visual tests.
const rootRequire = createRequire(path.resolve("../../package.json"));
const React = rootRequire("react") as typeof import("react");
const { renderToString } = rootRequire("react-dom/server") as { renderToString(node: ReactNode): string };
const copy = "Results are not bookable at this time. Live results will be available soon!!!";
type Props = Record<string, unknown> & { children?: ReactNode };

function fixture({ state = "populated", dark = false, platform = "ios", validHotel = true } = {}) {
  const selected: string[] = [];
  const handlers: Array<() => void> = [];
  const theme = { background: dark ? "#101820" : "#FFFFFF", textPrimary: dark ? "#FFFFFF" : "#172033", textSecondary: dark ? "#CBD5E1" : "#475569" };
  const host = (name: string) => function NativeHost({ children, ...props }: Props) {
    const styles = (Array.isArray(props.style) ? props.style : [props.style]).filter(Boolean) as Array<Record<string, unknown>>;
    const style = Object.assign({}, ...styles);
    if (typeof props.onPress === "function") handlers.push(props.onPress as () => void);
    return React.createElement(name === "text" ? "p" : "div", {
      "data-native": name, "data-testid": props.testID,
      "data-edges": props.edges === undefined ? undefined : JSON.stringify(props.edges),
      "data-font-scaling": props.allowFontScaling === undefined ? undefined : String(props.allowFontScaling),
      "data-color": style.color,
    }, children);
  };
  const SafeAreaView = host("safe-area");
  const Pressable = host("pressable");
  const child = () => React.createElement(SafeAreaView, { edges: [] },
    React.createElement("section", { "data-search-state": state },
      state === "populated" ? React.createElement("article", { "data-result-card": true },
        React.createElement(Pressable, { onPress: () => selected.push("offer-B") }, "View deal")) : state));
  const loading = ({ product, includeTopInset }: { product: string; includeTopInset?: boolean }) => React.createElement(SafeAreaView,
    { edges: includeTopInset === false ? ["bottom", "left", "right"] : ["top"] },
    React.createElement("section", { "data-initializing-product": product }, "Loading"));
  const bindings: Record<string, unknown> = {
    react: React, "react/jsx-runtime": rootRequire("react/jsx-runtime"),
    "react-native": { View: host("view"), Text: host("text"), Pressable, Platform: { OS: platform }, StyleSheet: { create: (value: unknown) => value } },
    "react-native-safe-area-context": { SafeAreaView },
    "expo-router": { router: { replace: () => {} }, useLocalSearchParams: () => ({}) },
    "../availability/FeatureAvailability": { useFeatureAvailability: () => ({ availability: {}, initializing: state === "initializing" }), isMobileProductAvailable: () => state !== "unavailable" },
    "../search/ApprovedCarResultsScreen": { ApprovedCarResultsScreen: child },
    "../search/ApprovedResultsScreen": { ApprovedResultsScreen: child },
    "../search/NativeTravelSearchLoadingScreen": { NativeTravelSearchLoadingScreen: loading },
    "../../theme/AppTheme": { useAppTheme: () => ({ theme }) },
    "./travelSearchModel": { buildSearchPlan: () => ({ plan: validHotel ? { key: "search" } : null }) },
    "../../../../../src/shared/presentation/resultsAvailabilityNotice": { RESULTS_AVAILABILITY_NOTICE },
  };
  function load<T>(file: string): T {
    const exports: Record<string, unknown> = {};
    runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, { exports, require: (name: string) => {
      assert.ok(name in bindings, `Unexpected screen dependency: ${name}`);
      return bindings[name];
    } });
    return exports as T;
  }
  const notice = load<{ ResultsAvailabilityNotice: () => ReactNode }>("src/features/search/ResultsAvailabilityNotice.tsx");
  bindings["../search/ResultsAvailabilityNotice"] = notice;
  const screen = load<{ TravelResultsScreen: (props: { product: string }) => ReactNode }>("src/features/flow/TravelResultsScreen.tsx");
  return { ...screen, ...notice, selected, handlers, theme };
}

for (const platform of ["ios", "android"]) {
  for (const product of ["flight", "hotel", "car"]) {
    for (const state of ["initializing", "loading", "populated", "empty", "error", "unavailable"]) {
      test(`${platform} ${product} ${state} renders one screen notice outside cards`, () => {
        const f = fixture({ state, platform });
        const html = renderToString(React.createElement(f.TravelResultsScreen, { product }));
        assert.equal(html.split(copy).length - 1, 1);
        assert.equal((html.match(/data-testid="results-availability-notice"/g) ?? []).length, 1);
        assert.equal((html.match(/data-edges="\[&quot;top&quot;\]"/g) ?? []).length, 1, "only the screen shell owns the top inset");
        assert.doesNotMatch(html, /<article[^>]*>[\s\S]*?Results are not bookable[\s\S]*?<\/article>/);
        if (state === "initializing") {
          const loaderMarker = `data-initializing-product="${product}"`;
          assert.ok(html.includes(loaderMarker), "initializing renders the matching product loader");
          assert.ok(html.indexOf(copy) < html.indexOf(loaderMarker), "loader renders below the notice");
          assert.match(html, /data-edges="\[&quot;bottom&quot;,&quot;left&quot;,&quot;right&quot;\]"/);
          assert.doesNotMatch(html, /data-search-state|data-result-card|search is temporarily unavailable/);
        } else if (state !== "unavailable") {
          assert.ok(html.includes(`data-search-state="${state}"`), "results child remains mounted below the notice");
        }
        if (state === "populated") {
          assert.equal(f.handlers.length, 1);
          f.handlers[0]();
          assert.deepEqual(f.selected, ["offer-B"], "notice leaves the selected-offer action intact");
        }
      });
    }
  }
}

for (const dark of [false, true]) test(`native notice respects theme and text scaling (dark=${dark})`, () => {
  const f = fixture({ dark });
  const html = renderToString(React.createElement(f.ResultsAvailabilityNotice));
  assert.equal(RESULTS_AVAILABILITY_NOTICE, copy);
  assert.match(html, /data-font-scaling="true"/);
  assert.ok(html.includes(`data-color="${f.theme.textSecondary}"`));
  const source = readFileSync("src/features/search/ResultsAvailabilityNotice.tsx", "utf8");
  assert.doesNotMatch(source, /numberOfLines|maxFontSizeMultiplier|onPress|disabled|bookable|bookingUrl/);
});

test("invalid Hotel route still renders nothing while recovering to the form", () => {
  const f = fixture({ validHotel: false });
  assert.equal(renderToString(React.createElement(f.TravelResultsScreen, { product: "hotel" })), "");
});

test("result children defer their top inset to the notice shell, including their search loader", () => {
  for (const file of ["ApprovedResultsScreen.tsx", "ApprovedCarResultsScreen.tsx"]) {
    const source = readFileSync(`src/features/search/${file}`, "utf8");
    assert.match(source, /edges=\{\[\]\}/);
    assert.match(source, /<NativeBrandedSearchLoading[^>]+includeTopInset=\{false\}/);
  }
  assert.match(readFileSync("src/features/search/NativeTravelSearchLoadingScreen.tsx", "utf8"), /includeTopInset = true/);
});

test("native notice is owned only by the three results routes, not Deals or result/detail cards", () => {
  const consumers: string[] = [];
  function visit(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (file.endsWith(".tsx") && /\bResultsAvailabilityNotice\b/.test(readFileSync(file, "utf8"))) consumers.push(file);
    }
  }
  visit("app"); visit("src");
  assert.deepEqual(consumers.sort(), ["src/features/flow/TravelResultsScreen.tsx", "src/features/search/ResultsAvailabilityNotice.tsx"]);
  const routes = readdirSync("app").filter(file => file.endsWith(".tsx") && /<TravelResultsScreen\b/.test(readFileSync(`app/${file}`, "utf8"))).sort();
  assert.deepEqual(routes, ["car-results.tsx", "flight-results.tsx", "hotel-results.tsx"]);
});
