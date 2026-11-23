import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const roots = {
  artifacts: resolve(import.meta.dirname, "../artifacts"),
  "test-results": resolve(import.meta.dirname, "../test-results"),
};
const types = { ".html": "text/html", ".json": "application/json", ".md": "text/markdown", ".png": "image/png", ".webm": "video/webm", ".zip": "application/zip" };

createServer((request, response) => {
  const requested = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  if (requested === "/") {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end("<title>Kurioticket mobile QA</title><h1>Kurioticket mobile QA</h1><p>Live QA-only output; staging is intentionally unchanged.</p><ul><li><a href='/artifacts/'>Diagnostic JSON and screenshots</a></li><li><a href='/test-results/'>Playwright test results</a></li></ul>");
    return;
  }
  const [, namespace, ...parts] = requested.split("/");
  const root = roots[namespace];
  if (!root) {
    response.writeHead(404).end("Not found");
    return;
  }
  const target = normalize(join(root, ...parts));
  if (!target.startsWith(root) || !existsSync(target)) {
    response.writeHead(404).end("Not found");
    return;
  }
  if (statSync(target).isDirectory()) {
    const entries = readdirSync(target, { withFileTypes: true }).map((entry) => {
      const suffix = entry.isDirectory() ? "/" : "";
      return `<li><a href="${encodeURIComponent(entry.name)}${suffix}">${entry.name}${suffix}</a></li>`;
    }).join("");
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<title>Kurioticket mobile QA artifacts</title><h1>Kurioticket mobile QA artifacts</h1><p>Refresh to see current screenshots, traces, and videos.</p><ul>${entries}</ul>`);
    return;
  }
  response.setHeader("content-type", types[extname(target)] ?? "application/octet-stream");
  createReadStream(target).pipe(response);
}).listen(4174, "127.0.0.1");
