import { readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TYPESCRIPT_SOURCE = /\.(?:[cm]?ts|tsx)$/i;

function normalizedModulePath(path) {
  return path.replaceAll('\\', '/').replace(TYPESCRIPT_SOURCE, '').toLowerCase();
}

export function findCaseInsensitiveTypeScriptPathCollisions(paths) {
  const modules = new Map();
  for (const path of paths.filter((value) => TYPESCRIPT_SOURCE.test(value))) {
    const key = normalizedModulePath(path);
    const matches = modules.get(key) ?? [];
    matches.push(path.replaceAll('\\', '/'));
    modules.set(key, matches);
  }
  return [...modules.values()]
    .filter((matches) => matches.length > 1)
    .map((matches) => matches.sort())
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function collectFiles(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute, root);
    return entry.isFile() ? [relative(root, absolute)] : [];
  });
}

function validateRepository() {
  const mobileRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const paths = ['app', 'src'].flatMap((directory) =>
    collectFiles(resolve(mobileRoot, directory)).map((path) => `${directory}/${path}`),
  );
  const collisions = findCaseInsensitiveTypeScriptPathCollisions(paths);
  if (collisions.length > 0) {
    const detail = collisions.map((matches) => `- ${matches.join(' <> ')}`).join('\n');
    throw new Error(`Case-insensitive TypeScript module path collisions detected:\n${detail}`);
  }
  console.log('Mobile TypeScript paths are case-insensitively unique.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) validateRepository();
