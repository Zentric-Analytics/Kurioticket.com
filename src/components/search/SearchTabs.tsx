{tab === "flights" ? (
  <>
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
      {(
        [
          "round-trip",
          "one-way",
          "multi-city",
        ] as TripType[]
      ).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() =>
            setTripType(mode)
          }
          className={cn(
            "focus-ring rounded-full px-3 py-1.5 capitalize",
            tripType === mode
              ? "bg-violet-100 text-[#5b21d6]"
              : "bg-slate-100 text-slate-700"
          )}
        >
          {mode === "round-trip"
            ? t.tripRound ||
              "round trip"
            : mode === "one-way"
            ? t.tripOneWay ||
              "one way"
            : t.tripMulti ||
              "multi city"}
        </button>
      ))}

      <button
        type="button"
        onClick={() =>
          setTab("hotels")
        }
        className="ml-auto text-[#5b21d6] underline-offset-2 hover:underline"
      >
        {t.searchHotelsInstead ||
          "Search hotels instead"}
      </button>
    </div>

    <form
      className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_140px]"
      onSubmit={(event) => {
        event.preventDefault();

        const params =
          new URLSearchParams({
            tripType,
            origin: from.trim(),
            destination: to.trim(),
            departureDate,
            returnDate:
              tripType === "one-way"
                ? ""
                : returnDate,
            travelers,
            cabinClass,
          });

        router.push(
          `/flights/results?${params.toString()}`
        );
      }}
    >
      <input
        value={from}
        onChange={(e) =>
          setFrom(e.target.value)
        }
        required
        placeholder={
          t.from || "From"
        }
        className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
      />

      <input
        value={to}
        onChange={(e) =>
          setTo(e.target.value)
        }
        required
        placeholder={t.to || "To"}
        className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
      />

      <input
        type="date"
        value={departureDate}
        onChange={(e) =>
          setDepartureDate(
            e.target.value
          )
        }
        required
        className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
      />

      <input
        type="date"
        value={returnDate}
        onChange={(e) =>
          setReturnDate(
            e.target.value
          )
        }
        disabled={
          tripType === "one-way"
        }
        className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50"
      />

      <select
        value={travelers}
        onChange={(e) =>
          setTravelers(
            e.target.value
          )
        }
        className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
      >
        <option value="1">
          {t.oneTraveler ||
            "1 Traveler"}
        </option>

        <option value="2">
          {t.twoTravelers ||
            "2 Travelers"}
        </option>

        <option value="3">
          {t.threeTravelers ||
            "3 Travelers"}
        </option>

        <option value="4">
          {t.fourTravelers ||
            "4 Travelers"}
        </option>
      </select>

      <select
        value={cabinClass}
        onChange={(e) =>
          setCabinClass(
            e.target.value
          )
        }
        className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
      >
        <option value="economy">
          {t.economy ||
            "Economy"}
        </option>

        <option value="premium-economy">
          {t.premiumEconomy ||
            "Premium economy"}
        </option>

        <option value="business">
          {t.business ||
            "Business"}
        </option>

        <option value="first">
          {t.first || "First"}
        </option>
      </select>

      <Button
        type="submit"
        className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]"
      >
        {t.searchFlights ||
          "Search Flights"}
      </Button>
    </form>
  </>
) : (