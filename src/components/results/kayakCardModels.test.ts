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
  assert.equal(party?.durationMinutes, Infinity);
  assert.equal(party?.duration, "Duration not supplied");
  assert.equal(kayakFlightCardModel({...offer,priceBasis:"total"}, {adults:"3"})?.price,100);
});
