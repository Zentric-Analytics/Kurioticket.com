import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { URL as NodeURL } from "node:url";
import test from "node:test";
import ts from "typescript";
import { carResultsRouteUpdate } from "./carResultsRouteUpdate";

test("merged route updates cannot reuse an omitted old airport selection credential", () => {
  const previous = { pickupLocationTarget: "old-pickup-authority", dropoffLocationTarget: "old-return-authority" };
  const merged: Record<string, string> = { ...previous, ...carResultsRouteUpdate({ pickupLocation: "LHR", dropoffLocation: "LHR", driverAge: "25" }) };
  assert.equal(merged.pickupLocationTarget, "");
  assert.equal(merged.dropoffLocationTarget, "");
  assert.equal(merged.driverAge, "25");
});

function modalFixture() {
  let rendered = true;
  let visible = true;
  let cursor = 0;
  const refs: Array<{ current: unknown }> = [];
  const effects: Array<() => void> = [];
  const committed: unknown[] = [];
  let closed = 0;
  const jsx = (type: unknown, props: any) => ({ type, props });
  const dependencies: Record<string, unknown> = {
    "react": { useRef: (initial: unknown) => refs[cursor++] ??= { current: initial }, useEffect: (fn: () => void) => effects.push(fn) },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { Animated: { View: "AnimatedView" }, Modal: "Modal", Platform: { OS: "android" }, KeyboardAvoidingView: "KeyboardAvoidingView", Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View", StyleSheet: { create: (x: unknown) => x, absoluteFill: {} } },
    "lucide-react-native": { X: "X" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ bottom: 0 }) },
    "../flow/CarSearchPanel": { CarSearchPanel: "CarSearchPanel" },
    "../flow/flowStyles": { useFlowTheme: () => ({ theme: { dark: false }, colors: {}, styles: {} }) },
    "../flow/retainedPickerContext": { useRetainedPickerContext: (_v: boolean, p: unknown) => p },
    "../flow/searchPickerPresentation": { useSearchPickerMotion: () => ({ rendered }) },
    "./FlightResultsSheetShell": {},
  };
  const compiled = ts.transpileModule(readFileSync(new NodeURL("./CarEditSearchModal.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported: any = {};
  runInNewContext(compiled, { exports: exported, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  const findPanel = (node: any): any => !node || typeof node !== "object" ? undefined : node.type === "CarSearchPanel" ? node : [node.props?.children].flat().map(findPanel).find(Boolean);
  const onClose = () => { closed++; visible = false; };
  const onSubmitSearch = (params: unknown) => committed.push(params);
  return {
    render: () => { cursor = 0; const tree = exported.CarEditSearchModal({ visible, params: {}, onClose, onSubmitSearch }); effects.splice(0).forEach(fn => fn()); return findPanel(tree); },
    dismiss: () => { rendered = false; }, reopen: () => { rendered = true; visible = true; },
    committed, closed: () => closed,
  };
}
test("actual car modal commits once only after its rendered native presentation has closed", () => {
  const h = modalFixture();
  const next = { pickupLocation: "LHR", driverAge: "25" };
  h.render().props.onSubmitSearch(next);
  assert.equal(h.closed(), 1);
  h.render();
  assert.equal(h.committed.length, 0, "route stays stable while closing animation owns a native Modal");
  h.dismiss(); h.render(); h.render();
  assert.deepEqual(h.committed, [next]);
});
test("reopening an interrupted edit cancels its pending submission", () => {
  const h = modalFixture();
  h.render().props.onSubmitSearch({ pickupLocation: "LHR" });
  h.reopen(); h.render();
  h.dismiss(); h.render();
  assert.equal(h.committed.length, 0);
});
