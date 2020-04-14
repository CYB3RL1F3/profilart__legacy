import https from "https";
import * as Sentry from "@sentry/node";
import config from "config";
import MapboxAdapter, { RawLocation } from "adapters/mapbox";
import { Geocoding } from "model/events";

export class Mapbox {
  adapter: MapboxAdapter;

  constructor() {
    this.adapter = new MapboxAdapter();
  }

  buildGeolocationApiCallUrl = (address: string) =>
    `${config.mapbox.baseurl}${encodeURIComponent(address)}.json?access_token=${
      config.mapbox.api_key
    }`;

  getLocation = async (address: string): Promise<Geocoding> => {
    try {
      const uri = this.buildGeolocationApiCallUrl(address);
      const location = await new Promise<RawLocation>((resolve, reject) => {
        https.get(uri, (response) => {
          let body = "";
          response.on("data", function (d) {
            body += d;
          });
          response.on("error", function (e) {
            reject(e);
          });
          response.on("end", function () {
            resolve(JSON.parse(body));
          });
        });
      });
      return this.adapter.adaptGeocoding(location);
    } catch (e) {
      Sentry.withScope((scope) => {
        scope.setExtra("mapbox", e);
        Sentry.captureException(e);
      });
      return null;
    }
  };
}

export default Mapbox;
