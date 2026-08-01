// Node tests do not run Metro's asset transformer; export a stable filename token.
for (const extension of [".jpg", ".jpeg", ".png"]) require.extensions[extension] = (module, filename) => { module.exports = filename; };
