import assert from "node:assert/strict";
import test from "node:test";
import type { HotelResult } from "../../api/travelApi";
import { activeHotelFilterCount, buildHotelFilterOptions, emptyHotelFilters, filterHotels } from "./hotelFilters";

const profile=(overrides:Record<string,unknown>={})=>({propertyType:"Hotel",amenities:[],accessibilityFeatures:[],travellerFeatures:[],room:{name:"Deluxe room",bedConfiguration:"King bed"},...overrides});
const hotel=(id:string,overrides:Partial<HotelResult>={}):HotelResult=>({id,provider:"Provider",name:`Hotel ${id}`,rating:9,classificationStars:4,reviewScore:9,reviewScale:10,reviewCount:1,neighbourhood:"Le  Marais",location:"Paris",amenities:["Free Wi-Fi"],roomType:"Deluxe king room, room only",cancellationInfo:"Free cancellation",valueScore:5,travelConfidenceScore:5,arrivalSuitabilityScore:5,recommendationReasons:[],badges:[],pricePerNight:100,totalPrice:200,currency:"USD",bookingUrl:"https://example.com",partnerRedirectUrl:"https://example.com",...overrides} as HotelResult);
const raw=[hotel("a",{classificationStars:5,name:"Grand Resort",amenities:["Free Wi-Fi","Pool"],roomType:"Family suite, king bed, half board",catalogueProfile:profile({propertyType:" Resort ",travellerFeatures:[" Family friendly "],accessibilityFeatures:["Step-free access"],room:{name:"Family Suite",bedConfiguration:"King Bed"}})}),hotel("b",{classificationStars:4,neighbourhood:"Montmartre, Paris",name:"City Apartment",amenities:["Parking"],roomType:"Double room, queen bed, full board",cancellationInfo:"Flexible cancellation",catalogueProfile:profile({propertyType:"Apartment",travellerFeatures:["family FRIENDLY"],accessibilityFeatures:["step-free ACCESS"],room:{name:"Double Room",bedConfiguration:"Queen bed"}})}),hotel("c",{classificationStars:undefined,neighbourhood:" le marais ",name:"Quiet Hostel",amenities:["Pool"],roomType:"Twin room, twin beds, all-inclusive",cancellationInfo:"Cancellation details",catalogueProfile:profile({propertyType:"Hostel",travellerFeatures:[],accessibilityFeatures:[],room:{name:"Twin Room",bedConfiguration:"Twin beds"}})})];
const options=buildHotelFilterOptions(raw,"Paris",{USD:1,EUR:.8});

