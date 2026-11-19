import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act, createElement } from "react";
import { platformFixture } from "../../../qa/stage06/fixtures";
import type { PlatformOperations } from "./PlatformHealthDashboard";

test("Refresh observations: visible pending, single request, success and error recovery", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://staging.kurioticket.com/admin/platform-health", pretendToBeVisual: true,
  });
  const globals = ["window", "self", "document", "Element", "Node", "HTMLElement", "Event", "MouseEvent", "navigator"] as const;
  const originals = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const key of globals) Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
  const oldReact = Object.getOwnPropertyDescriptor(globalThis, "React");
  const oldAct = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  const oldFetch = globalThis.fetch;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  const { createRoot } = await import("react-dom/client");
  const { PlatformHealthRefresh } = await import("./PlatformHealthRefresh");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const received: PlatformOperations[] = [];
  let displayed = "2026-11-16T00:00:00.000Z";
  const onRefreshed = (next: PlatformOperations) => {
    received.push(next);
    displayed = next.window.to;
    root.render(createElement(PlatformHealthRefresh, { hours: 24, lastRefreshedAt: displayed, onRefreshed }));
  };
  try {
    await act(async () => root.render(createElement(PlatformHealthRefresh, { hours: 24, lastRefreshedAt: displayed, onRefreshed })));
    const button = host.querySelector("button")!;
    assert.match(host.textContent ?? "", /Last refreshed: 00:00 UTC/);
    let requests = 0;
    let finish: (value: Response) => void = () => {};
    globalThis.fetch = (_url, options) => {
      requests++;
      assert.match(String(_url), /\/api\/admin\/platform-operations\?hours=24/);
      assert.equal(options?.cache, "no-store");
      assert.equal(options?.credentials, "same-origin");
      return new Promise<Response>(resolve => { finish = resolve; });
    };
    await act(async () => { button.click(); button.click(); });
    assert.equal(requests, 1);
    assert.equal(button.disabled, true);
    assert.match(button.textContent ?? "", /Refreshing/);
    assert.match(host.textContent ?? "", /Checking observations/);
    assert.equal(received.length, 0);
    const response = platformFixture();
    await act(async () => finish(Response.json(response)));
    assert.equal(received.length, 1);
    assert.equal(button.disabled, false);
    assert.match(host.textContent ?? "", /Updated/);
    assert.match(host.textContent ?? "", /Last refreshed: 00:00 UTC/);
    globalThis.fetch = async () => Response.json({ error: "backend unavailable" }, { status: 503 });
    await act(async () => button.click());
    assert.equal(received.length, 1, "failed refresh must preserve previous observations");
    assert.match(host.querySelector('[role="alert"]')?.textContent ?? "", /could not refresh/);
    assert.equal(button.disabled, false, "refresh must recover from a server error");
    globalThis.fetch = async () => Response.json({ invalid: true });
    await act(async () => button.click());
    assert.equal(received.length, 1, "invalid data must not be displayed");
    assert.match(host.querySelector('[role="alert"]')?.textContent ?? "", /response was incomplete/);
    globalThis.fetch = async () => Response.json(platformFixture());
    await act(async () => button.click());
    assert.equal(received.length, 2, "a retry must work after failure");
    assert.equal(host.querySelector('[role="alert"]'), null);
    assert.match(host.textContent ?? "", /Updated/);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    globalThis.fetch = oldFetch;
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    if (oldReact) Object.defineProperty(globalThis, "React", oldReact); else Reflect.deleteProperty(globalThis, "React");
    if (oldAct) Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", oldAct); else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    dom.window.close();
  }
});
