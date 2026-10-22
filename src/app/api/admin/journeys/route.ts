import { createAdminJourneyHttpHandlers } from "@/services/adminJourneyHttp";
import { adminJourneys } from "@/services/adminJourneyService";

export const runtime = "nodejs";
export const GET = createAdminJourneyHttpHandlers(adminJourneys).list;
