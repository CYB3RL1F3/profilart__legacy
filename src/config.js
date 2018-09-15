import url from 'url';

require('dotenv').config();

export const config = {
    url: process.env.URL,
    api: {
        residentAdvisor: {
            dj: 'https://www.residentadvisor.net/api/dj.asmx',
            events: 'https://www.residentadvisor.net/api/events.asmx'
        },
        discogs: {
            api_url: 'https://api.discogs.com/',
            key: process.env.DISCOGS_API_KEY,
            secret: process.env.DISCOGS_API_SECRET
        }
    },
    db: {
        address: process.env.MONGODB_URI // || 'mongodb://localhost:27017/profilart'
    },
    mapbox: {
        baseurl: 'https://api.tiles.mapbox.com/geocoding/v5/mapbox.places/',
        api_key: process.env.MAPBOX_API_KEY
    },
    jwt: {
        secretOrKey: process.env.JWT,
        passReqToCallback: true
    },
    redis: {
        store: process.env.REDIS_URL,
        collection: process.env.REDIS_COLLECTION
    }
};

export default config;
