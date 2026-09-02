# Canonical Package Search

Packages is one coordinated Kurioticket product with four supported modes: Flight + Hotel, Flight + Car, Hotel + Car, and Flight + Hotel + Car.

The complete query is validated by the selected mode. Web, iOS, and Android submit that query to `POST /api/packages/search`. The server calls the existing canonical Flight, Hotel, and Car service functions directly and returns one response containing the state and results of every included component.

Component failures are independent. A partial response preserves successful inventory and explicitly marks unavailable components; it never represents a complete bundle.

`packageOffers` is reserved for real provider-backed bundle offers. Until such a provider is integrated, it is empty. Client-generated combinations may coordinate separately priced component options, but they are not a bundle price, saving, discount, reservation, or checkout.

Deals merchandising may link only to a real provider offer, a complete canonical search, or Package search/results. It must not invent prices, availability, urgency, or discounts.
