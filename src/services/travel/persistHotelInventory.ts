/** Publish the complete details fallback before releasing the response. */
export async function persistHotelInventory(
  publishCohort: () => Promise<boolean>,
  writeIndividual: () => Promise<void>,
  defer?: (task: () => Promise<void>) => void,
) {
  const published = await publishCohort().catch(()=>false);
  if (published && defer) {
    defer(writeIndividual);
  } else {
    try { await writeIndividual(); }
    catch { if(!published) throw new Error("Hotel inventory publication unavailable"); }
  }
}
