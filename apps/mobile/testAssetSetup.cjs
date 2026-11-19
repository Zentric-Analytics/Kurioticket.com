// Node tests do not run Metro's asset transformer; export a stable filename token.
for (const extension of [".jpg", ".jpeg", ".png"]) require.extensions[extension] = (module, filename) => { module.exports = filename; };

// Match Metro/TypeScript's shared-source alias when focused Node tests import shared models.
const Module = require("node:module");
const path = require("node:path");
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    request = path.join(__dirname, "../..", "src", request.slice(2));
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};
