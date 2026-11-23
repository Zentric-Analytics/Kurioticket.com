import { expect, test } from "@playwright/test";
import { writeArtifact } from "../helpers/artifacts";
import { prepareResults, resultsProducts, type ResultsProduct } from "../helpers/resultsAudit";

for (const product of ["flights", "hotels"] as ResultsProduct[]) {
  test(`${product} Edit Search remains stable for 20 consecutive real-Safari cycles`, async ({ page }) => {
    test.setTimeout(600_000);
    await prepareResults(page, product, 600);

    await page.evaluate(`window.__resultsStressConfig = ${JSON.stringify({
      productName: product,
      openPattern: resultsProducts[product].open.source,
      closePattern: resultsProducts[product].close.source,
      nestedLabels: product === "flights"
        ? { 4: "Origin", 8: "Destination", 12: "Travel dates", 16: "Travelers and cabin" }
        : {},
      totalCycles: Number(process.env.QA_STRESS_CYCLES ?? 20),
    })}`);
    const records = await page.evaluate(async () => {
      const { productName, openPattern, closePattern } = (window as typeof window & {
        __resultsStressConfig: { productName: string; openPattern: string; closePattern: string; nestedLabels: Record<number, string>; totalCycles: number };
      }).__resultsStressConfig;
      const { nestedLabels, totalCycles } = (window as typeof window & {
        __resultsStressConfig: { nestedLabels: Record<number, string>; totalCycles: number };
      }).__resultsStressConfig;
      const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const findButton = (pattern: string) => Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .find((button) => {
          const box = button.getBoundingClientRect();
          const style = getComputedStyle(button);
          return !button.disabled && box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.pointerEvents !== "none"
            && new RegExp(pattern, "i").test(button.getAttribute("aria-label") ?? button.textContent ?? "");
        });
      const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().toJSON() ?? null;
      const output = [];

      for (let cycle = 1; cycle <= totalCycles; cycle += 1) {
        const targetY = cycle <= 10 ? 1800 : 0;
        window.scrollTo(0, Math.min(targetY, document.body.scrollHeight - innerHeight));
        await wait(500);
        window.dispatchEvent(new Event("scroll"));
        await wait(100);
        const before = { scrollX, scrollY, innerHeight, visualViewportHeight: visualViewport?.height ?? null };
        let launcher = findButton(openPattern)
          ?? (targetY === 0
            ? document.querySelector<HTMLButtonElement>("[data-flight-results-top-summary] button")
            : null);
        for (let attempt = 0; attempt < 20 && !launcher; attempt += 1) {
          window.scrollBy(0, attempt % 2 === 0 ? 1 : -1);
          window.dispatchEvent(new Event("scroll"));
          await wait(50);
          launcher = findButton(openPattern)
            ?? (targetY === 0
              ? document.querySelector<HTMLButtonElement>("[data-flight-results-top-summary] button")
              : null);
        }
        if (!launcher) throw new Error(`${productName} launcher missing on cycle ${cycle}`);
        launcher.click();
        for (let attempt = 0; attempt < 60 && !document.querySelector("[data-mobile-results-overlay-root]"); attempt += 1) await wait(50);
        await wait(250);
        const overlay = document.querySelector<HTMLElement>("[data-mobile-results-overlay-root]");
        if (!overlay) throw new Error(`${productName} overlay missing on cycle ${cycle}`);
        const open = {
          scrollX,
          scrollY,
          innerWidth,
          innerHeight,
          bodyScrollWidth: document.body.scrollWidth,
          overlay: rect("[data-mobile-results-overlay-root]"),
          dialog: rect("[data-mobile-results-overlay-root] [role=dialog]"),
          continuation: rect("[data-mobile-results-sheet-bottom-continuation]"),
          theme: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? null,
          htmlBackground: getComputedStyle(document.documentElement).backgroundColor,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          nested: null as null | {
            label: string;
            dialog: unknown;
            returnedDialog: unknown;
            beforeReturn: unknown;
            afterReturn: unknown;
          },
        };
        const nestedLabel = nestedLabels[cycle];
        if (nestedLabel) {
          const nestedLauncher = Array.from(overlay.querySelectorAll<HTMLButtonElement>("button"))
            .find((button) => (button.textContent ?? "").trim().startsWith(nestedLabel));
          if (!nestedLauncher) throw new Error(`${productName} ${nestedLabel} picker missing on cycle ${cycle}`);
          nestedLauncher.click();
          await wait(250);
          const nestedDialog = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).at(-1) ?? null;
          const returnButton = Array.from(nestedDialog?.querySelectorAll<HTMLButtonElement>("button") ?? [])
            .find((button) => {
              const box = button.getBoundingClientRect();
              const style = getComputedStyle(button);
              return !button.disabled && box.width > 0 && box.height > 0
                && style.visibility !== "hidden" && style.pointerEvents !== "none"
                && /^(Back|Done)$/.test((button.textContent ?? "").trim());
            });
          if (!returnButton) throw new Error(`${productName} ${nestedLabel} return control missing on cycle ${cycle}`);
          const pageState = () => ({
            scrollY,
            bodyScrollHeight: document.body.scrollHeight,
            rootScrollHeight: document.documentElement.scrollHeight,
            bodyPosition: document.body.style.position,
            bodyTop: document.body.style.top,
            rootHeight: document.documentElement.style.height,
            rootOverflow: document.documentElement.style.overflow,
          });
          open.nested = {
            label: nestedLabel,
            dialog: nestedDialog?.getBoundingClientRect().toJSON() ?? null,
            returnedDialog: null,
            beforeReturn: pageState(),
            afterReturn: null,
          };
          returnButton.click();
          for (
            let attempt = 0;
            attempt < 80 && document.querySelector("[data-flight-mobile-picker-shell]");
            attempt += 1
          ) {
            await wait(50);
          }
          if (document.querySelector("[data-flight-mobile-picker-shell]")) {
            throw new Error(`${productName} ${nestedLabel} picker did not finish closing`);
          }
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          open.nested.returnedDialog = document.querySelector<HTMLElement>('[data-mobile-results-overlay-root] [role="dialog"]')?.getBoundingClientRect().toJSON() ?? null;
          open.nested.afterReturn = pageState();
        }
        if (cycle % 2 === 0) {
          const close = findButton(closePattern);
          if (!close) throw new Error(`${productName} close button missing on cycle ${cycle}`);
          close.click();
        } else {
          overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        }
        for (let attempt = 0; attempt < 60 && document.querySelector("[data-mobile-results-overlay-root]"); attempt += 1) await wait(50);
        const after = { scrollX, scrollY };
        output.push({ cycle, before, open, after });
      }
      return output;
    });

    await writeArtifact(`${product}-20-cycles.json`, records);
    expect(records).toHaveLength(Number(process.env.QA_STRESS_CYCLES ?? 20));
    for (const record of records) {
      expect(record.open.dialog?.bottom).toBeCloseTo(record.open.innerHeight, 0);
      expect(record.open.bodyScrollWidth).toBeLessThanOrEqual(record.open.innerWidth);
      expect(Math.abs(record.after.scrollY - record.before.scrollY)).toBeLessThanOrEqual(1);
    }
  });
}
