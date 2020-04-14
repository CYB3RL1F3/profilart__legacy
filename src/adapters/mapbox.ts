import Adapter from "adapters/adapter";
import { Geocoding, Coordinates } from "model/events";

export interface RawLocation {
  features: Array<{
    id: string;
    place_name: string;
    geometry: {
      coordinates: Coordinates;
    };
  }>;
}

export class MapboxAdapter extends Adapter {
  adaptGeocoding(response: RawLocation): Geocoding {
    const rawLocation = response.features && response.features[0];
    if (!rawLocation) return null;
    return {
      id: rawLocation.id,
      address: rawLocation.place_name,
      position: rawLocation.geometry.coordinates
    };
  }
}

export default MapboxAdapter;
