import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act, createElement } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// Mount real controls with a local router and fake API. No staging content is written.
test("CMS editors, navigation guards and action recovery", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://cms.invalid/admin/content/faqs/content-123", pretendToBeVisual: true });
  const names = ["window", "self", "document", "Element", "Node", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "Event", "MouseEvent", "KeyboardEvent", "navigator", "location", "history"] as const;
  const original = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  for (const name of names) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
  // The repository test loader transpiles JSX with the classic React runtime.
  const originalReact = Object.getOwnPropertyDescriptor(globalThis, "React");
  const originalAct = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const { createRoot } = await import("react-dom/client");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime");
  const { FaqCmsEditor } = await import("./FaqCmsEditor");
  const { HomepageCmsEditor } = await import("./HomepageCmsEditor");
  const { CmsOperationProvider } = await import("./CmsOperationContext");
  const { CmsCardReorder } = await import("./CmsCardReorder");
  const { CmsRevisionRestoreButton } = await import("./CmsRevisionRestoreButton");
  const { FaqCmsInitializeButton } = await import("./FaqCmsInitializeButton");
  const { HomepageCmsInitializeButton } = await import("./HomepageCmsInitializeButton");
  const { CmsScopeHardeningActions } = await import("./CmsScopeHardeningActions");
  const { CmsLocationCombobox } = await import("./CmsLocationCombobox");
  const { requestCmsDiscard, useCmsNavigationGuard } = await import("@/lib/cmsNavigationGuard");
  const savedFetch = globalThis.fetch;
  const router = { back() {}, forward() {}, push() {}, replace() {}, refresh() {}, prefetch() {}, bfcacheId: "test" } as AppRouterInstance;
  const payload = { question: "How do I book?", answer: "Compare offers.", category: "General" };
  const faq = { id: "content-123", key: "faq-book", status: "PUBLISHED" as const, market: "GLOBAL", locale: "en", sortOrder: 0, version: 8, publishedVersion: 1, publishedAt: "2026-11-06T10:00:00Z", draftPayload: payload, publishedPayload: payload, publishedMarket: "GLOBAL", publishedLocale: "en", publishedSortOrder: 0 };
  let confirms = 0;
  let discard = false;
  dom.window.confirm = () => { confirms++; return discard; };
  let alerts = 0;
  dom.window.alert = () => { alerts++; };

  async function mount(element: React.ReactNode) {
    const host = document.createElement("div"); document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(createElement(AppRouterContext.Provider, { value: router }, element)));
    return { host, async close() { await act(async () => root.unmount()); host.remove(); } };
  }
  async function click(element: Element | null | undefined) { assert.ok(element); await act(async () => (element as HTMLElement).click()); }
  function button(host: Element, label: string) { return [...host.querySelectorAll("button")].find(b => b.textContent?.trim().startsWith(label)); }
  async function edit(element: HTMLInputElement | HTMLTextAreaElement | null, value: string) {
    assert.ok(element);
    const prototype = element.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
      element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  }
  try {
    await t.test("new drafts protect typed text, links, browser Back and tab closure", async () => {
      confirms = 0; discard = false;
      const view = await mount(createElement(FaqCmsEditor));
      await edit(view.host.querySelector("input"), "My unsaved FAQ");
      assert.equal(requestCmsDiscard(), false); assert.equal(confirms, 1);
      const link = document.createElement("a"); link.href = "/admin/content"; view.host.append(link);
      const event = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event); assert.equal(event.defaultPrevented, true);
      const unload = new dom.window.Event("beforeunload", { cancelable: true });
      dom.window.dispatchEvent(unload); assert.equal(unload.defaultPrevented, true);
      const current = location.href;
      history.replaceState({}, "", "/admin/content");
      dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate", { state: {} }));
      assert.equal(location.href, current);
      discard = true; assert.equal(requestCmsDiscard(), true);
      assert.equal(view.host.querySelector("input")?.value, "My unsaved FAQ");
      await view.close();
    });
    await t.test("blank and over-limit Order disable save and identify the field", async () => {
      const view = await mount(createElement(FaqCmsEditor, { initialItem: faq }));
      assert.equal(view.host.querySelector('input[type="number"]')?.value, "1");
      for (const value of ["", "0", "100002"]) {
        await edit(view.host.querySelector('input[type="number"]'), value);
        assert.equal(button(view.host, "Save draft")?.disabled, true);
        assert.match(view.host.querySelector('[data-cms-field-error="sortOrder"]')?.textContent ?? "", /1 to 100001/);
      }
      await edit(view.host.querySelector('input[type="number"]'), "100001");
      assert.equal(button(view.host, "Save draft")?.disabled, false);
      await view.close();
    });
    await t.test("paragraph save succeeds, success dismisses, edits clear old messages and field failures", async () => {
      globalThis.fetch = async (_url, init) => {
        const input = JSON.parse(String(init?.body));
        return Response.json({ item: { ...faq, version: 9, draftPayload: input.payload, sortOrder: input.sortOrder } });
      };
      const view = await mount(createElement(FaqCmsEditor, { initialItem: faq }));
      await edit(view.host.querySelector("textarea"), "First paragraph.\n\nSecond paragraph.");
      await click(button(view.host, "Save draft"));
      assert.match(view.host.textContent ?? "", /Draft saved/);
      assert.equal(requestCmsDiscard(), true, "successful save must clear the navigation warning");
      await click(view.host.querySelector('[aria-label="Dismiss success message"]'));
      assert.doesNotMatch(view.host.textContent ?? "", /Draft saved/);
      globalThis.fetch = async () => Response.json({ error: "Content payload is invalid.", issues: { fieldErrors: { answer: ["Fix this answer"] } } }, { status: 400 });
      await click(button(view.host, "Save draft"));
      assert.match(view.host.querySelector('[data-cms-field-error="answer"]')?.textContent ?? "", /Fix this answer/);
      await edit(view.host.querySelector("textarea"), "Corrected answer");
      assert.doesNotMatch(view.host.textContent ?? "", /Fix this answer|Content payload is invalid/);
      globalThis.fetch = async () => Response.json({ error: "Content changed since it was opened. Refresh before saving." }, { status: 409 });
      await click(button(view.host, "Save draft"));
      await edit(view.host.querySelector("textarea"), "Keep these local edits");
      assert.ok(button(view.host, "Reload latest"), "real stale-version conflicts must remain visible");
      await view.close();
    });
    await t.test("Hide retains unsaved draft edits and unchanged snapshots show no publication warning", async () => {
      globalThis.fetch = async () => Response.json({ item: { ...faq, status: "HIDDEN", version: 9 } });
      const view = await mount(createElement(FaqCmsEditor, { initialItem: faq }));
      const stateLabel = [...view.host.querySelectorAll("p")].find(p => p.textContent === "Unpublished changes");
      assert.equal(stateLabel?.nextElementSibling?.textContent, "No");
      await edit(view.host.querySelector("textarea"), "Keep my unsaved answer");
      await click(button(view.host, "Hide"));
      assert.equal(view.host.querySelector("textarea")?.value, "Keep my unsaved answer");
      discard = false; assert.equal(requestCmsDiscard(), false);
      await view.close();
    });
    await t.test("pending writes block navigation and recover after a rejected connection", async () => {
      let reject: (error: Error) => void = () => {};
      globalThis.fetch = () => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; });
      const view = await mount(createElement(FaqCmsEditor, { initialItem: faq }));
      await click(button(view.host, "Save draft"));
      const before = alerts;
      assert.equal(requestCmsDiscard(), false); assert.equal(alerts, before + 1);
      assert.ok([...view.host.querySelectorAll("button")].every(b => b.disabled));
      await act(async () => reject(new Error("Offline")));
      assert.match(view.host.textContent ?? "", /Check your connection/);
      assert.equal(button(view.host, "Save draft")?.disabled, false);
      await view.close();
    });
    await t.test("revision restore locks editors and sibling restore buttons until the operation settles", async () => {
      let reject: (error: Error) => void = () => {};
      globalThis.fetch = () => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; });
      discard = true;
      const view = await mount(createElement(CmsOperationProvider, null, createElement(React.Fragment, null,
        createElement(FaqCmsEditor, { initialItem: faq }),
        createElement(CmsRevisionRestoreButton, { itemId: faq.id, revisionId: "revision-1", expectedVersion: 8 }),
        createElement(CmsRevisionRestoreButton, { itemId: faq.id, revisionId: "revision-2", expectedVersion: 8 }),
      )));
      await click(button(view.host, "Restore to draft"));
      assert.equal(view.host.querySelector("textarea")?.disabled, true);
      assert.ok([...view.host.querySelectorAll("button")].every(b => b.disabled));
      assert.equal(requestCmsDiscard(), false);
      await act(async () => reject(new Error("Offline")));
      assert.equal(view.host.querySelector("textarea")?.disabled, false);
      assert.match(view.host.textContent ?? "", /Check your connection/);
      await view.close();
    });
    await t.test("reorder changes undone to the baseline disable Save and remove the leave warning", async () => {
      const rows = ["LOS", "JFK"].map((originCode, i) => ({ ...faq, id: `card-${i}`, key: `dubai-${originCode}`, draftPayload: { city: "Dubai", country: "United Arab Emirates", originCode, destinationCode: "DXB" }, sortOrder: i }));
      const view = await mount(createElement(CmsCardReorder, { rows, section: "destinations", market: "NG", onDone() {} }));
      assert.equal(button(view.host, "Save draft order")?.disabled, true);
      await click(view.host.querySelector('[aria-label="Move Dubai · United Arab Emirates · LOS → DXB down"]'));
      discard = false; assert.equal(requestCmsDiscard(), false);
      await click(view.host.querySelector('[aria-label="Move Dubai · United Arab Emirates · LOS → DXB up"]'));
      assert.equal(button(view.host, "Save draft order")?.disabled, true);
      assert.equal(requestCmsDiscard(), true);
      await view.close();
    });
    await t.test("existing hotels are linked and excluded from available canonical choices", async () => {
      const options = [
        { canonicalId: "hotel:gb-london", label: "London · United Kingdom", name: "London", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "London, United Kingdom", managedItemId: "managed-london" },
        { canonicalId: "hotel:ng-lagos", label: "Lagos · Nigeria", name: "Lagos", country: "Nigeria", countryCode: "NG", kind: "city", searchValue: "Lagos, Nigeria" },
      ];
      const view = await mount(createElement(HomepageCmsEditor, { section: "hotel-destinations", markets: ["GLOBAL"], initialMarket: "GLOBAL", hotelOptions: options }));
      await click(view.host.querySelector('[aria-label="Open Canonical hotel destination suggestions"]'));
      assert.doesNotMatch(document.querySelector('[role="listbox"]')?.textContent ?? "", /London/);
      assert.match(document.querySelector('[role="listbox"]')?.textContent ?? "", /Lagos/);
      await edit(view.host.querySelector('input[role="combobox"]'), "London");
      assert.ok(view.host.querySelector('a[href*="managed-london"]'));
      await view.close();
      const all = await mount(createElement(HomepageCmsEditor, { section: "hotel-destinations", markets: ["GLOBAL"], initialMarket: "GLOBAL", hotelOptions: options.slice(0, 1) }));
      assert.match(all.host.textContent ?? "", /All canonical hotel destinations are already managed/);
      assert.equal(button(all.host, "Create draft")?.disabled, true);
      await all.close();
    });
    await t.test("location dropdowns remain attached below the field and close on the same field or page scroll", async () => {
      const view = await mount(createElement(CmsLocationCombobox, { label: "Country", kind: "country", value: "Germany", onChange() {} }));
      const input = view.host.querySelector("input")!;
      let bottom = 236;
      input.getBoundingClientRect = () => ({ left: 24, right: 184, width: 160, height: 36, top: bottom - 36, bottom, x: 24, y: bottom - 36, toJSON() {} });
      await click(view.host.querySelector("button"));
      let list = document.querySelector<HTMLElement>('[role="listbox"]')!;
      assert.equal(list.style.top, "235px"); assert.equal(list.style.width, "160px");
      assert.ok(list.className.includes("border-t-0"));
      await act(async () => input.dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true })));
      assert.equal(document.querySelector('[role="listbox"]'), null);
      bottom = 716;
      await click(view.host.querySelector("button"));
      list = document.querySelector<HTMLElement>('[role="listbox"]')!;
      assert.equal(list.style.top, "715px");
      assert.ok(Number.parseInt(list.style.maxHeight) < 232);
      await act(async () => list.dispatchEvent(new dom.window.Event("scroll", { bubbles: true })));
      assert.ok(document.querySelector('[role="listbox"]'));
      bottom -= 20;
      await act(async () => document.dispatchEvent(new dom.window.Event("scroll", { bubbles: true })));
      assert.equal(document.querySelector('[role="listbox"]'), null);
      await view.close();
    });
    await t.test("restricted airport selectors give supported-route advice and remain searchable by city", async () => {
      const view = await mount(createElement(CmsLocationCombobox, { label: "Origin IATA", kind: "airport", value: "zzzzzz", airportCodes: ["LOS"], allowManualAirportCode: false, onChange() {} }));
      assert.equal(view.host.querySelector("input")?.hasAttribute("maxlength"), false);
      await click(view.host.querySelector("button"));
      assert.match(document.querySelector('[role="listbox"]')?.textContent ?? "", /No supported airport/);
      assert.doesNotMatch(document.querySelector('[role="listbox"]')?.textContent ?? "", /manually/);
      await view.close();
    });
    await t.test("modern browser traversal can be declined before the router changes pages", async () => {
      const navigation = new dom.window.EventTarget();
      Object.defineProperty(dom.window, "navigation", { value: navigation, configurable: true });
      function Guard() { useCmsNavigationGuard(true, false); return null; }
      const view = await mount(createElement(Guard));
      discard = false;
      const event = Object.assign(new dom.window.Event("navigate", { cancelable: true }), { navigationType: "traverse", canIntercept: true, hashChange: false });
      navigation.dispatchEvent(event); assert.equal(event.defaultPrevented, true);
      // Browsers that cannot cancel this navigation still need the popstate fallback.
      const current = location.href;
      const noncancelable = Object.assign(new dom.window.Event("navigate"), { navigationType: "traverse", canIntercept: false, hashChange: false });
      navigation.dispatchEvent(noncancelable);
      history.replaceState({}, "", "/admin/content");
      dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate", { state: {} }));
      assert.equal(location.href, current);
      await view.close(); delete (dom.window as unknown as { navigation?: unknown }).navigation;
    });
    await t.test("restore, initialization and scope operations catch offline failures and allow retry", async () => {
      globalThis.fetch = async () => { throw new Error("Offline"); };
      discard = true;
      const actions = [
        createElement(CmsRevisionRestoreButton, { itemId: faq.id, revisionId: "revision-1", expectedVersion: faq.version }),
        createElement(FaqCmsInitializeButton), createElement(HomepageCmsInitializeButton),
        createElement(CmsScopeHardeningActions, { type: "FAQ", market: "GLOBAL", locale: "en", scopeVersion: 1, legacyFallbackRetired: false, fallbackRetirementEligible: false, draftOrderCollisionCount: 1, draftOrderNeedsNormalization: true, mode: "normalize" }),
      ];
      for (const element of actions) {
        const view = await mount(element);
        await click(view.host.querySelector("button"));
        assert.match(view.host.querySelector('[role="alert"]')?.textContent ?? "", /Check your connection/);
        assert.equal(view.host.querySelector("button")?.disabled, false);
        await view.close();
      }
    });
  } finally {
    globalThis.fetch = savedFetch;
    for (const [name, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
    if (originalReact) Object.defineProperty(globalThis, "React", originalReact); else Reflect.deleteProperty(globalThis, "React");
    if (originalAct) Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalAct); else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    dom.window.close();
  }
});