test("default model includes every field and preserves input order",()=>{assert.deepEqual(emptyHotelFilters(),{propertyNameQuery:"",minimumPrice:null,maximumPrice:null,starRatings:[],areas:[],propertyTypes:[],roomTypes:[],bedTypes:[],meals:[],cancellationPolicies:[],facilities:[],travellerFeatures:[],accessibility:[]});assert.deepEqual(filterHotels(raw,emptyHotelFilters(),options).map(x=>x.id),["a","b","c"]);assert.deepEqual(raw.map(x=>x.id),["a","b","c"])});
test("property name is trimmed, case-insensitive, and ANDs",()=>{assert.deepEqual(filterHotels(raw,{...emptyHotelFilters(),propertyNameQuery:"  GRAND  "},options).map(x=>x.id),["a"]);assert.deepEqual(filterHotels(raw,{...emptyHotelFilters(),propertyNameQuery:"hotel",facilities:["pool"]},options).map(x=>x.id),[])});
test("minimum, maximum and combined ranges compare converted total price",()=>{const priced=[hotel("usd",{totalPrice:200,pricePerNight:999,currency:"USD"}),hotel("eur",{totalPrice:160,pricePerNight:1,currency:"EUR"}),hotel("high",{totalPrice:400,pricePerNight:1,currency:"USD"}),hotel("unknown",{totalPrice:100,pricePerNight:1,currency:"XYZ"})],o=buildHotelFilterOptions(priced,"Paris",{USD:1,EUR:.8});assert.equal(o.price?.minimum,0);assert.deepEqual(filterHotels(priced,{...emptyHotelFilters(),minimumPrice:250},o).map(x=>x.id),["high"]);assert.deepEqual(filterHotels(priced,{...emptyHotelFilters(),maximumPrice:200},o).map(x=>x.id),["usd","eur"]);assert.deepEqual(filterHotels(priced,{...emptyHotelFilters(),minimumPrice:190,maximumPrice:210},o).map(x=>x.id),["usd","eur"])});
test("structured traveller and accessibility options normalize identities and preserve labels",()=>{assert.deepEqual(options.travellerFeatures,[{value:"family friendly",label:"Family friendly",count:2}]);assert.deepEqual(options.accessibility,[{value:"step-free access",label:"Step-free access",count:2}]);assert.deepEqual(filterHotels(raw,{...emptyHotelFilters(),travellerFeatures:["family friendly"],accessibility:["step-free access"]},options).map(x=>x.id),["a","b"])});
test("property stays authoritative while room and bed data use canonical taxonomy",()=>{assert.ok(options.propertyTypes.some(x=>x.value==="resort"&&x.label==="Resort"));assert.ok(options.roomTypes.some(x=>x.value==="family-room"&&x.label==="Family Room"));assert.ok(options.roomTypes.some(x=>x.value==="suite"&&x.label==="Suites"));assert.ok(options.bedTypes.some(x=>x.value==="queen-bed"&&x.label==="Queen Bed"));assert.deepEqual(filterHotels(raw,{...emptyHotelFilters(),propertyTypes:["apartment"],roomTypes:["double-room"],bedTypes:["queen-bed"]},options).map(x=>x.id),["b"])});
test("classification stars are exact and multi groups use OR within and AND across",()=>{assert.deepEqual(filterHotels(raw,{...emptyHotelFilters(),starRatings:[5]},options).map(x=>x.id),["a"]);assert.deepEqual(filterHotels(raw,{...emptyHotelFilters(),starRatings:[5,4]},options).map(x=>x.id),["a","b"]);assert.deepEqual(filterHotels(raw,{...emptyHotelFilters(),starRatings:[5,4,3]},options).map(x=>x.id),["a","b"]);assert.deepEqual(filterHotels(raw,{...emptyHotelFilters(),propertyTypes:["resort","apartment"],facilities:["pool"]},options).map(x=>x.id),["a"]);assert.equal(options.starCounts[0],3)});
test("areas and facilities retain normalized raw-result counts",()=>{assert.deepEqual(options.areas.map(x=>[x.label,x.count]),[["Le Marais, Paris",2],["Montmartre, Paris",1]]);assert.equal(options.facilities.find(x=>x.value==="pool")?.count,2)});
test("active count treats query and entire price range as one then counts selections",()=>{const empty=emptyHotelFilters();assert.equal(activeHotelFilterCount(empty,options),0);assert.equal(activeHotelFilterCount({...empty,propertyNameQuery:" x ",minimumPrice:25,maximumPrice:200,starRatings:[5,4],areas:["x"],facilities:["pool"],travellerFeatures:["family friendly"],accessibility:["step-free access"]},options),8);assert.deepEqual(emptyHotelFilters(),empty)});

test("facility aliases collapse once per hotel with exact web wording",()=>{
  const aliases=[
    hotel("pool",{amenities:["Pool","Indoor pool","Swimming pool"]}),
    hotel("fitness",{amenities:["Gym","Fitness centre","Fitness center"]}),
    hotel("desk",{amenities:["Concierge","Front desk","24-hour desk"]}),
    hotel("wifi",{amenities:["Wi-Fi","Free Wi-Fi","Wireless internet"]}),
  ];
  const result=buildHotelFilterOptions(aliases,"Paris");
  assert.deepEqual(result.facilities.map(({value,label,count})=>({value,label,count})),[
    {value:"pool",label:"Pool",count:1},
    {value:"fitness",label:"Fitness center",count:1},
    {value:"frontDesk",label:"24-hour front desk",count:1},
    {value:"wifi",label:"Free Wi-Fi",count:1},
  ]);
});

test("facility priority precedes higher-count non-priority options",()=>{
  const hotels=[
    hotel("1",{amenities:["Wi-Fi","Pool","Spa","Fitness centre"]}),
    hotel("2",{amenities:["Wi-Fi","Pool","Spa","Gym"]}),
    hotel("3",{amenities:["Wi-Fi","Fitness center"]}),
    hotel("4",{amenities:["Wi-Fi"]}),
  ];
  assert.deepEqual(buildHotelFilterOptions(hotels,"Paris").facilities.map(x=>[x.label,x.count]),[["Pool",2],["Spa",2],["Fitness center",3],["Free Wi-Fi",4]]);
});

test("generic facilities remain while non-facility catalogue prose is excluded",()=>{
  const subject=hotel("generic",{amenities:[" Rooftop   terrace ","Hammam","Free cancellation","Pay at property","Room only","Airport corridor","Provider placeholder","Verified partner inventory"]});
  assert.deepEqual(buildHotelFilterOptions([subject],"Paris").facilities.map(x=>[x.value,x.label]),[["generic-hammam","Hammam"],["generic-rooftop terrace","Rooftop terrace"]]);
});

test("facility filtering uses the same canonical aliases as derivation",()=>{
  const hotels=[hotel("pool",{amenities:["Indoor pool"]}),hotel("desk",{amenities:["Concierge"]}),hotel("gym",{amenities:["Gym"]})];
  const result=buildHotelFilterOptions(hotels,"Paris");
  assert.deepEqual(filterHotels(hotels,{...emptyHotelFilters(),facilities:["pool"]},result).map(x=>x.id),["pool"]);
  assert.deepEqual(filterHotels(hotels,{...emptyHotelFilters(),facilities:["frontDesk"]},result).map(x=>x.id),["desk"]);
  assert.deepEqual(filterHotels(hotels,{...emptyHotelFilters(),facilities:["fitness"]},result).map(x=>x.id),["gym"]);
});

