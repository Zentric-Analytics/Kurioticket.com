import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);

test("Next lint root discovery retains directories, brace patterns, arrays and Windows paths", async () => {
  const pluginRequire = createRequire(require.resolve("@next/eslint-plugin-next"));
  const { getRootDirs } = pluginRequire("./utils/get-root-dirs.js");
  const temporary = await mkdtemp(join(tmpdir(), "lint-root-compatibility-"));
  try {
    for (const name of ["web", "admin", "other"]) await mkdir(join(temporary, name));
    await writeFile(join(temporary, "not-a-directory"), "fixture");
    const normalized = temporary.replaceAll("\\", "/");
    const roots = (rootDir) => getRootDirs({ cwd: temporary, settings: { next: { rootDir } } }).sort();
    assert.deepEqual(roots(undefined), [temporary]);
    assert.deepEqual(roots(`${normalized}/{web,admin}`), [`${normalized}/admin`, `${normalized}/web`]);
    assert.deepEqual(roots([`${normalized}/web`, `${normalized}/admin`]), [`${normalized}/admin`, `${normalized}/web`]);
    assert.deepEqual(roots(`${normalized}/*`), ["admin", "other", "web"].map((name) => `${normalized}/${name}`));
    assert.deepEqual(roots(`${normalized}/missing*`), []);
    assert.deepEqual(roots(`${normalized}/web`.replaceAll("/", "\\")), [`${normalized}/web`]);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("BrowserStack global-agent replacement preserves bootstrap and mutable proxy configuration", () => {
  const sdkRequire = createRequire(require.resolve("browserstack-node-sdk/package.json"));
  const entry = sdkRequire.resolve("global-agent");
  // A child contains global HTTP instrumentation; no external requests are made.
  execFileSync(process.execPath, ["-e", `
    const assert = require('node:assert/strict');
    const agent = require(${JSON.stringify(entry)});
    assert.equal(typeof agent.createGlobalProxyAgent, 'function');
    assert.equal(agent.bootstrap({ environmentVariableNamespace: 'COMPAT_ONLY_' }), true);
    assert.equal(global.GLOBAL_AGENT.HTTP_PROXY, null);
    global.GLOBAL_AGENT.HTTP_PROXY = 'http://127.0.0.1:12345';
    global.GLOBAL_AGENT.HTTPS_PROXY = 'http://127.0.0.1:12345';
    global.GLOBAL_AGENT.NO_PROXY = 'localhost';
    assert.equal(global.GLOBAL_AGENT.HTTP_PROXY, 'http://127.0.0.1:12345');
    assert.equal(global.GLOBAL_AGENT.HTTPS_PROXY, 'http://127.0.0.1:12345');
    assert.equal(global.GLOBAL_AGENT.NO_PROXY, 'localhost');
    assert.equal(agent.bootstrap(), false);
  `], { timeout: 10000, stdio: "pipe" });
});

test("get-uri retains its FTP stream adapter against patched basic-ftp without network access", async (t) => {
  const uriRequire = createRequire(require.resolve("get-uri"));
  const { Client } = uriRequire("basic-ftp");
  const { getUri } = require("get-uri");
  let closed = 0;
  let accessed;
  t.mock.method(Client.prototype, "access", async (options) => { accessed = options; });
  t.mock.method(Client.prototype, "lastMod", async () => new Date("2026-01-01T00:00:00Z"));
  t.mock.method(Client.prototype, "downloadTo", async (stream, path) => {
    assert.equal(path, "/fixture.txt");
    stream.end("isolated fixture");
    return { message: "complete" };
  });
  t.mock.method(Client.prototype, "close", () => { closed += 1; });
  const stream = await getUri("ftp://localhost/fixture.txt");
  let contents = "";
  for await (const chunk of stream) contents += chunk.toString();
  assert.equal(contents, "isolated fixture");
  assert.equal(accessed.host, "localhost");
  assert.equal(closed, 1);
  t.mock.method(Client.prototype, "access", async () => { throw new Error("denied fixture"); });
  await assert.rejects(getUri("ftp://localhost/fixture.txt"), /denied fixture/);
  assert.equal(closed, 2);
});
