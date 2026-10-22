/** Process every item without filling the database pool's unbounded wait queue. */
export async function forEachBounded<T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<unknown>,
) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("Concurrency must be a positive integer");
  }
  let cursor = 0;
  let failed = false;
  let firstError: unknown;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try {
        await task(item);
      } catch (error) {
        if (!failed) firstError = error;
        failed = true;
      }
    }
  }));
  if (failed) throw firstError;
}
