import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { AnalyticsConsentBridge, AnalyticsConsentRouteBoundary } = jiti("./AnalyticsConsentBridge") as typeof import("./AnalyticsConsentBridge");

test("mobile legal documents never mount the website consent subtree", () => {
  for (const pathname of ["/mobile/legal/terms-of-service", "/mobile/legal/privacy-policy", "/mobile/legal/privacy-policy/"]) {
    // No SessionProvider is supplied: entering the consent lifecycle would call
    // useSession and fail, even if the panel happened to render no markup yet.
    assert.equal(renderToStaticMarkup(createElement(PathnameContext.Provider, { value: pathname }, createElement(AnalyticsConsentBridge))), "");
  }
});

test("the route boundary follows navigation into and back out of mobile legal pages", () => {
  let mounts = 0;
  function ConsentLifecycle() { mounts += 1; return createElement("span", null, "Website consent"); }
  const render = (pathname: string) => renderToStaticMarkup(createElement(
    PathnameContext.Provider,
    { value: pathname },
    createElement(AnalyticsConsentRouteBoundary, null, createElement(ConsentLifecycle)),
  ));

  assert.match(render("/flights"), /Website consent/);
  assert.equal(render("/mobile/legal/terms-of-service"), "");
  assert.equal(render("/mobile/legal/privacy-policy"), "");
  assert.match(render("/hotels"), /Website consent/);
  assert.equal(mounts, 2);
});

test("website legal routes retain consent controls while an unresolved pathname mounts none", () => {
  const render = (pathname: string | null) => renderToStaticMarkup(createElement(
    PathnameContext.Provider,
    { value: pathname },
    createElement(AnalyticsConsentRouteBoundary, null, createElement("span", null, "Website consent")),
  ));
  assert.equal(render(null), "");
  assert.equal(render("/mobile/legal"), "");
  assert.match(render("/legal/privacy-policy"), /Website consent/);
  assert.match(render("/legal/terms-of-service"), /Website consent/);
  assert.match(render("/mobile/legal-information"), /Website consent/);
});
