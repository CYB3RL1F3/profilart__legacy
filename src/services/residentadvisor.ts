import Service from "../service";
import err from "../err";
import { withScope, captureException } from "@sentry/node";
import { ProfileModel } from "model/profile";
import { Models } from "model/models";
import {
  EventType,
  EventTypeArg,
  EventArgs
} from "model/events";
import { EventModel } from "model/events";
import { ChartsModel } from "model/charts";
import { InfosModel } from "model/infos";
import { EventByIdArgs } from "../model/events";

export class ResidentAdvisor extends Service {
  static EVENTS_TYPE = {
    1: "upcoming",
    2: "past"
  };

  constructor(database) {
    super(database);
  }

  getCharts = async (
    profile: ProfileModel
  ): Promise<ChartsModel[]> => {
    try {
      const fromCache = this.cache.get<ChartsModel[]>(profile, "RA", "charts");
      if (fromCache) return fromCache;
      const { content } = await this.fromDb<ChartsModel[]>(
        profile,
        Models.charts
      );
      return content;
    } catch (e) {
      withScope((scope) => {
        scope.setExtra("getCharts", e);
        captureException(e);
      });
      throw e;
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
    try {
      const type = this.getEventType(args.type);
      if (!type) throw err(400, "invalid type arg");
      const persistKey: Models = Models[`events_${type}`];
      const fromCache = this.cache.get<EventModel[]>(profile, "RA", persistKey);
      if (fromCache) return fromCache;

      const events = await this.fromDb<EventModel[]>(profile, persistKey);
      if (!events) throw err(400, "no events available");
      if (!events.content || !events.content.length) return [];
      return events.content;
    } catch (e) {
      withScope((scope) => {
        scope.setExtra("getEvents", e);
        captureException(e);
      });
      throw e;
    }
  };

  getEventById = async (
    profile: ProfileModel,
    args: EventByIdArgs
  ): Promise<EventModel> => {
    if (!(args && args.eventId)) {
      if (args && args.name) return this.getEventByName(profile, args);
      throw err(400, "an arg ID must be provided.");
    }
    if (!(args && args.type)) {
      throw err(400, "an arg TYPE must be provided.");
    }

    const type = this.getEventType(args.type);
    if (!type) throw err(400, "invalid type arg");
    const events = await this.getEvents(profile, args);
    const event = events.find((event) => event.id === args.eventId);
    
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
      const infos = await this.fromDb<InfosModel>(profile, Models.infos);
      if (!infos) throw this.getError(["no infos"]);
      return infos.content;
      
    } catch (e) {
      withScope((scope) => {
        scope.setExtra("loading", e);
        captureException(e);
      });
      throw e;
    }
  };
}

export default ResidentAdvisor;
