/** Publish the complete details fallback before releasing the response. */
export async function persistHotelInventory(
  publishCohort: () => Promise<boolean>,
  writeIndividual: (requireComplete?: boolean) => Promise<void>,
  defer?: (task: () => Promise<void>) => void,
) {
  const published = await publishCohort().catch(()=>false);
  if (published && defer) {
    // The complete immutable fallback is already published. Optional write or
    // scheduler failure must not discard it or delay response release.
    try { defer(async () => { try { await writeIndividual(false); } catch { /* Complete cohort remains authoritative. */ } }); }
    catch { /* A scheduler outage cannot invalidate the complete cohort. */ }
  } else {
    try { await writeIndividual(!published); }
    catch { if(!published) throw new Error("Hotel inventory publication unavailable"); }
  }
}
