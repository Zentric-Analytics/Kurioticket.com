export type CarsFormValues = {
  pickupLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  driverAge: string;
  returnToDifferentLocation: boolean;
  dropoffLocation: string;
};

export type CarsFormErrors = Partial<
  Record<keyof CarsFormValues | "dateRange", string>
>;

export const defaultDriverAge = "18-70";
const defaultDriverAgeLabel = "Any age 18–70";
const minimumDriverAge = 18;
const maximumDriverAge = 70;

const specificDriverAgeOptions = Array.from(
  { length: maximumDriverAge - minimumDriverAge + 1 },
  (_, index) => String(minimumDriverAge + index),
);

export const driverAgeOptions = [defaultDriverAge, ...specificDriverAgeOptions];

export const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";

  return `${String(hour).padStart(2, "0")}:${minute}`;
});

const getSearchParam = (params: URLSearchParams | null, key: string) =>
  params?.get(key)?.trim() ?? "";

export const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (isoDate: string) => {
  if (!isoDate) {
    return "";
  }

  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

export const parseIsoDate = (value: string) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const isBeforeToday = (date: Date) =>
  startOfLocalDay(date).getTime() < startOfLocalDay(new Date()).getTime();

export const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

type MonthCell = {
  date: Date;
  isCurrentMonth: boolean;
};

export const buildMonthCells = (monthDate: Date): MonthCell[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1 - startOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + index,
    );

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
};

export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
};

const normalizeDriverAge = (value: string) => {
  const trimmedValue = value.trim();

  return driverAgeOptions.includes(trimmedValue)
    ? trimmedValue
    : defaultDriverAge;
};

export const getDriverAgeOptionLabel = (age: string) =>
  age === defaultDriverAge ? defaultDriverAgeLabel : age;

export const buildCarResultsHref = ({
  pickupLocation,
  vehicleType,
}: {
  pickupLocation: string;
  vehicleType?: string;
}) => {
  const today = new Date();
  const pickupDate = toIsoDate(addDays(today, 14));
  const dropoffDate = toIsoDate(addDays(today, 17));
  const params = new URLSearchParams({
    pickupLocation,
    pickupDate,
    pickupTime: "10:00",
    dropoffDate,
    dropoffTime: "10:00",
    driverAge: defaultDriverAge,
    dropoffLocation: pickupLocation,
  });

  if (vehicleType) {
    params.set("vehicleType", vehicleType);
  }

  return `/cars/results?${params.toString()}`;
};

export const buildPickupHref = (pickupLocation: string) =>
  buildCarResultsHref({ pickupLocation });

export const getInitialValues = (
  params: URLSearchParams | null,
): CarsFormValues => {
  const pickupLocation = getSearchParam(params, "pickupLocation");
  const dropoffLocation = getSearchParam(params, "dropoffLocation");
  const differentDropoff = Boolean(
    dropoffLocation && pickupLocation && dropoffLocation !== pickupLocation,
  );

  return {
    pickupLocation,
    pickupDate: getSearchParam(params, "pickupDate"),
    pickupTime: getSearchParam(params, "pickupTime") || "10:00",
    dropoffDate: getSearchParam(params, "dropoffDate"),
    dropoffTime: getSearchParam(params, "dropoffTime") || "10:00",
    driverAge: normalizeDriverAge(getSearchParam(params, "driverAge")),
    returnToDifferentLocation: differentDropoff,
    dropoffLocation: differentDropoff ? dropoffLocation : "",
  };
};

export const validateCarsForm = (
  values: CarsFormValues,
  todayIso: string,
): CarsFormErrors => {
  const errors: CarsFormErrors = {};
  const pickupLocation = values.pickupLocation.trim();
  const dropoffLocation = values.dropoffLocation.trim();
  const driverAge = Number.parseInt(values.driverAge, 10);
  const hasDefaultDriverAge = values.driverAge === defaultDriverAge;

  if (!pickupLocation) {
    errors.pickupLocation = "Enter a pickup location.";
  }

  if (!values.pickupDate) {
    errors.pickupDate = "Select a pickup date.";
  } else if (values.pickupDate < todayIso) {
    errors.pickupDate = "Pickup date cannot be in the past.";
  }

  if (!values.pickupTime) {
    errors.pickupTime = "Select a pickup time.";
  }

  if (!values.dropoffDate) {
    errors.dropoffDate = "Select a drop-off date.";
  } else if (values.dropoffDate < todayIso) {
    errors.dropoffDate = "Drop-off date cannot be in the past.";
  }

  if (!values.dropoffTime) {
    errors.dropoffTime = "Select a drop-off time.";
  }

  if (
    !hasDefaultDriverAge &&
    (!values.driverAge ||
      Number.isNaN(driverAge) ||
      String(driverAge) !== values.driverAge ||
      driverAge < minimumDriverAge ||
      driverAge > maximumDriverAge)
  ) {
    errors.driverAge = "Select Any age 18–70 or a driver age from 18 to 70.";
  }

  if (values.returnToDifferentLocation && !dropoffLocation) {
    errors.dropoffLocation = "Enter a drop-off location.";
  }

  if (values.pickupDate && values.dropoffDate) {
    if (values.dropoffDate < values.pickupDate) {
      errors.dateRange = "Drop-off date cannot be before pickup date.";
    } else if (
      values.dropoffDate === values.pickupDate &&
      values.pickupTime &&
      values.dropoffTime &&
      values.dropoffTime <= values.pickupTime
    ) {
      errors.dateRange =
        "For same-day returns, drop-off time must be after pickup time.";
    }
  }

  return errors;
};
