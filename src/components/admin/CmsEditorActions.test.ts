import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CmsEditorActions, type CmsEditorAction } from "./CmsEditorActions";

const noop = () => {};
const defaults = {
  status: "PUBLISHED" as const,
  pendingAction: null,
  validDraft: true,
  draftDirty: false,
  onCreate: noop,
  onSave: noop,
  onPublish: noop,
  onHide: noop,
  onArchive: noop,
};

function render(overrides: Partial<Parameters<typeof CmsEditorActions>[0]> = {}) {
  const html = renderToStaticMarkup(createElement(CmsEditorActions, { ...defaults, ...overrides }));
  return { html, buttons: html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [] };
}

test("each action has its own loading state and competing writes are disabled", () => {
  for (const [pendingAction, label] of [
    ["save_draft", "Saving…"], ["publish", "Publishing…"], ["hide", "Hiding…"], ["archive", "Archiving…"],
  ] as const satisfies readonly (readonly [CmsEditorAction, string])[]) {
    const { html, buttons } = render({ pendingAction });
    assert.equal(buttons.length, 4);
    assert.equal(buttons.filter(button => button.includes('aria-busy="true"')).length, 1);
    assert.ok(buttons.every(button => button.includes('disabled=""')));
    assert.ok(buttons.find(button => button.includes('aria-busy="true"'))?.includes(`aria-hidden="false">${label}`));
    assert.ok(html.includes(`role="status" aria-live="polite">${label}`));
  }
});

test("idle actions recover and unsaved edits cannot be published", () => {
  const idle = render();
  assert.equal(idle.buttons.length, 4);
  assert.ok(idle.buttons.every(button => !button.includes('disabled=""') && !button.includes('aria-busy="true"')));
  const dirty = render({ draftDirty: true });
  assert.equal(dirty.buttons.filter(button => button.includes('disabled=""')).length, 1);
  assert.ok(dirty.buttons.find(button => button.includes('disabled=""'))?.includes('>Publish<'));
});

test("new, hidden and archived content expose only valid lifecycle actions", () => {
  const creating = render({ status: undefined, pendingAction: "create_draft" });
  assert.equal(creating.buttons.length, 1);
  assert.ok(creating.buttons[0].includes('aria-busy="true"'));
  assert.equal(render({ status: undefined, validDraft: false }).buttons.filter(button => button.includes('disabled=""')).length, 1);
  for (const status of ["DRAFT", "HIDDEN"] as const) assert.equal(render({ status }).buttons.length, 3);
  assert.equal(render({ status: "ARCHIVED" }).html, "");
});
