import https from "https";
import MapboxAdapter from "../adapters/mapbox";
import config from "../config";
import * as Sentry from "@sentry/node";

export class Mapbox {
  constructor() {
    this.adapter = new MapboxAdapter();
  }

  buildGeolocationApiCallUrl = address =>
    `${config.mapbox.baseurl}${encodeURIComponent(address)}.json?access_token=${
      config.mapbox.api_key
    }`;

  getLocation = async address => {
    try {
      const uri = this.buildGeolocationApiCallUrl(address);
      const location = await new Promise((resolve, reject) => {
        https.get(uri, response => {
          let body = "";
          response.on("data", function(d) {
            body += d;
          });
          response.on("error", function(e) {
            reject(e);
          });
          response.on("end", function() {
            resolve(JSON.parse(body));
          });
        });
      });
      return this.adapter.adapt("geocoding", location);
    } catch (e) {
      Sentry.withScope(scope => {
        scope.setExtra("mapbox", e);
        Sentry.captureException(e);
      });
      return null;
    }
  };
}

export default Mapbox;
