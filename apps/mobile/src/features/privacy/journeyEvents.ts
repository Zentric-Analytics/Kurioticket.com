import { randomUUID } from "expo-crypto";
import { travelApi } from "../../api/travelApi";
import { JourneyEventCoordinator } from "./journeyEventCoordinator";
import { visitorIdentity } from "./visitorIdentity";

export const journeyEvents = new JourneyEventCoordinator({
  context: visitorIdentity.trackingContext,
  createId: randomUUID,
  send: (event, context, signal) => travelApi.journeyEvent(event, { visitorContext: context, signal }),
});

visitorIdentity.subscribe(journeyEvents.contextChanged);
