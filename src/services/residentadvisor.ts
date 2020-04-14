import config from "../config";
import ResidentAdvisorAdapter from "../adapters/residentadvisor";
import Service from "../service";
import err from "../err";
import { RA_Scrapper } from "../lib/ra_scrapper";
import { withScope, captureException } from "@sentry/node";
import { ProfileModel } from "model/profile";
import { Models } from "model/models";
import { Options } from "request";
import { ChartsQuery, ChartsQueryArgs, ChartsRaw } from "model/charts";
import {
  EventType,
  EventQuery,
  EventTypeArg,
  EventArgs,
  EventsRaw
} from "model/events";
import { EventModel } from "model/events";
import { ChartsModel } from "model/charts";
import { InfosModel } from "model/infos";
import { EventByIdArgs } from "../model/events";

interface RAResp<T> {
  RA: T;
}

export class ResidentAdvisor extends Service {
  static EVENTS_TYPE = {
    1: "upcoming",
    2: "past"
  };

  adapter: ResidentAdvisorAdapter;

  constructor(database) {
    super(database);
    this.adapter = new ResidentAdvisorAdapter();
  }

  query = async <Query, Response>(
    endpoint: string,
    method: string,
    form: Query
  ) => {
    const url = `${endpoint}/${method}`;
    const options: Options = {
      url,
      method: "POST",
      headers: {
        "User-Agent": config.userAgent,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      form
    };
    const { RA } = await this.api.requestAndParseXML<RAResp<Response>>(options);
    return RA;
  };

  getCharts = async (
    profile: ProfileModel,
    args?: ChartsQueryArgs
  ): Promise<ChartsModel[]> => {
    try {
      const fromCache = this.cache.get<ChartsModel[]>(profile, "RA", "charts");
      if (fromCache) return fromCache;
      const response = await this.query<ChartsQuery, ChartsRaw>(
        config.api.residentAdvisor.dj,
        "getcharts",
        {
          DJID: profile.residentAdvisor.DJID,
          Option: (args && args.option) || "1",
          UserID: profile.residentAdvisor.userId,
          AccessKey: profile.residentAdvisor.accessKey,
          ChartID: ""
        }
      );
      if (!response.charts[0]) throw this.getError(["no chart data"]);
      const charts: ChartsModel[] = await this.adapter.adaptChart(response);
      await this.persist<ChartsModel[]>(profile, Models.charts, charts);
      this.cache.set<ChartsModel[]>(profile, "RA", Models.charts, charts);
      return charts;
    } catch (e) {
      withScope((scope) => {
        scope.setExtra("getCharts", e);
        captureException(e);
      });
      const { content } = await this.fromDb<ChartsModel[]>(
        profile,
        Models.charts
      );
      if (!content.length) throw e;
      return content;
    }
  };

  getEventType(type: EventTypeArg): EventType {
    if (type.toString() === "1" || type.toString() === "2") {
      return ResidentAdvisor.EVENTS_TYPE[type];
    }
    if (
      type === ResidentAdvisor.EVENTS_TYPE["1"] ||
      type === ResidentAdvisor.EVENTS_TYPE["2"]
    ) {
      return type;
    }
    return null;
  }

  getEventTypeNumber(type) {
    if (type.toString() === "1" || type.toString() === "2") return type;
    if (type === ResidentAdvisor.EVENTS_TYPE["1"]) return 1;
    if (type === ResidentAdvisor.EVENTS_TYPE["2"]) return 2;
    return null;
  }

  getEvents = async (
    profile: ProfileModel,
    args: EventArgs
  ): Promise<EventModel[]> => {
    if (!(args && args.type)) {
      throw err(400, "an arg TYPE must be provided.");
    }
    const type = this.getEventType(args.type);
    if (!type) throw err(400, "invalid type arg");
    const persistKey: Models = Models[`events_${type}`];
    const fromCache = this.cache.get<EventModel[]>(profile, "RA", persistKey);
    if (fromCache) return fromCache;

    try {
      const response: EventsRaw = await this.query<EventQuery, EventsRaw>(
        config.api.residentAdvisor.events,
        "GetEvents",
        {
          UserID: profile.residentAdvisor.userId,
          AccessKey: profile.residentAdvisor.accessKey,
          CountryID: args.countryId || "",
          AreaID: args.areaId || "",
          PromoterID: args.promoterId || "",
          VenueID: args.venueId || "",
          DJID: profile.residentAdvisor.DJID,
          option: this.getEventTypeNumber(args.type),
          year: args.year || ""
        }
      );
      const events = await this.adapter.adaptEvents(response);
      await this.persist(profile, persistKey, events);
      this.cache.set(profile, "RA", persistKey, events);
      return events;
    } catch (e) {
      withScope((scope) => {
        scope.setExtra("getEvents", e);
        captureException(e);
      });
      const { content } = await this.fromDb<EventModel[]>(profile, persistKey);
      if (!content.length) throw e;
      return content;
    }
  };

  getEventById = async (
    profile: ProfileModel,
    args: EventByIdArgs
  ): Promise<EventModel> => {
    if (!(args && args.ID)) {
      if (args && args.name) return this.getEventByName(profile, args);
      throw err(400, "an arg ID must be provided.");
    }
    if (!(args && args.type)) {
      throw err(400, "an arg TYPE must be provided.");
    }
    const events = await this.getEvents(profile, args);
    const event = events.find((event) => event.id === args.ID);
    if (!event) throw err(404, "Event not found");
    return event;
  };

  getEventByName = async (
    profile: ProfileModel,
    args: EventByIdArgs
  ): Promise<EventModel> => {
    if (!(args && args.name)) {
      throw err(400, "an arg name must be provided.");
    }
    if (!(args && args.type)) {
      throw err(400, "an arg TYPE must be provided.");
    }
    const events = await this.getEvents(profile, args);
    const event = events.find(
      (event) => event.title.toLowerCase() === args.name.toLowerCase()
    );
    if (!event) throw err(404, "Event not found");
    return event;
  };

  getError = (error: string[]) =>
    err(
      500,
      `error with Resident Advisor API : ${
        error && error.length ? error.join(", ") : error
      }`
    );

  getInfos = async (profile: ProfileModel): Promise<InfosModel> => {
    try {
      const fromCache = this.cache.get<InfosModel>(profile, "RA", "infos");
      if (fromCache) return fromCache;
      /* TEMPORARY DISABLED ==> API limitation problem. Using scrapper instead.
      // Might be re-enabled with test cases (if not working, then try scrapping)
      const response = await this.query(
        config.api.residentAdvisor.dj,
        "getartist",
        {
          UserID: profile.residentAdvisor.userId,
          AccessKey: profile.residentAdvisor.accessKey,
          DJID: profile.residentAdvisor.DJID,
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
      */
      const scrapper = new RA_Scrapper(profile);
      const infos = await scrapper.getScrappedData();
      await this.persist<InfosModel>(profile, Models.infos, infos);
      this.cache.set<InfosModel>(profile, "RA", Models.infos, infos);
      return infos;
    } catch (e) {
      withScope((scope) => {
        scope.setExtra("loading", e);
        captureException(e);
      });
      const { content } = await this.fromDb<InfosModel>(profile, Models.infos);
      if (!content.name) throw err(500, e.message || e);
      return content;
    }
  };
}

export default ResidentAdvisor;
