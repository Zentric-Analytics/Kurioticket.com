import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const start = source.indexOf("    const releaseExistingLock = () => {");
const end = source.indexOf("  }, [filtersOpen, quickFilterGroupId]);", start);
assert.ok(start >= 0 && end > start);
// Execute the actual effect body, including its cleanup, with deterministic DOM doubles.
const effect = ts.transpileModule(`(() => {${source.slice(start, end)}})()`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function install(quick: boolean, empty = false) {
  const document = { activeElement: null as object | null };
  const node = () => ({ focus() { document.activeElement = this; } });
  const first = node(), last = node(), launcher = node(), other = node();
  const controls = empty ? [] : [first, last];
  const dialog = { ...node(), contains(value: object | null) { return value === this || controls.includes(value as typeof first); }, querySelectorAll() { return controls; } };
  const quickClose = node(), fullClose = node();
  const keyHandlers = new Map<string, (event: { key: string; shiftKey: boolean; preventDefault(): void }) => void>();
  const mediaHandlers = new Map<string, () => void>();
  const media = { matches: true, addEventListener(name: string, fn: () => void) { mediaHandlers.set(name, fn); }, removeEventListener(name: string) { mediaHandlers.delete(name); } };
  const state = { filtersOpen: !quick, quickFilterGroupId: quick ? "features" : null as string | null, released: 0, restored: 0 };
  const cleanup = runInNewContext(effect, {
    document, filtersOpen: state.filtersOpen, quickFilterGroupId: state.quickFilterGroupId,
    window: { matchMedia: () => media, addEventListener(name: string, fn: (event: { key: string; shiftKey: boolean; preventDefault(): void }) => void) { keyHandlers.set(name, fn); }, removeEventListener(name: string) { keyHandlers.delete(name); } },
    requestAnimationFrame: (fn: () => void) => { fn(); return 1; }, cancelAnimationFrame() {},
    mobileFiltersScrollLockRef: { current: null },
    quickFiltersDialogRef: { current: quick ? dialog : null }, filtersDialogRef: { current: quick ? null : dialog },
    quickFiltersCloseButtonRef: { current: quickClose }, filtersCloseButtonRef: { current: fullClose },
    mobileFiltersLauncherRef: { current: launcher }, filtersButtonRef: { current: other },
    mobileFiltersModalityRef: { current: "keyboard" },
    isSafelyFocusableElement: () => true,
    acquireMobileResultsScrollLock: () => () => { state.released += 1; },
    restoreOverlayLauncherFocus: (target: typeof launcher, modality: string) => { assert.equal(target, launcher); assert.equal(modality, "keyboard"); state.restored += 1; target.focus(); },
    setFiltersOpen: (value: boolean) => { state.filtersOpen = value; },
    setQuickFilterGroupId: (value: string | null) => { state.quickFilterGroupId = value; },
  });
  assert.equal(typeof cleanup, "function");
  function key(key: string, shiftKey = false) {
    let prevented = false;
    const handler = keyHandlers.get("keydown");
    assert.ok(handler);
    handler({ key, shiftKey, preventDefault() { prevented = true; } });
    return prevented;
  }
  return { document, first, last, dialog, quickClose, fullClose, state, key, cleanup, media, mediaHandlers, keyHandlers };
}

for (const quick of [false, true]) {
  test(`${quick ? "quick filter" : "full filter"} receives focus and traps keyboard navigation`, () => {
    const x = install(quick);
    assert.equal(x.document.activeElement, quick ? x.quickClose : x.fullClose);
    x.document.activeElement = x.last;
    assert.equal(x.key("Tab"), true); assert.equal(x.document.activeElement, x.first);
    assert.equal(x.key("Tab", true), true); assert.equal(x.document.activeElement, x.last);
    x.document.activeElement = {};
    assert.equal(x.key("Tab"), true); assert.equal(x.document.activeElement, x.first);
    x.document.activeElement = x.dialog;
    assert.equal(x.key("Tab", true), true); assert.equal(x.document.activeElement, x.last);
    assert.equal(x.key("Escape"), true);
    assert.equal(x.state.filtersOpen, false); assert.equal(x.state.quickFilterGroupId, null);
    x.cleanup();
    assert.equal(x.state.released, 1); assert.equal(x.state.restored, 1);
    assert.equal(x.keyHandlers.size, 0); assert.equal(x.mediaHandlers.size, 0);
  });
}

test("an empty quick dialog retains focus instead of tabbing into the page", () => {
  const x = install(true, true);
  assert.equal(x.key("Tab"), true); assert.equal(x.document.activeElement, x.dialog);
  x.cleanup();
});

test("desktop resize closes both filter modes without restoring a hidden launcher", () => {
  const x = install(true);
  x.media.matches = false;
  x.mediaHandlers.get("change")?.();
  assert.equal(x.state.filtersOpen, false); assert.equal(x.state.quickFilterGroupId, null);
  x.cleanup();
  assert.equal(x.state.restored, 0); assert.equal(x.state.released, 1);
});
