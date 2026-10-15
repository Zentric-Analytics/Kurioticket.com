import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchTabs = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const flightForm = readFileSync(
  "src/components/search/StandaloneFlightSearchForm.tsx",
  "utf8",
);

test("desktop homepage Flights tab reuses the Flight landing search form", () => {
  assert.match(
    searchTabs,
    /import \{ StandaloneFlightSearchForm \} from "@\/components\/search\/StandaloneFlightSearchForm";/,
  );
  assert.match(
    searchTabs,
    /tab === "flights" \? \([\s\S]*?mobileHomepage \? \([\s\S]*?<form[\s\S]*?onFlightSubmit[\s\S]*?<\/form>[\s\S]*?\) : \([\s\S]*?<StandaloneFlightSearchForm[\s\S]*?localizeCalendarLabels[\s\S]*?presentation="homepage-embedded"[\s\S]*?\/>/,
  );
});

test("homepage embedded presentation keeps one shared Flight form implementation", () => {
  assert.match(
    flightForm,
    /presentation\?: "default" \| "main-flight-landing" \| "homepage-embedded"/,
  );
  assert.match(
    flightForm,
    /const useHomepageEmbeddedPresentation =\s*presentation === "homepage-embedded"/,
  );
  assert.match(
    flightForm,
    /useHomepageEmbeddedPresentation[\s\S]*?border-0 bg-transparent p-0 shadow-none ring-0 backdrop-blur-none/,
  );
  assert.match(
    flightForm,
    /!useMainFlightLandingMobilePresentation &&\s*!useHomepageEmbeddedPresentation \? \(/,
  );
  assert.match(
    flightForm,
    /role="radiogroup"[\s\S]*?\["multi-city", t\("multiCity"\)\]/,
  );
  assert.match(
    flightForm,
    /<MultiCityFlightEditor[\s\S]*?presentation="landing"/,
  );
  assert.match(
    flightForm,
    /<FlightAirportFieldControl[\s\S]*?desktopValue=\{desktopOriginLabel\}[\s\S]*?showDesktopSecondary=\{false\}/,
  );
  assert.match(
    flightForm,
    /<FlightAirportFieldControl[\s\S]*?desktopValue=\{desktopDestinationLabel\}[\s\S]*?showDesktopSecondary=\{false\}/,
  );
});

test("mobile homepage keeps its existing dedicated Flight form", () => {
  assert.match(
    searchTabs,
    /tab === "flights" \? \([\s\S]*?mobileHomepage \? \([\s\S]*?<form[\s\S]*?onSubmit=\{\s*onFlightSubmit\s*\}/,
  );
  assert.match(searchTabs, /data-testid="mobile-homepage-flight-controls"/);
});
