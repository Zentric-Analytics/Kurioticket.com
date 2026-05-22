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
  <form
    className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(160px,1.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(90px,0.7fr)_140px]"
    onSubmit={(event) => {
      event.preventDefault();

      const params =
        new URLSearchParams({
          destination,
          checkIn,
          checkOut,
          guests,
          rooms,
        });

      router.push(
        `/hotels/results?${params.toString()}`
      );
    }}
  >
    <input
      value={destination}
      onChange={(e) =>
        setDestination(
          e.target.value
        )
      }
      required
      placeholder={
        t.destination ||
        "Destination"
      }
      className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
    />

    <input
      type="date"
      value={checkIn}
      onChange={(e) =>
        setCheckIn(
          e.target.value
        )
      }
      required
      className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
    />

    <input
      type="date"
      value={checkOut}
      onChange={(e) =>
        setCheckOut(
          e.target.value
        )
      }
      required
      className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
    />

    <select
      value={guests}
      onChange={(e) =>
        setGuests(
          e.target.value
        )
      }
      className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
    >
      <option value="1">
        1 {t.adults || "Adults"}
      </option>

      <option value="2">
        2 {t.adults || "Adults"}
      </option>

      <option value="3">
        3 {t.adults || "Adults"}
      </option>

      <option value="4">
        4 {t.adults || "Adults"}
      </option>
    </select>

    <select
      value={rooms}
      onChange={(e) =>
        setRooms(
          e.target.value
        )
      }
      className="focus-ring h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
    >
      <option value="1">
        1 {t.room || "Room"}
      </option>

      <option value="2">
        2 {t.rooms || "Rooms"}
      </option>

      <option value="3">
        3 {t.rooms || "Rooms"}
      </option>
    </select>

    <Button
      type="submit"
      className="h-11 rounded-lg bg-[#5b21d6] font-bold text-white hover:bg-[#4c1d95]"
    >
      {t.searchHotels ||
        "Search Hotels"}
    </Button>
  </form>
)}