import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {LocaleProvider} from "@/components/layout/LocaleProvider";
import {PendingDeletionActions} from "./PendingDeletionActions";
import {PendingDeletionDeadline} from "./PendingDeletionDeadline";


const deadline = "2026-11-24T03:30:00.000Z";

async function hydrate(content: ReactNode, verify: (dom: JSDOM, initialText: string) => Promise<void>) {
  const view = createElement(LocaleProvider, null, content);
  const dom = new JSDOM(`<main>${renderToString(view)}</main>`, { url: "https://example.invalid/account/pending-deletion" });
  const container = dom.window.document.querySelector("main")!;
  const initialText = container.querySelector("time")!.textContent!;
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = Object.keys(globals).map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, value });
  const hydrationErrors: unknown[] = [];
  const root = hydrateRoot(container, view, { onRecoverableError: (error) => hydrationErrors.push(error) });
  try {
    await act(async () => {});
    await verify(dom, initialText);
    assert.deepEqual(hydrationErrors, []);
  } finally {
    await act(async () => root.unmount());
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    dom.window.close();
  }
}

test("the web deadline hydrates in the traveler's time zone without a server mismatch", async () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  const format = (timeZone: string) => new Intl.DateTimeFormat("en-us", { dateStyle: "full", timeStyle: "short", timeZone }).format(new Date(deadline));
  try {
    await hydrate(createElement(PendingDeletionDeadline, { deadline, dateStyle: "full" }), async (dom, initialText) => {
      const time = dom.window.document.querySelector("time")!;
      assert.equal(initialText, format("UTC"));
      assert.equal(time.textContent, format("America/Los_Angeles"));
      assert.equal(time.dateTime, deadline);
    });
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("a failed recovery submission stays restricted and allows retry", async () => {
  const originalFetch = globalThis.fetch;
  const statuses: Array<Response | Error> = [new Error("network unavailable"), Response.json({ error: "recovery expired" }, { status: 403 }), new Response(null, { status: 200 })];
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/account/security/deletion-request/reactivate");
    assert.equal(init?.method, "POST");
    const result = statuses.shift();
    if (result instanceof Error) throw result;
    assert.ok(result);
    return result;
  };
  try {
    await hydrate(createElement(PendingDeletionActions, { deadline }), async (dom) => {
      const button = dom.window.document.querySelector("button")!;
      while (statuses.length) {
        const before = statuses.length;
        await act(async () => button.click());
        assert.equal(statuses.length, before - 1);
        assert.equal(button.disabled, false);
        assert.match(dom.window.document.body.textContent!, /Unable to reactivate account/i);
        assert.equal(dom.window.location.pathname, "/account/pending-deletion");
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("successful deletion replaces the authenticated document instead of reusing the router cache", () => {
  const dashboard = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  const handler = dashboard.slice(dashboard.indexOf("const handleDeletionRequest"));
  assert.match(handler, /if \(!response\.ok \|\| !\["PENDING", "READY_FOR_REVIEW"\]\.includes\(data\.request\?\.status\)\)/);
  assert.match(handler, /window\.location\.replace\("\/account\/pending-deletion"\)/);
  assert.doesNotMatch(handler, /router\.(?:push|replace)\("\/account\/pending-deletion"\)/);
});