test("room prose derives canonical categories without becoming an option",()=>{
  const hotels=[
    hotel("suite",{catalogueProfile:profile({room:{name:"Boutique room and suite options",bedConfiguration:"King bed"}})}),
    hotel("family",{catalogueProfile:profile({room:{name:"Classic, deluxe and family room options",bedConfiguration:"Queen bed"}})}),
    hotel("none",{catalogueProfile:profile({room:{name:"Contemporary guest room options",bedConfiguration:"Twin beds"}})}),
  ];
  const result=buildHotelFilterOptions(hotels,"Paris");
  assert.deepEqual(result.roomTypes,[{value:"family-room",label:"Family Room",count:1},{value:"suite",label:"Suites",count:1}]);
  assert.equal(result.roomTypes.some(x=>x.label.includes("options")),false);
  assert.equal(result.roomTypes.some(x=>x.value==="deluxe-room"),false);
});

test("one structured room can match multiple canonical categories",()=>{
  const hotels=[hotel("both",{catalogueProfile:profile({room:{name:"Family suite",bedConfiguration:"King bed"}})}),hotel("other",{catalogueProfile:profile({room:{name:"Contemporary guest room options",bedConfiguration:"Queen bed"}})})];
  const result=buildHotelFilterOptions(hotels,"Paris");
  assert.deepEqual(result.roomTypes.map(x=>x.label),["Family Room","Suites"]);
  assert.deepEqual(filterHotels(hotels,{...emptyHotelFilters(),roomTypes:["family-room"]},result).map(x=>x.id),["both"]);
  assert.deepEqual(filterHotels(hotels,{...emptyHotelFilters(),roomTypes:["suite"]},result).map(x=>x.id),["both"]);
});

test("room categories sort by count then label and may be universal",()=>{
  const hotels=[hotel("1",{catalogueProfile:profile({room:{name:"Family suite",bedConfiguration:"King bed"}})}),hotel("2",{catalogueProfile:profile({room:{name:"Family room",bedConfiguration:"Queen bed"}})}),hotel("3",{catalogueProfile:profile({room:{name:"Double room",bedConfiguration:"Twin beds"}})})];
  assert.deepEqual(buildHotelFilterOptions(hotels,"Paris").roomTypes.map(x=>[x.label,x.count]),[["Family Room",2],["Double Room",1],["Suites",1]]);
});

test("bed options use canonical taxonomy, suppress prose, and match structured data",()=>{
  const hotels=[hotel("king",{catalogueProfile:profile({room:{name:"Room",bedConfiguration:"King bed"}})}),hotel("queen",{catalogueProfile:profile({room:{name:"Room",bedConfiguration:"Queen bed"}})}),hotel("twin",{catalogueProfile:profile({room:{name:"Room",bedConfiguration:"Twin beds"}})}),hotel("prose",{catalogueProfile:profile({room:{name:"Room",bedConfiguration:"Bed configuration varies by room"}})})];
  const result=buildHotelFilterOptions(hotels,"Paris");
  assert.deepEqual(result.bedTypes.map(x=>x.label),["King Bed","Queen Bed","Twin Beds"]);
  assert.equal(result.bedTypes.some(x=>x.label.includes("varies")),false);
  assert.deepEqual(filterHotels(hotels,{...emptyHotelFilters(),bedTypes:["king-bed"]},result).map(x=>x.id),["king"]);
});

test("canonical taxonomy labels match web exactly",()=>{
  const roomNames=["Single room","Double room","Twin room","Family room","Suite","Standard room","Deluxe room","Studio"];
  const bedConfigurations=["Twin beds","Double bed","Queen bed","King bed","Bed configuration varies by room"];
  const hotels=roomNames.map((name,index)=>hotel(String(index),{catalogueProfile:profile({room:{name,bedConfiguration:bedConfigurations[index%bedConfigurations.length]}}),amenities:["Wi-Fi","Pool","Spa","Fitness centre","Concierge","Air conditioning"]}));
  const result=buildHotelFilterOptions(hotels,"Paris");
  assert.deepEqual(new Set(result.roomTypes.map(x=>x.label)),new Set(["Single Room","Double Room","Twin Room","Family Room","Suites","Standard Room","Deluxe Room","Studio"]));
  assert.deepEqual(new Set(result.bedTypes.map(x=>x.label)),new Set(["Twin Beds","Double Bed","Queen Bed","King Bed"]));
  assert.deepEqual(new Set(result.facilities.map(x=>x.label)),new Set(["Free Wi-Fi","Pool","Spa","Fitness center","24-hour front desk","Air conditioning"]));
});
