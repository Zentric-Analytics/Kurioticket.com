import test from "node:test";
import assert from "node:assert/strict";
import { kayakFlightCardModel, kayakHotelCardModel, kayakCarCardModel } from "./kayakCardModels";
import { doesCarMatchFilterOption, filterCarResults } from "@/lib/cars/carResults";
import { getHotelComparableReviewScore } from "@/lib/hotels/hotelRatingSemantics";

test("KAYAK guest ratings participate in cross-provider comparison independently of stars", () => {
  const offer={id:"rated",title:"Hotel",description:"Room",details:[],price:100,currency:"USD",priceBasis:"total",testUrl:"https://affiliates.kayak.com/sandbox-clickout",hotelStars:5,hotelReviewScore:8.6,hotelReviewCount:3118};
  const model=kayakHotelCardModel(offer,2);
  assert.equal(model.reviewScale,10);
  assert.equal(model.reviewCount,3118);
  assert.equal(getHotelComparableReviewScore(model),8.6);
  assert.ok(getHotelComparableReviewScore({reviewScore:4.5,reviewScale:5})! > getHotelComparableReviewScore(model)!);
  assert.equal(getHotelComparableReviewScore(kayakHotelCardModel({...offer,hotelReviewScore:undefined},2)),null);
});
test("regular flight card model keeps all legs without inventing fare benefits", () => {
  const model=kayakFlightCardModel({id:"1",title:"trip",description:"seller",details:[],price:123,currency:"USD",priceBasis:"per person",testUrl:"https://affiliates.kayak.com/sandbox-clickout",flightLegs:[{durationMinutes:90,segments:[{origin:"BOS",destination:"JFK",departure:"2099-10-12T10:00:00",arrival:"2099-10-12T11:30:00",airline:"Test",flightNumber:"T 1"}]}]});
  assert.equal(model?.legs?.[0].duration,"1h 30m");
  assert.equal(model?.baggageInfo,"Baggage allowance not supplied by provider");
  assert.doesNotMatch(model?.baggageInfo ?? "", /included/i);
  assert.equal(model?.legs?.[0].segments.length,1);
  assert.deepEqual(model?.badges,[]);
  assert.equal(model?.bookingProviderName,"seller");
});
test("KAYAK Hotel cards preserve booking provider branding for Rates", () => {
  const model = kayakHotelCardModel({
    id: "hotel-brand",
    title: "Hotel",
    description: "King room",
    details: [],
    price: 200,
    currency: "USD",
    priceBasis: "total",
    testUrl: "https://affiliates.kayak.com/sandbox-clickout",
    bookingProviderName: "Seller Display",
    bookingProviderLogoUrl: "https://content.r9cdn.net/provider-logo.png",
  }, 2);
  assert.equal(model.provider, "KAYAK sandbox");
  assert.equal(model.bookingProviderName, "Seller Display");
  assert.equal(model.providerLogoUrl, "https://content.r9cdn.net/provider-logo.png");
});

test("hotel and car models preserve images and mark unknown specifications",()=>{
  const offer={id:"1",title:"Test",description:"Supplier",details:[],price:100,currency:"USD",priceBasis:"total",testUrl:"https://affiliates.kayak.com/sandbox-clickout",images:[{url:"https://content.r9cdn.net/image.jpg",alt:"Test"}]};
  assert.equal(kayakHotelCardModel(offer,2).imageUrls?.[0],offer.images[0].url);
  assert.equal(kayakHotelCardModel(offer,2).classificationStars,undefined);
  const car=kayakCarCardModel(offer,2,"BOS");
  assert.deepEqual(car.sandboxPresentation?.specs,["Specifications not supplied"]);
  assert.equal(car.imageUrl,offer.images[0].url);
  assert.equal(car.offers[0].freeCancellation,false);
  assert.equal(car.offers[0].pricePerDay,50);
  for (const option of ["automatic", "smallCars", "limitedMileage", "cityLocation"]) {
    assert.equal(doesCarMatchFilterOption(car,option),false);
    assert.deepEqual(filterCarResults([car],{test:[option]}),[]);
  }
});

