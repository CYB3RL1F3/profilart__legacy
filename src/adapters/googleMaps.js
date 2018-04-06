export class GoogleMaps {
  adaptGeocoding(response) {
    const rawLocation = response[0];
    return {
      id: rawLocation.place_id,
      address: rawLocation.formatted_address,
      position: rawLocation.geometry.location
    }
  }

  adapt(type, response) {
    switch (type) {
      case 'geocoding': return this.adaptGeocoding(response)
    }
  }
}

export default GoogleMaps;
