import { Data } from "lib/database/database.d";

export type Coordinates = [number, number];

export interface Geocoding {
  id: string;
  address: string;
  position: Coordinates;
}

export type EventType = "upcoming" | "past";
export type EventTypeNumber = "1" | "2";

export interface EventModel {
  id?: string;
  venueId?: string;
  date?: string;
  country?: string;
  area?: string;
  areaId?: string;
  title?: string;
  address?: string;
  location?: Geocoding;
  lineup?: string[];
  time?: {
    begin?: string;
    end?: string;
  };
  cost?: string;
  promoter?: string;
  links?: {
    event?: string;
    venue?: string;
  };
  flyer?: {
    front?: string;
    back?: string;
    list?: string;
  }
}

export type Events = Data<EventModel[]>;

export interface EventQuery {
  UserID: string;
  AccessKey: string;
  CountryID: string;
  AreaID: string;
  PromoterID: string;
  VenueID: string;
  DJID: string;
  option: EventTypeNumber;
  year: string;
}

export interface EventByIDQuery {
  ID: string;
}

export type EventTypeArg = EventType | number;

export interface EventArgs {
  type?: EventTypeArg;
  countryId?: string;
  areaId?: string;
  promoterId?: string;
  venueId?: string;
  year?: string;
}

export interface EventByIdArgs {
  eventId?: string;
  name?: string;
  type: EventTypeArg;
}

export interface EventRaw {
  address: string;
  time: string[];
  id: string[];
  venueid: string[];
  eventdate: string[];
  countryname: string[];
  areaname: string[];
  areaId: string[];
  venue: string[];
  lineup: string;
  cost: string[];
  promoter: string[];
  eventlink: string[];
  venuelink: string[];
  imagelisting: string[];
}

export interface EventsRaw {
  events: Array<{
    event: EventRaw[];
  }>;
}