test("flight comparison uses party totals and unknown durations cannot rank as zero", () => {
  const offer = {id:"party",title:"Trip",description:"Supplier",details:[],price:100,currency:"USD",priceBasis:"per person",testUrl:"https://affiliates.kayak.com/sandbox-clickout",flightLegs:[{segments:[{origin:"BOS",destination:"JFK",departure:"2099-10-12T10:00:00",arrival:"2099-10-12T11:00:00",airline:"Test",flightNumber:"T1"}]}]};
  const party = kayakFlightCardModel(offer, {adults:"2", children:"1", infants:"0"});
  assert.equal(party?.price, 300);
  assert.equal(kayakFlightCardModel({...offer,flightCarryOnIncluded:true})?.baggageInfo,"Carry-on included");
  assert.doesNotMatch(kayakFlightCardModel({...offer,flightCarryOnIncluded:false})?.baggageInfo ?? "",/included/i);
  assert.equal(party?.durationMinutes, Number.MAX_SAFE_INTEGER);
  assert.equal(party?.duration, "Duration not supplied");
  assert.equal(kayakFlightCardModel({...offer,priceBasis:"total"}, {adults:"3"})?.price,100);
});

test("KAYAK flight details use only provider-authored fare facts", () => {
  const offer = {
    id:"fare", title:"Trip", description:"Seller", details:[], price:364, currency:"USD", priceBasis:"total",
    testUrl:"https://affiliates.kayak.com/sandbox-clickout", flightCabin:"Economy", flightFareFamily:"Economy Saver",
    flightLegs:[{segments:[{origin:"BOS",destination:"JFK",departure:"2099-10-12T10:00:00",arrival:"2099-10-12T11:00:00",airline:"Test",flightNumber:"T1",cabinDetails:{cabinClass:"Economy",fareBrandName:"Economy Saver"}}]}],
    flightFareTerms:[
      {category:"baggage" as const,semantic:"positive" as const,text:"1 carry-on included"},
      {category:"baggage" as const,semantic:"positive" as const,text:"1 checked bag included"},
    ],
    flightConditions:[{category:"change" as const,scope:"trip" as const,state:"allowed" as const,penaltyAmount:40,penaltyCurrency:"USD"}],
    flightOptionalServices:[{type:"seat",description:"Preferred seat",price:25,currency:"USD"}],
  };
  const model = kayakFlightCardModel(offer)!;
  assert.equal(model.fareBrandName,"Economy Saver");
  assert.deepEqual(model.fareTerms,offer.flightFareTerms);
  assert.deepEqual(model.legs?.[0].segments[0].cabinDetails,[{cabinClass:"Economy",fareBrandName:"Economy Saver"}]);
  assert.deepEqual(model.providerDetails,{
    price:{totalAmount:364,totalCurrency:"USD"},
    conditions:offer.flightConditions,
    optionalServices:offer.flightOptionalServices,
  });
  assert.equal("baseAmount" in (model.providerDetails?.price ?? {}),false);
  assert.equal("taxAmount" in (model.providerDetails?.price ?? {}),false);
});

test("KAYAK airline policy attributes never become purchased fare terms", () => {
  const model = kayakFlightCardModel({id:"policy",title:"Trip",description:"Seller",details:[],price:100,currency:"USD",priceBasis:"total",testUrl:"https://affiliates.kayak.com/sandbox-clickout",flightLegs:[{segments:[{origin:"BOS",destination:"JFK",departure:"2099-10-12T10:00:00",arrival:"2099-10-12T11:00:00",airline:"Test",flightNumber:"T1"}]}],attributes:[{label:"AA airline policy (not included allowance) · baggage policies",value:"1 checked bag"}]})!;
  assert.deepEqual(model.fareTerms,[]);
});
