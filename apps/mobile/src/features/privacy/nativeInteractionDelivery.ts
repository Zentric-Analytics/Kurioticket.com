import { travelApi } from "../../api/travelApi";
import { createNativeActivityDelivery } from "./nativeActivityDelivery";
import { visitorIdentity } from "./visitorIdentity";

const delivery = createNativeActivityDelivery<Parameters<typeof travelApi.customerInteraction>[0]>({
  context: visitorIdentity.trackingContext,
  send: (event, visitorContext, signal) => travelApi.customerInteraction(event, { visitorContext, signal }),
});
visitorIdentity.subscribe(delivery.contextChanged);

export const deliverNativeInteraction = delivery.deliver;
