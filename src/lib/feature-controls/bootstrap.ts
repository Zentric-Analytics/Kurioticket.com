import type { PrismaClient } from "@/generated/prisma/client";
import { featureControlKeys, featureControlRegistry, type FeatureControlEnvironment } from "./registry";

type BootstrapDb = Pick<PrismaClient, "$transaction">;

/** Claims legacy rows for this database's deployment and creates only local rows. */
export async function bootstrapFeatureControls(db: BootstrapDb, environment: FeatureControlEnvironment) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('feature-controls-bootstrap'))`;
    await tx.featureFlag.updateMany({ where: { environment: "LEGACY" }, data: { environment } });
    for (const key of featureControlKeys) {
      const definition = featureControlRegistry[key];
      await tx.featureFlag.upsert({
        where: { key_environment: { key, environment } },
        update: {},
        create: { key, environment, name: definition.name, description: definition.description, enabled: environment === "STAGING" ? definition.defaultStaging : definition.defaultProduction },
      });
    }
  });
}
