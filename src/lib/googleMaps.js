import GMap from '@google/maps';
import GoogleMapsAdapter from '../adapters/googleMaps';
import config from '../config';

export class GoogleMaps {
  constructor () {
    this.adapter = new GoogleMapsAdapter();
    this.client = GMap.createClient({
      key: config.google.api_key,
      Promise
    });
  }

  getLocation = (address) => new Promise((resolve, reject) => {
    this.client.geocode({ address })
      .asPromise()
      .then((response) => resolve(this.adapter.adapt('geocoding', response.json.results)))
      .catch((err) => reject(err))
  })
}

export default GoogleMaps;
