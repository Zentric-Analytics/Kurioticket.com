import assert from "node:assert/strict";
import test from "node:test";
import { getFlowThemeColors } from "./flowThemeColors";

const lightTheme = { dark:false,background:"#FAFBFF",surface:"#FFFFFF",textPrimary:"#071A48",textSecondary:"#56658E",textMuted:"#56658E",textOnSurface:"#071A48",textOnImage:"#FFFFFF",muted:"#56658E",border:"#E7ECF5",icon:"#071A48" };
const darkTheme = { dark:true,background:"#091224",surface:"#121E33",textPrimary:"#F4F7FF",textSecondary:"#AAB5CD",textMuted:"#AAB5CD",textOnSurface:"#F4F7FF",textOnImage:"#FFFFFF",muted:"#AAB5CD",border:"#2B3952",icon:"#EAF0FF" };

const luminance = (hex: string) => {
  const channels = hex.slice(1).match(/.{2}/g)!.map((value) => Number.parseInt(value, 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (foreground: string, background: string) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

test("flight picker selected colors remain readable in light and dark themes", () => {
  for (const theme of [lightTheme, darkTheme]) {
    const colors = getFlowThemeColors(theme);
    assert.notEqual(colors.selected, colors.surface);
    assert.ok(contrast(colors.selectedPrimaryText, colors.selected) >= 4.5);
    assert.ok(contrast(colors.selectedSecondaryText, colors.selected) >= 4.5);
    assert.ok(contrast(colors.selectedLabelText, colors.selected) >= 3);
    assert.notEqual(colors.selectedBorder, colors.selected);
  }
});

test("flight picker surfaces and search fields follow the active theme", () => {
  const light = getFlowThemeColors(lightTheme);
  const dark = getFlowThemeColors(darkTheme);
  assert.equal(light.surface, lightTheme.surface);
  assert.equal(dark.surface, darkTheme.surface);
  assert.notEqual(light.input, dark.input);
  assert.equal(dark.text, darkTheme.textPrimary);
  assert.equal(dark.placeholder, darkTheme.muted);
  assert.equal(dark.border, darkTheme.border);
});
