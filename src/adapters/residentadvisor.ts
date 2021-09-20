import Mapbox from "lib/mapbox";
import Adapter from "adapters/adapter";
import { ChartsModel, ChartsRaw } from "model/charts";
import { EventModel, EventRaw } from "model/events";
import { InfosModel, InfosRaw } from "model/infos";
import { EventsRaw } from "../model/events";
import Resolvers from "lib/resolvers";

export class ResidentAdvisorAdapter extends Adapter {
  mapbox: Mapbox;
  resolver: Resolvers;

  constructor() {
    super();
    this.mapbox = new Mapbox();
    this.resolver = new Resolvers();
  }

  extractLineup = (lineup: string): string[] => {
    let bypass = false;
    return `${lineup}`.split(", ").reduce((acc, content) => {
      if (bypass) {
        acc[acc.length - 1] += `, ${content}`;
        bypass = content.indexOf(")") === -1;
      } else {
        acc.push(content);
        bypass = content.indexOf("(") > -1;
      }

      return acc;
    }, []);
  };

  adapt = async (response, adapt: string): Promise<EventModel[] | ChartsModel[] | InfosModel> => {
    switch (adapt) {
      case "events":
        return await this.adaptEvents(response);
      case "charts":
        return this.adaptChart(response);
      case "infos":
        return this.adaptInfos(response);
      default:
        return response;
    }
  };

  adaptChart = ({ charts }: ChartsRaw): ChartsModel[] => {
    return charts.map(
      ({ track }) =>
        track[0] &&
        track[0].chartid && {
          id: track[0].chartid[0],
          date: track[0].chartdate[0],
          rank: track[0].rank[0],
          tracks: track.map((t) => ({
            id: t.trackid[0],
            artist: t.artist[0],
            title: t.title[0],
            label: t.label[0],
            remix: t.mix[0],
            cover: t.cover[0],
            RA_link: t.tracklink[0]
          }))
        }
    );
  };

  adaptEvent = async (event: EventRaw): Promise<EventModel> => {
    const addr = event.address[0] || event.address;
    const location = await this.mapbox.getLocation(addr);
    const time = event.time[0].split(" - ");
    return {
      id: event.id[0],
      venueId: event.venueid[0],
      date: event.eventdate[0],
      country: event.countryname[0],
      area: event.areaname[0],
      areaId: event.areaId[0],
      title: event.venue[0],
      address: addr,
      location,
      lineup: this.extractLineup(event.lineup),
      time: {
        begin: time[0],
        end: time[1]
      },
      cost: event.cost[0],
      promoter: event.promoter[0],
      links: {
        event: event.eventlink[0],
        venue: event.venuelink[0]
      },
      flyer: {
        front: event.imagelisting[0] ? await this.resolver.resolveFrontFlyerUrl(event.imagelisting[0]) : null,
        back: event.imagelisting[0] ? event.imagelisting[0].replace('list', 'back') : null,
        list: event.imagelisting[0] || null
      }

    };
  };

  adaptEvents = async (response: EventsRaw): Promise<EventModel[]> =>
    response.events instanceof Array
      ? await Promise.all<EventModel>(
          response.events[0].event.map(
            async (event) => await this.adaptEvent(event)
          )
        )
      : [];

  adaptInfos = (response: InfosRaw): InfosModel => {
    const data = response.artist[0];
    return {
      name: data.artistname[0],
      realname: data.realname[0],
      country: data.countryname[0],
      labels: data.labels[0].split(", ").map((label) => ({
        name: label,
        image: "",
        RA: ""
      })),
      website: data.website[0],
      RA: data.raprofile[0],
      facebook: `https://facebook.com/${data.facebook}`,
      twitter: `https://twitter.com/${data.twitter}`,
      discogs: `https://discogs.com/artist/${data.discogs}`,
      soundcloud: `https://soundcloud.com/${data.soundcloud}`,
      picture: data.profileimage[0],
      bio: {
        intro: this.clean(data.biointro[0]),
        content: this.clean(data.bio[0])
      }
    };
  };

  clean = (data: string) => data.replace(/\&amp\;/g, "&");
}

export default ResidentAdvisorAdapter;
