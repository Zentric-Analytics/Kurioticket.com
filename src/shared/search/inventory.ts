/** Public, normalized capability facts. No supplier IDs, credentials or raw context. */
export type InventoryProvenance = {
  providerId: string;
  providerLabel: string;
  mode: "live" | "sandbox" | "test";
  details: "cached-snapshot" | "none";
  refresh: "exact-offer" | "none";
};

export type InventoryIdentity = {id:string; inventoryProvenance?:InventoryProvenance};
export type InventoryStage = "normalized" | "deduplicated" | "grouped" | "policy-eligible" | "public" | "client-accepted" | "visible";
/** Counts alone cannot detect substitution. Sets also retain exact identity ownership. */
export function inventoryStage(stage:InventoryStage, rows:readonly InventoryIdentity[]) {
  const identities=rows.map(row=>row.id);
  return {stage,count:rows.length,uniqueCount:new Set(identities).size,identities};
}
export function assertInventorySubset(parent:readonly InventoryIdentity[], child:readonly InventoryIdentity[]) {
  const ids=new Set(parent.map(row=>row.id));
  if(child.some(row=>!ids.has(row.id))) throw new Error("Inventory identity escaped its source snapshot");
}

export function inventoryAccounting(stages: readonly {stage:InventoryStage;rows:readonly InventoryIdentity[]}[]) {
  for(let index=1;index<stages.length;index++) assertInventorySubset(stages[index-1].rows,stages[index].rows);
  return stages.map(({stage,rows})=>{const snapshot=inventoryStage(stage,rows);return {stage:snapshot.stage,count:snapshot.count,uniqueCount:snapshot.uniqueCount};});
}
