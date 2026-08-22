import {
  handleCustomizationPreferencesGet,
  handleCustomizationPreferencesPatch,
} from "@/app/api/account/customization-preferences/route";
import { getMobileSession } from "@/lib/mobile-auth";
import { getPrisma } from "@/lib/prisma";

type MobileSession = {
  user: {
    id: string;
    status: string;
  };
} | null;

type CanonicalPrisma = Parameters<
  typeof handleCustomizationPreferencesGet
>[1];

type CustomizationHandlerDependencies<TPrisma> = {
  session: (request: Request) => Promise<MobileSession>;
  prisma: TPrisma;
  get: (userId: string | null, prisma: TPrisma) => Promise<Response>;
  patch: (
    userId: string | null,
    prisma: TPrisma,
    payload: unknown,
  ) => Promise<Response>;
};

export function createCustomizationHandlers<TPrisma>(
  dependencies: CustomizationHandlerDependencies<TPrisma>,
) {
  async function getActiveUserId(request: Request) {
    const session = await dependencies.session(request);
    return session?.user.status === "ACTIVE" ? session.user.id : null;
  }

  return {
    GET: async (request: Request) =>
      dependencies.get(
        await getActiveUserId(request),
        dependencies.prisma,
      ),
    PATCH: async (request: Request) =>
      dependencies.patch(
        await getActiveUserId(request),
        dependencies.prisma,
        await request.json().catch(() => null),
      ),
  };
}

function createProductionHandlers() {
  const prisma = getPrisma() as unknown as CanonicalPrisma;

  return createCustomizationHandlers({
    session: getMobileSession,
    prisma,
    get: handleCustomizationPreferencesGet,
    patch: handleCustomizationPreferencesPatch,
  });
}

export async function GET(request: Request) {
  return createProductionHandlers().GET(request);
}

export async function PATCH(request: Request) {
  return createProductionHandlers().PATCH(request);
}
