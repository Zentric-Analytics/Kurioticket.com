import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthenticatorQrCode } from "./AuthenticatorQrCode";

test("authenticator setup encodes locally without secret-bearing network resources", () => {
  const value = "otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&issuer=Test";
  const markup = renderToStaticMarkup(createElement(AuthenticatorQrCode, { value }));
  assert.match(markup, /<svg/);
  assert.match(markup, /<path/);
  assert.match(markup, /Authenticator app QR code/);
  assert.doesNotMatch(markup, /<(?:img|image|script)|(?:href|src)=|JBSWY3DPEHPK3PXP/);
  assert.notEqual(markup, renderToStaticMarkup(createElement(AuthenticatorQrCode, { value: value + "&digits=8" })));
  const dashboard = readFileSync("src/components/dashboard/DashboardGrid.tsx", "utf8");
  assert.match(dashboard, /<AuthenticatorQrCode value=\{totpSetup\.otpauthUri\}/);
  assert.doesNotMatch(dashboard, /api\.qrserver\.com|encodeURIComponent\(totpSetup\.otpauthUri\)/);
});
