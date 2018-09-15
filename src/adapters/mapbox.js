export class MapboxAdapter {
    adaptGeocoding(response) {
        const rawLocation = response.features && response.features[0];
        if (!rawLocation) return null;
        return {
            id: rawLocation.id,
            address: rawLocation.place_name,
            position: rawLocation.geometry.coordinates
        };
    }

    adapt(type, response) {
        switch (type) {
            case 'geocoding':
                return this.adaptGeocoding(response);
        }
    }
}

export default MapboxAdapter;
