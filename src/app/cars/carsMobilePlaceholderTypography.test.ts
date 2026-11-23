import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const searchBarSource = source.slice(
  source.indexOf("function CarsSearchBar"),
  source.indexOf("function CarsMobilePickerDialogs"),
);
const pickupFieldSource = searchBarSource.slice(
  searchBarSource.indexOf('label={t("carsSearch.pickupLocationLabel")}'),
  searchBarSource.indexOf('label={t("carsSearch.returnLocationLabel")}'),
);
const rentalDatesSource = source.slice(
  source.indexOf("function RentalDatesField"),
  source.indexOf("function TimeRangeField"),
);

test("mobile empty pickup and rental-date typography uses the same placeholder treatment", () => {
  assert.match(
    pickupFieldSource,
    /className="[^"]*sm:hidden"[\s\S]*?className=\{`min-w-0 \$\{[\s\S]*?values\.pickupLocation[\s\S]*?\? "font-semibold text-slate-950"[\s\S]*?: "font-normal text-slate-500"/,
  );
  assert.match(pickupFieldSource, /className="block truncate">\{pickupDisplay\.primary/);
  assert.match(
    rentalDatesSource,
    /pickupDate \? "font-semibold text-slate-950" : "font-normal text-slate-500"/,
  );
  assert.doesNotMatch(
    pickupFieldSource,
    /sm:hidden \$\{[\s\S]*?values\.pickupLocation/,
  );
});

test("filled typography and desktop pickup presentation remain unchanged", () => {
  assert.match(
    pickupFieldSource,
    /values\.pickupLocation[\s\S]*?\? "font-semibold text-slate-950"[\s\S]*?: "font-normal text-slate-500"/,
  );
  assert.match(
    rentalDatesSource,
    /pickupDate \? "font-semibold text-slate-950" : "font-normal text-slate-500"/,
  );
  assert.match(
    pickupFieldSource,
    /inputClassName="hidden h-7 w-full border-none bg-transparent py-0 ps-0 text-\[16px\] font-medium text-slate-950 placeholder:text-slate-400 focus:outline-none sm:block md:text-\[15px\] lg:h-8"/,
  );
});
