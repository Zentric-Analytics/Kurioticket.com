/** Bound each transaction to eight existing 64 KiB chunks. Publish the
 * manifest only after every batch succeeds; no extra write concurrency. */
export const COHORT_WRITE_BATCH_SIZE = 8;

export async function publishCohort<T>(
  chunks: readonly T[],
  writeBatch: (chunks: readonly T[], offset: number) => Promise<unknown>,
  publishManifest: () => Promise<unknown>,
) {
  for (let offset = 0; offset < chunks.length; offset += COHORT_WRITE_BATCH_SIZE) {
    await writeBatch(chunks.slice(offset, offset + COHORT_WRITE_BATCH_SIZE), offset);
  }
  await publishManifest();
}
