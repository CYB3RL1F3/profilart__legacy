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

  query = async (endpoint, method, payload) => {
    const url = `${endpoint}/${method}`;
    const options = {
      url: url,
      method: "POST",
      headers: {
        "User-Agent": "RAPI/0.0.1",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      form: payload
    };
    const { RA } = await this.api.requestAndParseXML(options);
    return RA;
  };

  getCharts = async (profile, args) => {
    try {
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
      const charts = this.adapter.adapt(response, "charts");
      await this.persist(profile, "charts", charts);
      return charts;
    } catch (e) {
      console.log(e);
      const { content } = await this.fromDb(profile, "charts");
      return content;
    }
  };

  getEvents = async (profile, args) => {
    if (!(args && args.type)) {
      throw err(400, "an arg TYPE must be provided.");
    }
    const persistKey = `events_${this.constructor.EVENTS_TYPE[args.type]}`;
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
      return events;
    } catch (e) {
      const { content } = await this.fromDb(profile, persistKey);
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

  getInfos = async profile => {
    try {
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
      const infos = this.adapter.adapt(response, "infos");
      await this.persist(profile, "infos", infos);
      return infos;
    } catch (e) {
      const { content } = await this.fromDb(profile, "infos");
      return content;
    }
  };
}

export default ResidentAdvisor;
