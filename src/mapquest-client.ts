import axios from "axios";
import { AxiosError } from "../node_modules/axios/index";

type GetLocationCountryCommand = {
  lat: number;
  lon: number;
  apiToken: string;
};

type ReverseGeocode = {
  address: {
    country: string;
    countryCode: string;
  };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getLocationCountry = async ({
  lat,
  lon,
  apiToken
}: GetLocationCountryCommand) => {
  await delay(1000);

  try {
    const { data } = await axios.get<ReverseGeocode>(
      "http://open.mapquestapi.com/nominatim/v1/reverse.php",
      {
        params: {
          key: apiToken,
          format: "json",
          lat,
          lon,
        },
      }
    );

    return data.address.country
      .normalize("NFD")
      .replace(/([\u0300-\u036f]|[^0-9a-zA-Z])/g, "");
  } catch (err) {
    console.error(
      `Failed to fetch country for ${lat},${lon}`,
      (err as AxiosError).message
    );
    return "Country undetermined";
  }
};
