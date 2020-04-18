require("dotenv").config();

const {
  URL,
  DISCOGS_API_KEY,
  DISCOGS_API_SECRET,
  MONGODB_URI,
  MONGODB_BASE,
  MAPBOX_API_KEY,
  JWT,
  REDIS_URL,
  REDIS_COLLECTION,
  SOUNDCLOUD_API_CLIENT_ID,
  SOUNDCLOUD_API_CLIENT_SECRET,
  MAILGUN_USER,
  MAILGUN_EMAIL,
  MAILGUN_ENDPOINT,
  SENTRY_DSN,
  TIMELINE_URL
} = process.env;

export const config = {
  url: URL,
  api: {
    residentAdvisor: {
      dj: "https://www.residentadvisor.net/api/dj.asmx",
      events: "https://www.residentadvisor.net/api/events.asmx"
    },
    discogs: {
      api_url: "https://api.discogs.com/",
      key: DISCOGS_API_KEY,
      secret: DISCOGS_API_SECRET
    },
    timeline: {
      url: TIMELINE_URL
    }
  },
  db: {
    address: MONGODB_URI,
    base: MONGODB_BASE
  },
  mapbox: {
    baseurl: "https://api.tiles.mapbox.com/geocoding/v5/mapbox.places/",
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
  },
  sentry: {
    dsn: SENTRY_DSN
  },
  userAgent: "Profilart/1.0 +https://profilart.com"
};

export default config;
