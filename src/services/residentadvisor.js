import config from "../config";
import ResidentAdvisorAdapter from "../adapters/residentadvisor";
import Service from "../service";
import err from "../err";

export class ResidentAdvisor extends Service {
  static EVENTS_TYPE = {
    1: "upcoming",
    2: "past"
  };

  constructor(database) {
    super(database);
    this.adapter = new ResidentAdvisorAdapter();
  }

  query = async (endpoint, method, form) => {
    const url = `${endpoint}/${method}`;
    const options = {
      url,
      method: "POST",
      headers: {
        "User-Agent": "Profilart/1.0 +https://profilart.fr",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      form
    };
    const { RA } = await this.api.requestAndParseXML(options);
    return RA;
  };

  getCharts = async (profile, args) => {
    try {
      const fromCache = this.cache.get(profile, "RA", "charts");
      if (fromCache) return fromCache;
      const response = await this.query(
        config.api.residentAdvisor.dj,
        "getcharts",
        {
          DJID: profile.RA.DJID,
          Option: (args && args.option) || "1",
          UserID: profile.RA.userId,
          AccessKey: profile.RA.accessKey,
          ChartID: ""
        }
      );
      if (!response.charts[0]) throw this.getError(["no chart data"]);
      const charts = this.adapter.adapt(response, "charts");
      await this.persist(profile, "charts", charts);
      this.cache.set(profile, "RA", "charts", charts);
      return charts;
    } catch (e) {
      console.log(e);
      const { content } = await this.fromDb(profile, "charts");
      if (!charts.length) throw e;
      return content;
    }
  };

  getEvents = async (profile, args) => {
    if (!(args && args.type)) {
      throw err(400, "an arg TYPE must be provided.");
    }
    const type = this.constructor.EVENTS_TYPE[args.type];
    const persistKey = `events_${type}`;
    const fromCache = this.cache.get(profile, "RA", persistKey);
    if (fromCache) return fromCache;

    try {
      const response = await this.query(
        config.api.residentAdvisor.events,
        "GetEvents",
        {
          UserID: profile.RA.userId,
          AccessKey: profile.RA.accessKey,
          CountryID: args.countryId || "",
          AreaID: args.areaId || "",
          PromoterID: args.promoterId || "",
          VenueID: args.venueId || "",
          DJID: profile.RA.DJID,
          option: args.type,
          year: args.year || ""
        }
      );
      const events = await this.adapter.adaptEvents(response);
      await this.persist(profile, persistKey, events);
      this.cache.set(profile, "RA", persistKey, events);
      return events;
    } catch (e) {
      const { content } = await this.fromDb(profile, persistKey);
      if (!content.length) throw e;
      return content;
    }
  };

  getEventById = async (profile, args) => {
    if (!(args && args.ID)) {
      throw err(400, "an arg ID must be provided.");
    }
    if (!(args && args.type)) {
      throw err(400, "an arg TYPE must be provided.");
    }
    const events = await this.getEvents(profile, args);
    const event = events.find(event => event.id === args.ID);
    if (!event) throw err(400, "Event not found");
    return event;
  };

  getError = error =>
    err(
      500,
      `error with Resident Advisor API : ${
        error && error.length ? error.join(", ") : error
      }`
    );

  getInfos = async profile => {
    try {
      const fromCache = this.cache.get(profile, "RA", "infos");
      if (fromCache) return fromCache;
      const response = await this.query(
        config.api.residentAdvisor.dj,
        "getartist",
        {
          UserID: profile.RA.userId,
          AccessKey: profile.RA.accessKey,
          DJID: profile.RA.DJID,
          ArtistName: profile.artistName,
          URL: ""
        }
      );
      if (!response || !response.artist) throw this.getError("no infos data");
      if (
        !response.artist[0] ||
        (response.artist[0].accesserrors || []).length
      ) {
        throw this.getError(
          response.artist[0].accesserrors[0].error || ["unknown error"]
        );
      }
      const infos = this.adapter.adapt(response, "infos");
      await this.persist(profile, "infos", infos);
      this.cache.set(profile, "RA", "infos", infos);
      return infos;
    } catch (e) {
      const { content } = await this.fromDb(profile, "infos");
      if (!content.name) throw e;
      return content;
    }
  };
}

export default ResidentAdvisor;
