import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeSource = readFileSync("src/theme/AppTheme.tsx", "utf8");
const darkBlock: string = themeSource.match(/export const darkTheme = \{([\s\S]*?)\n\} as const;/)?.[1]
  ?? (() => { throw new Error("Expected the darkTheme declaration"); })();

function darkColor(token: "background" | "surface" | "textPrimary" | "textSecondary") {
  const value = darkBlock.match(new RegExp(`\\b${token}: "(#[0-9A-Fa-f]{6})"`))?.[1];
  assert.ok(value, `Expected darkTheme.${token} to be a six-digit hex color`);
  return value;
}

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g);
  assert.ok(channels, `Expected a six-digit hex color, received ${hex}`);
  const [red, green, blue] = channels.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

test("dark Flight primary and secondary text meet normal-text contrast", () => {
  for (const text of [darkColor("textPrimary"), darkColor("textSecondary")]) {
    for (const surface of [darkColor("background"), darkColor("surface")]) {
      assert.ok(
        contrastRatio(text, surface) >= 4.5,
        `${text} on ${surface} must meet WCAG AA normal-text contrast`,
      );
    }
  }
});
