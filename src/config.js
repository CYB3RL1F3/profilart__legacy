require('dotenv').config();

const {
    URL,
    DISCOGS_API_KEY,
    DISCOGS_API_SECRET,
    MONGODB_URI,
    MAPBOX_API_KEY,
    JWT,
    REDIS_URL,
    REDIS_COLLECTION,
    SOUNDCLOUD_API_CLIENT_ID,
    SOUNDCLOUD_API_CLIENT_SECRET,
    MAILGUN_USER,
    MAILGUN_EMAIL,
    MAILGUN_ENDPOINT
} = process.env;

export const config = {
    url: URL,
    api: {
        residentAdvisor: {
            dj: 'https://www.residentadvisor.net/api/dj.asmx',
            events: 'https://www.residentadvisor.net/api/events.asmx'
        },
        discogs: {
            api_url: 'https://api.discogs.com/',
            key: DISCOGS_API_KEY,
            secret: DISCOGS_API_SECRET
        }
    },
    db: {
        address: MONGODB_URI
    },
    mapbox: {
        baseurl: 'https://api.tiles.mapbox.com/geocoding/v5/mapbox.places/',
        api_key: MAPBOX_API_KEY
    },
    jwt: {
        secretOrKey: JWT,
        passReqToCallback: true
    },
    redis: {
        store: REDIS_URL,
        collection: REDIS_COLLECTION
    },
    soundcloud: {
        clientId: SOUNDCLOUD_API_CLIENT_ID,
        clientSecret: SOUNDCLOUD_API_CLIENT_SECRET
    },
    mailer: {
        mailgun: {
            user: MAILGUN_USER,
            email: MAILGUN_EMAIL,
            endpoint: MAILGUN_ENDPOINT
        }
    }
};

export default config;
