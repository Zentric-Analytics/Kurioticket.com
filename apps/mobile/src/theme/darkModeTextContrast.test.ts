import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

test("flight-form captions and helper text stay theme-aware in dark mode", () => {
  const primitives = source("src/features/flow/FlowPrimitives.tsx");
  const flight = source("src/features/flow/FlightSearchPanel.tsx");

  assert.match(
    primitives,
    /<Text style=\{ft\.styles\.label\}>\{label\}<\/Text>/,
  );
  assert.match(primitives, /<Text style=\{ft\.styles\.meta\}>\{meta\}<\/Text>/);
  assert.match(flight, /placeholderTextColor=\{ft\.colors\.placeholder\}/);
  assert.match(
    flight,
    /trailing=\{<FlowIcon name="chevron" color=\{ft\.colors\.icon\} size=\{18\}\/>\}/,
  );
});

test("bottom navigation inactive labels and promo cards keep readable themed contrast", () => {
  const tabs = source("src/features/tabs/KurioticketTabBar.tsx");
  const promos = source("src/features/home/HomepageDealPromos.tsx");

  assert.match(tabs, /useAppTheme/);
  assert.match(tabs, /\{ color: theme\.muted \}/);
  assert.match(promos, /useFlowTheme/);
  assert.match(
    promos,
    /\? promo\.darkBackgroundColor\s*: promo\.lightBackgroundColor/s,
  );
  assert.match(
    promos,
    /const titleColor = ft\.theme\.dark \? "#F4F7FF" : ft\.colors\.textPrimary/,
  );
  assert.match(
    promos,
    /const descriptionColor = ft\.theme\.dark \? "#C8D2E6" : ft\.colors\.textSecondary/,
  );
});

test("app theme exposes semantic text tokens without changing light-mode colors", () => {
  const theme = source("src/theme/AppTheme.tsx");
  const flow = source("src/features/flow/flowStyles.ts");

  assert.match(theme, /lightTheme[\s\S]*textPrimary: "#071A48"/);
  assert.match(theme, /lightTheme[\s\S]*textSecondary: "#56658E"/);
  assert.match(theme, /darkTheme[\s\S]*textPrimary: "#F4F7FF"/);
  assert.match(theme, /darkTheme[\s\S]*textSecondary: "#AAB5CD"/);
  assert.match(flow, /text: theme\.textPrimary/);
  assert.match(flow, /textSecondary: theme\.textSecondary/);
  assert.match(flow, /secondaryText: theme\.muted/);
  assert.match(flow, /placeholder: theme\.muted/);
});
