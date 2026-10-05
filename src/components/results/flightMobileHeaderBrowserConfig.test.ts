import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import config from "../../../qa/mobile-web/browserstack/flights-header.playwright.config";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const configDirectory = dirname(fileURLToPath(new URL("../../../qa/mobile-web/browserstack/flights-header.playwright.config.ts", import.meta.url)));

test("Flight header browser servers resolve commands from the repository root", () => {
  assert.ok(Array.isArray(config.webServer));
  for (const server of config.webServer) {
    const cwd = resolve(configDirectory, server.cwd ?? ".");
    assert.equal(cwd, repositoryRoot.replace(/\/$/, ""));
    assert.ok(existsSync(resolve(cwd, "package.json")));
    if (server.command.startsWith("node ")) {
      assert.ok(existsSync(resolve(cwd, server.command.slice("node ".length))));
    }
  }
});
