import type { Page } from "@playwright/test";

type Rect = ReturnType<DOMRect["toJSON"]> | null;

export async function installViewportEventRecorder(page: Page) {
  await page.evaluate(() => {
    const samples: unknown[] = [];
    const read = (event: string) => samples.push({
      event,
      timestamp: performance.now(),
      innerHeight: window.innerHeight,
      visualViewportHeight: window.visualViewport?.height ?? null,
      visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
      scrollY: window.scrollY,
    });
    const state = { samples, read };
    (window as typeof window & { __kurioticketViewportDiagnostics?: typeof state }).__kurioticketViewportDiagnostics = state;
    window.addEventListener("resize", () => read("window.resize"));
    window.addEventListener("orientationchange", () => read("orientationchange"));
    window.visualViewport?.addEventListener("resize", () => read("visualViewport.resize"));
    window.visualViewport?.addEventListener("scroll", () => read("visualViewport.scroll"));
    read("installed");
  });
}

export async function readViewportEvents(page: Page) {
  return page.evaluate(() => (
    (window as typeof window & { __kurioticketViewportDiagnostics?: { samples: unknown[] } })
      .__kurioticketViewportDiagnostics?.samples ?? []
  ));
}

export async function collectSafariDiagnostics(page: Page, label: string) {
  const serialized = await page.evaluate((sampleLabel) => {
    const rect = (selector: string): Rect => {
      const value = document.querySelector(selector)?.getBoundingClientRect();
      return value ? value.toJSON() : null;
    };
    const probe = (unit: string) => {
      const element = document.createElement("div");
      element.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;height:${unit};width:1px`;
      document.body.append(element);
      const pixels = element.getBoundingClientRect().height;
      element.remove();
      return pixels;
    };
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    return JSON.stringify({
      label: sampleLabel,
      timestamp: performance.now(),
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        devicePixelRatio: window.devicePixelRatio,
      },
      visualViewport: window.visualViewport ? {
        width: window.visualViewport.width,
        height: window.visualViewport.height,
        offsetTop: window.visualViewport.offsetTop,
        offsetLeft: window.visualViewport.offsetLeft,
        pageTop: window.visualViewport.pageTop,
        pageLeft: window.visualViewport.pageLeft,
        scale: window.visualViewport.scale,
      } : null,
      document: {
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        bodyScrollWidth: document.body.scrollWidth,
        bodyScrollHeight: document.body.scrollHeight,
      },
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
      },
      cssPixels: {
        vh: probe("100vh"),
        svh: probe("100svh"),
        dvh: probe("100dvh"),
        lvh: probe("100lvh"),
      },
      colors: {
        html: rootStyle.backgroundColor,
        body: bodyStyle.backgroundColor,
        themeColor: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? null,
        overlayCanvas: rootStyle.getPropertyValue("--mobile-results-overlay-canvas").trim(),
        activeOverlayCanvas: rootStyle.getPropertyValue("--mobile-results-overlay-active-canvas").trim(),
        overlay: document.querySelector("[data-mobile-results-overlay-root]")
          ? getComputedStyle(document.querySelector("[data-mobile-results-overlay-root]")!).backgroundColor
          : null,
        sheet: document.querySelector("[data-mobile-results-edit-sheet] [role=dialog]")
          ? getComputedStyle(document.querySelector("[data-mobile-results-edit-sheet] [role=dialog]")!).backgroundColor
          : null,
      },
      rects: {
        overlay: rect("[data-mobile-results-overlay-root]"),
        editSheet: rect("[data-mobile-results-edit-sheet]"),
        sheetSurface: rect("[data-mobile-results-edit-sheet] .mobile-results-sheet-surface"),
        dialog: rect("[data-mobile-results-overlay-root] [role=dialog]"),
        continuation: rect("[data-mobile-results-sheet-bottom-continuation]"),
        compactHeader: rect("header[aria-hidden=false]"),
      },
    });
  }, label);
  return JSON.parse(serialized);
}
