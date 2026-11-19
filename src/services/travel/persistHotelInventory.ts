/** Publish the complete details fallback before releasing the response. */
export async function persistHotelInventory(
  publishCohort: () => Promise<boolean>,
  writeIndividual: () => Promise<void>,
  defer?: (task: () => Promise<void>) => void,
) {
  const published = await publishCohort();
  if (published && defer) {
    defer(writeIndividual);
  } else {
    await writeIndividual();
  }
}
