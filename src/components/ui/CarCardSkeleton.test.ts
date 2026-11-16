import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { cn } from "../../lib/utils";

const source = readFileSync(new URL("./Skeleton.tsx", import.meta.url), "utf8");
const carSkeleton = source.slice(source.indexOf("export function CarCardSkeleton"));

test("CarCardSkeleton mirrors the compact mobile 40/60 card and conversion row", () => {
  assert.match(carSkeleton, /data-car-card-skeleton-mobile className="md:hidden"/);
  assert.match(carSkeleton, /grid-cols-\[40%_minmax\(0,1fr\)\]/);
  assert.match(carSkeleton, /border-t[^\"]*bg-slate-50\/45/);
  assert.match(carSkeleton, /h-11 w-24 rounded-\[10px\]/);
});

test("CarCardSkeleton mirrors the compact standalone desktop price rail", () => {
  type Element = ReactElement<{ className?: string; children?: ReactNode; [key: string]: unknown }>;
  // Compile the unchanged module with the automatic JSX runtime used by Next.js.
  // The standalone JITI loader otherwise expects a React global in TSX modules.
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const moduleExports = {} as { CarCardSkeleton: (props?: { desktopSurfaceParity: boolean; transitionMotion: "pulse" | "shimmer" }) => Element };
  runInNewContext(compiled, { exports: moduleExports, require: (name: string) => {
    if (name === "react/jsx-runtime") return jsxRuntime;
    assert.equal(name, "@/lib/utils");
    return { cn };
  } });
  const { CarCardSkeleton } = moduleExports;
  const elements = (node: ReactNode): Element[] => {
    const found: Element[] = [];
    Children.forEach(node, (child) => {
      if (isValidElement<Element["props"]>(child)) {
        found.push(child, ...elements(child.props.children));
      }
    });
    return found;
  };
  const children = (node: Element) => Children.toArray(node.props.children).filter(isValidElement) as Element[];
  const tokens = (node: Element) => new Set(node.props.className?.split(/\s+/));
  const has = (actual: Set<string>, expected: string[]) => expected.forEach((token) => assert.ok(actual.has(token), token));
  const grids: Set<string>[] = [];
  let mobileMarkup: string | undefined;
  for (const desktopSurfaceParity of [true, false]) {
    for (const transitionMotion of ["pulse", "shimmer"] as const) {
      const root = CarCardSkeleton({ desktopSurfaceParity, transitionMotion });
      const all = elements(root);
      const marked = (name: string) => {
        const matches = all.filter((node) => Object.hasOwn(node.props, name));
        assert.equal(matches.length, 1, name);
        return matches[0];
      };
      const mobile = marked("data-car-card-skeleton-mobile");
      const desktop = marked("data-car-card-skeleton-desktop");
      has(tokens(mobile), ["md:hidden"]);
      has(tokens(children(mobile)[0]), ["grid", "grid-cols-[40%_minmax(0,1fr)]"]);
      const renderedMobile = renderToStaticMarkup(mobile);
      if (mobileMarkup === undefined) mobileMarkup = renderedMobile;
      else assert.equal(renderedMobile, mobileMarkup, "desktop parity and transition motion do not rewrite mobile content");
      const grid = tokens(desktop);
      has(grid, ["hidden", "md:grid", "md:grid-cols-[250px_minmax(0,1fr)]"]);
      has(grid, desktopSurfaceParity
        ? ["lg:grid-cols-[192px_minmax(0,1fr)]", "xl:grid-cols-[200px_minmax(0,1fr)]"]
        : ["lg:grid-cols-[192px_minmax(0,1fr)_152px]", "xl:grid-cols-[200px_minmax(0,1fr)_152px]"]);
      assert.equal([...grid].filter((token) => token.startsWith("lg:grid-cols-")).length, 1);
      assert.equal([...grid].filter((token) => token.startsWith("xl:grid-cols-")).length, 1);
      if (transitionMotion === "pulse") grids.push(grid);
      const regions = children(desktop);
      assert.equal(regions.length, 3, "image, heading/details, then lower price/offer placeholders");
      has(tokens(regions[0]), ["md:border-e", "lg:border-e-0", "lg:p-0"]);
      has(tokens(children(regions[0])[0]), ["aspect-[4/3]", "w-full", "lg:aspect-auto", "lg:h-[176px]"]);
      has(tokens(regions[1]), ["space-y-2.5", "px-4", "py-3"]);
      has(tokens(regions[2]), ["col-span-full", "min-w-0"]);
      has(tokens(regions[2]), desktopSurfaceParity
        ? ["lg:col-span-2", "lg:border-s-0", "lg:border-t"]
        : ["lg:col-span-1", "lg:border-s", "lg:border-t-0"]);
      const [price, offers] = children(regions[2]);
      assert.equal(tokens(price).has("lg:hidden"), desktopSurfaceParity);
      has(tokens(offers), ["hidden", "w-full"]);
      assert.equal(tokens(offers).has("lg:block"), desktopSurfaceParity);
      assert.equal(children(offers).length, 3, "standalone lower area has three rate-row placeholders");
      const html = renderToStaticMarkup(root);
      assert.match(html, /role="status" aria-label="Loading car result"/);
      assert.match(html, /class="sr-only">Loading car result<\/span>/);
      assert.match(html, /animate-pulse/);
      assert.equal(tokens(root).has("cars-filter-card-skeleton"), transitionMotion === "shimmer");
      assert.doesNotMatch(html, /<(?:a|button)\b/, "placeholders have no live handoff or alert controls");
    }
  }
  const defaultDesktop = elements(CarCardSkeleton()).find((node) => Object.hasOwn(node.props, "data-car-card-skeleton-desktop"));
  assert.ok(defaultDesktop);
  assert.deepEqual(tokens(defaultDesktop), grids[1], "omitted parity retains the default three-column variant");

  // Evaluate the actual ready-card class owners, without running provider hooks.
  const cardText = readFileSync(new URL("../results/CarResultCard.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("CarResultCard.tsx", cardText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const regions = new Map<string, ts.JsxOpeningElement>();
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node)) {
      const region = node.attributes.properties.find((prop): prop is ts.JsxAttribute => ts.isJsxAttribute(prop) && prop.name.getText() === "data-region");
      if (region?.initializer && ts.isStringLiteral(region.initializer)) regions.set(region.initializer.text, node);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const image = regions.get("image");
  assert.ok(image && ts.isJsxElement(image.parent) && ts.isJsxElement(image.parent.parent));
  const readyGrid = image.parent.parent.openingElement;
  const evaluateClasses = (node: ts.JsxOpeningElement, guidedPlanning: boolean) => {
    const attr = node.attributes.properties.find((prop): prop is ts.JsxAttribute => ts.isJsxAttribute(prop) && prop.name.getText() === "className");
    assert.ok(attr?.initializer && ts.isJsxExpression(attr.initializer) && attr.initializer.expression);
    return new Set<string>(runInNewContext(attr.initializer.expression.getText(), { guidedPlanning, desktopSurfaceParity: true, offersExpanded: false }).split(/\s+/));
  };
  const standalone = evaluateClasses(readyGrid, false);
  for (const token of ["hidden", "md:grid", "md:grid-cols-[250px_minmax(0,1fr)]", "lg:grid-cols-[192px_minmax(0,1fr)]", "xl:grid-cols-[200px_minmax(0,1fr)]"]) {
    assert.ok(standalone.has(token));
    assert.ok(grids[0].has(token), `standalone skeleton matches ready grid: ${token}`);
  }
  has(evaluateClasses(image, false), ["md:col-start-1", "lg:row-span-1"]);
  const imageFrame = image.parent.children.find((node): node is ts.JsxElement => ts.isJsxElement(node));
  assert.ok(imageFrame);
  has(evaluateClasses(imageFrame.openingElement, false), ["aspect-[4/3]", "w-full", "md:!h-[220px]", "lg:!h-[176px]"]);
  const details = regions.get("details"), pricing = regions.get("pricing");
  assert.ok(details && pricing);
  has(evaluateClasses(details, false), ["lg:col-span-2", "lg:col-start-1"]);
  has(evaluateClasses(pricing, false), ["md:col-span-2", "md:col-start-1", "lg:!hidden"]);
  const guided = evaluateClasses(readyGrid, true);
  has(guided, ["lg:grid-cols-[250px_minmax(0,1fr)_205px]", "xl:grid-cols-[270px_minmax(0,1fr)_205px]"]);
  has(evaluateClasses(pricing, true), ["lg:col-start-3", "lg:row-start-1"]);
  assert.ok(!guided.has("lg:grid-cols-[192px_minmax(0,1fr)]"));
  assert.ok(!grids[1].has("lg:grid-cols-[192px_minmax(0,1fr)]"), "default/non-parity placeholder must not inherit standalone geometry");
  // Non-parity placeholders approximate guided/default loading; exact guided parity is not asserted.
});
