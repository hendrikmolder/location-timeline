import parseArgs from "minimist";
import { readFileSync } from "fs";
import ora from "ora";
import chalk from "chalk";

import { getLocationCountry } from "./mapquest-client.ts";

type RawRecord = {
  locations: Array<{
    latitudeE7: number;
    longitudeE7: number;
    source: "WIFI" | "GPS";
    accuracy: number;
    timestamp: string;
  }>;
};

type Location = {
  latitude: number;
  longitude: number;
  source: "WIFI" | "GPS";
  accuracy: number;
  timestamp: number;
};

const parseRecordsFile = (filePath: string) => {
  try {
    const data = readFileSync(filePath, "utf-8");

    if (data) {
      return data;
    }

    throw new Error("Unable to parse file");
  } catch (err) {
    console.error(err);
    throw new Error(`Unable to parse file: ${err}`);
  }
};

const rawRecordsToLocations = (rawRecords: RawRecord): Location[] =>
  rawRecords.locations.map(
    ({ latitudeE7, longitudeE7, source, timestamp, accuracy }) => ({
      latitude: latitudeE7 / 1e7,
      longitude: longitudeE7 / 1e7,
      accuracy,
      source,
      timestamp: Date.parse(timestamp),
    })
  );

const { file: fileName, token: mapQuestToken } = parseArgs(process.argv.slice(2), { "--": true });
const fileNameSpinner = ora(
  `Using ${chalk.red(fileName)} for Timeline data`
).start();

// Parse file
const rawRecordsFile = parseRecordsFile(fileName);
const records: RawRecord = JSON.parse(rawRecordsFile);

const locations = rawRecordsToLocations(records);
fileNameSpinner.succeed();

// Filter last 365 days
const today = new Date();
const todayOneYearAgo = new Date(
  Date.UTC(today.getFullYear() - 1, today.getMonth(), today.getDate(), 0, 0, 1)
);

ora(
  `Using the locations from last 365, beggining with ${chalk.red(
    todayOneYearAgo.toDateString()
  )}`
).succeed();
const locationsWithinOneYear = locations.filter(
  ({ timestamp }) => new Date(timestamp).getTime() >= todayOneYearAgo.getTime()
);

// Group by dates
const locationsByDate: Record<string, Location[]> =
  locationsWithinOneYear.reduce((result, currentItem) => {
    const dateKey = new Date(currentItem.timestamp).toISOString().split("T")[0];

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (result[dateKey] = result[dateKey] || []).push(currentItem);

    return result;
  }, {});

// Find most accurate location
const accurateLocationSpinner = ora(
  "Calculating most accurate location for each day"
).start();
const accourateLocations = Object.keys(locationsByDate).map((date) => {
  const accLoc = locationsByDate[date].reduce(
    (prev, current) => (prev.accuracy > current.accuracy ? prev : current),
    locationsByDate[date][0]
  );

  return {
    date,
    location: accLoc,
  };
});
accurateLocationSpinner.succeed();

// Enrich with country names
const countryNamesSpinner = ora(
  `Fetching country names for all locations`
).start();
const locationsWithCountries = await Promise.all(
  accourateLocations.map(async ({ location, date }) => ({
    date,
    country: await getLocationCountry({
      lat: location.latitude,
      lon: location.longitude,
      apiToken: mapQuestToken
    }),
  }))
);
countryNamesSpinner.succeed();

// Group by countries
const countriesGroupSpinner = ora("Calculating days for each country").start();
type DaysByCountry = Array<{ country: string; days: number }>;

const daysByCountry = locationsWithCountries.reduce<DaysByCountry>(
  (countryDays: DaysByCountry, currentItem) => {
    const countryIndex = countryDays.findIndex(
      ({ country }) => country === currentItem.country
    );

    if (countryIndex >= 0) {
      countryDays[countryIndex].days++;
    } else {
      countryDays.push({ country: currentItem.country, days: 1 });
    }

    return countryDays;
  },
  []
);

countriesGroupSpinner.succeed();

console.table(daysByCountry, ["country", "days"]);
