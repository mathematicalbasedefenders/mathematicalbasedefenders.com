import { log } from "./log";

const DAYS_IN_A_YEAR = 365.25;
const YEAR_DIVISOR = DAYS_IN_A_YEAR * 24 * 60 * 60 * 1000;
const DAY_DIVISOR = 24 * 60 * 60 * 1000;
const HOUR_DIVISOR = 60 * 60 * 1000;
const MINUTE_DIVISOR = 60 * 1000;
const SECOND_DIVISOR = 1000;

function addCommasToNumber(x: number) {
  return x.toLocaleString("en-US");
}

function formatToRelativeTime(
  x: number | null,
  precision: number,
  countYears: boolean
) {
  if (x == null) {
    log.warn("Null value given to format a time period. Returning null value.");
    return "(not available)";
  }
  if (x < 0) {
    log.warn(`Formatting a negative time period. Beware of results.`);
  }
  let toReturn = "";
  let unitsLeft = precision;
  const duration: { [key: string]: number } = convertToRelativeTime(
    x,
    countYears
  );
  const units = [
    "years",
    "days",
    "hours",
    "minutes",
    "seconds",
    "milliseconds"
  ];
  for (const unit of units) {
    if (duration[unit] > 0) {
      const quantity = addCommasToNumber(duration[unit]);
      const plural = duration[unit] === 1 ? unit.slice(0, -1) : unit;
      toReturn += `${quantity} ${plural}`;
      unitsLeft--;
      if (unitsLeft > 0) {
        toReturn += ` `;
      }
    }
    if (unitsLeft === 0) {
      break;
    }
  }
  if (toReturn === ``) {
    return `0 milliseconds`;
  }
  return toReturn;
}

function convertToRelativeTime(x: number, countYears: boolean) {
  let remaining = x;
  const duration = {
    years: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  };
  if (countYears) {
    duration.years = Math.floor(remaining / YEAR_DIVISOR);
    remaining -= duration.years * YEAR_DIVISOR;
  }
  duration.days = Math.floor(remaining / DAY_DIVISOR);
  remaining -= duration.days * DAY_DIVISOR;
  duration.hours = Math.floor(remaining / HOUR_DIVISOR);
  remaining -= duration.hours * HOUR_DIVISOR;
  duration.minutes = Math.floor(remaining / MINUTE_DIVISOR);
  remaining -= duration.minutes * MINUTE_DIVISOR;
  duration.seconds = Math.floor(remaining / SECOND_DIVISOR);
  remaining -= duration.seconds;
  duration.milliseconds = Math.floor(remaining);
  return duration;
}

/**
 * Converts time in milliseconds to a X:YY.ZZZ format, which is more human readable.
 * @param milliseconds The number of milliseconds to convert into "clock" format
 * @returns The X:YY.ZZZ format of the amount of milliseconds.
 */
function millisecondsToTime(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    log.warn("Number given is not a positive finite number.");
  }
  let m = Math.floor(milliseconds / 60000);
  let s = Math.floor((milliseconds % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  let ms = Math.floor((milliseconds % 60000) % 1000)
    .toString()
    .padStart(3, "0");
  return `${m}:${s}.${ms}`;
}

export { addCommasToNumber, formatToRelativeTime, millisecondsToTime };
