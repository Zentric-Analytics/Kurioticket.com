import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const artifactRoot = resolve(process.cwd(), "../artifacts");

export async function writeArtifact(name: string, value: unknown) {
  await mkdir(artifactRoot, { recursive: true });
  const path = resolve(artifactRoot, name);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}
